import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a074b-d5a0-11f0-8040-510e90b1f3a7.html';

// PageObject to encapsulate common element selectors and actions
class PrimPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.addNodeBtn = page.locator('#addNodeBtn');
    this.runAlgorithmBtn = page.locator('#runAlgorithmBtn');
    this.nextStepBtn = page.locator('#nextStepBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.randomGraphBtn = page.locator('#randomGraphBtn');
    this.nodeCountInput = page.locator('#nodeCount');
    this.stepInfo = page.locator('#stepInfo');
    this.logs = page.locator('#logs');
    this.canvas = page.locator('#graphCanvas');
    this.heading = page.locator('h1');
    this.description = page.locator('.description');
  }

  // Click helpers
  async clickAddNode() {
    await this.addNodeBtn.click();
  }
  async clickRunAlgorithm() {
    await this.runAlgorithmBtn.click();
  }
  async clickNextStep() {
    await this.nextStepBtn.click();
  }
  async clickReset() {
    await this.resetBtn.click();
  }
  async clickRandomGraph() {
    await this.randomGraphBtn.click();
  }

  // Read helpers
  async getStepInfoText() {
    return (await this.stepInfo.innerText()).trim();
  }
  async getLogsText() {
    return (await this.logs.innerText()).trim();
  }
}

test.describe("Prim's Algorithm Visualization - end-to-end checks", () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Collect console and page errors so tests can assert on them.
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      // Collect pageerrors (uncaught exceptions such as SyntaxError)
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // Capture console messages of type 'error' and others for inspection
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push({ type: msg.type(), text: msg.text() });
      }
    });

    // Open the page and wait for load; the page's inline <script> is intentionally broken
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Give the page a short moment to emit any console/page errors from parsing scripts
    await page.waitForTimeout(300);
  });

  test.afterEach(async ({ page }) => {
    // Remove listeners to avoid cross-test interference (Playwright will remove page on test end,
    // but we clear arrays to be explicit)
    page.removeAllListeners && page.removeAllListeners('pageerror');
    page.removeAllListeners && page.removeAllListeners('console');
    pageErrors = [];
    consoleErrors = [];
  });

  test('Initial page load shows static UI elements and placeholder content', async ({ page }) => {
    // Purpose: Verify that the static HTML is present and initial placeholder texts are visible,
    // even if the script fails to execute.
    const prim = new PrimPage(page);

    // Heading and description exist
    await expect(prim.heading).toHaveText("Prim's Algorithm Visualization");
    await expect(prim.description).toHaveText(/Prim's Algorithm finds a Minimum Spanning Tree/i);

    // Control buttons exist and are visible
    await expect(prim.addNodeBtn).toBeVisible();
    await expect(prim.runAlgorithmBtn).toBeVisible();
    await expect(prim.nextStepBtn).toBeVisible();
    await expect(prim.resetBtn).toBeVisible();
    await expect(prim.randomGraphBtn).toBeVisible();

    // Node count input exists with default value 5
    await expect(prim.nodeCountInput).toBeVisible();
    await expect(prim.nodeCountInput).toHaveValue('5');

    // Canvas exists and has width/height attributes set
    await expect(prim.canvas).toBeVisible();
    const width = await prim.canvas.getAttribute('width');
    const height = await prim.canvas.getAttribute('height');
    expect(width).toBe('800');
    expect(height).toBe('500');

    // The step info shows the initial placeholder text from the HTML (script did not overwrite it)
    const stepText = await prim.getStepInfoText();
    expect(stepText).toContain('Click "Run Prim\'s Algorithm" to start the visualization.');

    // Logs are present and empty initially
    const logsText = await prim.getLogsText();
    expect(logsText).toBe('');
  });

  test('A SyntaxError or script parse error is emitted on page load due to truncated script', async ({ page }) => {
    // Purpose: The included inline script in the HTML is intentionally truncated (missing closing braces),
    // so the browser should raise a parse/ SyntaxError. We assert that at least one pageerror or console error
    // was reported and that the message indicates a syntax/script parse problem.
    // This test observes runtime errors without patching the page.

    // At least one page error should be present
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // The message should indicate a syntax or unexpected end/token; allow a few variants
    const combinedMessages = pageErrors.map(e => String(e && e.message)).join(' || ');
    const hasSyntaxLike = /SyntaxError|Unexpected end|Unexpected token|Unexpected identifier/i.test(combinedMessages);
    expect(hasSyntaxLike).toBeTruthy();

    // Additionally, check console errors captured (if any) and assert presence of error-like messages
    const consoleText = consoleErrors.map(e => e.text).join(' || ');
    const consoleHasSyntaxLike = /SyntaxError|Unexpected end|Unexpected token|Unexpected identifier/i.test(consoleText);
    // Either pageerror or console error should indicate parse problem; at minimum pageerror already asserted.
    expect(consoleHasSyntaxLike || hasSyntaxLike).toBeTruthy();
  });

  test('Clicking interactive controls does not change algorithm UI because script failed to attach handlers', async ({ page }) => {
    // Purpose: Because the script failed during parse, event listeners are not attached.
    // Clicking buttons should not cause the dynamic behavior (no logs added, placeholder text stays).
    const prim = new PrimPage(page);

    // Confirm initial state
    const initialStep = await prim.getStepInfoText();
    expect(initialStep).toContain('Click "Run Prim\'s Algorithm" to start the visualization.');
    expect(await prim.getLogsText()).toBe('');

    // Try clicking Add Node, Run Algorithm, Random Graph, Next Step, Reset
    await prim.clickAddNode();
    await prim.clickRunAlgorithm();
    await prim.clickRandomGraph();
    await prim.clickNextStep();
    await prim.clickReset();

    // Wait briefly to ensure no script would have reacted (if it were present)
    await page.waitForTimeout(200);

    // State should remain unchanged (no added logs, step info the same as static HTML)
    const afterStep = await prim.getStepInfoText();
    expect(afterStep).toContain('Click "Run Prim\'s Algorithm" to start the visualization.');

    const afterLogs = await prim.getLogsText();
    expect(afterLogs).toBe('');
  });

  test('Edge-case: invalid nodeCount input does not trigger validation logic because script is not executing', async ({ page }) => {
    // Purpose: The UI has an input for node count and the script would normally validate it.
    // Since the script didn't load, changing the input should only change the input value itself,
    // but not cause alerts or updates to stepInfo.
    const prim = new PrimPage(page);

    // Set an invalid value outside of 3-10 range and assert only the input changes
    await prim.nodeCountInput.fill('20');
    await expect(prim.nodeCountInput).toHaveValue('20');

    // There should be no alert (can't assert dialogs since none should appear), and stepInfo remains initial
    const stepText = await prim.getStepInfoText();
    expect(stepText).toContain('Click "Run Prim\'s Algorithm" to start the visualization.');

    // Reset input to a valid value programmatically and verify
    await prim.nodeCountInput.fill('4');
    await expect(prim.nodeCountInput).toHaveValue('4');
  });

  test('Accessibility and visibility basics: legend items are present and readable', async ({ page }) => {
    // Purpose: Ensure the static legend and labels are present even if JS failed.
    const legendItems = page.locator('.legend-item');
    await expect(legendItems).toHaveCount(4);

    // Check that each legend entry contains expected text pieces
    await expect(page.locator('.legend-item >> text=Visited Node')).toBeVisible();
    await expect(page.locator('.legend-item >> text=Unvisited Node')).toBeVisible();
    await expect(page.locator('.legend-item >> text=MST Edge')).toBeVisible();
    await expect(page.locator('.legend-item >> text=Candidate Edge')).toBeVisible();
  });
});