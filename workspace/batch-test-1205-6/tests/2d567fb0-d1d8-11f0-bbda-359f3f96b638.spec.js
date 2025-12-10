import { test, expect } from '@playwright/test';

// Test file for Application ID: 2d567fb0-d1d8-11f0-bbda-359f3f96b638
// HTML served at:
// http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d567fb0-d1d8-11f0-bbda-359f3f96b638.html
//
// These tests validate the FSM described in the prompt:
// - S0_Idle (initial): input and button present
// - S1_EdgeAdded: clicking Add Edge with valid input updates adjacency list and clears input
// - InvalidEdgeInput: clicking Add Edge with invalid input triggers alert
//
// The tests observe console messages and page errors without modifying page code.
// They let any runtime errors occur naturally and assert expected presence/absence.

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d567fb0-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object Model for the adjacency list application
class AdjacencyPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#edge-input');
    this.addButton = page.locator('#add-edge');
    this.adjPre = page.locator('#adjacency-list');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillEdge(text) {
    await this.input.fill(text);
  }

  async clickAddEdge() {
    await this.addButton.click();
  }

  async getInputValue() {
    return await this.input.inputValue();
  }

  async getAdjacencyText() {
    return (await this.adjPre.textContent()) || '';
  }

  async getAdjacencyObject() {
    const txt = await this.getAdjacencyText();
    if (!txt.trim()) return {};
    try {
      return JSON.parse(txt);
    } catch (e) {
      // Let parsing errors propagate if unexpected; tests may assert on that.
      throw e;
    }
  }
}

