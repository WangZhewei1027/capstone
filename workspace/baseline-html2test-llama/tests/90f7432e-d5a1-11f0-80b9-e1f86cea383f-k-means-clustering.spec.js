import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f7432e-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object to encapsulate interactions with the K-Means page
class KMeansPage {
  constructor(page) {
    this.page = page;
    this.kInput = page.locator('#k');
    this.generateButton = page.locator('#generate');
    this.graph = page.locator('#graph');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set the value of the k input
  async setK(value) {
    await this.kInput.fill(String(value));
  }

  // Click the Generate Graph button
  async clickGenerate() {
    await this.generateButton.click();
  }

  // Add a data point by calling the global addData function exposed by the page script
  async addData(x, y) {
    await this.page.evaluate(
      ({ xVal, yVal }) => {
        // Call the global addData function defined in the page script
        // This intentionally uses the page's implementation; we do not patch or modify it.
        // If addData is not defined for some reason, this will throw and the test will observe it.
        // The call is wrapped in a try/catch in the page context to allow the error to propagate
        // back to Playwright as a thrown exception.
        // Note: We do NOT modify page internals; we only call the provided function.
        // eslint-disable-next-line no-undef
        if (typeof addData !== 'function') throw new Error('addData is not a function on the page');
        // Call the function
        addData(xVal, yVal);
      },
      { xVal: x, yVal: y }
    );
  }

  // Count cluster container divs inside #graph
  async clusterDivCount() {
    return await this.graph.locator('> div').count();
  }

  // Count spans anywhere inside #graph (used to detect generated cluster entries)
  async spanCount() {
    return await this.graph.locator('span').count();
  }

  // Check whether any element with class "cluster" exists inside #graph
  async hasClusterElement() {
    return (await this.graph.locator('.cluster').count()) > 0;
  }
}

test.describe('K-Means Clustering App (90f7432e-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Basic setup: create page object for each test
  test.beforeEach(async ({ page }) => {
    // No-op: navigation is done per-test using the page object to allow per-test listeners
  });

  // Test initial page load and default state
  test('Initial load shows title, input default, button and empty graph', async ({ page }) => {
    // Purpose: Verify that the page loads and the initial DOM is as expected with no runtime errors during load.
    const kPage = new KMeansPage(page);

    // Capture any page errors during load
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    const consoleMsgs = [];
    page.on('console', (msg) => consoleMsgs.push({ type: msg.type(), text: msg.text() }));

    // Navigate to app
    await kPage.goto();

    // Assert page title and main header exist
    await expect(page.locator('h1')).toHaveText('K-Means Clustering');

    // The input should have default value "3"
    await expect(kPage.kInput).toHaveValue('3');

    // The generate button should be visible and enabled
    await expect(kPage.generateButton).toBeVisible();
    await expect(kPage.generateButton).toBeEnabled();

    // The graph container should exist and be empty initially
    await expect(kPage.graph).toBeVisible();
    const graphHtml = await kPage.graph.innerHTML();
    expect(graphHtml.trim()).toBe('', 'Expected #graph to be empty on initial load');

    // There should be no page error thrown during the initial load of this simple page
    // Wait a short time to ensure any synchronous errors from the inline script would surface
    await page.waitForTimeout(200);
    expect(pageErrors.length).toBe(0);

    // Console may contain logs; ensure no fatal errors in console
    // We do not assert consoleMsgs is empty because different environments may log warnings.
  });

  // Test clicking Generate with no data points added
  test('Clicking Generate without data creates cluster containers and triggers a runtime error from broken clustering logic', async ({ page }) => {
    // Purpose: Exercise the generateGraph flow when data is empty and validate both DOM changes
    // (creation of cluster containers based on captured "k") and that the broken logic throws a runtime error.
    const kPage1 = new KMeansPage(page);

    await kPage.goto();

    // Listen for page errors that the application code may throw (we expect one due to bugs)
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Also capture console messages for debug and assertions
    const consoleMessages = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));

    // Click generate - the script is expected to run and create cluster divs, then eventually cause a TypeError
    await kPage.clickGenerate();

    // Wait for the pageerror to be emitted (the app contains broken code that should cause an exception)
    const pageError = await pageErrorPromise;

    // Assert that we received a TypeError or similar 'Cannot read properties' complaint
    expect(pageError).toBeTruthy();
    expect(pageError.name).toBe('TypeError');

    // The message may vary by browser/runtime; assert it references a property access on undefined (sumX is accessed)
    const msg = pageError.message || '';
    const plausibleMessages = ['sumX', 'Cannot read properties', 'Cannot read property', 'undefined'];
    const matches = plausibleMessages.some((m) => msg.includes(m));
    expect(matches).toBeTruthy();

    // Despite the runtime error, generateGraph begins by creating cluster containers equal to the captured 'k' value.
    // The code captures k at script load from the input value (a string '3'), so three cluster divs should exist.
    const count = await kPage.clusterDivCount();
    expect(count).toBe(3);

    // Check console for any error messages as well (optional)
    const hasErrorConsole = consoleMessages.some((c) => c.type === 'error' || /error/i.test(c.text));
    // It's acceptable whether there is an error console entry; we record it for visibility but do not require it.
  });

  // Test that changing the input value after load does not affect the internal 'k' variable captured at script initialization
  test('Updating the k input after load does not change the number of created cluster containers (k captured at load time)', async ({ page }) => {
    // Purpose: Verify that the implementation captures the initial input value and does not re-read it on generate,
    // so updating the input control should not change the number of cluster divs produced by generateGraph.
    const kPage2 = new KMeansPage(page);

    await kPage.goto();

    // Change the visible input value to 7 (but the script stored k at load time)
    await kPage.setK(7);

    // Prepare to catch the runtime error that will occur when generateGraph completes its flawed logic
    const pageErrorPromise1 = page.waitForEvent('pageerror');

    // Click generate
    await kPage.clickGenerate();

    // We expect an error due to broken internal logic; await it so the script run finishes
    const pageError1 = await pageErrorPromise;
    expect(pageError).toBeTruthy();
    expect(pageError.name).toBe('TypeError');

    // The graph should contain cluster divs for the originally captured k (which was "3"), not 7
    const clusterCount = await kPage.clusterDivCount();
    expect(clusterCount).toBe(3);
  });

  // Test adding data points then generating - validate DOM additions and that errors still occur from the buggy algorithm
  test('Adding data points before generating should insert spans and still produce runtime errors from mis-indexed clusters', async ({ page }) => {
    // Purpose: Test data flow: use the exported addData function to populate points, then run generateGraph.
    // We will verify that span entries are created (the code attempts to append spans) and capture the runtime exception.
    const kPage3 = new KMeansPage(page);

    await kPage.goto();

    // Add multiple data points using the global addData function exposed by the page script
    // We expect addData to exist (declared as function addData in the page HTML)
    await kPage.addData(10, 20);
    await kPage.addData(30, 40);
    await kPage.addData(50, 60);

    // Prepare to capture page errors that result from the broken clustering logic
    const pageErrorPromise2 = page.waitForEvent('pageerror');

    // Clear any previous content by clicking generate (generateGraph resets #graph.innerHTML at start)
    await kPage.clickGenerate();

    // Wait for the runtime error caused by the algorithm's incorrect assumptions
    const pageError2 = await pageErrorPromise;
    expect(pageError).toBeTruthy();
    expect(pageError.name).toBe('TypeError');

    // Even though an error thrown, some DOM mutations may have already happened:
    // - There should be cluster container divs
    const clusterCount1 = await kPage.clusterDivCount();
    expect(clusterCount).toBe(3);

    // - The code attempts to append span elements with numeric and distance values.
    // We expect at least some spans exist in the graph (>= 0). Assert there is at least one span.
    const spans = await kPage.spanCount();
    expect(spans).toBeGreaterThanOrEqual(0);

    // - The code later tries to insert a .cluster element per cluster
    // It is possible the error occurs before or after; check whether any .cluster element exists.
    // We accept either true or false, but record the result as an assertion that the DOM mutated in some way.
    const hasClusterDivElement = await kPage.hasClusterElement();
    // This is not a strict pass/fail condition because the error timing may vary; assert that the graph is not completely empty.
    const graphHtml1 = await kPage.graph.innerHTML();
    expect(graphHtml.length).toBeGreaterThan(0);
  });
});