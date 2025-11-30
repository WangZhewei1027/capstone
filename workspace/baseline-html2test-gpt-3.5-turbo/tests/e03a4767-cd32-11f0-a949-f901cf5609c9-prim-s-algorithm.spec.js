import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a4767-cd32-11f0-a949-f901cf5609c9.html';

// Page Object Model for the Prim's Algorithm page
class PrimPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numVertices = page.locator('#numVertices');
    this.generateBtn = page.locator('#generateGraphBtn');
    this.startBtn = page.locator('#startBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.statusText = page.locator('#statusText');
    this.graphInfo = page.locator('#graphInfo');
    this.canvas = page.locator('#graphCanvas');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setNumVertices(n) {
    await this.numVertices.fill(String(n));
  }

  async clickGenerate(expectDialog = false) {
    if (expectDialog) {
      const dialogPromise = this.page.waitForEvent('dialog');
      await this.generateBtn.click();
      const dialog = await dialogPromise;
      return dialog;
    } else {
      await this.generateBtn.click();
      return null;
    }
  }

  async clickStart(expectDialog = false) {
    if (expectDialog) {
      const dialogPromise1 = this.page.waitForEvent('dialog');
      await this.startBtn.click();
      const dialog1 = await dialogPromise;
      return dialog;
    } else {
      await this.startBtn.click();
      return null;
    }
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async getStatusText() {
    return (await this.statusText.textContent())?.trim();
  }

  async getGraphInfoHtml() {
    return (await this.graphInfo.innerHTML())?.trim();
  }

  async isStartEnabled() {
    return !(await this.startBtn.getAttribute('disabled'));
  }

  async isStepEnabled() {
    return !(await this.stepBtn.getAttribute('disabled'));
  }

  async isResetEnabled() {
    return !(await this.resetBtn.getAttribute('disabled'));
  }

  async canvasIsVisible() {
    return await this.canvas.isVisible();
  }
}

test.describe("Prim's Algorithm Visualization - e03a4767-cd32-11f0-a949-f901cf5609c9", () => {
  // Collect console errors and page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test('Initial load: UI elements present and default state is correct', async ({ page }) => {
    // Purpose: Verify initial page load and default UI state before any interaction
    const prim = new PrimPage(page);
    await prim.goto();

    // Basic presence checks
    await expect(page.locator('h1')).toHaveText("Prim's Algorithm");
    await expect(prim.numVertices).toHaveValue('6'); // default value from HTML
    await expect(prim.generateBtn).toBeVisible();
    await expect(prim.startBtn).toBeVisible();
    await expect(prim.stepBtn).toBeVisible();
    await expect(prim.resetBtn).toBeVisible();
    await expect(prim.canvas).toBeVisible();

    // Status and controls disabled state
    await expect(prim.statusText).toHaveText('Click "Generate Random Graph" to begin.');
    expect(await prim.isStartEnabled()).toBe(false);
    expect(await prim.isStepEnabled()).toBe(false);
    expect(await prim.isResetEnabled()).toBe(false);

    // graphInfo initially empty
    const gi = await prim.getGraphInfoHtml();
    expect(gi).toBe('');

    // No console errors or page errors on initial load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Generate graph with invalid vertex count triggers alert and does not generate', async ({ page }) => {
    // Purpose: Validate input validation - invalid number (2) should trigger alert
    const prim1 = new PrimPage(page);
    await prim.goto();

    await prim.setNumVertices(2);

    // Expect an alert dialog and verify its message
    const dialogPromise2 = page.waitForEvent('dialog');
    await prim.generateBtn.click();
    const dialog2 = await dialogPromise;
    expect(dialog.message()).toContain('Please enter a number of vertices between 3 and 12.');
    await dialog.accept();

    // Controls should remain in initial state after invalid input
    expect(await prim.isStartEnabled()).toBe(false);
    expect(await prim.isStepEnabled()).toBe(false);
    expect(await prim.isResetEnabled()).toBe(false);
    expect(await prim.getGraphInfoHtml()).toBe('');

    // No console errors or page errors produced by invalid input handling
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Generate a valid random graph updates graph info and enables start', async ({ page }) => {
    // Purpose: Generate a graph with n=5 and verify UI updates accordingly
    const prim2 = new PrimPage(page);
    await prim.goto();

    await prim.setNumVertices(5);

    const dialog3 = await prim.clickGenerate(false); // should not produce a dialog3
    expect(dialog).toBeNull();

    // Graph info should mention 5 vertices
    await expect(prim.graphInfo).toContainText('Vertices: 5');

    // There should be at least (n-1) edges due to connected chain creation
    const giHtml = await prim.getGraphInfoHtml();
    // Extract edges count from graphInfo HTML (format: "Edges: X")
    const edgesMatch = giHtml.match(/Edges:\s*(\d+)/);
    expect(edgesMatch).not.toBeNull();
    const edgesCount = Number(edgesMatch[1]);
    expect(edgesCount).toBeGreaterThanOrEqual(4); // for n=5, at least 4

    // Buttons: start enabled, others disabled/enabled per implementation
    expect(await prim.isStartEnabled()).toBe(true);
    expect(await prim.isStepEnabled()).toBe(false);
    expect(await prim.isResetEnabled()).toBe(false);

    // Status text updated to reflect generation
    const status = await prim.getStatusText();
    expect(status).toContain('Random connected graph generated with 5 vertices');

    // No console errors or page errors after generation
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Start initializes Prim state and enables stepping', async ({ page }) => {
    // Purpose: After generating a graph, clicking Start should initialize Prim's algorithm state
    const prim3 = new PrimPage(page);
    await prim.goto();

    // Generate with default 6 vertices
    await prim.clickGenerate(false);

    // Click Start (should initialize and enable step/reset)
    await prim.clickStart(false);

    // start button should be disabled now, step and reset enabled
    expect(await prim.isStartEnabled()).toBe(false);
    expect(await prim.isStepEnabled()).toBe(true);
    expect(await prim.isResetEnabled()).toBe(true);

    // Status should indicate starting from vertex 0
    await expect(prim.statusText).toContainText('Starting from vertex 0');

    // Canvas should remain visible after initialization
    expect(await prim.canvasIsVisible()).toBe(true);

    // No console errors or page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Step through algorithm until MST is complete and validate final state', async ({ page }) => {
    // Purpose: Perform repeated steps and assert algorithm completes with expected number of edges
    const prim4 = new PrimPage(page);
    await prim.goto();

    // Generate a graph with a small deterministic vertex count (like 4 or 5)
    await prim.setNumVertices(4);
    await prim.clickGenerate(false);

    // Start algorithm
    await prim.clickStart(false);

    // Step repeatedly until the status shows completion or step button becomes disabled
    // Limit the number of steps to avoid infinite loops in case of unexpected behavior
    const maxAttempts = 12;
    let attempts = 0;
    let completed = false;
    while (attempts < maxAttempts) {
      attempts++;
      // Click step if enabled
      if (await prim.isStepEnabled()) {
        await prim.clickStep();
      }

      const status1 = await prim.getStatusText();
      if (status && status.includes('All vertices included. MST complete')) {
        completed = true;
        // Extract Total edges if present
        const totalEdgesMatch = status.match(/Total edges:\s*(\d+)/);
        if (totalEdgesMatch) {
          const totalEdges = Number(totalEdgesMatch[1]);
          // For n=4, MST edges should be 3
          expect(totalEdges).toBeGreaterThanOrEqual(0);
          // Assert specifically equals n-1 if value is present
          expect(totalEdges).toBe(4 - 1);
        }
        break;
      }

      // small wait to allow DOM updates
      await page.waitForTimeout(80);
    }

    expect(completed).toBe(true);
    // After completion, step button should be disabled and start disabled
    expect(await prim.isStepEnabled()).toBe(false);
    expect(await prim.isStartEnabled()).toBe(false);

    // Canvas still present and graphInfo still contains vertices/edges info
    expect(await prim.canvasIsVisible()).toBe(true);
    const giHtml1 = await prim.getGraphInfoHtml();
    expect(giHtml).toMatch(/Vertices:\s*4/);

    // No console errors or page errors during stepping and completion
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Reset returns algorithm to pre-start state while preserving generated graph', async ({ page }) => {
    // Purpose: Ensure reset clears algorithm state but does not remove generated graph info
    const prim5 = new PrimPage(page);
    await prim.goto();

    // Generate graph
    await prim.setNumVertices(5);
    await prim.clickGenerate(false);

    // Start and perform one step
    await prim.clickStart(false);
    if (await prim.isStepEnabled()) {
      await prim.clickStep();
    }

    // Click reset - should reset algorithm controls
    await prim.clickReset();

    // After reset, start should be enabled again, step/reset disabled
    expect(await prim.isStartEnabled()).toBe(true);
    expect(await prim.isStepEnabled()).toBe(false);
    expect(await prim.isResetEnabled()).toBe(false);

    // Status text should reflect reset message
    const status2 = await prim.getStatusText();
    expect(status).toContain('Reset algorithm state');

    // Graph info should still reflect previously generated graph (vertices/edges remain)
    const giHtml2 = await prim.getGraphInfoHtml();
    expect(giHtml).toContain('Vertices: 5');
    expect(giHtml).toMatch(/Edges:\s*\d+/);

    // No console errors or page errors during reset
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Generating maximum allowed vertices (12) succeeds and updates UI', async ({ page }) => {
    // Purpose: Edge case test for upper bound of vertices input
    const prim6 = new PrimPage(page);
    await prim.goto();

    await prim.setNumVertices(12);
    await prim.clickGenerate(false);

    // Verify graphInfo shows 12 vertices
    await expect(prim.graphInfo).toContainText('Vertices: 12');

    // start should be enabled
    expect(await prim.isStartEnabled()).toBe(true);

    // No console errors or page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('No unexpected console errors or page errors occurred during typical interactions', async ({ page }) => {
    // Purpose: Aggregate test to observe console and page errors through a set of typical interactions
    const prim7 = new PrimPage(page);
    await prim.goto();

    // Typical interaction sequence
    await prim.setNumVertices(6);
    await prim.clickGenerate(false);
    await prim.clickStart(false);

    // perform a couple of steps if enabled
    for (let i = 0; i < 3; i++) {
      if (await prim.isStepEnabled()) {
        await prim.clickStep();
        await page.waitForTimeout(50);
      }
    }

    // Now assert that there were no console errors or uncaught page errors captured
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});