test.describe('Adjacency List FSM and UI - 2d567fb0-d1d8-11f0-bbda-359f3f96b638', () => {
  let page;
  let adjacencyPage;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh context and page for isolation
    const context = await browser.newContext();
    page = await context.newPage();

    // Collect console messages and page errors for assertions
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    adjacencyPage = new AdjacencyPage(page);
    await adjacencyPage.goto();
  });

  test.afterEach(async () => {
    // Close the page to clean up
    if (page && !page.isClosed()) {
      await page.close();
    }
  });

  test('Initial Idle state: input, button, and adjacency list are present and empty', async () => {
    // This test validates the S0_Idle evidence: input and Add Edge button are rendered,
    // and the adjacency display starts empty.
    await expect(adjacencyPage.input).toBeVisible();
    await expect(adjacencyPage.addButton).toBeVisible();

    const inputValue = await adjacencyPage.getInputValue();
    expect(inputValue).toBe('', 'Expected the edge input to be initially empty');

    const adjText = await adjacencyPage.getAdjacencyText();
    expect(adjText.trim()).toBe('', 'Expected adjacency list display to be empty on load');

    // Ensure no runtime page errors occurred on initial load
    expect(pageErrors.length).toBe(0);
    // No console.error messages expected during normal load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Adding a valid edge transitions to EdgeAdded: adjacency list updates and input is cleared', async () => {
    // This test validates the transition S0_Idle -> S1_EdgeAdded:
    // - displayAdjacencyList() called implicitly as the DOM updates
    // - adjacencyList[node1].push(node2) and adjacencyList[node2].push(node1) observable in DOM
    // - input field cleared on exit action

    // Enter valid edge "A B"
    await adjacencyPage.fillEdge('A B');

    // Click Add Edge and wait a moment for DOM update
    await adjacencyPage.clickAddEdge();

    // After the click, input should be cleared (exit action)
    const inputAfter = await adjacencyPage.getInputValue();
    expect(inputAfter).toBe('', 'Expected input to be cleared after adding a valid edge');

    // Adjacency list should show the undirected connection between A and B
    const adjObj = await adjacencyPage.getAdjacencyObject();
    expect(adjObj).toHaveProperty('A');
    expect(adjObj).toHaveProperty('B');

    // The adjacency arrays should contain the counterpart nodes
    expect(Array.isArray(adjObj.A)).toBe(true);
    expect(Array.isArray(adjObj.B)).toBe(true);
    expect(adjObj.A).toContain('B');
    expect(adjObj.B).toContain('A');

    // Ensure no page errors or console.error messages occurred during the operation
    expect(pageErrors.length).toBe(0);
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Adding multiple edges updates adjacency list cumulatively and preserves undirected edges', async () => {
    // This test adds multiple edges to verify cumulative state and S1->S0 transitions clear input each time.

    // Add first edge A B
    await adjacencyPage.fillEdge('A B');
    await adjacencyPage.clickAddEdge();

    // Add second edge B C
    await adjacencyPage.fillEdge('B C');
    await adjacencyPage.clickAddEdge();

    // Parse adjacency object
    const adjObj1 = await adjacencyPage.getAdjacencyObject();

    // Expected structure:
    // A: ['B']
    // B: ['A', 'C']
    // C: ['B']
    expect(adjObj).toHaveProperty('A');
    expect(adjObj).toHaveProperty('B');
    expect(adjObj).toHaveProperty('C');

    expect(adjObj.A).toContain('B');
    expect(adjObj.B).toContain('A');
    expect(adjObj.B).toContain('C');
    expect(adjObj.C).toContain('B');

    // Each add should clear the input; verify final input is empty
    expect(await adjacencyPage.getInputValue()).toBe('', 'Input should be cleared after consecutive adds');

    // No runtime errors expected
    expect(pageErrors.length).toBe(0);
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Invalid inputs (empty or single token) trigger alert and do not modify adjacency list', async () => {
    // This test validates the InvalidEdgeInput event and associated alert behavior.
    // It asserts that an alert with the expected message appears and adjacency list remains unchanged.

    // Helper to attempt click and capture dialog message
    const attemptInvalidClickAndGetMessage = async (inputText) => {
      if (inputText !== null) {
        await adjacencyPage.fillEdge(inputText);
      } else {
        // Ensure input is empty
        await adjacencyPage.fillEdge('');
      }
      // Wait for the dialog event that should be triggered by invalid input
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        adjacencyPage.clickAddEdge(),
      ]);
      const message = dialog.message();
      await dialog.dismiss();
      return message;
    };

    // Start from a clean state; adjacency list empty
    const beforeObj = await adjacencyPage.getAdjacencyObject();

    // Case 1: Empty input
    const msgEmpty = await attemptInvalidClickAndGetMessage('');
    expect(msgEmpty).toBe('Please enter a valid edge (e.g., A B)');

    // Case 2: Single token
    const msgSingle = await attemptInvalidClickAndGetMessage('OnlyOneToken');
    expect(msgSingle).toBe('Please enter a valid edge (e.g., A B)');

    // Adjacency list should remain unchanged (still empty object)
    const afterObj = await adjacencyPage.getAdjacencyObject();
    expect(afterObj).toEqual(beforeObj);

    // Ensure no unexpected page errors occurred (alerts are expected; pageerror none)
    expect(pageErrors.length).toBe(0);
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Edge cases: input with extra spaces and duplicate edges produce observable behavior', async () => {
    // This tests how the application handles extra whitespace and duplicate edges.
    // The implementation splits on a single space; extra spaces might produce additional empty tokens.
    // We assert the actual observed behavior (without modifying source).

    // Add an edge with extra spaces; the current implementation uses split(' '), so multiple spaces
    // can create empty tokens. We use "D   E" (three spaces) to observe behavior.
    await adjacencyPage.fillEdge('D   E');
    await adjacencyPage.clickAddEdge();

    // Inspect adjacency list after adding the 'D   E' input
    const objAfterExtraSpaces = await adjacencyPage.getAdjacencyObject();

    // Because input.split(' ') yields tokens including empty strings, behavior can vary.
    // At minimum, the code will have attempted to read node1 and node2 as the first two tokens.
    // We assert that either 'D' and 'E' were added properly OR that some keys exist (test documents behavior).
    // Rather than enforcing a specific normalization, assert that adjacency display is a JSON object (parsable).
    expect(typeof objAfterExtraSpaces).toBe('object');

    // Now add the same exact edge again to observe duplicates
    await adjacencyPage.fillEdge('D E');
    await adjacencyPage.clickAddEdge();

    const objAfterDuplicate = await adjacencyPage.getAdjacencyObject();

    // If the implementation allows duplicates, arrays for D and E may have repeated entries.
    // Verify that D and E exist and are arrays; duplicates (length > 1) are acceptable and asserted.
    expect(objAfterDuplicate).toHaveProperty('D');
    expect(objAfterDuplicate).toHaveProperty('E');
    expect(Array.isArray(objAfterDuplicate.D)).toBe(true);
    expect(Array.isArray(objAfterDuplicate.E)).toBe(true);

    // There should be at least one relationship between D and E in both directions
    expect(objAfterDuplicate.D).toContain('E');
    expect(objAfterDuplicate.E).toContain('D');

    // Confirm no pageerrors or console.errors occurred
    expect(pageErrors.length).toBe(0);
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Observe console messages and page errors during interactions (must not patch or change runtime)', async () => {
    // This test explicitly demonstrates collecting console and page errors while interacting
    // with the page. It does not assert that errors must exist; rather it records them and
    // asserts that any severe runtime errors did not occur unexpectedly.

    // Perform an operation: add a valid edge
    await adjacencyPage.fillEdge('X Y');
    await adjacencyPage.clickAddEdge();

    // Allow microtasks to flush
    await page.waitForTimeout(100);

    // Log collected console messages for debugging if necessary (kept as assertions)
    // Assert there were no uncaught page errors
    expect(pageErrors.length).toBe(0, `Expected no uncaught page errors, saw: ${pageErrors.map(e => e.message).join('; ')}`);

    // Assert no console.error messages were emitted during interactions
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0, `Expected no console.error messages, saw: ${errors.map(e => e.text).join('; ')}`);
  });
});