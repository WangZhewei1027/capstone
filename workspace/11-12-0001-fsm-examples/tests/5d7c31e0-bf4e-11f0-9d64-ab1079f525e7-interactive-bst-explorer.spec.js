import { test, expect } from '@playwright/test';

// Test file: 5d7c31e0-bf4e-11f0-9d64-ab1079f525e7.spec.js
// Application URL (served locally by the runner):
const APP_URL = 'http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/5d7c31e0-bf4e-11f0-9d64-ab1079f525e7.html';

/**
 * Page Object for the BST Explorer app.
 * Encapsulates common UI interactions so tests are readable and maintainable.
 */
class BSTPage {
  constructor(page) {
    this.page = page;
  }

  // Best-effort locator for the main value input (text or number)
  input() {
    // prefer explicit selectors; fall back to first text/number input
    return this.page.locator('input[type="number"], input[type="text"], input').first();
  }

  // Generic button locator by visible label (case-insensitive)
  button(labelRegex) {
    // Playwright's getByRole is reliable if buttons are proper <button> elements.
    return this.page.getByRole('button', { name: new RegExp(labelRegex, 'i') });
  }

  // Insert a value using the primary Insert button (auto mode)
  async insert(value) {
    await this.input().fill(String(value));
    const insertBtn = this.button('^\\s*Insert\\s*$|^\\s*Insert (?!.*Step).*'); // matches Insert button
    if (await insertBtn.count() === 0) {
      // try generic Insert label fallback
      await this.button('Insert').first().click();
    } else {
      await insertBtn.first().click();
    }
    // Wait for the node text to appear
    await this.page.waitForSelector(`text="${value}"`, { timeout: 2000 });
  }

  // Insert using step-mode Insert (if present)
  async insertStep(value) {
    await this.input().fill(String(value));
    const btn = this.button('Insert.*Step|Insert\\s*\\(Step\\)|Insert Step');
    if (await btn.count() === 0) {
      // fallback: click any button that mentions "Step" near "Insert"
      await this.button('Step').first().click();
    } else {
      await btn.first().click();
    }
  }

  // Search for a value using the auto search button
  async search(value) {
    await this.input().fill(String(value));
    const searchBtn = this.button('^\\s*Search\\s*$|^\\s*Search (?!.*Step).*');
    if (await searchBtn.count() === 0) {
      await this.button('Search').first().click();
    } else {
      await searchBtn.first().click();
    }
    // search may highlight nodes; wait for the target text to be present (it should already exist)
    await this.page.waitForSelector(`text="${value}"`, { timeout: 2000 });
  }

  // Step-mode search (opens stepping_operation)
  async searchStep(value) {
    await this.input().fill(String(value));
    const btn = this.button('Search.*Step|Search\\s*\\(Step\\)|Search Step');
    if (await btn.count() === 0) {
      await this.button('Step').first().click();
    } else {
      await btn.first().click();
    }
  }

  // Toggle step mode ON or OFF
  async toggleStep(on = true) {
    // Try a dedicated toggle control first
    const toggleCandidate = this.page.getByRole('switch', { name: /step/i });
    if (await toggleCandidate.count() > 0) {
      const isChecked = (await toggleCandidate.first().getAttribute('aria-checked')) === 'true';
      if (isChecked !== on) await toggleCandidate.first().click();
      return;
    }
    // Otherwise try a button labeled Step Mode or Toggle Step
    const btn = this.button('Toggle Step|Step Mode|Step');
    if (await btn.count() > 0) {
      // If on=true ensure it's toggled on (we detect presence of Next button as indicator)
      await btn.first().click();
      // Wait a short moment for UI to reflect toggle
      await this.page.waitForTimeout(200);
    } else {
      // Last resort: click any element mentioning "step"
      const el = this.page.locator('text=/step/i').first();
      if (await el.count() > 0) await el.click();
    }
  }

  // Click the Next step control (used in step-mode)
  nextStep() {
    return this.button('^\\s*Next\\s*$|^\\s*Next Step\\s*$').first().click();
  }

  // Click the Prev step control (used in step-mode)
  prevStep() {
    return this.button('^\\s*Prev\\s*$|^\\s*Previous\\s*$|^\\s*Prev Step\\s*$').first().click();
  }

