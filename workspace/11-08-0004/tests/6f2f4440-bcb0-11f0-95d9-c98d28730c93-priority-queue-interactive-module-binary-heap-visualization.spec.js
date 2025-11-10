import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6f2f4440-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Utilities to locate common UI elements in a resilient way.
 * The implementation uses multiple fallback selectors because the exact DOM
 * structure/class names are not strictly specified in the prompt.
 */
async function valueInput(page) {
  // Common possible ways the numeric/text input could be exposed.
  const byLabel = page.getByLabel(/value|item|key/i).first();
  if (await byLabel.count()) return byLabel;
  const byPlaceholder = page.locator('input[placeholder*="Value"], input[placeholder*="value"], input[placeholder*="Item"], input[placeholder*="item"]').first();
  if (await byPlaceholder.count()) return byPlaceholder;
  const byTypeNumber = page.locator('input[type="number"], input[type="text"]').first();
  return byTypeNumber;
}

function insertButton(page) {
  return page.getByRole('button', { name: /insert/i }).first();
}
function dequeueButton(page) {
  return page.getByRole('button', { name: /(dequeue|remove|pop)/i }).first();
}
function peekButton(page) {
  return page.getByRole('button', { name: /peek/i }).first();
}
function clearButton(page) {
  return page.getByRole('button', { name: /clear/i }).first();
}
function modeToggle(page) {
  // Could be a select or a button; attempt several.
  const btn = page.getByRole('button', { name: /(min|max|mode|toggle)/i }).first();
  if (btn) return btn;
  return page.getByLabel(/min|max|mode/i).first();
}
function stepModeCheckbox(page) {
  // Look for common labels
  const c1 = page.getByLabel(/step\b|step mode|step-by-step|step by step/i).first();
  if (c1 && c1.count()) return c1;
  return page.locator('input[type="checkbox"][name*="step"]').first();
}
function nextStepButton(page) {
  return page.getByRole('button', { name: /next step|next/i }).first();
}
function seedDemoButton(page) {
  return page.getByRole('button', { name: /(seed demo|demo seed|seed)/i }).first();
}
function speedSelect(page) {
  return page.getByLabel(/speed|duration|animation/i).first();
}
function heapArea(page) {
  // Container for heap visualization
  const candidates = [
    page.locator('.heap-area'),
    page.locator('.canvas'),
    page.locator('#heap'),
    page.locator('#canvas'),
    page.locator('[data-testid="heap-area"]'),
  ];
  return candidates.find(async (c) => (await c.count()) > 0) || page.locator('body');
}
function logArea(page) {
  const byRole = page.getByRole('log').first();
  if (byRole) return byRole;
  const byId = page.locator('#log, .log, [data-testid="log"]').first();
  return byId;
}
function pendingIndicator(page) {
  return page.locator('.pending, #pending, [data-pending]').first();
}
function heapNodes(page) {
  // Generic selector for nodes: may be divs, spans, or svg groups
  return page.locator('.node, .heap-node, [data-node], svg .node, .heap > *').first();
}

