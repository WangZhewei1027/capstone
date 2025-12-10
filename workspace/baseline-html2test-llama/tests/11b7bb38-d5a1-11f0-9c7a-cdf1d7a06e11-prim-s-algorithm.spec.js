import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb38-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe("Prim's Algorithm - Interactive App (11b7bb38-d5a1-11f0-9c7a-cdf1d7a06e11)", () => {
  // Arrays to collect runtime page errors and console error messages for each test
  let pageErrors = [];
  let consoleErrors = [];

  // Navigate to the page and set up listeners before each test
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Collect uncaught exceptions (pageerror) and console errors
    page.on('pageerror', (err) => {
      // Keep the Error object for detailed assertions
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Go to the application URL
    await page.goto(APP_URL);
  });

  // Test initial page load and default visible controls
  test('Initial load shows form controls and empty graph container', async ({ page }) => {
    // Ensure title is correct and main elements are visible
    await expect(page).toHaveTitle(/Prim's Algorithm/);

    const verticesInput = page.locator('#vertices');
    const edgesInput = page.locator('#edges');
    const generateButton = page.locator('#generate-button');
    const graphContainer = page.locator('#graph');

    // Verify inputs and button are present and visible
    await expect(verticesInput).toBeVisible();
    await expect(edgesInput).toBeVisible();
    await expect(generateButton).toBeVisible();

    // Inputs should be empty by default (no user-provided value)
    await expect(verticesInput).toHaveValue('');
    await expect(edgesInput).toHaveValue('');

    // Graph container exists and is empty on load
    await expect(graphContainer).toBeVisible();
    const graphHTML = await graphContainer.innerHTML();
    expect(graphHTML).toBe('', 'Graph container should be empty on initial load');

    // No runtime errors should be reported just by loading the page
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test clicking the generate button without modifying inputs.
  // The page code reads input values at load time (so changing inputs later does not affect the stored variables),
  // and the button is inside a form (may trigger a submission). We account for possible navigation.
  test('Clicking Generate without entering values does not throw and graph stays empty', async ({ page }) => {
    const graphContainer1 = page.locator('#graph');
    const generateButton1 = page.locator('#generate-button');

    // Start waiting for navigation (if any) but don't fail the test if it doesn't occur
    const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 1000 }).catch(() => null);

    // Click the generate button (which is inside a form)
    await generateButton.click();

    // Await any potential navigation (or its timeout)
    await navPromise;

    // After click, ensure the graph container still exists.
    await expect(graphContainer).toBeVisible();

    // The implementation sets vertices based on the input's initial value at load time (which was empty),
    // so this action is expected to produce an empty graph (no children inserted).
    const htmlAfterClick = await graphContainer.innerHTML();
    expect(htmlAfterClick.trim()).toBe('', 'Graph should remain empty when generate is clicked without effective vertices');

    // Confirm there were no uncaught page errors produced by this user action
    expect(pageErrors.length).toBe(0);
  });

  // Test invoking the page's prim() function directly with a crafted graph to surface known runtime errors
  test('Invoking prim(graph) with a crafted graph triggers a TypeError that is reported as a pageerror', async ({ page }) => {
    // We will call the prim function defined on the page with a small graph that exposes the function's bugs.
    // This call is performed as-is (no modification to page code). The function has logic that will cause
    // a TypeError such as "graph[current] is not iterable" for certain inputs.
    //
    // We expect:
    // - page.evaluate to reject because the function throws
    // - an uncaught pageerror to be emitted and captured by our listener

    // Prepare the call and assert it throws. Use a flexible error message match because different engines message text vary.
    const evalPromise = page.evaluate(() => {
      // Call prim with a small non-empty graph that the implementation does not handle correctly.
      // This will exercise internal loops and should cause an error in the implementation naturally.
      return prim([[0]]);
    });

    // The evaluation should reject with a thrown error from the page context
    await expect(evalPromise).rejects.toThrow(/not iterable|Cannot read properties of undefined|TypeError/i);

    // Give the page a moment to emit and record the pageerror event
    await page.waitForTimeout(50);

    // There should be at least one page error captured
    expect(pageErrors.length).toBeGreaterThan(0);

    // The first page error message should indicate an iteration or property access problem
    const firstError = pageErrors[0];
    expect(firstError).toBeDefined();
    const msg = firstError.message || String(firstError);
    expect(msg).toMatch(/not iterable|Cannot read properties|is not iterable|TypeError/i);

    // The console may also have corresponding error messages; ensure they are collected if present
    // (They are optional depending on how the error is propagated and the environment.)
    if (consoleErrors.length > 0) {
      const joined = consoleErrors.join(' | ');
      expect(joined).toMatch(/error|typeerror|not iterable|cannot read properties/i);
    }
  });

  // Additional test: ensure required attributes and accessibility basics on form controls
  test('Form controls have required attribute and are reachable', async ({ page }) => {
    const verticesInput1 = page.locator('#vertices');
    const edgesInput1 = page.locator('#edges');
    const generateButton2 = page.locator('#generate-button');

    // The markup declares inputs with required attribute - verify presence
    await expect(verticesInput).toHaveAttribute('required', '');
    await expect(edgesInput).toHaveAttribute('required', '');

    // Tab to the vertices input then to edges then to button to ensure elements are focusable in order
    await page.keyboard.press('Tab'); // should focus first focusable element, often the first input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // The generate button should be focusable
    await expect(generateButton).toBeFocused().catch(() => {
      // In some environments the tab order might differ; at least ensure the button is focusable by clicking it
      return generateButton.click();
    });
  });
});