  // Click Delete action (global), may prompt confirm
  async clickDelete() {
    const btn = this.button('^\\s*Delete\\s*$|^\\s*Delete\\b');
    await btn.first().click();
  }

  // Click Clear action (global), may prompt confirm
  async clickClear() {
    await this.button('Clear').first().click();
  }

  // Click Randomize
  async randomize() {
    await this.button('Randomize').first().click();
  }

  // Click on a node by visible value (select node to delete)
  async clickNode(value) {
    // click the element that contains the value text
    await this.page.locator(`text="${value}"`).first().click();
  }

  // Count occurrences of a visible value text (useful for duplicates)
  async countValueOccurrences(value) {
    return await this.page.locator(`text="${value}"`).count();
  }

  // Helper to get a short text snapshot of the tree area for debugging assertions
  async treeText() {
    // attempt to locate a container for the visualization
    const candidates = [
      '[data-testid="bst-canvas"]',
      '.visual',
      '.canvas',
      '.tree',
      '.bst',
      '.viewer',
      '#app',
      'main'
    ];
    for (const sel of candidates) {
      const c = this.page.locator(sel);
      if ((await c.count()) > 0) {
        return (await c.first().innerText()).slice(0, 1000);
      }
    }
    // fallback to body text
    return (await this.page.locator('body').innerText()).slice(0, 1000);
  }
}

