import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f74321-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe("Kruskal's Algorithm - interactive app (90f74321-d5a1-11f0-80b9-e1f86cea383f)", () => {
  // Navigate to the page before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  // Test initial page load and default state of the DOM
  test('Initial page load: inputs, buttons and graph container are present and empty', async ({ page }) => {
    // Ensure title and main heading are present
    await expect(page).toHaveTitle(/Kruskal/i);
    const heading = page.locator('h1');
    await expect(heading).toHaveText("Kruskal's Algorithm");

    // Inputs and buttons should be visible and empty
    const verticesInput = page.locator('#vertices');
    const edgesInput = page.locator('#edges');
    const calculateButton = page.locator('#calculate');
    const displayButton = page.locator('#display');
    const graphDiv = page.locator('#graph');

    await expect(verticesInput).toBeVisible();
    await expect(edgesInput).toBeVisible();
    await expect(calculateButton).toBeVisible();
    await expect(displayButton).toBeVisible();
    await expect(graphDiv).toBeVisible();

    // Inputs should have empty values by default
    await expect(verticesInput).toHaveValue('');
    await expect(edgesInput).toHaveValue('');
    // Graph container should be empty at start
    await expect(graphDiv).toHaveJSProperty('innerHTML', '');
  });

  // Test the alert behavior when inputs are less than minimum required (vertices < 3 or edges < 3)
  test('Clicking Calculate with vertices or edges < 3 shows an alert and prevents further processing', async ({ page }) => {
    const verticesInput1 = page.locator('#vertices');
    const edgesInput1 = page.locator('#edges');
    const calculateButton1 = page.locator('#calculate');
    const graphDiv1 = page.locator('#graph');

    // Fill inputs with values less than 3 to trigger alert
    await verticesInput.fill('2');
    await edgesInput.fill('1');

    // Capture the dialog (alert) and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      calculateButton.click()
    ]);
    expect(dialog).toBeTruthy();
    // The application alerts a specific message in this case
    expect(dialog.message()).toContain('Minimum number of vertices and edges are 3');
    await dialog.dismiss();

    // Ensure that no modifications were made to the graph container after the alert
    await expect(graphDiv).toHaveJSProperty('innerHTML', '');
  });

  // Test clicking Calculate with valid inputs - we expect runtime errors to happen naturally in the page script
  test('Clicking Calculate with valid numeric inputs should run the algorithm code and produce runtime errors (observed as page errors)', async ({ page }) => {
    const verticesInput2 = page.locator('#vertices');
    const edgesInput2 = page.locator('#edges');
    const calculateButton2 = page.locator('#calculate');
    const graphDiv2 = page.locator('#graph');

    // Provide valid inputs (>= 3) so the code path that attempts to build/modify arrays runs
    await verticesInput.fill('4');
    await edgesInput.fill('4');

    // Wait for a pageerror event which is expected due to issues in the implementation (TypeError/ReferenceError/etc.)
    const [pageError] = await Promise.all([
      page.waitForEvent('pageerror'),
      calculateButton.click()
    ]);

    // Assert that an error occurred and its message indicates a typical JS runtime problem
    expect(pageError).toBeTruthy();
    expect(pageError.message).toMatch(/(TypeError|ReferenceError|SyntaxError|Cannot read properties|Cannot set properties|is not a function)/i);

    // Because the script errors while manipulating structures, the graph container should remain unchanged (no DOM produced)
    await expect(graphDiv).toHaveJSProperty('innerHTML', '');
  });

  // Test clicking Display button directly - displayGraph is wired to the click handler and is expected to receive the event instead of a graph array
  // This should produce a runtime error (e.g., trying to call forEach on the event object)
  test('Clicking Display without prior valid graph should raise a runtime error (displayGraph called with wrong argument)', async ({ page }) => {
    const displayButton1 = page.locator('#display');
    const graphDiv3 = page.locator('#graph');

    // Clicking display will call displayGraph with the MouseEvent object -> code attempts to call forEach on it, causing TypeError
    const [pageError] = await Promise.all([
      page.waitForEvent('pageerror'),
      displayButton.click()
    ]);

    expect(pageError).toBeTruthy();
    // Ensure error message corresponds to typical "forEach is not a function" or property access issues
    expect(pageError.message).toMatch(/(TypeError|is not a function|forEach|Cannot read properties|Cannot set properties)/i);

    // Graph container should still be empty or unchanged
    await expect(graphDiv).toHaveJSProperty('innerHTML', '');
  });

  // Test combination: call calculate (causing errors) then click display - ensure page errors are observed for both actions
  test('Calling Calculate then Display produces one or more page errors (errors happen naturally and are observed)', async ({ page }) => {
    const verticesInput3 = page.locator('#vertices');
    const edgesInput3 = page.locator('#edges');
    const calculateButton3 = page.locator('#calculate');
    const displayButton2 = page.locator('#display');

    await verticesInput.fill('3');
    await edgesInput.fill('3');

    // Collect errors emitted during calculate and display clicks
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    // Click calculate and wait a short time for errors to surface
    await calculateButton.click();
    // Click display afterwards to exercise the displayGraph click-binding
    await displayButton.click();

    // Allow a brief moment for asynchronous errors to be emitted
    await page.waitForTimeout(250);

    // We expect at least one error to have occurred across these interactions
    expect(errors.length).toBeGreaterThanOrEqual(1);
    // Every captured error should have a message indicating a JS runtime problem
    for (const err of errors) {
      expect(err.message).toMatch(/(TypeError|ReferenceError|SyntaxError|Cannot read properties|is not a function|Cannot set properties)/i);
    }
  });
});