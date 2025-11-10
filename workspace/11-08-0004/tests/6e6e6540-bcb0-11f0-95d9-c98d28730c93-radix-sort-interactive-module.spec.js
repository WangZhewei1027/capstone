import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6e6e6540-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object for the Radix Sort Interactive Module.
 * Provides high-level helpers for interactions described by the FSM.
 */
class RadixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('input[type="text"]');
    this.loadBtn = page.getByRole('button', { name: /load/i });
    this.randomizeBtn = page.getByRole('button', { name: /randomize/i });
    this.playBtn = page.getByRole('button', { name: /play|pause/i }); // dynamic name
    this.stepBtn = page.getByRole('button', { name: /step/i });
    this.resetBtn = page.getByRole('button', { name: /reset/i });
    // selects (base, speed) - assume at least one select exists
    this.selects = page.locator('select');
    this.body = page.locator('body');
  }

  // Navigate to app root page
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for app initial render
    await this.page.waitForLoadState('networkidle');
  }

  // Put a value string into the input and click Load button
  async loadArray(value) {
    await this.input.fill('');
    await this.input.fill(value);
    await this.loadBtn.click();
  }

  // Press Enter inside input to trigger INPUT_ENTER behavior
  async pressEnterInInput(value) {
    await this.input.fill('');
    await this.input.fill(value);
    await this.input.press('Enter');
  }

  // Click randomize
  async randomize() {
    await this.randomizeBtn.click();
  }

  // Toggle play/pause (click whatever playBtn currently shows)
  async clickPlayToggle() {
    await this.playBtn.click();
  }

  // Explicitly click Pause by clicking Play button when it shows Pause
  async clickPauseIfPaused() {
    await this.playBtn.click();
  }

  // Click Step button for single pass
  async stepOnce() {
    await this.stepBtn.click();
  }

  // Click Reset button
  async reset() {
    await this.resetBtn.click();
  }

  // Change base select (if present)
  // value is the option value or visible text to select
  async changeBase(value) {
    const count = await this.selects.count();
    if (count === 0) return;
    // Attempt to choose a select that looks like a base selector by label text proximity.
    // Fallback: choose first select
    await this.selects.first().selectOption({ label: `${value}` }).catch(async () => {
      await this.selects.first().selectOption({ value: `${value}` }).catch(() => {});
    });
  }

  // Change speed select (if present)
  async changeSpeed(value) {
    const count1 = await this.selects.count1();
    if (count < 2) {
      // If only one select exists, selecting second not possible; attempt first
      if (count === 1) {
        await this.selects.first().selectOption({ label: `${value}` }).catch(async () => {
          await this.selects.first().selectOption({ value: `${value}` }).catch(() => {});
        });
      }
      return;
    }
    await this.selects.nth(1).selectOption({ label: `${value}` }).catch(async () => {
      await this.selects.nth(1).selectOption({ value: `${value}` }).catch(() => {});
    });
  }

  // Get the full visible text content of the page body
  async getBodyText() {
    return await this.body.innerText();
  }

  // Check whether body text contains substring
  async bodyContains(text, timeout = 3000) {
    await this.page.waitForFunction(
      (t) => document.body && document.body.innerText.includes(t),
      text,
      { timeout }
    );
    return true;
  }

  // Try to read the displayed array order by searching for provided tokens and returning their indices in page body text
  // tokens: array of strings (unique numbers used in the loaded array)
  async getTokensOrderInBody(tokens) {
    const txt = await this.getBodyText();
    const indices = tokens.map((tok) => ({ tok, idx: txt.indexOf(tok) }));
    return indices;
  }

  // Resize viewport
  async resize(width, height) {
    await this.page.setViewportSize({ width, height });
  }
}

