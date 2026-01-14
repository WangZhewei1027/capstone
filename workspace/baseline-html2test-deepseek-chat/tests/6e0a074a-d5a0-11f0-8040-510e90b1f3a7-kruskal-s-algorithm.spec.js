import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a074a-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object encapsulating selectors and common interactions
class KruskalPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.selectors = {
      header: 'header h1',
      randomGraphBtn: '#random-graph',
      stepByStepBtn: '#step-by-step',
      playBtn: '#play',
      resetBtn: '#reset',
      verticesInput: '#vertices',
      verticesValue: '#vertices-value',
      speedInput: '#speed',
      speedValue: '#speed-value',
      stepDescription: '#step-description',
      mstWeight: '#mst-weight',
      canvas: '#graph-canvas',
      graphContainer: '#graph-container',
      stepInfoBox: '#step-info',
    };
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getHeaderText() {
    return (await this.page.locator(this.selectors.header).textContent())?.trim();
  }

  async clickRandomGraph() {
    await this.page.click(this.selectors.randomGraphBtn);
  }

  async clickStepByStep() {
    await this.page.click(this.selectors.stepByStepBtn);
  }

  async clickPlay() {
    await this.page.click(this.selectors.playBtn);
  }

  async clickReset() {
    await this.page.click(this.selectors.resetBtn);
  }

  async setVertices(value) {
    // Set range input and dispatch input event so the app updates the displayed value
    await this.page.locator(this.selectors.verticesInput).evaluate((el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
  }

  async getVerticesValueText() {
    return (await this.page.locator(this.selectors.verticesValue).textContent())?.trim();
  }

  async setSpeed(value) {
    await this.page.locator(this.selectors.speedInput).evaluate((el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
  }

  async getSpeedValueText() {
    return (await this.page.locator(this.selectors.speedValue).textContent())?.trim();
  }

  async getStepDescription() {
    return (await this.page.locator(this.selectors.stepDescription).textContent())?.trim();
  }

  async getMstWeightText() {
    return (await this.page.locator(this.selectors.mstWeight).textContent())?.trim();
  }

  async getPlayButtonText() {
    return (await this.page.locator(this.selectors.playBtn).textContent())?.trim();
  }

  async canvasHasContext() {
    // Return true if canvas.getContext('2d') is available
    return await this.page.locator(this.selectors.canvas).evaluate((canvas) => {
      try {
        return !!canvas.getContext && !!canvas.getContext('2d');
      } catch {
        return false;
      }
    });
  }

  async waitForAlgorithmCompletion({ timeout = 10000 } = {}) {
    // Wait until step-description contains 'completed' or timeout
    await this.page.waitForFunction(() => {
      const el = document.getElementById('step-description');
      if (!el) return false;
      return el.textContent && el.textContent.toLowerCase().includes('completed');
    }, null, { timeout });
  }
}

test.describe('Kruskal\'s Algorithm Visualization - End-to-End', () => {
  // Collect console errors and page errors during each test
  test.beforeEach(async ({ page }) => {
    // Attach listeners that store console 'error' messages and page errors on the page object for assertions.
    page.context()._kruskal_console_errors = [];
    page.context()._kruskal_page_errors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        page.context()._kruskal_console_errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      // pageerror is a runtime exception (ReferenceError, TypeError, etc.)
      page.context()._kruskal_page_errors.push(String(error));
    });
  });

  test.afterEach(async ({ page }) => {
    // Assert that no console.error messages were emitted during the test
    const consoleErrors = page.context()._kruskal_console_errors || [];
    const pageErrors = page.context()._kruskal_page_errors || [];

    // Provide diagnostic output on failure by attaching them to the assertion messages
    expect(consoleErrors, `Console errors should be empty. Found: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(pageErrors, `Page runtime errors should be empty. Found: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('Initial page load: UI elements are present and default state is correct', async ({ page }) => {
    // Verify initial page state: header, defaults, and canvas context.
    const p = new KruskalPage(page);
    await p.goto();

    // Check header text
    const headerText = await p.getHeaderText();
    expect(headerText).toBe("Kruskal's Algorithm Visualization");

    // Default step description prompt
    const stepDesc = await p.getStepDescription();
    expect(stepDesc).toContain('Click "Step-by-Step" or "Play Animation" to start.');

    // Default MST weight should be 0
    const mstWeight = await p.getMstWeightText();
    expect(mstWeight).toBe('0');

    // Default vertices value should be 8 (as per HTML input value)
    const verticesVal = await p.getVerticesValueText();
    expect(verticesVal).toBe('8');

    // Default speed value should be 'Normal' (speed input default is 3)
    const speedVal = await p.getSpeedValueText();
    expect(speedVal).toBe('Normal');

    // Canvas should be present and support 2d context
    const hasContext = await p.canvasHasContext();
    expect(hasContext).toBe(true);

    // Buttons should be visible and enabled
    await expect(page.locator(p.selectors.randomGraphBtn)).toBeVisible();
    await expect(page.locator(p.selectors.stepByStepBtn)).toBeVisible();
    await expect(page.locator(p.selectors.playBtn)).toBeVisible();
    await expect(page.locator(p.selectors.resetBtn)).toBeVisible();
  });

  test('Interactive controls: vertices and speed sliders update UI labels', async ({ page }) => {
    // Ensure that changing sliders updates UI text and triggers the input events exposed by the app
    const p = new KruskalPage(page);
    await p.goto();

    // Change number of vertices to 10 and assert the label updates
    await p.setVertices(10);
    const verticesVal = await p.getVerticesValueText();
    expect(verticesVal).toBe('10');

    // Change speed to Very Slow (1) and assert label
    await p.setSpeed(1);
    let speedVal = await p.getSpeedValueText();
    expect(speedVal).toBe('Very Slow');

    // Change speed to Very Fast (5) and assert label changes to 'Very Fast'
    await p.setSpeed(5);
    speedVal = await p.getSpeedValueText();
    expect(speedVal).toBe('Very Fast');
  });

  test('Generate Random Graph updates state and resets algorithm status', async ({ page }) => {
    // Clicking "Generate Random Graph" should reinitialize the graph and update the step description
    const p = new KruskalPage(page);
    await p.goto();

    // Precondition: MST weight is 0
    expect(await p.getMstWeightText()).toBe('0');

    // Click Random Graph and assert step description updated accordingly
    await p.clickRandomGraph();
    const desc = await p.getStepDescription();
    expect(desc).toContain("New random graph generated. Click 'Step-by-Step' or 'Play Animation' to start Kruskal's algorithm.");

    // MST weight should still display 0 after generating new graph
    expect(await p.getMstWeightText()).toBe('0');

    // The vertices label should remain in sync with input (doesn't change automatically here)
    const verticesLabel = await p.getVerticesValueText();
    expect(Number(verticesLabel)).toBeGreaterThanOrEqual(4);
  });

  test('Step-by-step mode: single step adds or skips an edge and updates MST weight and description', async ({ page }) => {
    // Clicking the step button should process one edge: either add to MST or skip due to cycle.
    const p = new KruskalPage(page);
    await p.goto();

    // Click a single step
    await p.clickStepByStep();

    // The description should reflect that an edge was added or skipped
    const desc = await p.getStepDescription();
    const lower = desc.toLowerCase();
    expect(lower.includes('added edge') || lower.includes('skipped edge')).toBeTruthy();

    // MST weight should be a numeric string (0 or positive number). It should reflect totalWeight displayed.
    const mstText = await p.getMstWeightText();
    expect(mstText).toMatch(/^\d+$/);
  });

  test('Run algorithm to completion via step-by-step: finalizes with completed message', async ({ page }) => {
    // Repeatedly click 'Step-by-Step' until the algorithm reports completion.
    const p = new KruskalPage(page);
    await p.goto();

    // Guard against infinite loops: limit number of iterations (edges are limited for N<=15).
    let completed = false;
    for (let i = 0; i < 300; i++) {
      await p.clickStepByStep();
      const desc = await p.getStepDescription();
      if (desc.toLowerCase().includes('completed')) {
        completed = true;
        break;
      }
      // Small pause to allow UI updates
      await page.waitForTimeout(5);
    }

    expect(completed).toBe(true);
    const finalDesc = await p.getStepDescription();
    expect(finalDesc).toContain("Kruskal's algorithm completed.");
    // MST weight should be numeric at completion
    expect(await p.getMstWeightText()).toMatch(/^\d+$/);
  }, { timeout: 20000 });

  test('Play animation toggles between Play and Pause and completes automatically', async ({ page }) => {
    // Use the speed control to accelerate animation, click Play, ensure it toggles to Pause, and eventually reverts to Play when complete.
    const p = new KruskalPage(page);
    await p.goto();

    // Speed up animation to Very Fast to shorten test duration
    await p.setSpeed(5);
    expect(await p.getSpeedValueText()).toBe('Very Fast');

    // Click Play to start animation; button text should become 'Pause'
    await p.clickPlay();
    let playText = await p.getPlayButtonText();
    expect(playText).toBe('Pause');

    // Wait for algorithm to complete (the app will pause animation on completion)
    await p.waitForAlgorithmCompletion({ timeout: 15000 });

    // After completion the play button should reflect 'Play Animation' (click handler sets text back)
    // The visual label when paused is 'Play Animation' according to the implementation
    // There might be tiny timing between pauseAnimation clearing interval and text update, so wait for it
    await page.waitForFunction(() => {
      const btn = document.getElementById('play');
      return btn && btn.textContent && btn.textContent.trim().toLowerCase().includes('play');
    }, null, { timeout: 5000 });

    playText = await p.getPlayButtonText();
    expect(playText.toLowerCase()).toContain('play');

    // Final step description should indicate completion
    const endDesc = await p.getStepDescription();
    expect(endDesc.toLowerCase()).toContain('completed');
  }, { timeout: 30000 });

  test('Reset restores algorithm state and clears MST weight', async ({ page }) => {
    // Run a few steps, then reset, and validate the UI returns to initial algorithm-ready state.
    const p = new KruskalPage(page);
    await p.goto();

    // Do a few steps
    for (let i = 0; i < 3; i++) {
      await p.clickStepByStep();
      await page.waitForTimeout(10);
    }

    // MST weight should reflect some sum (possibly 0 if all skipped but still should be numeric)
    expect(await p.getMstWeightText()).toMatch(/^\d+$/);

    // Click reset
    await p.clickReset();

    // Step description should indicate reset state
    const resetDesc = await p.getStepDescription();
    expect(resetDesc).toContain('Algorithm reset. Click \'Step-by-Step\' or \'Play Animation\' to start.');

    // MST weight should be reset to '0'
    expect(await p.getMstWeightText()).toBe('0');

    // Play button should be in Play state (not paused)
    const playText = await p.getPlayButtonText();
    expect(playText.toLowerCase()).toContain('play');
  });

  test('Canvas drawing remains accessible after graph regeneration and interactions', async ({ page }) => {
    // Confirm that canvas continues to have a 2D context after multiple interactions
    const p = new KruskalPage(page);
    await p.goto();

    // Regenerate graph multiple times and perform interactions
    for (let i = 0; i < 3; i++) {
      await p.clickRandomGraph();
      await page.waitForTimeout(50);
      // Perform a step
      await p.clickStepByStep();
      await page.waitForTimeout(50);
      const hasCtx = await p.canvasHasContext();
      expect(hasCtx).toBe(true);
    }
  });

  test('Accessibility & visibility: UI areas are visible and step info updates are readable', async ({ page }) => {
    // Verify that the control area and step info are visible and the descriptions are readable by assistive means (text present)
    const p = new KruskalPage(page);
    await p.goto();

    // Ensure controls section is visible
    await expect(page.locator('.controls')).toBeVisible();

    // Step info box should be visible and contain heading and paragraph
    await expect(page.locator('#step-info')).toBeVisible();
    const stepHeading = await page.locator('#step-info h4').textContent();
    expect(stepHeading?.trim()).toBe('Current Step');

    // The MST weight label should be present and have numeric content
    await expect(page.locator('#mst-weight')).toBeVisible();
    expect(await p.getMstWeightText()).toMatch(/^\d+$/);
  });
});