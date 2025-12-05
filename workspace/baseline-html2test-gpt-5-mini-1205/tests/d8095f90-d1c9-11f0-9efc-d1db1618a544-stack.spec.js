import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d8095f90-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object for the Stack demo to keep tests readable
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#valueInput');
    this.pushBtn = page.locator('#pushBtn');
    this.popBtn = page.locator('#popBtn');
    this.peekBtn = page.locator('#peekBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.fillBtn = page.locator('#fillBtn');

    this.arrayView = page.locator('#arrayView');
    this.sizeBadge = page.locator('#sizeBadge');
    this.peekBadge = page.locator('#peekBadge');
    this.lastOpBadge = page.locator('#lastOpBadge');
    this.stackVisual = page.locator('#stackVisual');
    this.log = page.locator('#log');
    this.liveRegion = page.locator('body > div[aria-live], div[aria-live]'); // live region appended to body
  }

  // Helper: push a value using the Push button (fills input then clicks)
  async pushValue(value) {
    await this.valueInput.fill(value);
    await this.pushBtn.click();
  }

  // Helper: press Enter in the input (triggers push)
  async pushValueByEnter(value) {
    await this.valueInput.fill(value);
    await this.valueInput.press('Enter');
  }

  async pop() {
    await this.popBtn.click();
  }

  async peek() {
    await this.peekBtn.click();
  }

  async clear() {
    await this.clearBtn.click();
  }

  async fillSample() {
    await this.fillBtn.click();
  }

  async pushRandom() {
    await this.randomBtn.click();
  }

  // Counts filled slots (non-empty stack elements)
  async filledSlotCount() {
    return await this.page.locator('.stack-slot.filled').count();
  }

  // Counts total slots (including empty placeholders)
  async totalSlotCount() {
    return await this.page.locator('#stackVisual .stack-slot').count();
  }

  // Get the text content of the top-most filled slot (if exists)
  async topFilledText() {
    // stack grows from bottom to top, but DOM inserts filled slots before empty ones.
    // The first .stack-slot.filled should be the topmost filled slot.
    const filled = this.page.locator('.stack-slot.filled').first();
    if (await filled.count() === 0) return null;
    return (await filled.textContent()).trim();
  }

  // Get latest log entry text (the first child of #log since they prepend)
  async latestLogText() {
    const first = this.log.locator('div').first();
    if (await first.count() === 0) return '';
    return (await first.textContent()).trim();
  }
}

