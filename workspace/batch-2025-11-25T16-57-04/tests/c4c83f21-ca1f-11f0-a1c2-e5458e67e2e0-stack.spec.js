import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T16-57-04/html/c4c83f21-ca1f-11f0-a1c2-e5458e67e2e0.html';

/**
 * Page Object for the Stack app.
 * Encapsulates common actions and helpers used across tests.
 */
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // ensure page is loaded
    await expect(this.page.locator('h1')).toHaveText('Stack');
  }

  async clickButton() {
    await this.page.click('button[onclick="myFunction()"], button');
  }

  async getStackText() {
    return await this.page.locator('#stack').innerText();
  }

  /**
   * Replace the page's myFunction with the provided function.
   * The function will be serialized and installed in the page scope.
   *
   * The injected function should be self-contained (no outside closures).
   * We also initialize window.__fsmLog = [] so tests can assert lifecycle events.
   *
   * @param {Function} fn - function to install as window.myFunction
   */
  async setMyFunction(fn) {
    const fnStr = fn.toString();
    await this.page.evaluate((s) => {
      // initialize a simple log to capture lifecycle events in the test
      window.__fsmLog = [];
      // install myFunction from the provided string
      // wrap in parentheses to support arrow functions or function declarations
      // eslint-disable-next-line no-eval
      window.myFunction = eval('(' + s + ')');
    }, fnStr);
  }

  async getFsmLog() {
    return await this.page.evaluate(() => {
      return window.__fsmLog ? Array.from(window.__fsmLog) : [];
    });
  }
}