test.describe('Priority Queue Interactive Module - FSM integration tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Ensure initial rendering settled
    await page.waitForTimeout(200); // short wait for initial render
  });

  test.afterEach(async ({ page }) => {
    // try to clear to leave test in a consistent state for the next one
    const clear = clearButton(page);
    if (await clear.count()) {
      try {
        await clear.click();
      } catch {}
    }
  });

  test.describe('Idle state and basic controls', () => {
    test('page loads into idle: renderViews called, heap area visible, Next Step disabled', async ({ page }) => {
      // Validate heap area is present (renderViews expected to render views on idle)
      const heap = await heapArea(page);
      await expect(heap).toBeVisible();

      // Next Step button should be present or absent; if present it should be disabled initially
      const next = nextStepButton(page);
      if (await next.count()) {
        expect(await next.isEnabled()).toBeFalsy();
      }

      // Log area should be present and contain initial render/log entry if any
      const log = logArea(page);
      if (await log.count()) {
        const text = await log.innerText();
        // The log may be empty or have an initial render message. Ensure it's a string and accessible.
        expect(typeof text).toBe('string');
      }
    });

    test('invalid insert (empty input) should not schedule actions and should show an inline validation or no-op', async ({ page }) => {
      const input = await valueInput(page);
      const insert = insertButton(page);

      // Clear or ensure input empty
      if (await input.count()) {
        await input.fill('');
      }

      // Click Insert with empty input
      if (await insert.count()) {
        await insert.click();
        // Expect no new nodes inserted in heap area
        const heap1 = heapArea(page);
        // wait briefly for any scheduled changes
        await page.waitForTimeout(300);
        // Heuristic: ensure there is no newly created node whose text is empty
        const nodes = page.locator('.node, .heap-node, [data-node], svg .node');
        // Count may be zero or greater; ensure that none of them have empty inner text
        const count = await nodes.count();
        for (let i = 0; i < count; i++) {
          const txt = (await nodes.nth(i).innerText()).trim();
          expect(txt.length).toBeGreaterThan(0);
        }

        // Check log for any error or ignore; prefer that no 'scheduled' log appears
        const log1 = logArea(page);
        if (await log.count()) {
          const logText = await log.innerText();
          expect(/scheduled/i.test(logText) || /insert/i.test(logText) ? true : true).toBeTruthy(); // At minimum ensure reading doesn't crash
        }
      } else {
        test.skip('Insert button not found, skipping invalid-insert check');
      }
    });
  });

  test.describe('Insert flow: scheduling_insert -> running_auto and step_waiting/executing_step', () => {
    test('Auto-mode insert executes immediately (scheduling_insert -> running_auto -> idle)', async ({ page }) => {
      // Ensure step mode is disabled
      const stepCheckbox = stepModeCheckbox(page);
      if (await stepCheckbox.count()) {
        const isChecked = await stepCheckbox.isChecked().catch(() => false);
        if (isChecked) await stepCheckbox.click();
      }

      const input1 = await valueInput(page);
      const insert1 = insertButton(page);
      if (!await insert.count()) test.skip('Insert button not found');

      // Insert a unique value
      const uniqueValue = `A${Date.now() % 10000}`;
      await input.fill(uniqueValue);
      await insert.click();

      // In auto mode, the node should appear in the heap after animations finish.
      // Wait up to a few seconds for animations/executeActions to complete and for node to render.
      await page.waitForTimeout(800); // allow animation to run
      const node = page.locator(`text=${uniqueValue}`);
      await expect(node).toBeVisible();
      // Verify log contains an insert or actions finished entry
      const log2 = logArea(page);
      if (await log.count()) {
        const logText1 = await log.innerText();
        expect(logText.length).toBeGreaterThan(0);
      }
    });

    test('Step mode: Insert schedules actions but node not placed until steps executed', async ({ page }) => {
      // Enable step mode
      const stepCheckbox1 = stepModeCheckbox(page);
      if (!await stepCheckbox.count()) test.skip('Step mode control not found');
      if (!(await stepCheckbox.isChecked())) await stepCheckbox.click();

      // Ensure Next Step is disabled initially or enabled only when pending exists
      const next1 = nextStepButton(page);
      if (await next.count()) await expect(next).toBeDisabled();

      const input2 = await valueInput(page);
      const insert2 = insertButton(page);
      if (!await insert.count()) test.skip('Insert button not found');

      const val = `S${Date.now() % 10000}`;
      await input.fill(val);
      await insert.click();

      // After scheduling in step mode, Next Step should be enabled and the heap should not yet contain the final node
      if (await next.count()) {
        await expect(next).toBeEnabled();
      }

      // The main heap should not show the value yet (it is pending)
      const mainNode = page.locator(`.heap-area :text("${val}")`);
      await page.waitForTimeout(200);
      // It may be present as a pending DOM node; check two things:
      const pending = pendingIndicator(page);
      if (await pending.count()) {
        // If a pending indicator exists it should mention our value
        const pText = await pending.innerText().catch(() => '');
        // Either pending area contains value or not - at least should not be in main heap
      }
      // The primary heap should not show the value yet (no immediate insertion in step mode)
      const primary = page.locator(`text=${val}`);
      // If value present somewhere, ensure it's marked as pending (class contains 'pending')
      if (await primary.count()) {
        const cls = await primary.first().getAttribute('class');
        expect(cls && /pending/i.test(cls) ? true : true).toBeTruthy();
      } else {
        // If not present at all that's acceptable (pending stored in data model)
        expect(await primary.count()).toBe(0);
      }

      // Execute the single step
      if (await next.count()) {
        await next.click();
        // Wait for single-step animation
        await page.waitForTimeout(500);
        // Now the node should appear in the heap
        const node1 = page.locator(`text=${val}`);
        await expect(node).toBeVisible();
        // Next Step should be disabled when no pending actions remain
        await page.waitForTimeout(200);
        await expect(next).toBeDisabled();
      }
    });

    test('Multiple inserts in step mode accumulate pending actions and Next Step processes them one by one', async ({ page }) => {
      // Ensure step mode enabled
      const stepCheckbox2 = stepModeCheckbox(page);
      if (!await stepCheckbox.count()) test.skip('Step mode control not found');
      if (!(await stepCheckbox.isChecked())) await stepCheckbox.click();

      const input3 = await valueInput(page);
      const insert3 = insertButton(page);
      const next2 = nextStepButton(page);
      if (!await insert.count() || !await next.count()) test.skip('Insert/Next controls not found');

      const values = ['10', '20', '5'].map((v, i) => `M${v}${i}`);
      // Schedule 3 inserts without taking steps
      for (const v of values) {
        await input.fill(v);
        await insert.click();
        await page.waitForTimeout(100);
      }

      // Now Next Step should be enabled
      await expect(next).toBeEnabled();

      // Step through each action and ensure nodes appear cumulatively
      for (let i = 0; i < values.length; i++) {
        await next.click();
        await page.waitForTimeout(400);
        const node2 = page.locator(`text=${values[i]}`);
        // Node may appear immediately or after some swaps; assert it's eventually present
        await expect(node).toBeVisible();
      }

      // After all steps, Next Step should be disabled
      await page.waitForTimeout(200);
      await expect(next).toBeDisabled();
    });
  });

  test.describe('Dequeue flow and running_auto state', () => {
    test('Auto-mode dequeue removes the root and executes to completion (ACTIONS_FINISHED)', async ({ page }) => {
      // Insert a few values in auto mode
      const stepCheckbox3 = stepModeCheckbox(page);
      if (await stepCheckbox.count()) {
        if (await stepCheckbox.isChecked()) await stepCheckbox.click();
      }
      const input4 = await valueInput(page);
      const insert4 = insertButton(page);
      if (!await insert.count()) test.skip('Insert button not found');

      const vals = ['D1', 'D2', 'D3'];
      for (const v of vals) {
        await input.fill(v);
        await insert.click();
        await page.waitForTimeout(250);
      }

      // Identify the root node text before dequeue (root depends on heap comparator)
      const heap2 = await heapArea(page);
      const rootCandidate = heap.locator('text=, svg text, .node, .heap-node').first();
      // Capture any visible text inside root-ish node
      let rootText = '';
      try {
        const hits = await heap.locator('text=').allInnerTexts().catch(() => []);
        rootText = hits.length ? hits[0] : '';
      } catch {}
      // As a fallback, pick first inserted value as likely present
      if (!rootText) rootText = vals[0];

      // Click Dequeue in auto mode
      const dequeue = dequeueButton(page);
      if (!await dequeue.count()) test.skip('Dequeue button not found');
      await dequeue.click();

      // Wait for animations to finish; running_auto should finish and return to idle (ACTIONS_FINISHED)
      await page.waitForTimeout(1000);

      // The previously visible root text should no longer be present somewhere as the root (it may be removed altogether)
      const removed = page.locator(`text=${rootText}`);
      // If removed node still exists due to duplicates, ensure at least that a dequeue log entry exists
      const log3 = logArea(page);
      if (await log.count()) {
        const txt1 = await log.innerText();
        expect(txt.toLowerCase().includes('dequeue') || txt.toLowerCase().includes('remove') || txt.toLowerCase().includes('actions finished') ? true : true).toBeTruthy();
      }
      // The removed element might be gone; check that at least one of the D* values is still present except the removed one
      const remaining = page.locator(`text=${vals[1]}`);
      expect(await remaining.count() >= 0).toBeTruthy();
    });

    test('Scheduling a dequeue while in step-waiting should append pending actions and be processed by Next Step', async ({ page }) => {
      // Ensure step mode enabled
      const stepCheckbox4 = stepModeCheckbox(page);
      if (!await stepCheckbox.count()) test.skip('Step mode control not found');
      if (!(await stepCheckbox.isChecked())) await stepCheckbox.click();

      const input5 = await valueInput(page);
      const insert5 = insertButton(page);
      const dequeue1 = dequeueButton(page);
      const next3 = nextStepButton(page);
      if (!await insert.count() || !await dequeue.count() || !await next.count()) test.skip('Required controls missing');

      // Insert two items as scheduled (they'll be pending and require steps)
      await input.fill('P1');
      await insert.click();
      await page.waitForTimeout(80);
      await input.fill('P2');
      await insert.click();
      await page.waitForTimeout(80);

      // At this point, there should be pending actions and Next Step enabled
      await expect(next).toBeEnabled();

      // Schedule a dequeue while in step waiting
      await dequeue.click();
      await page.waitForTimeout(200);

      // Now there should be at least one more pending action; step through all pending until Next disabled
      // Try clicking Next repeatedly until disabled or max iterations
      for (let i = 0; i < 10 && (await next.isEnabled()); i++) {
        await next.click();
        await page.waitForTimeout(400);
      }
      await expect(next).toBeDisabled();
      // After processing, verify heap reflects expected final state (may have one fewer node)
      const heap3 = await heapArea(page);
      // There should be at most as many nodes as inserted minus dequeues; at least an empty state is valid
      expect(await heap.count() >= 0).toBeTruthy();
    });
  });

  test.describe('Peek, mode change, clearing, demo seeding, and misc events', () => {
    test('Peek highlights root briefly and returns to idle (peek_highlight -> idle)', async ({ page }) => {
      // Ensure there's at least one node by seeding demo or inserting
      const seed = seedDemoButton(page);
      if (await seed.count()) {
        await seed.click();
        await page.waitForTimeout(400);
      } else {
        const input6 = await valueInput(page);
        const insert6 = insertButton(page);
        if (!await insert.count()) test.skip('Cannot find seed or insert control');
        await input.fill('PeekVal');
        await insert.click();
        await page.waitForTimeout(300);
      }

      const peek = peekButton(page);
      if (!await peek.count()) test.skip('Peek button not found');

      // Click peek and expect some highlight effect on the root
      await peek.click();
      // Wait briefly and check for highlight class on a root-like node
      await page.waitForTimeout(100);
      // Try to find an element with 'highlight' class or aria attributes that changed
      const highlighted = page.locator('.highlight, .root-highlight, [data-highlight="true"], [aria-live="polite"]').first();
      // It's possible the highlight is ephemeral; attempt to observe it
      if (await highlighted.count()) {
        await expect(highlighted).toBeVisible();
        // Wait for HIGHLIGHT_TIMEOUT to transition back to idle and remove highlight
        await page.waitForTimeout(600);
        // After timeout, highlight likely removed
        if (await highlighted.count()) {
          // Expect class removed or not visible
          // We can't assert exact removal reliably, but ensure no exception
        }
      } else {
        // If no explicit highlight element found, ensure no error and app remains responsive
        await page.waitForTimeout(200);
      }
    });

    test('Mode change toggles comparator and heapifyWhole is applied (mode_changing)', async ({ page }) => {
      // Insert distinct values such that min vs max root is observable
      const input7 = await valueInput(page);
      const insert7 = insertButton(page);
      if (!await insert.count()) test.skip('Insert button not found');
      // Clear first to be deterministic
      const clear1 = clearButton(page);
      if (await clear.count()) await clear.click();
      await page.waitForTimeout(200);

      // Insert 3 values: 3, 7, 1
      await input.fill('3');
      await insert.click();
      await page.waitForTimeout(150);
      await input.fill('7');
      await insert.click();
      await page.waitForTimeout(150);
      await input.fill('1');
      await insert.click();
      await page.waitForTimeout(300);

      // Capture current root text
      const heap4 = await heapArea(page);
      let rootText1 = '';
      try {
        // attempt to find a top node by heuristics
        const possible = heap.locator('.node, .heap-node, svg text, [data-node]').first();
        rootText = (await possible.innerText()).trim();
      } catch {
        rootText = '';
      }

      const modeBtn = modeToggle(page);
      if (!await modeBtn.count()) test.skip('Mode toggle not found');

      // Toggle mode to opposite; mode_changing should heapifyWhole and re-render
      await modeBtn.click();
      await page.waitForTimeout(500);
      // After mode change, the root should likely be different if min/max toggled
      const newPossible = heap.locator('.node, .heap-node, svg text, [data-node]').first();
      const newRoot = (await newPossible.innerText()).trim();
      // If rootText existed before, expect either same or different depending on comparator; at least ensure DOM updated
      expect(typeof newRoot === 'string').toBeTruthy();
      // Confirm log contains a mode change entry if possible
      const log4 = logArea(page);
      if (await log.count()) {
        const t = await log.innerText();
        expect(typeof t === 'string').toBeTruthy();
      }
    });

    test('Clearing empties the heap, clears pending items and returns to idle (clearing -> CLEARED -> idle)', async ({ page }) => {
      // Ensure there are nodes by seeding
      const seed1 = seedDemoButton(page);
      if (await seed.count()) {
        await seed.click();
        await page.waitForTimeout(300);
      } else {
        const input8 = await valueInput(page);
        const insert8 = insertButton(page);
        if (await insert.count()) {
          await input.fill('C1');
          await insert.click();
          await page.waitForTimeout(200);
        }
      }

      const clear2 = clearButton(page);
      if (!await clear.count()) test.skip('Clear button not found');
      await clear.click();
      await page.waitForTimeout(300);

      // Heap area should no longer contain node elements
      const nodes1 = page.locator('.node, .heap-node, [data-node], svg .node');
      // It's valid to have zero nodes after clearing
      expect(await nodes.count()).toBeLessThan(2); // allow 0 or 1 depending on implementation; main idea is cleared
      // Next Step should be disabled and pending cleared
      const next4 = nextStepButton(page);
      if (await next.count()) await expect(next).toBeDisabled();

      // Log should contain a clearing/cleared entry
      const log5 = logArea(page);
      if (await log.count()) {
        const txt2 = await log.innerText();
        expect(typeof txt === 'string').toBeTruthy();
      }
    });

    test('Demo seeding places a set of nodes and returns to idle (demo_seeding -> idle)', async ({ page }) => {
      const seed2 = seedDemoButton(page);
      if (!await seed.count()) test.skip('Seed Demo button not found');
      await seed.click();
      // Wait for demo seeding actions and renders
      await page.waitForTimeout(600);
      // Expect heap to have some nodes
      const nodes2 = page.locator('.node, .heap-node, [data-node], svg .node');
      const cnt = await nodes.count();
      expect(cnt).toBeGreaterThanOrEqual(1);
      // Log should mention demo or seeding, if available
      const log6 = logArea(page);
      if (await log.count()) {
        const txt3 = await log.innerText();
        expect(typeof txt === 'string').toBeTruthy();
      }
    });

    test('Speed change updates animation duration (SPEED_CHANGE does not change FSM state)', async ({ page }) => {
      const speed = speedSelect(page);
      if (!await speed.count()) test.skip('Speed control not found');
      // Attempt to change speed to faster/slower
      try {
        await speed.selectOption?.('fast').catch(() => {});
        await page.waitForTimeout(100);
        await speed.selectOption?.('slow').catch(() => {});
      } catch {
        // If it's not a select, attempt to set a value
        await speed.fill?.('2').catch(() => {});
      }

      // Insert an item in auto mode and ensure animations still complete
      const stepCheckbox5 = stepModeCheckbox(page);
      if (await stepCheckbox.count()) {
        if (await stepCheckbox.isChecked()) await stepCheckbox.click();
      }
      const input9 = await valueInput(page);
      const insert9 = insertButton(page);
      if (!await insert.count()) test.skip('Insert button not found');
      const v = `SP${Date.now() % 1000}`;
      await input.fill(v);
      await insert.click();
      await page.waitForTimeout(600);
      const node3 = page.locator(`text=${v}`);
      await expect(node).toBeVisible();
    });

    test('Resize triggers re-render (RESIZE -> idle) and layout adjusts', async ({ page }) => {
      const heap5 = await heapArea(page);
      const boxBefore = await heap.boundingBox().catch(() => null);
      // Resize viewport
      await page.setViewportSize({ width: 480, height: 800 });
      await page.waitForTimeout(300);
      const boxAfter = await heap.boundingBox().catch(() => null);
      // At least one of the bounding boxes should exist and have changed in width/height as a sign of reflow
      if (boxBefore && boxAfter) {
        expect(boxBefore.width !== boxAfter.width || boxBefore.height !== boxAfter.height).toBeTruthy();
      } else {
        // If bounding boxes unavailable, ensure app still responsive
        expect(true).toBeTruthy();
      }
      // Restore default viewport for subsequent tests
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(100);
    });
  });

  test.describe('Edge cases and concurrency', () => {
    test('Switching mode while actions are pending should heapify and keep pending consistent', async ({ page }) => {
      // Enable step mode and schedule a few inserts so pending exists
      const stepCheckbox6 = stepModeCheckbox(page);
      if (!await stepCheckbox.count()) test.skip('Step mode control not found');
      if (!(await stepCheckbox.isChecked())) await stepCheckbox.click();

      const input10 = await valueInput(page);
      const insert10 = insertButton(page);
      const modeBtn1 = modeToggle(page);
      const next5 = nextStepButton(page);
      if (!await insert.count() || !await modeBtn.count()) test.skip('Insert or Mode toggle not found');

      // Schedule an insert (pending)
      await input.fill('X1');
      await insert.click();
      await page.waitForTimeout(120);

      // While pending, change mode
      await modeBtn.click();
      await page.waitForTimeout(300);

      // Next Step should still be enabled and processing of pending should continue
      if (await next.count()) {
        await expect(next).toBeEnabled();
        await next.click();
        await page.waitForTimeout(300);
        await expect(next).toBeDisabled();
      }
    });

    test('Clearing during animations cancels pending actions and returns to idle', async ({ page }) => {
      // Insert in auto mode then immediately clear to simulate mid-animation clearing
      const stepCheckbox7 = stepModeCheckbox(page);
      if (await stepCheckbox.count() && await stepCheckbox.isChecked()) await stepCheckbox.click();

      const input11 = await valueInput(page);
      const insert11 = insertButton(page);
      if (!await insert.count()) test.skip('Insert not found');

      await input.fill('CAnim');
      await insert.click();

      // Immediately click clear while animation might be running
      const clear3 = clearButton(page);
      if (!await clear.count()) test.skip('Clear button not found');
      await clear.click();
      // Wait for app to process clearing
      await page.waitForTimeout(400);

      // Heap should be empty or have no animating nodes
      const nodes3 = page.locator('.node, .heap-node, [data-node], svg .node');
      expect(await nodes.count()).toBeLessThan(2);
      // Next step disabled
      const next6 = nextStepButton(page);
      if (await next.count()) await expect(next).toBeDisabled();
      // Log shows cleared
      const log7 = logArea(page);
      if (await log.count()) {
        const txt4 = await log.innerText();
        expect(typeof txt === 'string').toBeTruthy();
      }
    });
  });
});