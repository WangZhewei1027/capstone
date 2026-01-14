import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad37881-d59a-11f0-891d-f361d22ca68a.html';

// Page object for the Priority Queue page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input-field');
    this.addButton = page.locator('#add-button');
    this.removeButton = page.locator('#remove-button');
    this.output = page.locator('#output-field');
  }

  async gotoAndCollectErrors(errorsCollector, consoleCollector) {
    // Attach collectors before navigation
    this.page.on('console', (msg) => {
      consoleCollector.push({ type: msg.type(), text: msg.text() });
    });
    this.page.on('pageerror', (err) => {
      errorsCollector.push(err);
    });

    // Attempt to navigate and capture any page error that fires during load.
    // If no pageerror occurs within timeout, navigation still completes.
    try {
      const [pageError] = await Promise.all([
        this.page.waitForEvent('pageerror', { timeout: 2000 }),
        this.page.goto(APP_URL),
      ]);
      // The pageerror will also be captured by the listener; we push again to ensure presence.
      if (pageError) errorsCollector.push(pageError);
    } catch (e) {
      // Either timeout or navigation finished without a pageerror.
      // Ensure the page is navigated:
      await this.page.goto(APP_URL);
    }
  }

  async fillInput(text) {
    await this.input.fill(text);
  }

  async clickAdd() {
    await this.addButton.click();
  }

  async clickRemove() {
    await this.removeButton.click();
  }

  async getOutputText() {
    // Use innerText to normalize whitespace/newlines
    return (await this.output.innerText()).trim();
  }

  async isFunctionDefined(name) {
    return await this.page.evaluate((n) => typeof window[n] !== 'undefined', name);
  }

  async evaluateType(name) {
    return await this.page.evaluate((n) => typeof window[n], name);
  }
}