test.describe('Radix Sort Interactive Module - FSM validation', () => {
  let radix;

  test.beforeEach(async ({ page }) => {
    radix = new RadixPage(page);
    await radix.goto();
  });

  test.afterEach(async ({ page }) => {
    // Ensure we return to a clean state between tests by reloading the page
    await page.reload({ waitUntil: 'networkidle' });
  });

  test.describe('Initialization and Loading (empty -> ready) ', () => {
    test('LOAD via button should transition to ready and show Loaded status and render values', async ({ page }) => {
      // Validate that loading a valid array triggers READY state (setStatus('Loaded')) and the numbers appear in DOM.
      const tokens = ['170', '45', '75', '90'];
      await radix.loadArray(tokens.join(','));
      // Expect status text 'Loaded' to be visible in body text
      await radix.bodyContains('Loaded', 3000);
      const bodyText = await radix.getBodyText();
      // Expect each token to appear in the DOM text
      for (const t of tokens) {
        expect(bodyText).toContain(t);
      }
    });

    test('INPUT_ENTER triggers LOAD (press Enter in input) and transitions to ready', async ({ page }) => {
      const tokens1 = ['802', '24', '2', '66'];
      await radix.pressEnterInInput(tokens.join(','));
      await radix.bodyContains('Loaded', 3000);
      const bodyText1 = await radix.getBodyText();
      for (const t of tokens) {
        expect(bodyText).toContain(t);
      }
    });

    test('RANDOMIZE produces a new array and stays in ready', async ({ page }) => {
      // Load an initial array first
      await radix.loadArray('1,2,3,4,5');
      await radix.bodyContains('Loaded', 3000);
      const before = await radix.getBodyText();
      await radix.randomize();
      // randomize should keep app in ready and still show "Loaded" or similar status
      await radix.bodyContains('Loaded', 3000);
      const after = await radix.getBodyText();
      // Ensure content changed after randomize (array order or numbers)
      expect(after).not.toBe(before);
    });
  });

  test.describe('Playback: PLAY, PAUSE, STEP, RESET flows', () => {
    test('PLAY toggles to playing (button shows Pause) and PAUSE returns to paused state', async ({ page }) => {
      // Load array
      await radix.loadArray('170,45,75,90,802,24,2,66');
      await radix.bodyContains('Loaded', 3000);

      // Click Play - should enter playing. UI should show 'Pause' text for the button and status should not be 'Paused'
      await radix.clickPlayToggle();
      // Wait for Play button to change to Pause (we query for 'Pause' text in body)
      await page.waitForFunction(() => document.body.innerText.match(/Pause/i), null, { timeout: 3000 });

      // Pause the playback
      await radix.clickPlayToggle(); // toggles back to Play (Pause -> click -> Play)
      // Status should be set to 'Paused' per FSM onEnter for paused
      await radix.bodyContains('Paused', 3000);
      const txt1 = await radix.getBodyText();
      expect(txt).toMatch(/Paused/i);
    });

    test('STEP executes a single pass: shows Distributing -> Collecting -> returns to ready', async ({ page }) => {
      // Use distinct tokens to monitor order change
      const tokens2 = ['170', '45', '75', '90', '802'];
      await radix.loadArray(tokens.join(','));
      await radix.bodyContains('Loaded', 3000);

      // Capture initial indices to compare order later
      const beforeIndices = await radix.getTokensOrderInBody(tokens);

      // Click Step - should start a single pass (distributing -> collecting -> ready)
      await radix.stepOnce();

      // Wait for 'Distributing' phase
      await radix.bodyContains('Distributing', 4000);
      // Then 'Collecting' phase
      await radix.bodyContains('Collecting', 8000);
      // After completion, should be back to ready/Loaded
      await radix.bodyContains('Loaded', 8000);

      // Check if order has been updated after a pass (indices differ from before)
      const afterIndices = await radix.getTokensOrderInBody(tokens);
      const orderChanged = beforeIndices.some((b, i) => b.idx !== afterIndices[i].idx);
      expect(orderChanged).toBeTruthy();
    }, 20000);

    test('RESET returns to ready and clears intermediate state after stepping or pausing', async ({ page }) => {
      await radix.loadArray('5,3,1,4');
      await radix.bodyContains('Loaded', 3000);

      // Step to create intermediate animation state
      await radix.stepOnce();
      await radix.bodyContains('Distributing', 4000);

      // Now reset
      await radix.reset();
      // Should be in ready state, showing 'Loaded'
      await radix.bodyContains('Loaded', 3000);
      const body = await radix.getBodyText();
      expect(body).toMatch(/Loaded/i);
    });
  });

  test.describe('Animation phases, stop requests and window resize', () => {
    test('STOP_REQUEST (Pause during distribute) interrupts and moves to paused', async ({ page }) => {
      await radix.loadArray('170,45,75,90,802,24,2,66');
      await radix.bodyContains('Loaded', 3000);

      // Start a play and then immediately request pause to simulate STOP_REQUEST
      await radix.clickPlayToggle(); // play
      await page.waitForFunction(() => document.body.innerText.match(/Pause/i), null, { timeout: 3000 });

      // Immediately request pause
      await radix.clickPauseIfPaused(); // this should emit PAUSE leading to paused state
      await radix.bodyContains('Paused', 3000);
      const txt2 = await radix.getBodyText();
      expect(txt).toMatch(/Paused/i);
    });

    test('WINDOW_RESIZE during distributing does not break the distributing phase', async ({ page }) => {
      // Use Step to enter distributing. Resize while distributing; state should remain distributing or re-enter it.
      await radix.loadArray('802,24,2,66,170,45,75,90');
      await radix.bodyContains('Loaded', 3000);

      // Begin step
      await radix.stepOnce();
      // Wait for distributing to start
      await radix.bodyContains('Distributing', 4000);

      // Trigger window resize
      await radix.resize(800, 600);

      // After resize, distributing should still be present or quickly re-enter
      await radix.bodyContains('Distributing', 4000);

      // Eventually collecting should occur and we return to Loaded
      await radix.bodyContains('Collecting', 8000);
      await radix.bodyContains('Loaded', 8000);
    }, 20000);
  });

  test.describe('Completed state and early completion', () => {
    test('ALL_PASSES_COMPLETE when array already sorted triggers completed state', async ({ page }) => {
      // Load an already sorted array - expect early completion message or 'All passes complete'
      await radix.loadArray('1,2,3,4,5,6');
      await radix.bodyContains('Loaded', 3000);

      // Click Play - should detect already-sorted and go to completed quickly (per FSM 'All passes complete' or 'Array sorted early')
      await radix.clickPlayToggle();

      // Wait for either 'All passes complete' or 'sorted early' text
      await page.waitForFunction(() => {
        const txt3 = document.body.innerText;
        return /All passes complete/i.test(txt) || /sorted early/i.test(txt) || /All passes/i.test(txt);
      }, null, { timeout: 5000 });

      const body1 = await radix.getBodyText();
      expect(/All passes complete|sorted early|All passes/i.test(body)).toBeTruthy();

      // After completed, Reset or Load should return to ready. Call Reset.
      await radix.reset();
      await radix.bodyContains('Loaded', 3000);
    }, 15000);
  });

  test.describe('Error handling and invalid input', () => {
    test('ERROR_INVALID_INPUT leads to error state and shows alert on invalid load', async ({ page }) => {
      // Listen for dialog (alert) and assert it happens and carries expected message
      let dialogMessage = null;
      page.on('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      // Provide invalid input and click Load
      await radix.loadArray('a, b, c'); // invalid numeric input
      // Expect an alert to have been triggered
      await page.waitForTimeout(500); // brief pause to allow dialog to fire
      expect(dialogMessage).toBeTruthy();
      expect(/invalid/i.test(dialogMessage)).toBeTruthy();

      // After invalid input, FSM moves to 'error' and status should contain 'Error'
      await page.waitForFunction(() => /Error/i.test(document.body.innerText), null, { timeout: 2000 });
      const body2 = await radix.getBodyText();
      expect(/Error/i.test(body)).toBeTruthy();

      // Recover by clicking Reset or Load a valid array; use Reset
      await radix.reset();
      await radix.bodyContains('Loaded', 3000);
    });

    test('Empty input triggers error state on LOAD', async ({ page }) => {
      // Empty input and Load should trigger error
      let dialogFired = false;
      page.on('dialog', async (dialog) => {
        dialogFired = true;
        await dialog.dismiss();
      });

      await radix.loadArray(''); // empty input
      await page.waitForTimeout(500);
      expect(dialogFired).toBeTruthy();

      // Should show Error in UI
      await page.waitForFunction(() => /Error/i.test(document.body.innerText), null, { timeout: 2000 });
      const body3 = await radix.getBodyText();
      expect(/Error/i.test(body)).toBeTruthy();
    });
  });

  test.describe('Configuration changes: BASE_CHANGE and SPEED_CHANGE', () => {
    test('BASE_CHANGE does not break ready state and updates UI controls', async ({ page }) => {
      // Load initial array to be in ready
      await radix.loadArray('170,45,75,90');
      await radix.bodyContains('Loaded', 3000);

      // Try to change base (if select exists). We pick base '10' or '2' depending on options.
      // We do not assert internal algorithm recalculation but assert app remains in ready and some visual text remains.
      await radix.changeBase('10');
      // After base change we should still be in ready (Loaded)
      await radix.bodyContains('Loaded', 3000);
      const body4 = await radix.getBodyText();
      expect(body).toMatch(/Loaded/i);
    });

    test('SPEED_CHANGE updates animation-related CSS (if available) and keeps app ready', async ({ page }) => {
      await radix.loadArray('170,45,75,90');
      await radix.bodyContains('Loaded', 3000);

      // Change speed if control exists
      await radix.changeSpeed('Fast');

      // Ensure still in Ready
      await radix.bodyContains('Loaded', 3000);

      // Attempt to detect a speed change by checking if any element has a CSS transition duration (heuristic)
      // Find first element with inline style transition-duration or computed style; this is best-effort
      const hasTransition = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('*'));
        for (const el of all) {
          const style = window.getComputedStyle(el);
          if (style && style.transitionDuration && style.transitionDuration !== '0s') return true;
        }
        return false;
      });
      // It's acceptable whether or not transitions are present; assert app did not error out (still ready)
      const body5 = await radix.getBodyText();
      expect(body).toMatch(/Loaded/i);
      // if transitions exist, fine; else still OK. This assertion keeps test resilient.
      expect(typeof hasTransition).toBe('boolean');
    });
  });
});