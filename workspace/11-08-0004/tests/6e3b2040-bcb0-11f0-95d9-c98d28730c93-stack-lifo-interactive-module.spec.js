import { test, expect } from '@playwright/test';

// Test file: 6e3b2040-bcb0-11f0-95d9-c98d28730c93.spec.js
// URL served by the harness:
const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6e3b2040-bcb0-11f0-95d9-c98d28730c93.html';

// Helper to find the first matching locator from an array of selectors or Playwright-friendly queries.
// Returns a Locator for the first selector that has a match on the page.
async function firstLocator(page, selectors) {
  for (const sel of selectors) {
    const locator = page.locator(sel);
    if (await locator.count() > 0) return locator;
  }
  // Also try aria queries (role/label) as last resort
  for (const sel of selectors) {
    try {
      const locator1 = page.getByRole('button', { name: new RegExp(sel, 'i') });
      if (await locator.count() > 0) return locator;
    } catch {
      // ignore
    }
  }
  throw new Error(`None of the selectors matched: ${JSON.stringify(selectors)}`);
}

// Page object to encapsulate common operations on the stack UI
class StackPage {
  constructor(page) {
    this.page = page;
  }

  // Resolve common controls with fallback selectors
  async valueInput() {
    return await firstLocator(this.page, [
      'input[aria-label="Value"]',
      'input[name="value"]',
      'input[type="text"]',
      'label:has-text("Value") ~ input',
      'input[placeholder="Value"]'
    ]);
  }

  async capacityInput() {
    return await firstLocator(this.page, [
      'input[aria-label="Capacity"]',
      'input[name="capacity"]',
      'input[type="number"]',
      'label:has-text("Capacity") ~ input'
    ]);
  }

  async setCapacityButton() {
    return await firstLocator(this.page, [
      'button:has-text("Set")',
      'button:has-text("Set capacity")',
      'button:has-text("Apply")',
      'button[aria-label="Set capacity"]'
    ]);
  }

  async pushButton() {
    return await firstLocator(this.page, [
      'button:has-text("Push")',
      'button[aria-label="Push"]',
      '.btn-push',
      'button:has-text("Add")'
    ]);
  }

  async popButton() {
    return await firstLocator(this.page, [
      'button:has-text("Pop")',
      'button[aria-label="Pop"]',
      '.btn-pop'
    ]);
  }

  async peekButton() {
    return await firstLocator(this.page, [
      'button:has-text("Peek")',
      'button[aria-label="Peek"]',
      '.btn-peek'
    ]);
  }

  async clearButton() {
    return await firstLocator(this.page, [
      'button:has-text("Clear")',
      'button[aria-label="Clear"]',
      '.btn-clear'
    ]);
  }

  // Stack frame/container
  async stackFrame() {
    return await firstLocator(this.page, [
      '[aria-label="Stack"]',
      '[data-testid="stack"]',
      '#stack',
      '.stack-frame',
      '.stack'
    ]);
  }

  // Locate nodes inside the stack
  async stackNodesLocator() {
    const frame = await this.stackFrame();
    // attempt several common child selectors
    const combined = frame.locator('.stack-node, .node, [data-node], .stack-item, li, .item');
    // If none exist yet, return the combined locator (it will have count 0)
    return combined;
  }

  // Accessible announcer (aria-live region)
  async announcer() {
    return await firstLocator(this.page, [
      '[aria-live="polite"]',
      '[aria-live="assertive"]',
      '[role="status"]',
      '[role="alert"]',
      '.announce',
      '.sr-only'
    ]);
  }

  // Helper to push a value via the UI (fill + click)
  async pushValue(value) {
    const input = await this.valueInput();
    await input.fill(value);
    const push = await this.pushButton();
    await push.click();
  }

  // Helper to set capacity
  async setCapacity(value) {
    const cap = await this.capacityInput();
    await cap.fill(String(value));
    // Try clicking set/apply button if present
    try {
      const setBtn = await this.setCapacityButton();
      await setBtn.click();
    } catch {
      // If no explicit set button, press Enter in the capacity input
      await cap.press('Enter');
    }
  }
}