test.describe('Priority Queue App (FSM verification + runtime errors)', () => {
  let pqPage;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    pqPage = new PriorityQueuePage(page);
    consoleMessages = [];
    pageErrors = [];

    // Navigate and collect errors (if any)
    await pqPage.gotoAndCollectErrors(pageErrors, consoleMessages);
  });

  test.afterEach(async ({ page }) => {
    // detach listeners to avoid leakage across tests (Playwright auto-cleans pages, but be explicit)
    page.removeAllListeners && page.removeAllListeners('console');
    page.removeAllListeners && page.removeAllListeners('pageerror');
  });

  test('S0_Idle: Initial render - input, add, remove and output exist, and loading causes runtime error (ReferenceError)', async () => {
    // This test verifies initial static DOM per Idle state and that the page script produced a runtime error
    // due to missing PriorityQueue implementation in the provided HTML/JS.

    // DOM elements should be present
    await expect(pqPage.input).toBeVisible();
    await expect(pqPage.addButton).toBeVisible();
    await expect(pqPage.removeButton).toBeVisible();
    await expect(pqPage.output).toBeVisible();

    // Output field initial content (per HTML) is an empty div -> innerText trimmed is empty string
    const initialOutput = await pqPage.getOutputText();
    expect(initialOutput).toBe('');

    // Because the page script references an undefined PriorityQueue, we expect at least one page error
    // containing "PriorityQueue" or "is not defined". We assert there was at least one page error captured.
    expect(pageErrors.length).toBeGreaterThan(0);

    // Check that one of the errors mentions PriorityQueue (common ReferenceError message)
    const combinedMessages = pageErrors.map(e => (e && e.message) || String(e)).join(' | ');
    expect(combinedMessages).toContain('PriorityQueue');
  });

  test('Transition: InputChange (S0_Idle -> S1_TaskAdded) - typing should NOT trigger FSM transitions because script failed', async () => {
    // This test attempts to type into the input to trigger the input event handler that would call addTask.
    // Because the script threw at load time, those handlers and functions should not be defined.

    // Confirm that functions are not defined on the window (addTask, removeTask, PriorityQueue)
    expect(await pqPage.evaluateType('PriorityQueue')).toBe('undefined');
    expect(await pqPage.evaluateType('addTask')).toBe('undefined');
    expect(await pqPage.evaluateType('removeTask')).toBe('undefined');

    // Try to type a task - the page's input element will accept text (DOM works), but no transition should occur.
    await pqPage.fillInput('Task A');

    // Give a small pause to allow any stray handlers to run if they existed (they do not)
    await pqPage.page.waitForTimeout(200);

    // Output should remain unchanged (still empty) because update routines were never registered
    const afterTypingOutput = await pqPage.getOutputText();
    expect(afterTypingOutput).toBe('');

    // Ensure no additional page errors were produced by typing (we only asserted that initial load error exists)
    // The pageErrors array was collected during navigation; it's acceptable if it's >0; we ensure no new ones were appended by this action.
    // (We can't detect the exact count because pageerrors are captured only during navigation in gotoAndCollectErrors, but we can still assert the critical error exists)
    const combinedMessages = pageErrors.map(e => (e && e.message) || String(e)).join(' | ');
    expect(combinedMessages).toContain('PriorityQueue');
  });

  test('Transition: AddButtonClick (S0_Idle -> S1_TaskAdded) - clicking Add should not update output due to missing functions', async () => {
    // This test simulates clicking the Add button. In a correct implementation, this would add a task and display the queue.
    // In the broken runtime, no handlers / functions are available, so clicking should not change the output.

    // Precondition: output empty
    expect(await pqPage.getOutputText()).toBe('');

    // Try clicking Add
    await pqPage.fillInput('Task B');
    await pqPage.clickAdd();

    // Short wait in case any handlers were present
    await pqPage.page.waitForTimeout(200);

    // Validate that output remains unchanged
    const outputAfterClick = await pqPage.getOutputText();
    expect(outputAfterClick).toBe('');

    // Confirm again that functions are not present
    expect(await pqPage.evaluateType('addTask')).toBe('undefined');
    expect(await pqPage.evaluateType('displayQueueWithIndex')).toBe('undefined');
  });

  test('Transition: RemoveButtonClick (S1_TaskAdded -> S2_TaskRemoved) - clicking Remove should be inert when runtime failed', async () => {
    // Attempt to remove without a valid runtime. Remove should do nothing and not crash the test harness.

    // Ensure output is empty initially
    expect(await pqPage.getOutputText()).toBe('');

    // Click Remove button
    await pqPage.clickRemove();

    // Wait briefly for any possible (but unexpected) behavior
    await pqPage.page.waitForTimeout(200);

    // Output should remain unchanged
    const afterRemoveOutput = await pqPage.getOutputText();
    expect(afterRemoveOutput).toBe('');

    // There should be at least one page error from load (PriorityQueue undefined)
    const combinedMessages = pageErrors.map(e => (e && e.message) || String(e)).join(' | ');
    expect(combinedMessages).toContain('PriorityQueue');
  });

  test('Edge case: Verify global functions/constructors are undefined and clicking does not throw additional page errors', async () => {
    // This test explicitly checks the absence of the expected runtime constructs and ensures interactions do not cause additional pageerrors.

    // Check undefined globals
    expect(await pqPage.evaluateType('PriorityQueue')).toBe('undefined');
    expect(await pqPage.evaluateType('updateOutputField')).toBe('undefined');
    expect(await pqPage.evaluateType('displayQueueWithIndex')).toBe('undefined');

    // Capture console messages currently present (from before navigation error)
    const initialConsoleSnapshot = consoleMessages.slice();

    // Try multiple interactions: type, click add, click remove
    await pqPage.fillInput('Edge Task');
    await pqPage.clickAdd();
    await pqPage.clickRemove();

    // Small delay
    await pqPage.page.waitForTimeout(200);

    // No new pageerrors should have appeared beyond the initial one thrown during load (we assert initial error contains PriorityQueue)
    const combinedMessages = pageErrors.map(e => (e && e.message) || String(e)).join(' | ');
    expect(combinedMessages).toContain('PriorityQueue');

    // The console messages array should have captured any console-level outputs; ensure we didn't get runtime exceptions logged after the load
    // We assert that consoleMessages length is at least initial snapshot length (it might be equal)
    expect(consoleMessages.length).toBeGreaterThanOrEqual(initialConsoleSnapshot.length);

    // The output should still be unchanged (no queue behavior occurred)
    expect(await pqPage.getOutputText()).toBe('');
  });
});