test.describe('Interactive Stack Demo - end-to-end tests', () => {
  let consoleErrors;
  let pageErrors;

  // Setup: create fresh arrays to capture console/page errors for every test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console errors and page errors without modifying the page
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(BASE);
    // Wait for primary UI elements to be ready
    await page.waitForSelector('#stackVisual');
    await page.waitForSelector('#arrayView');
  });

  // Teardown: assert that no uncaught console / page errors were emitted during the test run
  test.afterEach(async () => {
    // Fail the test if there were page errors or console error messages
    expect(consoleErrors, `Expected no console.error messages, got: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Expected no page 'pageerror' events, got: ${JSON.stringify(pageErrors.map(e => String(e)))}`).toHaveLength(0);
  });

  test('Initial load displays empty stack with expected defaults', async ({ page }) => {
    // Verify initial UI state and default badges when the page first loads
    const sp = new StackPage(page);

    // arrayView should show an empty array
    await expect(sp.arrayView).toHaveText('[]');

    // Size badge should indicate 0
    await expect(sp.sizeBadge).toHaveText('Size: 0');

    // Peek badge should show placeholder '—'
    await expect(sp.peekBadge).toHaveText('Peek: —');

    // Last op badge should start with 'Last: —' text content (as per markup)
    await expect(sp.lastOpBadge).toHaveText(/Last: —|Last: —/);

    // There should be 8 total slots (maxSlots = 8) as placeholders
    const total = await sp.totalSlotCount();
    expect(total).toBe(8);

    // No filled slots initially
    const filled = await sp.filledSlotCount();
    expect(filled).toBe(0);

    // Live region for accessibility should exist (off-screen)
    const live = page.locator('div[aria-live="polite"]');
    await expect(live).toHaveCountGreaterThan(0);
  });

  test('Push with empty input logs an error and does not change stack size', async ({ page }) => {
    // Verify pushing with empty input produces an error-like message in the Operations log
    const sp = new StackPage(page);

    // Ensure input is empty
    await sp.valueInput.fill('');
    await sp.pushBtn.click();

    // Last operation should indicate a skipped push
    await expect(sp.lastOpBadge).toHaveText('Last: push skipped');

    // The log should contain 'Push skipped: empty input' in the latest entry
    const latest = await sp.latestLogText();
    expect(latest).toMatch(/Push skipped: empty input/);

    // Size must remain 0
    await expect(sp.sizeBadge).toHaveText('Size: 0');

    // No filled slots
    expect(await sp.filledSlotCount()).toBe(0);
  });

  test('Pushing values updates array view, size, peek and visual slots', async ({ page }) => {
    // Test pushing numeric and string values (via Enter and Push button)
    const sp = new StackPage(page);

    // Push a number using Enter key
    await sp.pushValueByEnter('42');

    // arrayView should reflect [42]
    await expect(sp.arrayView).toHaveText('[42]');

    // Size and Peek should update
    await expect(sp.sizeBadge).toHaveText('Size: 1');
    await expect(sp.peekBadge).toHaveText('Peek: 42');

    // One filled slot should be present and display '42'
    expect(await sp.filledSlotCount()).toBe(1);
    const topText = await sp.topFilledText();
    expect(topText).toBe('42');

    // Push a string that isn't valid JSON using the Push button
    await sp.pushValue('"hello"'); // This is valid JSON (string) -> JSON.parse yields hello (string)
    // Wait a tick for synchronous render
    await page.waitForTimeout(50);

    // Now arrayView should show [42,"hello"] (note JSON.stringify representation)
    await expect(sp.arrayView).toHaveText('[42,"hello"]');
    await expect(sp.sizeBadge).toHaveText('Size: 2');

    // Peek should be hello
    await expect(sp.peekBadge).toHaveText('Peek: hello');

    // Two filled slots
    expect(await sp.filledSlotCount()).toBe(2);

    // Latest log includes push(...) message; contains 'push(' substring
    const latestLog = await sp.latestLogText();
    expect(latestLog).toMatch(/push\(/);
  });

  test('Pop removes the top item and updates badges, log and visualization', async ({ page }) => {
    const sp = new StackPage(page);

    // Set up: push two values
    await sp.pushValue('1');
    await sp.pushValue('2');

    // Verify size is 2
    await expect(sp.sizeBadge).toHaveText('Size: 2');

    // Pop once
    await sp.pop();

    // After pop, size should be 1
    await expect(sp.sizeBadge).toHaveText('Size: 1');

    // Last operation badge should state 'Last: pop' (non-empty pop)
    await expect(sp.lastOpBadge).toHaveText('Last: pop');

    // The arrayView should reflect a single item [1]
    await expect(sp.arrayView).toHaveText('[1]');

    // The log should contain 'pop() ->' within the latest entry
    const latest = await sp.latestLogText();
    expect(latest).toMatch(/pop\(\) ->/);

    // There should be exactly 1 filled slot now
    expect(await sp.filledSlotCount()).toBe(1);
    const topText = await sp.topFilledText();
    expect(topText).toBe('1');
  });

  test('Peek inspects top without removing and logs appropriately', async ({ page }) => {
    const sp = new StackPage(page);

    // Ensure stack empty then push known values
    await sp.clear();
    await sp.pushValue('100');
    await sp.pushValue('200');

    // Size should be 2
    await expect(sp.sizeBadge).toHaveText('Size: 2');

    // Peek action
    await sp.peek();

    // Size should remain unchanged
    await expect(sp.sizeBadge).toHaveText('Size: 2');

    // Last op should be 'Last: peek'
    await expect(sp.lastOpBadge).toHaveText('Last: peek');

    // Latest log entry should contain 'peek() -> 200'
    const latest = await sp.latestLogText();
    expect(latest).toMatch(/peek\(\) -> .*200/);
  });

  test('Clear empties the stack and updates UI elements', async ({ page }) => {
    const sp = new StackPage(page);

    // Fill sample to create content
    await sp.fillSample();

    // Ensure size > 0
    const sizeTextBefore = await sp.sizeBadge.textContent();
    expect(sizeTextBefore).toMatch(/Size: \d+/);
    expect(parseInt(sizeTextBefore.replace('Size: ', ''), 10)).toBeGreaterThan(0);

    // Clear the stack
    await sp.clear();

    // Size should be 0 and arrayView show '[]'
    await expect(sp.sizeBadge).toHaveText('Size: 0');
    await expect(sp.arrayView).toHaveText('[]');

    // Last op should indicate clear
    await expect(sp.lastOpBadge).toHaveText('Last: clear');

    // No filled slots remain
    expect(await sp.filledSlotCount()).toBe(0);
  });

  test('Fill sample pushes multiple items and updates badges and array view', async ({ page }) => {
    const sp = new StackPage(page);

    // Clear first to guarantee predictable state
    await sp.clear();

    // Use the fill sample button
    await sp.fillSample();

    // The sample in code is [1,2,3,{"name":"Alice"},"hello"] -> JSON.stringify yields: [1,2,3,{"name":"Alice"},"hello"]
    // Check size badge shows 5
    await expect(sp.sizeBadge).toHaveText('Size: 5');

    // Array view should start with "[1,2,3" substring
    const arrayText = await sp.arrayView.textContent();
    expect(arrayText).toContain('[1,2,3');

    // Last operation should be 'Last: fill'
    await expect(sp.lastOpBadge).toHaveText('Last: fill');

    // There should be 5 filled slots
    expect(await sp.filledSlotCount()).toBe(5);
  });

  test('Push Random increases size and sets last operation to push (random)', async ({ page }) => {
    const sp = new StackPage(page);

    // Clear to start at 0 size
    await sp.clear();
    await expect(sp.sizeBadge).toHaveText('Size: 0');

    // Click random push
    await sp.pushRandom();

    // Size should be at least 1
    const sizeText = await sp.sizeBadge.textContent();
    expect(parseInt(sizeText.replace('Size: ', ''), 10)).toBeGreaterThanOrEqual(1);

    // Last op indicates random push
    await expect(sp.lastOpBadge).toHaveText(/Last: push \(random\)/);
  });

  test('Operations log keeps entries and live region updates for accessibility', async ({ page }) => {
    const sp = new StackPage(page);

    // Clear then do a push and peek to generate logs
    await sp.clear();
    await sp.pushValue('7');
    await sp.peek();

    // The log should have at least two entries (peek and push) - check that the latest contains 'peek()' and earlier contains 'push('
    const latest = await sp.latestLogText();
    expect(latest).toMatch(/peek\(\) ->|peek\(\) -> undefined|peek\(\) ->/);

    // The second entry (next child) should include push
    const second = sp.log.locator('div').nth(1);
    if ((await second.count()) > 0) {
      const secondText = (await second.textContent()).trim();
      expect(secondText).toMatch(/push\(/);
    }

    // Live region exists and should reflect the most recent logged message (appended by wrappedLog)
    // The live region is appended off-screen; ensure it exists and contains some text content
    const liveLocator = page.locator('div[aria-live="polite"]');
    await expect(liveLocator).toHaveCountGreaterThan(0);
    const liveText = await liveLocator.first().textContent();
    expect(liveText.trim().length).toBeGreaterThan(0);
  });
});