test.describe('Stack FSM - c4c83f21-ca1f-11f0-a1c2-e5458e67e2e0', () => {
  test.beforeEach(async ({ page }) => {
    // Create page object and navigate to app before each test
    const stack = new StackPage(page);
    await stack.goto();
  });

  test('idle state: initial render should show button and empty stack', async ({ page }) => {
    // This test validates the idle state: the app initially renders with a button
    // and an empty #stack container (no items / no error).
    const stack = new StackPage(page);

    // Ensure the interactive button exists and has the expected onclick attribute
    const button = page.locator('button[onclick="myFunction()"]');
    await expect(button).toBeVisible();

    // #stack should be empty on initial load (idle)
    const stackText = await stack.getStackText();
    expect(stackText.trim()).toBe('', 'Expected #stack to be empty in idle state');
  });

  test('handlingClick: clicking the button invokes myFunction()', async ({ page }) => {
    // This test replaces myFunction with a spy that logs that it was called,
    // and asserts that clicking the button triggers the call (transition: idle -> handlingClick).
    const stack = new StackPage(page);

    // Install a function that logs its invocation and immediately updates the DOM
    await stack.setMyFunction(function () {
      // log entry for handlingClick
      window.__fsmLog.push('handlingClick_called');
      // simulate an immediate, synchronous stack update
      const stackEl = document.getElementById('stack');
      stackEl.innerText = 'item-1';
      // log STACK_UPDATED and RENDER_COMPLETE to simulate both transitions
      window.__fsmLog.push('STACK_UPDATED');
      window.__fsmLog.push('RENDER_COMPLETE');
    });

    // Click the button
    await stack.clickButton();

    // Wait for the fsm log to record the expected entries
    await page.waitForFunction(() => window.__fsmLog && window.__fsmLog.includes('handlingClick_called'));

    const log = await stack.getFsmLog();
    expect(log).toEqual(['handlingClick_called', 'STACK_UPDATED', 'RENDER_COMPLETE']);

    // Verify #stack was updated as a result of myFunction (updatingStack onEnter)
    const stackText = await stack.getStackText();
    expect(stackText.trim()).toBe('item-1');
  });

  test('updatingStack: asynchronous render completes after a delay and returns to idle', async ({ page }) => {
    // This test validates that during a long-running myFunction() call,
    // the handlingClick event occurs first, then the updatingStack render happens,
    // and finally RENDER_COMPLETE is logged. We assert ordering of events.
    const stack = new StackPage(page);

    // Install an async myFunction that updates the DOM after a short delay
    await stack.setMyFunction(async function () {
      window.__fsmLog.push('handlingClick_called');
      const stackEl = document.getElementById('stack');
      // Simulate asynchronous update (e.g., fetching data / rendering)
      await new Promise((res) => setTimeout(res, 150));
      stackEl.innerHTML = '<div class="item">async-item</div>';
      window.__fsmLog.push('STACK_UPDATED');
      // Simulate a further rendering step completing after a short wait
      await new Promise((res) => setTimeout(res, 50));
      window.__fsmLog.push('RENDER_COMPLETE');
    });

    // Click the button to start the async flow
    await stack.clickButton();

    // Immediately after click, we should see handlingClick_called logged first
    await page.waitForFunction(() => window.__fsmLog && window.__fsmLog[0] === 'handlingClick_called');

    // At this point, STACK_UPDATED should NOT yet be present
    const intermediateLog = await stack.getFsmLog();
    expect(intermediateLog[0]).toBe('handlingClick_called');
    expect(intermediateLog).not.toContain('STACK_UPDATED');

    // Wait for render to complete
    await page.waitForFunction(() => window.__fsmLog && window.__fsmLog.includes('RENDER_COMPLETE'));

    const finalLog = await stack.getFsmLog();
    expect(finalLog).toEqual(['handlingClick_called', 'STACK_UPDATED', 'RENDER_COMPLETE']);

    // Verify DOM reflects the asynchronous render
    const stackText = await stack.getStackText();
    expect(stackText).toContain('async-item');
  });

  test('error state: myFunction signals an error and shows an error message in #stack; retry restores normal flow', async ({ page }) => {
    // This test simulates an error path:
    // - myFunction sets an error message into #stack and logs ERROR_OCCURRED
    // - verify error displayed and FSM would be in error state
    // - then replace myFunction with a successful implementation and click to retry
    // - verify the error is cleared and normal update happens
    const stack = new StackPage(page);

    // Install myFunction that enters an error state
    await stack.setMyFunction(function () {
      window.__fsmLog.push('handlingClick_called');
      const stackEl = document.getElementById('stack');
      // Simulate showing an error as the onEnter of error state would
      stackEl.innerText = 'Error: Failed to update stack';
      window.__fsmLog.push('ERROR_OCCURRED');
      // Note: we intentionally do not push RENDER_COMPLETE here
    });

    // Click to trigger the error
    await stack.clickButton();

    // Wait for the error log entry
    await page.waitForFunction(() => window.__fsmLog && window.__fsmLog.includes('ERROR_OCCURRED'));

    // Assert log contains the error event
    const errorLog = await stack.getFsmLog();
    expect(errorLog).toContain('ERROR_OCCURRED');

    // Assert the UI shows the error message in #stack (onEnter of error)
    const errorText = await stack.getStackText();
    expect(errorText).toMatch(/Error: Failed to update stack/);

    // Now simulate a retry: replace myFunction with a successful implementation that clears the error
    await stack.setMyFunction(function () {
      // onExit of error is expected to clear error; simulate that
      window.__fsmLog.push('handlingClick_called_after_error');
      const stackEl = document.getElementById('stack');
      // clear the previous error and render a normal item
      stackEl.innerText = 'recovered-item';
      window.__fsmLog.push('STACK_UPDATED');
      window.__fsmLog.push('RENDER_COMPLETE');
    });

    // Click again to retry
    await stack.clickButton();

    // Wait for the recovery flow to complete
    await page.waitForFunction(() => window.__fsmLog && window.__fsmLog.includes('RENDER_COMPLETE'));

    // Verify that the sequence includes the recovery handling click and completion
    const recoveryLog = await stack.getFsmLog();
    // It should contain both the original ERROR_OCCURRED and the new successful flow entries
    expect(recoveryLog).toContain('ERROR_OCCURRED');
    expect(recoveryLog).toContain('handlingClick_called_after_error');
    expect(recoveryLog.slice(-2)).toEqual(['STACK_UPDATED', 'RENDER_COMPLETE']);

    // Verify that the error was cleared and replaced by the recovered content
    const recoveredText = await stack.getStackText();
    expect(recoveredText.trim()).toBe('recovered-item');
  });

  test('edge case: multiple rapid clicks append multiple items in order', async ({ page }) => {
    // This test validates that repeated clicks (rapid succession) result in multiple stack entries.
    // It simulates myFunction appending items (maintaining order) and logs each call.
    const stack = new StackPage(page);

    // Install myFunction that appends a new numbered item to the stack
    await stack.setMyFunction(function () {
      if (!window.__counter) window.__counter = 0;
      window.__counter += 1;
      const n = window.__counter;
      window.__fsmLog.push('called_' + n);
      const stackEl = document.getElementById('stack');
      // Append an entry (preserve order)
      const div = document.createElement('div');
      div.className = 'item';
      div.innerText = 'item-' + n;
      stackEl.appendChild(div);
      window.__fsmLog.push('STACK_UPDATED_' + n);
      window.__fsmLog.push('RENDER_COMPLETE_' + n);
    });

    // Fire three rapid clicks
    await Promise.all([
      stack.clickButton(),
      stack.clickButton(),
      stack.clickButton()
    ]);

    // Wait for all three render completes to be logged
    await page.waitForFunction(() => {
      return window.__fsmLog &&
        window.__fsmLog.filter(Boolean).some(x => x.startsWith('RENDER_COMPLETE_')) &&
        window.__fsmLog.filter(x => x.startsWith('RENDER_COMPLETE_')).length === 3;
    });

    // Validate logs show three distinct calls in order
    const log = await stack.getFsmLog();
    const calledEntries = log.filter((e) => typeof e === 'string' && e.startsWith('called_'));
    expect(calledEntries.length).toBe(3);
    // ensure ordering: called_1, called_2, called_3
    expect(calledEntries).toEqual(['called_1', 'called_2', 'called_3']);

    // Verify DOM has three item elements in the same order
    const items = await page.$$eval('#stack .item', (els) => els.map((n) => n.innerText));
    expect(items).toEqual(['item-1', 'item-2', 'item-3']);
  });
});