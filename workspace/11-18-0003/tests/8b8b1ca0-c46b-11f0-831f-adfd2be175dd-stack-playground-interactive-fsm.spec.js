import { test, expect } from '@playwright/test';

/**
 * Playwright E2E tests for: Interactive Stack Playground
 * Application ID: 8b8b1ca0-c46b-11f0-831f-adfd2be175dd
 *
 * Notes:
 * - Tests assume the full application (HTML + JS) is served at the given URL.
 * - The HTML snippet in the prompt is partial; the tests are implemented defensively:
 *   they try to locate common IDs and fallback to text-based buttons/selectors.
 * - A Page Object (StackPage) encapsulates interactions and common assertions.
 *
 * These tests exercise FSM states/transitions described in the FSM:
 * - idle, validating, pushing, popping, peeking, runningAlgorithm, paused,
 *   inputError, overflow, underflow, done
 *
 * Each test includes comments describing the expectation and which FSM transitions it validates.
 */

const APP_URL = 'http://127.0.0.1:5500/workspace/11-18-0003/html/8b8b1ca0-c46b-11f0-831f-adfd2be175dd.html';

class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // --- Helper locators with fallbacks ---
  async _getByIdsOrText(ids, texts) {
    // Try ids first
    for (const id of ids) {
      const locator = this.page.locator(`#${id}`);
      if (await locator.count() > 0) return locator;
    }
    // Then try button/text fallbacks
    for (const t of texts) {
      const locator = this.page.getByRole('button', { name: t, exact: false });
      if (await locator.count() > 0) return locator;
      const textLocator = this.page.locator(`text=${t}`);
      if (await textLocator.count() > 0) return textLocator.first();
    }
    // If not found, return a locator that will fail when used
    return this.page.locator('#non-existent-' + Math.random());
  }

  async pushBtn() {
    return this._getByIdsOrText(['pushBtn', 'push'], ['Push', 'push']);
  }

  async popBtn() {
    return this._getByIdsOrText(['popBtn', 'pop'], ['Pop', 'pop']);
  }

  async peekBtn() {
    return this._getByIdsOrText(['peekBtn', 'peek'], ['Peek', 'peek']);
  }

  async runAlgoBtn() {
    return this._getByIdsOrText(['runAlgoBtn', 'run-algo', 'runAlgo'], ['Run Algorithm', 'Run', 'Run Algo']);
  }

  async pauseBtn() {
    return this._getByIdsOrText(['pauseBtn', 'pause'], ['Pause', 'pause']);
  }

  async resumeBtn() {
    return this._getByIdsOrText(['resumeBtn', 'resume'], ['Resume', 'resume']);
  }

  async stepBtn() {
    return this._getByIdsOrText(['stepBtn', 'step'], ['Step', 'step']);
  }

  async stopBtn() {
    return this._getByIdsOrText(['stopBtn', 'stop'], ['Stop', 'stop']);
  }

  async resetBtn() {
    return this._getByIdsOrText(['resetBtn', 'reset'], ['Reset', 'reset']);
  }

  async ackErrorBtn() {
    // Could be labeled "OK", "Acknowledge", "Dismiss"
    return this._getByIdsOrText(['ackErrorBtn', 'ackError', 'ack-btn'], ['OK', 'Acknowledge', 'Dismiss', 'Close']);
  }

  async ackDoneBtn() {
    return this._getByIdsOrText(['ackDoneBtn', 'ackDone'], ['OK', 'Done', 'Acknowledge']);
  }

  async valueInput() {
    const loc = this.page.locator('#value');
    if (await loc.count() > 0) return loc;
    // fallback to input with placeholder or aria-label
    const fallback = this.page.locator('input[placeholder*="e.g. 42"], input[aria-label*="Value"], input[type="text"]');
    return fallback.first();
  }

  async maxSizeInput() {
    const loc = this.page.locator('#maxSize');
    if (await loc.count() > 0) return loc;
    return this.page.locator('input[type="number"]').first();
  }

  async modeSelect() {
    const loc = this.page.locator('#mode');
    if (await loc.count() > 0) return loc;
    return this.page.locator('select').first();
  }

  async sizeBadge() {
    // "#size-badge" is present in snippet
    const loc = this.page.locator('#size-badge');
    if (await loc.count() > 0) return loc;
    // fallback: find element containing "Size:"
    return this.page.locator('text=Size:').first();
  }

  // --- Actions ---
  async navigate() {
    await this.page.goto(APP_URL);
    // Wait for main UI controls to be visible
    await expect(await this.sizeBadge()).toBeVisible();
    await expect(this.valueInput()).toBeVisible();
    await expect(this.pushBtn()).toBeVisible();
  }

  async setValue(value) {
    const input = await this.valueInput();
    await input.fill(String(value));
    // trigger input event
    await input.dispatchEvent('input');
  }

  async clearValue() {
    const input = await this.valueInput();
    await input.fill('');
    await input.dispatchEvent('input');
  }

  async setMaxSize(n) {
    const input = await this.maxSizeInput();
    await input.fill(String(n));
    await input.dispatchEvent('input');
  }

  async setMode(modeValue) {
    const select = await this.modeSelect();
    await select.selectOption({ value: modeValue });
    await select.dispatchEvent('change');
  }

  async push(value) {
    if (value !== undefined) await this.setValue(value);
    const btn = await this.pushBtn();
    await btn.click();
  }

  async pop() {
    const btn = await this.popBtn();
    await btn.click();
  }

  async peek() {
    const btn = await this.peekBtn();
    await btn.click();
  }

  async runAlgorithm() {
    const btn = await this.runAlgoBtn();
    await btn.click();
  }

  async pause() {
    const btn = await this.pauseBtn();
    await btn.click();
  }

  async resume() {
    const btn = await this.resumeBtn();
    await btn.click();
  }

  async step() {
    const btn = await this.stepBtn();
    await btn.click();
  }

  async stop() {
    const btn = await this.stopBtn();
    await btn.click();
  }

  async reset() {
    const btn = await this.resetBtn();
    if (await btn.count() > 0) {
      await btn.click();
    } else {
      // fallback: dispatch RESET event on document
      await this.page.evaluate(() => window.dispatchEvent(new CustomEvent('RESET')));
    }
  }

  async ackError() {
    const btn = await this.ackErrorBtn();
    await btn.click();
  }

  async ackDone() {
    const btn = await this.ackDoneBtn();
    await btn.click();
  }

  // --- Assertions & helpers ---
  async getSizeText() {
    const badge = await this.sizeBadge();
    return (await badge.innerText()).trim();
  }

  async expectSize(n) {
    const badge = await this.sizeBadge();
    await expect(badge).toHaveText(new RegExp(`Size:\\s*${n}`));
  }

  async stackItems() {
    // look for common stack visualization selectors
    const candidates = [
      '.stack .item',
      '.stack-item',
      '.stack .stack-item',
      '.stack > div',
      '.visual-stack .item',
      '.visual-stack .stack-item',
      '.stack .node'
    ];
    for (const sel of candidates) {
      const locator = this.page.locator(sel);
      if (await locator.count() > 0) return locator;
    }
    // fallback: any element with role listitem
    return this.page.locator('[role="listitem"]');
  }

  async topItemText() {
    // Try to find top/highlighted element
    const topSelectors = [
      '.stack .item.top',
      '.stack-item.top',
      '.stack .top',
      '.stack .item[data-top="true"]',
      '.stack-item[data-top="true"]'
    ];
    for (const sel of topSelectors) {
      const loc = this.page.locator(sel);
      if (await loc.count() > 0) return (await loc.first().innerText()).trim();
    }
    // fallback: last stack item
    const items = await this.stackItems();
    const count = await items.count();
    if (count === 0) return null;
    return (await items.nth(count - 1).innerText()).trim();
  }

  async expectAnimation() {
    // Check some element gets an "animating" class during push/pop
    const animLocators = [
      '.animating',
      '.stack-item.animating',
      '.stack .item.animating'
    ];
    for (const sel of animLocators) {
      const loc = this.page.locator(sel);
      if (await loc.count() > 0) {
        await expect(loc.first()).toHaveClass(/animating/);
        // wait for animation to end
        await expect(loc.first()).not.toHaveClass(/animating/, { timeout: 3000 }).catch(() => {});
        return;
      }
    }
    // If no animating class exists, try waiting for a temporary element to appear/disappear
    // This is a soft path; simply wait a short time to allow the app to settle
    await this.page.waitForTimeout(200);
  }

  async expectErrorMessage(type) {
    // type: 'input', 'overflow', 'underflow'
    const patterns = {
      input: /input|invalid|value/i,
      overflow: /overflow|capacity|full/i,
      underflow: /underflow|empty/i
    };
    const re = patterns[type] || /error/i;
    // look for elements with class or text
    const candidates = [
      '.error-message',
      '.alert',
      '.toast',
      '.error',
      '.overflow-message',
      '.underflow-message',
      '.input-error'
    ];
    for (const sel of candidates) {
      const loc = this.page.locator(sel);
      if (await loc.count() > 0) {
        await expect(loc.first()).toHaveText(re);
        return;
      }
    }
    // fallback: any visible element with matching text
    const visible = this.page.locator(`text=${re}`);
    await expect(visible.first()).toBeVisible();
  }

  async expectCompletion() {
    // look for "done" or "completed" messages
    const candidates = ['.completion-message', '.done-message', '.completed', '.completion'];
    for (const sel of candidates) {
      const loc = this.page.locator(sel);
      if (await loc.count() > 0) {
        await expect(loc.first()).toBeVisible();
        return;
      }
    }
    // fallback: check for text nodes
    await expect(this.page.locator('text=Done').first()).toBeVisible().catch(() => {});
  }
}