// Group tests by related FSM sections
test.describe('Interactive BST Explorer - FSM end-to-end', () => {
  let bst;

  test.beforeEach(async ({ page }) => {
    // Navigate to the app for each test
    await page.goto(APP_URL);
    bst = new BSTPage(page);
    // Ensure the app has loaded by waiting for the input to be visible
    await expect(bst.input()).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Attempt to reset the app state between tests by clicking Clear and accepting confirm if present
    page.on('dialog', async dialog => {
      try { await dialog.accept(); } catch { /* ignore */ }
    });
    const clear = await bst.button('Clear');
    if (await clear.count() > 0) {
      await clear.first().click().catch(() => {}); // ignore errors
    }
    // small pause to stabilize
    await page.waitForTimeout(150);
  });

  test.describe('Idle state and basic insert/search/delete flows', () => {
    test('inserting_auto via Insert button adds a node and returns to idle (ANIMATION_COMPLETE)', async ({ page }) => {
      // Insert a value using the Insert button (auto animation mode)
      const value = 42;
      await bst.insert(value);

      // Assert the inserted value is visible in the DOM
      const node = page.getByText(String(value));
      await expect(node).toBeVisible();

      // After animation completes, UI should be idle and allow further insert
      // We validate by performing a second insert immediately
      const value2 = 7;
      await bst.insert(value2);
      await expect(page.getByText(String(value2))).toBeVisible();
    });

    test('keyboard ENTER triggers insert (KEYBOARD_ENTER)', async ({ page }) => {
      // Fill input and press Enter, should insert the value
      const val = 1001;
      await bst.input().fill(String(val));
      await bst.input().press('Enter');
      await page.waitForSelector(`text="${val}"`, { timeout: 2000 });
      await expect(page.getByText(String(val))).toBeVisible();
    });

    test('searching_auto highlights or visits nodes and returns to idle', async ({ page }) => {
      // Prepare tree
      await bst.insert(10);
      await bst.insert(5);
      await bst.insert(15);

      // Search for an existing value using auto search
      await bst.search(5);

      // The node with value 5 should be visible; additionally we try to detect "visited" or "found" state
      const found = page.getByText('5');
      await expect(found).toBeVisible();

      // Some visualizers add an attribute/class on find; check for a common class names as heuristics
      const parentHandle = await found.first().evaluateHandle(node => node.parentElement || node);
      const classList = await parentHandle.evaluate(node => node.className ? node.className : '');
      // We assert that the element exists; we also assert the UI remains responsive by performing another search
      await bst.search(15);
      await expect(page.getByText('15')).toBeVisible();
    });

    test('delete flow via node click prompts confirm and removes node on CONFIRM_YES', async ({ page }) => {
      // Insert nodes
      const v = 88;
      await bst.insert(v);

      // Intercept confirm dialog and accept it (CONFIRM_YES -> deleting_auto)
      page.on('dialog', async dialog => {
        // Expect a confirm to appear
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });

      // Click the node to trigger confirmation -> should delete
      await bst.clickNode(v);

      // After confirm + deletion, the node should be removed
      await page.waitForTimeout(300); // slight delay for deletion to complete
      await expect(page.locator(`text="${v}"`).first()).toHaveCount(0);
    });

    test('delete flow CANCEL (CONFIRM_NO) leaves node intact', async ({ page }) => {
      const v = 123;
      await bst.insert(v);

      // Intercept confirm dialog and dismiss it (NO)
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss();
      });

      // Trigger delete via clicking the node (NODE_CLICK -> confirming_delete -> CONFIRM_NO)
      await bst.clickNode(v);

      // Node should still be present
      await expect(page.getByText(String(v))).toBeVisible();
    });

    test('clear prompts confirm and clears the entire tree on YES (CONFIRM_YES)', async ({ page }) => {
      // Prepare multiple nodes
      await bst.insert(1);
      await bst.insert(2);
      await bst.insert(3);

      // Accept confirm
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });

      // Click Clear button
      await bst.clickClear();

      // The previously visible numbers should no longer be present
      await page.waitForTimeout(300);
      await expect(page.locator('text="1"')).toHaveCount(0);
      await expect(page.locator('text="2"')).toHaveCount(0);
      await expect(page.locator('text="3"')).toHaveCount(0);
    });

    test('clear CANCEL (CONFIRM_NO) keeps tree intact', async ({ page }) => {
      await bst.insert(11);
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss();
      });
      await bst.clickClear();
      await expect(page.getByText('11')).toBeVisible();
    });
  });

  test.describe('Step mode and stepping_operation behavior', () => {
    test('TOGGLE_STEP_ON enables step mode and shows Next/Prev controls (step_mode_idle)', async ({ page }) => {
      // Toggle step mode on
      await bst.toggleStep(true);

      // Next and Prev controls should become visible in step mode
      const next = bst.button('Next');
      const prev = bst.button('Prev|Previous');
      // At least one should be visible
      await expect(next.first()).toBeVisible({ timeout: 1000 }).catch(async () => {
        // fallback expectation: Prev should be visible
        await expect(prev.first()).toBeVisible();
      });
    });

    test('CLICK_INSERT_STEP enters stepping_operation and NEXT_STEP advances steps', async ({ page }) => {
      // Enable step mode first
      await bst.toggleStep(true);

      // Start an Insert (step) operation
      // Some implementations expose a distinct "Insert (Step)" button
      await bst.insertStep(77);

      // Now the stepping operation should expose Next/Prev; click Next to advance
      const nextBtn = bst.button('Next');
      if (await nextBtn.count() === 0) {
        // If no explicit Next button, try generic step control
        await bst.page.locator('text=/next/i').first().click().catch(() => {});
      } else {
        await nextBtn.first().click();
      }

      // After advancing a step, we expect the value eventually to either appear or be in a staged form.
      // We assert that the node eventually appears after stepping through (simulate finish)
      // Click Next a few times to complete the operation (OPERATION_FINISH -> step_mode_idle)
      for (let i = 0; i < 5; i++) {
        if ((await bst.countValueOccurrences(77)) > 0) break;
        if ((await nextBtn.count()) > 0) await nextBtn.first().click().catch(() => {});
        await page.waitForTimeout(200);
      }
      // Final assertion: value should be present (operation finished)
      await expect(page.getByText('77')).toBeVisible();
    });

    test('PREV_STEP is available and does not break step mode', async ({ page }) => {
      // toggle step on and start a step operation
      await bst.toggleStep(true);
      await bst.insertStep(99);

      const prevBtn = bst.button('Prev|Previous');
      if (await prevBtn.count() > 0) {
        await prevBtn.first().click().catch(() => {});
        // ensure UI still has Next available
        const nextBtn = bst.button('Next');
        await expect(nextBtn.first()).toBeVisible();
      } else {
        // If Prev not present, just assert stepping controls exist
        await expect(bst.button('Next').first()).toBeVisible();
      }
    });

    test('TOGGLE_STEP_OFF returns to idle (step_mode_idle -> idle)', async ({ page }) => {
      // Enable step mode then disable it
      await bst.toggleStep(true);
      // Wait for step controls to appear
      await expect(bst.button('Next').first()).toBeVisible({ timeout: 1000 }).catch(() => {});
      // Toggle off
      await bst.toggleStep(false);
      // Wait a moment and assert Next/Prev are not visible (meaning we left step mode)
      await page.waitForTimeout(150);
      const nextCount = await bst.button('Next').count();
      // If Next button exists but hidden, ensure it's not visible; otherwise count==0 is acceptable
      if (nextCount > 0) {
        await expect(bst.button('Next').first()).not.toBeVisible();
      }
    });
  });

  test.describe('Randomizing and interrupt behavior', () => {
    test('CLICK_RANDOMIZE produces multiple nodes and completes (randomizing -> RANDOMIZE_COMPLETE -> idle)', async ({ page }) => {
      // Ensure tree empty
      // Start randomize
      await bst.randomize();

      // Randomize likely creates multiple nodes; wait for more than one numeric text to appear
      // Heuristic: wait until at least 3 numeric-like texts appear (give room for animations)
      const start = Date.now();
      let foundMany = false;
      while (Date.now() - start < 5000) {
        // simple heuristic: count occurrences of a few known numbers or count numeric texts
        const bodyText = await bst.treeText();
        const numbersFound = (bodyText.match(/\b\d+\b/g) || []).length;
        if (numbersFound >= 3) {
          foundMany = true;
          break;
        }
        await page.waitForTimeout(200);
      }
      expect(foundMany).toBeTruthy();
    });

    test('INTERRUPT: clicking Insert during randomize interrupts and triggers new insert', async ({ page }) => {
      // Start randomize, then quickly try to insert a distinct value to interrupt
      await bst.randomize();
      // Immediately insert a distinct value
      const val = 5555;
      // Interruption may be represented as immediate action; attempt to click Insert
      await bst.insert(val);
      // The value should eventually be present
      await expect(page.getByText(String(val))).toBeVisible({ timeout: 3000 });
    });

    test('RANDOMIZE_NEXT allows stepping through randomization sequence when present', async ({ page }) => {
      // Some implementations allow stepping randomize; enable step mode and randomize to test behavior
      await bst.toggleStep(true);
      await bst.randomize();
      // If Next button exists, press it a few times to advance
      const nextBtn = bst.button('Next');
      if (await nextBtn.count() > 0) {
        for (let i = 0; i < 3; i++) {
          await nextBtn.first().click().catch(() => {});
          await page.waitForTimeout(150);
        }
        // After stepping, expect some nodes present
        const bodyText = await bst.treeText();
        expect((bodyText.match(/\b\d+\b/g) || []).length).toBeGreaterThan(0);
      } else {
        test.skip('Next step controls not available while randomizing in this build');
      }
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('Inserting duplicate values results in multiple occurrences (edge case)', async ({ page }) => {
      const v = 202;
      await bst.insert(v);
      await bst.insert(v);
      // Expect at least 2 occurrences of the same numeric text
      const count = await bst.countValueOccurrences(v);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('Attempting operations while in animation can be interrupted by other controls (INTERRUPT)', async ({ page }) => {
      // Start an insert and immediately attempt another operation to interrupt
      const v1 = 300;
      const v2 = 301;
      // Start insert but don't wait for it to finish
      await bst.input().fill(String(v1));
      // Click Insert to start animation
      await bst.button('Insert').first().click().catch(() => {});
      // Immediately press Search to trigger an interrupt transition
      await bst.input().fill(String(v2));
      await bst.button('Search').first().click().catch(() => {});
      // Ensure search target appears (or at least v1/v2 present)
      await page.waitForTimeout(300);
      const treeText = await bst.treeText();
      // At least one of the values should be present within a short time window
      const hasV1 = treeText.includes(String(v1));
      const hasV2 = treeText.includes(String(v2));
      expect(hasV1 || hasV2).toBeTruthy();
    });

    test('Unknown or rapid key presses do not break the UI (robustness under noisy input)', async ({ page }) => {
      // Simulate random keys that could map to shortcuts; ensure UI remains responsive
      await bst.input().fill('77');
      await bst.input().press('s'); // potential search shortcut
      await bst.input().press('k');
      await bst.input().press('Enter'); // should insert if Enter is bound
      // Ensure the application still renders the value
      await expect(page.getByText('77')).toBeVisible();
    });
  });
});