import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a074c-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('Topological Sort Visualization (Application ID: 6e0a074c-d5a0-11f0-8040-510e90b1f3a7)', () => {
  // Helper to attach listeners to capture console messages and page errors
  async function attachLogListeners(page) {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // Capture uncaught exceptions (ReferenceError, SyntaxError, TypeError, etc.)
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    return { consoleMessages, pageErrors };
  }

  test('Initial page load: default input executes topological sort and renders visualization', async ({ page }) => {
    // Attach listeners to capture any console output or uncaught page errors during load and execution.
    const { consoleMessages, pageErrors } = await attachLogListeners(page);

    // Load the page and wait for the window.onload initialization to complete.
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait until the result container has the "Topological Order" text - initial run is invoked on window.onload.
    const resultLocator = page.locator('#result');
    await expect(resultLocator).toContainText('Topological Order', { timeout: 3000 });

    // Assert that the expected topological order for the default example appears.
    // The default input in the textarea is:
    // A->B
    // B->C
    // A->D
    // D->C
    // The implementation (Kahn's) with insertion order produces: A → B → D → C
    await expect(resultLocator).toContainText('A → B → D → C');

    // Verify that a node element was created for each node (A, B, C, D)
    const nodeLocator = page.locator('.graph-container .node, #graphContainer .node, .node'); // fallback selectors
    await expect(nodeLocator).toHaveCount(4);

    // Extract node labels and ensure expected nodes present
    const nodeTexts = await nodeLocator.allTextContents();
    expect(nodeTexts.sort()).toEqual(['A', 'B', 'C', 'D'].sort());

    // Verify edges/arrows were created for each directed edge (4 edges and 4 arrowheads)
    const edgeLocator = page.locator('.edge');
    const arrowLocator = page.locator('.arrow');
    await expect(edgeLocator).toHaveCount(4);
    await expect(arrowLocator).toHaveCount(4);

    // The step-by-step execution should be populated; first step mentions initial nodes with in-degree 0.
    const firstStep = page.locator('#steps .step').first();
    await expect(firstStep).toContainText('Initial nodes with in-degree 0');
    await expect(firstStep).toContainText('A'); // A should be initially listed

    // Ensure no uncaught page errors occurred during page load and processing.
    // This verifies that any ReferenceError/SyntaxError/TypeError DID NOT escape to the global handler.
    expect(pageErrors.length, `Uncaught page errors detected: ${pageErrors.join('; ')}`).toBe(0);

    // Also assert that there were no console messages of type 'error' (unexpected runtime errors logged)
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Console errors were logged: ${JSON.stringify(consoleErrors)}`).toBe(0);
  });

  test('Performing topological sort after user input: detects cycles and shows styled error', async ({ page }) => {
    // This test verifies error handling when a cycle exists in the input graph.
    const { consoleMessages, pageErrors } = await attachLogListeners(page);

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Replace textarea content with a cyclic graph: X->Y, Y->Z, Z->X
    const inputLocator = page.locator('#graphInput');
    await inputLocator.fill('X->Y\nY->Z\nZ->X');

    // Click the perform button
    const performButton = page.getByRole('button', { name: 'Perform Topological Sort' });
    await performButton.click();

    // The UI catches the thrown Error and writes it into #result. Assert the error is displayed.
    const resultLocator = page.locator('#result');
    await expect(resultLocator).toContainText('Error:');
    await expect(resultLocator).toContainText('Graph has a cycle');

    // Verify the result element was styled to indicate an error (background and left border were set)
    // We check computed style values since the JS sets style.backgroundColor/borderLeftColor.
    const computed = await resultLocator.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        backgroundColor: s.backgroundColor,
        borderLeftColor: s.borderLeftColor
      };
    });

    // The hex #ffe6e6 becomes rgb(255, 230, 230). Accept that exact rgb conversion.
    expect(computed.backgroundColor).toBe('rgb(255, 230, 230)');
    // #ff4444 becomes rgb(255, 68, 68)
    expect(computed.borderLeftColor).toBe('rgb(255, 68, 68)');

    // Ensure that the UI did not produce any uncaught page errors — the algorithm throws but it's caught and displayed.
    expect(pageErrors.length, `Unexpected uncaught page errors: ${pageErrors.join('; ')}`).toBe(0);

    // Ensure the console did not log unexpected errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Console errors were logged: ${JSON.stringify(consoleErrors)}`).toBe(0);
  });

  test('User can update input to another DAG and re-run: visualization and steps update accordingly', async ({ page }) => {
    // This test updates the graph input to a new acyclic graph and verifies DOM updates.
    const { consoleMessages, pageErrors } = await attachLogListeners(page);

    await page.goto(APP_URL, { waitUntil: 'load' });

    // New DAG: 1->2, 1->3, 2->3 => expected topological order 1 → 2 → 3
    const inputLocator = page.locator('#graphInput');
    await inputLocator.fill('1->2\n1->3\n2->3');

    // Click the perform button to re-run the algorithm.
    const performButton = page.getByRole('button', { name: 'Perform Topological Sort' });
    await performButton.click();

    // Verify new result appears and contains the expected ordering
    const resultLocator = page.locator('#result');
    await expect(resultLocator).toContainText('Topological Order');
    await expect(resultLocator).toContainText('1 → 2 → 3');

    // Visualization should now show exactly 3 nodes and 3 edges/arrows
    const nodes = page.locator('.node');
    await expect(nodes).toHaveCount(3);

    const edgeLocator = page.locator('.edge');
    const arrowLocator = page.locator('.arrow');
    await expect(edgeLocator).toHaveCount(3);
    await expect(arrowLocator).toHaveCount(3);

    // Steps should include initial nodes with in-degree 0 and the processing steps mentioning '1'
    const firstStep = page.locator('#steps .step').first();
    await expect(firstStep).toContainText('Initial nodes with in-degree 0');
    await expect(firstStep).toContainText('1');

    // Ensure no uncaught page errors occurred
    expect(pageErrors.length, `Uncaught page errors detected: ${pageErrors.join('; ')}`).toBe(0);

    // Also ensure no console errors were recorded
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Console errors were logged: ${JSON.stringify(consoleErrors)}`).toBe(0);
  });

  test('Accessibility and interactive controls exist: textarea placeholder, perform button role', async ({ page }) => {
    // This test verifies presence and basic accessibility attributes of interactive controls.
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Textarea exists and has a placeholder attribute matching the example
    const inputLocator = page.locator('#graphInput');
    await expect(inputLocator).toBeVisible();
    await expect(inputLocator).toHaveAttribute('placeholder', /A->B/);

    // The perform button is focusable and available via role
    const performButton = page.getByRole('button', { name: 'Perform Topological Sort' });
    await expect(performButton).toBeVisible();
    await expect(performButton).toBeEnabled();

    // Test keyboard interaction: focus the button and press Enter to trigger it
    await performButton.focus();
    await page.keyboard.press('Enter');

    // After pressing Enter, ensure result section still displays something (algorithm ran)
    const resultLocator = page.locator('#result');
    await expect(resultLocator).toBeVisible();
    await expect(resultLocator).toContainText('Topological Order');

    // No uncaught page errors should be present after interacting via keyboard
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));
    expect(pageErrors.length).toBe(0);
  });
});