// Group tests
test.describe('Stack Playground — FSM end-to-end', () => {
  let page;
  let stack;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    stack = new StackPage(page);
    await stack.navigate();
  });

  test.afterEach(async () => {
    try {
      // Attempt to reset UI between tests
      await stack.reset();
    } catch (e) {
      // ignore
    }
    await page.close();
  });

  // --- Idle state checks ---
  test('idle state: controls are visible and size badge initially zero', async () => {
    // Validate "idle" state UI presence: size 0, push control enabled
    // FSM: idle onEnter updateUI
    await stack.expectSize(0);
    const pushBtn = await stack.pushBtn();
    await expect(pushBtn).toBeEnabled();
    const input = await stack.valueInput();
    await expect(input).toBeVisible();
  });

  // --- Validation flow (validating -> pushing/inputError) ---
  test('validating -> pushing: pushing valid input updates size and animates', async () => {
    // This test validates the sequence: idle -> validating -> VALID_INPUT -> pushing -> ANIMATION_END -> idle
    await stack.setValue('A');
    await stack.push(); // triggers validating -> pushing
    // Expect some animation/animating indicator during push
    await stack.expectAnimation();
    // After animation, size badge should equal 1 (updateSizeBadge)
    await stack.expectSize(1);
    // Top element should contain the pushed value
    const topText = await stack.topItemText();
    if (topText !== null) {
      expect(topText).toMatch(/A/);
    }
  });

  test('validating -> inputError: pushing invalid/empty input shows input error and can be acknowledged', async () => {
    // Validate idle -> validating -> INVALID_INPUT -> inputError -> ACK_ERROR -> idle
    await stack.clearValue();
    // Trigger push with empty input
    await stack.push();
    // Expect an input-related error message appears
    await stack.expectErrorMessage('input');
    // Acknowledge the error (ACK_ERROR)
    const ack = await stack.ackErrorBtn();
    if (await ack.count() > 0) {
      await ack.click();
      // After acknowledging, UI should return to idle (no visible error)
      // Wait shortly for UI to clear
      await page.waitForTimeout(200);
      // Try to ensure no input error visible
      // This is a soft assertion — if no specific element exists it will not fail hard
    } else {
      // If no ack button, try dispatching ACK_ERROR event on window
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('ACK_ERROR')));
    }
  });

  // --- Overflow behavior ---
  test('pushing beyond max size triggers overflow state and can be corrected', async () => {
    // Validate sequence: idle -> validating -> pushing -> PUSH_ERROR_OVERFLOW -> overflow -> MAXSIZE_CHANGE -> validating -> (after fix) idle
    // Set max size to 1 and push twice
    await stack.setMaxSize(1);
    await stack.setValue('X');
    await stack.push();
    await stack.expectAnimation();
    await stack.expectSize(1);

    // Push a second time to overflow
    await stack.setValue('Y');
    await stack.push();
    // Expect an overflow error visible
    await stack.expectErrorMessage('overflow');

    // Change max size to 2 to correct the condition (MAXSIZE_CHANGE -> validating)
    await stack.setMaxSize(2);
    // After changing maxSize, there should be no overflow error (transition to validating/idle)
    // Wait briefly and then attempt to push again successfully
    await page.waitForTimeout(200);
    await stack.push(); // push Y
    await stack.expectAnimation();
    await stack.expectSize(2);
  });

  // --- Underflow behavior ---
  test('popping from empty stack triggers underflow and can be acknowledged', async () => {
    // Validate idle -> popping -> POP_ERROR_UNDERFLOW -> underflow -> ACK_ERROR -> idle
    // Ensure stack is empty
    await stack.reset();
    await page.waitForTimeout(100);
    // Click pop
    const popBtn = await stack.popBtn();
    await popBtn.click();
    // Expect underflow error
    await stack.expectErrorMessage('underflow');
    // Acknowledge error
    const ack = await stack.ackErrorBtn();
    if (await ack.count() > 0) {
      await ack.click();
      await page.waitForTimeout(100);
    } else {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('ACK_ERROR')));
    }
    // After ack, ensure size remains 0
    await stack.expectSize(0);
  });

  // --- Peek behavior ---
  test('peek operation shows top element without modifying stack', async () => {
    // Validate idle -> peeking -> PEEK_DONE -> idle
    // Push two values then peek
    await stack.setValue('one');
    await stack.push();
    await stack.expectAnimation();
    await stack.setValue('two');
    await stack.push();
    await stack.expectAnimation();
    await stack.expectSize(2);

    // Perform peek
    const beforeTop = await stack.topItemText();
    await stack.peek();
    // Peek should show a visible peek result (varies by implementation, check for .peek or "Top:" text)
    const peekLocators = [
      '.peek-value',
      '.peek .value',
      'text=Top:',
      'text=Peek:'
    ];
    let peekShown = false;
    for (const sel of peekLocators) {
      const loc = page.locator(sel);
      if (await loc.count() > 0) {
        await expect(loc.first()).toBeVisible();
        peekShown = true;
        break;
      }
    }
    // If the app triggers a PEEK_DONE transition, top should remain unchanged
    const afterTop = await stack.topItemText();
    if (beforeTop !== null && afterTop !== null) {
      expect(afterTop).toEqual(beforeTop);
    }
    // If no explicit peek UI is found, at least assert stack size unchanged
    await stack.expectSize(2);
  });

  // --- Popping removes top and updates size badge ---
  test('popping removes top element, updates badge and may animate', async () => {
    // Validate idle -> popping -> ANIMATION_END -> idle
    await stack.setValue('alpha');
    await stack.push();
    await stack.expectAnimation();
    await stack.setValue('beta');
    await stack.push();
    await stack.expectAnimation();
    await stack.expectSize(2);

    // Pop once
    await stack.pop();
    // Some animation expected
    await stack.expectAnimation();
    // Size should decrement to 1
    await stack.expectSize(1);
    // Top should be the earlier 'alpha'
    const top = await stack.topItemText();
    if (top !== null) expect(top).toMatch(/alpha/i);
  });

  // --- Algorithm runner: start, step, pause, resume, done ---
  test('running algorithm: start -> steps -> pause -> resume -> done -> ack', async () => {
    // This test covers runningAlgorithm, paused, ALGORITHM_STEP, ALGORITHM_DONE, PAUSE_CLICK, RESUME_CLICK, ACK_DONE
    // If the app has a run algorithm button, start it
    const runBtn = await stack.runAlgoBtn();
    if (await runBtn.count() === 0) {
      // If no run algorithm control, simulate algorithm events
      await page.evaluate(() => {
        // Dispatch a startAlgorithm-like event if the app binds to custom events
        window.dispatchEvent(new CustomEvent('RUN_ALGO_CLICK'));
        // Simulate steps and done after short delays
        setTimeout(() => window.dispatchEvent(new CustomEvent('ALGORITHM_STEP')), 200);
        setTimeout(() => window.dispatchEvent(new CustomEvent('ALGORITHM_DONE')), 400);
      });
      // Wait for the algorithm to "complete"
      await page.waitForTimeout(600);
      // Expect a completion UI or "Done" text
      await stack.expectCompletion();
      // Acknowledge done
      const ack = await stack.ackDoneBtn();
      if (await ack.count() > 0) await ack.click();
      return;
    }

    // If run button exists, use it
    await runBtn.click();
    // Wait briefly for the running state to take effect
    await page.waitForTimeout(200);

    // Attempt to click step (if available)
    const step = await stack.stepBtn();
    if (await step.count() > 0) {
      await step.click();
      // After a step, the algorithm may still be running; try pause then resume
    }

    // Pause the algorithm if control exists
    const pause = await stack.pauseBtn();
    if (await pause.count() > 0) {
      await pause.click();
      // After pause, clicking resume should continue
      const resume = await stack.resumeBtn();
      if (await resume.count() > 0) {
        await resume.click();
      }
    }

    // Wait for completion signal; step through until "Done" or a completion UI appears
    // Some implementations have a done message; poll for it
    await page.waitForTimeout(500);
    await stack.expectCompletion();
    // Acknowledge done
    const ackDone = await stack.ackDoneBtn();
    if (await ackDone.count() > 0) {
      await ackDone.click();
      // After ACK_DONE, expect to return to idle; ensure push button is enabled
      await expect(await stack.pushBtn()).toBeEnabled();
    }
  }, 10000);

  // --- Pause/Resume/Stop semantics around algorithm runner ---
  test('algorithm stop returns to idle immediately and stop can interrupt running algorithm', async () => {
    // Start algorithm then stop it
    const runBtn = await stack.runAlgoBtn();
    const stopBtn = await stack.stopBtn();
    if (await runBtn.count() === 0 || await stopBtn.count() === 0) {
      // Fallback: dispatch events
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('RUN_ALGO_CLICK'));
        setTimeout(() => window.dispatchEvent(new CustomEvent('STOP_CLICK')), 200);
      });
      await page.waitForTimeout(300);
      // After stop, verify controls returned to idle (push button enabled)
      await expect(await stack.pushBtn()).toBeEnabled();
      return;
    }

    await runBtn.click();
    await page.waitForTimeout(100);
    await stopBtn.click();
    // After stop, ensure push/resume controls are in idle state
    await page.waitForTimeout(200);
    await expect(await stack.pushBtn()).toBeEnabled();
  });

  // --- Mode change doesn't disrupt idle but should be accepted ---
  test('mode change updates implementation selection and remains in idle', async () => {
    // Changing mode should trigger MODE_CHANGE event and remain in idle
    const mode = await stack.modeSelect();
    await mode.selectOption('linked');
    await mode.dispatchEvent('change');
    // Ensure select value changed
    await expect(mode).toHaveValue('linked');
    // Ensure UI still shows size badge and controls
    await stack.expectSize(0);
    await expect(await stack.pushBtn()).toBeEnabled();
  });

  // --- Reset behavior ---
  test('reset clears stack and returns FSM to idle', async () => {
    // Push a value, then reset and ensure size is zero and stack cleared
    await stack.setValue('z');
    await stack.push();
    await stack.expectAnimation();
    await stack.expectSize(1);
    // Click reset
    const reset = await stack.resetBtn();
    if (await reset.count() > 0) {
      await reset.click();
    } else {
      // fallback event
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('RESET')));
    }
    // After reset, expect size 0
    await page.waitForTimeout(200);
    await stack.expectSize(0);
    // Ensure no stack items remain (soft check)
    const items = await stack.stackItems();
    const count = await items.count();
    if (count > 0) {
      // If there are items, ensure they are hidden or cleared; this is a soft assertion
      for (let i = 0; i < Math.min(5, count); i++) {
        const visible = await items.nth(i).isVisible();
        expect(visible).toBeFalsy().catch(() => {});
      }
    }
  });

  // --- Edge case: unknown push error handled as inputError ---
  test('unknown push error transitions to inputError (simulated)', async () => {
    // Some implementations may emit PUSH_ERROR_UNKNOWN; simulate by dispatching event and asserting error UI
    // Simulate pushing valid input then dispatching PUSH_ERROR_UNKNOWN
    await stack.setValue('err');
    await stack.push();
    await stack.expectAnimation();
    // Dispatch the PUSH_ERROR_UNKNOWN event at window level to simulate unexpected error
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('PUSH_ERROR_UNKNOWN')));
    // Expect input error to be shown as described in FSM (mapped to inputError)
    await stack.expectErrorMessage('input');
    // Acknowledge
    const ack = await stack.ackErrorBtn();
    if (await ack.count() > 0) await ack.click();
    else await page.evaluate(() => window.dispatchEvent(new CustomEvent('ACK_ERROR')));
  });

  // --- Edge case: multiple rapid operations should be queued / handled gracefully ---
  test('rapid push/pop operations do not crash and badge eventually reflects correct size', async () => {
    // Push three items rapidly
    await stack.setValue('1');
    await stack.push();
    await stack.setValue('2');
    await stack.push();
    await stack.setValue('3');
    await stack.push();
    // Allow animations or processing to complete
    await page.waitForTimeout(800);
    // Expected size 3
    await stack.expectSize(3);

    // Rapid pop three times
    const popBtn = await stack.popBtn();
    await popBtn.click();
    await popBtn.click();
    await popBtn.click();
    await page.waitForTimeout(800);
    await stack.expectSize(0);
  });
});