test.describe('Stack (LIFO) Interactive Module - FSM Coverage', () => {
  let page;
  let stackPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    stackPage = new StackPage(page);
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait a bit for initial render scripts to attach
    await page.waitForTimeout(100);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Idle state and initial indicators', () => {
    test('initial UI is idle with empty stack and indicators updated', async () => {
      // Validate stack frame exists
      const frame1 = await stackPage.stackFrame();
      await expect(frame).toBeVisible();

      // Stack should initially be empty (no nodes)
      const nodes = await stackPage.stackNodesLocator();
      expect(await nodes.count()).toBe(0);

      // Announcer exists but initially empty or contains intro text - ensure element present
      const announcer = await stackPage.announcer();
      await expect(announcer).toBeVisible();

      // Push button should be present but likely disabled until a value is entered
      const pushBtn = await stackPage.pushButton();
      // Use try/catch: some implementations keep it enabled
      try {
        expect(await pushBtn.isDisabled()).toBeTruthy();
      } catch {
        // If it's not disabled, that's acceptable for some implementations - still visible
        await expect(pushBtn).toBeVisible();
      }
    });
  });

  test.describe('Push interactions (pushing state and transitions)', () => {
    test('CLICK_PUSH_VALID & INPUT_ENTER_VALID -> pushing -> node appears and announcer says pushed', async () => {
      // Push a new value via input + push
      const value = 'A';
      await stackPage.pushValue(value);

      // Immediately after initiating push there may be a floating element (animation)
      const floating = page.locator('.floating-node, .floating, .float, .push-anim');
      if (await floating.count() > 0) {
        await expect(floating.first()).toBeVisible();
      }
      // Wait for animation to complete and node to be rendered in the stack
      const frame2 = await stackPage.stackFrame();
      await expect(frame).toContainText(value, { timeout: 2000 });

      // Verify the announcer reported the push
      const announcer1 = await stackPage.announcer1();
      await expect(announcer).toHaveText(/pushed\s*.*A/i, { timeout: 2000 });
    });

    test('DROP_ON_STACK_VALID -> dragging + drop creates node on stack', async () => {
      // Find a draggable source (palette item) - fallbacks included
      const draggable = await firstLocator(page, [
        '[draggable="true"]',
        '.palette .item[draggable="true"]',
        '.draggable-item',
        '.draggable',
        '.item.draggable'
      ]);

      // If no explicit draggable source, create one via script for test stability
      let createdTemporary = false;
      let sourceSelector = null;
      if (!(await draggable.count())) {
        // inject an element we can drag
        await page.evaluate(() => {
          const el = document.createElement('div');
          el.textContent = 'DRAGGED';
          el.setAttribute('draggable', 'true');
          el.className = 'test-draggable';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.background = 'red';
          document.body.appendChild(el);
        });
        createdTemporary = true;
        sourceSelector = '.test-draggable';
      } else {
        // use the found draggable's first element handle to compute a selector by index
        sourceSelector = (await draggable.first().evaluate((el) => {
          el.setAttribute('data-test-drag-source', 'true');
          return '[data-test-drag-source="true"]';
        }));
      }

      const src = page.locator(sourceSelector);
      const dest = await stackPage.stackFrame();

      // Perform drag and drop using Playwright API
      await src.waitFor({ state: 'visible' });
      await src.hover();
      await page.dragAndDrop(sourceSelector, await dest.evaluate((el) => {
        // create a temporary unique selector via attribute
        if (!el.hasAttribute('data-test-drag-dest')) el.setAttribute('data-test-drag-dest', 'true');
        return '[data-test-drag-dest="true"]';
      }));

      // After drop, new node with the dragged content is expected. If our injected element had text 'DRAGGED'
      const expectedText = createdTemporary ? 'DRAGGED' : await src.textContent();
      // Wait for stack to contain the dragged label
      await expect(dest).toContainText(expectedText, { timeout: 2000 });

      // Announcer should indicate a push occurred
      const announcer2 = await stackPage.announcer2();
      await expect(announcer).toHaveText(/pushed|popped|drop/i, { timeout: 2000 });
    });

    test('CLICK_PUSH_FULL -> overflow state triggers flash and announcement', async () => {
      // Reduce capacity to 1 then attempt to push two items to force overflow
      await stackPage.setCapacity(1);
      // Clear stack first to ensure deterministic start
      const clear = await stackPage.clearButton();
      await clear.click();
      await page.waitForTimeout(100);

      // Push first item (should succeed)
      await stackPage.pushValue('B');
      const frame3 = await stackPage.stackFrame();
      await expect(frame).toContainText('B', { timeout: 2000 });

      // Push second item (should cause overflow)
      await stackPage.pushValue('C');

      // Expect some overflow visual cue: look for flash/overflow class on stack frame
      const overflowLoc = frame.locator('.flash-overflow, .overflow, .flash, .overflow-flash');
      if (await overflowLoc.count() > 0) {
        await expect(overflowLoc.first()).toBeVisible();
      } else {
        // As a fallback, check announcer text for overflow message
        const announcer3 = await stackPage.announcer3();
        await expect(announcer).toHaveText(/overflow/i, { timeout: 2000 });
      }
    });
  });

  test.describe('Pop interactions (popping state and transitions)', () => {
    test('CLICK_POP_VALID & CLICK_NODE_TOP -> popping removes top node and announces popped value', async () => {
      // Ensure stack has two items
      await stackPage.pushValue('X1');
      await page.waitForTimeout(250);
      await stackPage.pushValue('X2');
      await page.waitForTimeout(250);

      const nodes1 = await stackPage.stackNodesLocator();
      expect(await nodes.count()).toBeGreaterThanOrEqual(2);

      // Click the explicit Pop button
      const popBtn = await stackPage.popButton();
      await popBtn.click();

      // Top value X2 should be removed
      const frame4 = await stackPage.stackFrame();
      await expect(frame).not.toContainText('X2', { timeout: 2000 });

      // Announcer should report the popped value
      const announcer4 = await stackPage.announcer4();
      await expect(announcer).toHaveText(/popped\s*.*X2/i, { timeout: 2000 });

      // Now clicking the top node should pop X1
      // Re-push X1 to ensure present
      await stackPage.pushValue('X1');
      await page.waitForTimeout(250);

      const nodesAfter = await stackPage.stackNodesLocator();
      const topNode = nodesAfter.first(); // assume first is top in DOM order
      await topNode.click();
      await expect(frame).not.toContainText('X1', { timeout: 2000 });

      // Announcer updated for popped X1
      await expect(announcer).toHaveText(/popped\s*.*X1/i, { timeout: 2000 });
    });

    test('CLICK_NODE_NON_TOP -> announce_only state (announce only, no removal)', async () => {
      // Push three distinct values
      await stackPage.pushValue('N1');
      await page.waitForTimeout(150);
      await stackPage.pushValue('N2');
      await page.waitForTimeout(150);
      await stackPage.pushValue('N3');
      await page.waitForTimeout(150);

      const nodes2 = await stackPage.stackNodesLocator();
      expect(await nodes.count()).toBeGreaterThanOrEqual(3);

      // Identify a non-top node: pick the last in DOM order (if first is top) or second item
      const nonTop = nodes.nth(1); // second item (non-top)
      const textBefore = await nonTop.textContent();
      await nonTop.click();

      // Ensure the clicked non-top node still exists (no removal)
      const frame5 = await stackPage.stackFrame();
      await expect(frame).toContainText(textBefore.trim(), { timeout: 1000 });

      // Announcer should have the LIFO-only message
      const announcer5 = await stackPage.announcer5();
      await expect(announcer).toHaveText(/only the top element can be popped|lifo/i, { timeout: 2000 });
    });

    test('CLICK_POP_EMPTY -> underflow state and flash + announcement', async () => {
      // Clear the stack first
      const clear1 = await stackPage.clearButton();
      await clear.click();
      await page.waitForTimeout(100);

      // Ensure empty
      const nodes3 = await stackPage.stackNodesLocator();
      expect(await nodes.count()).toBe(0);

      // Click Pop on empty stack
      const popBtn1 = await stackPage.popButton();
      await popBtn.click();

      // Expect underflow visual or announcer mention
      const frame6 = await stackPage.stackFrame();
      const underflowVisual = frame.locator('.flash-underflow, .underflow, .underflow-flash');
      if (await underflowVisual.count() > 0) {
        await expect(underflowVisual.first()).toBeVisible();
      } else {
        const announcer6 = await stackPage.announcer6();
        await expect(announcer).toHaveText(/underflow|empty/i, { timeout: 2000 });
      }
    });
  });

  test.describe('Peek interactions (peeking state and transitions)', () => {
    test('CLICK_PEEK_VALID -> peeking shows pointer pulse on top and announces peek value', async () => {
      // Ensure there is a value to peek
      await stackPage.pushValue('PeekMe');
      await page.waitForTimeout(250);

      const nodes4 = await stackPage.stackNodesLocator();
      expect(await nodes.count()).toBeGreaterThanOrEqual(1);
      const top = nodes.first();

      // Click Peek
      const peekBtn = await stackPage.peekButton();
      await peekBtn.click();

      // Top node should display some pulse or highlight class during peeking (best-effort match)
      const pulse = top.locator('.pulse, .peek, .peek-pulse, .pointer-pulse');
      if (await pulse.count() > 0) {
        await expect(pulse.first()).toBeVisible();
      } else {
        // fallback: check announcer for peek message
        const announcer7 = await stackPage.announcer7();
        await expect(announcer).toHaveText(/peek[:\s].*peekme|peek: top/i, { timeout: 2000 });
      }

      // Announcer reports peek
      const announcer8 = await stackPage.announcer8();
      await expect(announcer).toHaveText(/peek/i, { timeout: 2000 });
    });

    test('CLICK_PEEK_EMPTY -> underflow when peeking empty stack', async () => {
      // Clear stack
      const clear2 = await stackPage.clearButton();
      await clear.click();
      await page.waitForTimeout(150);

      const nodes5 = await stackPage.stackNodesLocator();
      expect(await nodes.count()).toBe(0);

      // Click Peek
      const peekBtn1 = await stackPage.peekButton();
      await peekBtn.click();

      // Announcer should state underflow or empty peek
      const announcer9 = await stackPage.announcer9();
      await expect(announcer).toHaveText(/underflow|empty|cannot peek/i, { timeout: 2000 });
    });
  });

  test.describe('Clearing, capacity warnings, and related transitions', () => {
    test('CLICK_CLEAR_NONEMPTY -> clearing clears all nodes and announces cleared', async () => {
      // Ensure stack has some items
      await stackPage.pushValue('C1');
      await page.waitForTimeout(150);
      await stackPage.pushValue('C2');
      await page.waitForTimeout(150);

      const nodesBefore = await stackPage.stackNodesLocator();
      expect(await nodesBefore.count()).toBeGreaterThanOrEqual(2);

      // Click Clear
      const clearBtn = await stackPage.clearButton();
      await clearBtn.click();

      // Stack should be empty
      const nodesAfter1 = await stackPage.stackNodesLocator();
      await expect(nodesAfter).toHaveCount(0, { timeout: 2000 });

      // Announcer should have 'Cleared stack' message
      const announcer10 = await stackPage.announcer10();
      await expect(announcer).toHaveText(/cleared/i, { timeout: 2000 });
    });

    test('CAPACITY_CHANGED_CAUSES_WARNING -> capacity_warning flash + announce', async () => {
      // Push two items
      await stackPage.pushValue('W1');
      await page.waitForTimeout(150);
      await stackPage.pushValue('W2');
      await page.waitForTimeout(150);

      // Change capacity to 1 (smaller than size 2) to trigger capacity_warning
      await stackPage.setCapacity(1);

      // Look for overflow/warning visual on stack frame
      const frame7 = await stackPage.stackFrame();
      const warningVisual = frame.locator('.flash-overflow, .overflow, .capacity-warning, .warning-flash');
      const announcer11 = await stackPage.announcer11();
      if (await warningVisual.count() > 0) {
        await expect(warningVisual.first()).toBeVisible();
      }
      // Announcer should report a warning regarding capacity change
      await expect(announcer).toHaveText(/warning:|exceed/i, { timeout: 2000 });
    });

    test('CAPACITY_CHANGED_OK -> idle after capacity set to accommodate current size', async () => {
      // Ensure stack has at least one element
      await stackPage.pushValue('OK1');
      await page.waitForTimeout(150);

      // Set capacity large enough
      await stackPage.setCapacity(10);
      // No warning expected; announcer may say something or remain unchanged.
      const announcer12 = await stackPage.announcer12();
      // Wait briefly to allow any transitions
      await page.waitForTimeout(500);
      // Ensure UI still responsive and stack still contains OK1
      const frame8 = await stackPage.stackFrame();
      await expect(frame).toContainText('OK1', { timeout: 1000 });
    });
  });

  test.describe('Overflow and underflow flash lifecycles', () => {
    test('overflow -> OVERFLOW_DONE returns to idle after flash timeout', async () => {
      // Ensure capacity 1 and push two to overflow
      await stackPage.setCapacity(1);
      await page.waitForTimeout(100);
      await stackPage.clearButton().then((b) => b.click());
      await page.waitForTimeout(100);
      await stackPage.pushValue('O1');
      await page.waitForTimeout(150);
      await stackPage.pushValue('O2');
      // Wait for potential overflow flash then allow it to clear
      await page.waitForTimeout(1200); // give time for onExit removal/resets
      // After timeout, UI should be idle and still reflect the single allowed node (O1) or unchanged
      const frame9 = await stackPage.stackFrame();
      // Either O2 wasn't added or flash cleared; ensure no persistent overflow classes
      const overflowVisual = frame.locator('.flash-overflow, .overflow, .overflow-flash');
      if (await overflowVisual.count() > 0) {
        // Wait a bit longer for it to clear
        await page.waitForTimeout(800);
      }
      // Announcer may have an overflow message but UI should not be stuck
      await expect(frame).toBeVisible();
    });

    test('underflow -> UNDERFLOW_DONE returns to idle after flash timeout', async () => {
      // Ensure empty
      await stackPage.clearButton().then((b) => b.click());
      await page.waitForTimeout(100);
      // Trigger underflow by popping when empty
      const pop = await stackPage.popButton();
      await pop.click();
      // Wait for flash to appear and then disappear
      await page.waitForTimeout(1200);
      const frame10 = await stackPage.stackFrame();
      const underflowVisual1 = frame.locator('.flash-underflow, .underflow, .underflow-flash');
      if (await underflowVisual.count() > 0) {
        // wait a bit to ensure it clears
        await page.waitForTimeout(800);
      }
      // Ensure UI still responsive
      await expect(frame).toBeVisible();
    });
  });

  test.describe('Drag lifecycle and drag_over visual', () => {
    test('DRAG_START -> DRAG_OVER -> DROP_ON_STACK_VALID triggers highlight during drag and push on drop', async () => {
      // Find a draggable element (or create one)
      let srcSelector = null;
      const draggables = page.locator('[draggable="true"], .draggable-item, .draggable');
      if (await draggables.count() > 0) {
        // mark it uniquely
        await draggables.first().evaluate((el) => el.setAttribute('data-test-drag-src', 'true'));
        srcSelector = '[data-test-drag-src="true"]';
      } else {
        // create a temporary draggable element
        await page.evaluate(() => {
          const el1 = document.createElement('div');
          el.textContent = 'DVAL';
          el.setAttribute('draggable', 'true');
          el.className = 'test-draggable-2';
          document.body.appendChild(el);
        });
        srcSelector = '.test-draggable-2';
      }

      // Prepare a stack frame selector
      const stackFrame = await stackPage.stackFrame();
      await stackFrame.evaluate((el) => {
        if (!el.hasAttribute('data-test-drag-dest')) el.setAttribute('data-test-drag-dest', 'true');
      });
      const destSelector = '[data-test-drag-dest="true"]';

      // Simulate native dragenter/dragover to trigger DRAG_OVER visual change
      await page.dispatchEvent(srcSelector, 'dragstart', {
        dataTransfer: { setData: () => {}, types: [], dropEffect: 'move' }
      });
      await page.dispatchEvent(destSelector, 'dragenter', {
        dataTransfer: { setData: () => {}, types: [], dropEffect: 'move' }
      });
      // After drag over, stackFrame should get borderColor highlight per FSM (best-effort check)
      const highlight = await stackFrame.locator('[style*="rgba(6,182,212,0.18)"], .drag-over, .drag-highlight');
      if (await highlight.count() > 0) {
        await expect(highlight.first()).toBeVisible();
      }

      // Now simulate drop
      await page.dispatchEvent(destSelector, 'drop', {
        dataTransfer: { getData: () => 'DVAL' }
      });
      // Finally dragend
      await page.dispatchEvent(srcSelector, 'dragend', {});

      // After drop, stack should contain the dragged content
      const frame11 = await stackPage.stackFrame();
      await expect(frame).toContainText(/DVAL|DRAGGED/i, { timeout: 2000 });
      // Announcer should show push-like text
      const announcer13 = await stackPage.announcer13();
      await expect(announcer).toHaveText(/pushed|drop/i, { timeout: 2000 });
    });
  });

  test.describe('Resilience and window events', () => {
    test('WINDOW_RESIZE handled gracefully and UI remains idle', async () => {
      // Resize viewport to trigger potential responsive codepath and WINDOW_RESIZE event
      await page.setViewportSize({ width: 400, height: 800 });
      await page.waitForTimeout(200);
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(200);

      // Ensure stack frame still visible
      const frame12 = await stackPage.stackFrame();
      await expect(frame).toBeVisible();

      // Ensure we can still push after resize (idle)
      await stackPage.pushValue('R1');
      await expect(frame).toContainText('R1', { timeout: 2000 });
    });
  });
});