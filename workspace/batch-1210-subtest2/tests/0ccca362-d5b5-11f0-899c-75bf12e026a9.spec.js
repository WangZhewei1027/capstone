import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccca362-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object to encapsulate common interactions and queries
class FloydWarshallPage {
  constructor(page) {
    this.page = page;
    this.selectors = {
      matrixInput: '#matrixInput',
      runButton: '#runButton',
      status: '#status',
      outputArea: '#outputArea',
      stepControls: '#stepControls',
      prevStep: '#prevStep',
      nextStep: '#nextStep',
      autoPlay: '#autoPlay',
      resetSteps: '#resetSteps',
      header: 'h1'
    };
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setMatrixInput(text) {
    await this.page.fill(this.selectors.matrixInput, text);
  }

  async clickRun() {
    await this.page.click(this.selectors.runButton);
  }

  async clickNext() {
    await this.page.click(this.selectors.nextStep);
  }

  async clickPrev() {
    await this.page.click(this.selectors.prevStep);
  }

  async clickAutoPlay() {
    await this.page.click(this.selectors.autoPlay);
  }

  async clickReset() {
    await this.page.click(this.selectors.resetSteps);
  }

  async getStatusText() {
    return (await this.page.locator(this.selectors.status).innerText()).trim();
  }

  async isStepControlsVisible() {
    const display = await this.page.locator(this.selectors.stepControls).evaluate((el) => {
      return window.getComputedStyle(el).display;
    });
    return display !== 'none';
  }

  async getPrevDisabled() {
    return await this.page.locator(this.selectors.prevStep).isDisabled();
  }

  async getNextDisabled() {
    return await this.page.locator(this.selectors.nextStep).isDisabled();
  }

  async getAutoPlayText() {
    return (await this.page.locator(this.selectors.autoPlay).innerText()).trim();
  }

  async getOutputText() {
    return (await this.page.locator(this.selectors.outputArea).innerText()).trim();
  }

  async getHeaderText() {
    return (await this.page.locator(this.selectors.header).innerText()).trim();
  }

  // Wait until status contains 'Algorithm completed' (used after clicking Run)
  async waitForAlgorithmCompletion(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const s = document.getElementById('status');
      return s && s.textContent && s.textContent.includes('Algorithm completed');
    }, null, { timeout });
  }

  // Wait until status shows the 'Running' message (immediate on click)
  async waitForRunningMessage(timeout = 1000) {
    await this.page.waitForFunction(() => {
      const s = document.getElementById('status');
      return s && s.textContent && s.textContent.includes('Running Floyd-Warshall algorithm...');
    }, null, { timeout });
  }
}

test.describe('Floyd-Warshall Visualization FSM tests (Application ID: 0ccca362-d5b5-11f0-899c-75bf12e026a9)', () => {
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    // collect console messages and page errors for assertions
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      // collect uncaught exceptions from page
      pageErrors.push(String(err && err.stack ? err.stack : err));
    });

    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
  });

  test('S0_Idle: initial render shows header and step controls hidden', async ({ page }) => {
    // This test validates the initial Idle state (S0_Idle).
    const app = new FloydWarshallPage(page);
    await app.goto();

    // Check header exists (evidence for Idle)
    const header = await app.getHeaderText();
    expect(header).toBe('Floyd-Warshall Algorithm Visualization');

    // Step controls should be hidden initially
    const visible = await app.isStepControlsVisible();
    expect(visible).toBe(false);

    // Prev and Next buttons should be disabled by default (per HTML attributes)
    const prevDisabled = await page.locator('#prevStep').isDisabled();
    const nextDisabled = await page.locator('#nextStep').isDisabled();
    expect(prevDisabled).toBe(true);
    expect(nextDisabled).toBe(true);

    // Assert no uncaught page errors occurred during initial render
    expect(pageErrors.length).toBe(0);
  });

  test.describe('Run Algorithm and Steps Navigation (S0 -> S1 -> S2)', () => {
    test('RunAlgorithm event transitions to Algorithm Running and then Steps Available', async ({ page }) => {
      // This test validates the RunAlgorithm transition S0_Idle -> S1_AlgorithmRunning -> S2_StepsAvailable
      const app = new FloydWarshallPage(page);
      await app.goto();

      // Start listening to console and page errors were already set in beforeEach
      // Click Run Algorithm
      await app.clickRun();

      // Immediately the status should show the running message (S1 entry action expectation)
      await app.waitForRunningMessage();
      const runningStatus = await app.getStatusText();
      expect(runningStatus).toContain('Running Floyd-Warshall algorithm...');

      // Wait for algorithm completion (S2)
      await app.waitForAlgorithmCompletion(5000);
      const completedStatus = await app.getStatusText();
      // The default 4x4 matrix results in 4^3 = 64 steps
      expect(completedStatus).toMatch(/Algorithm completed:\s*64\s*steps\./);

      // Step controls should now be visible (S2 entry action)
      const visible = await app.isStepControlsVisible();
      expect(visible).toBe(true);

      // prev should be disabled because we are at currentStep === 0
      expect(await app.getPrevDisabled()).toBe(true);
      // next should be enabled because currentStep < steps.length - 1
      expect(await app.getNextDisabled()).toBe(false);

      // Output area should contain description of the first step
      const outputText = await app.getOutputText();
      expect(outputText).toContain('Considering if vertex'); // basic check that step was rendered

      // Ensure no uncaught page errors occurred during algorithm run
      expect(pageErrors.length).toBe(0);
    });

    test('NextStep and PreviousStep update steps and button disabled states', async ({ page }) => {
      // This test validates NextStep and PreviousStep events keep S2 and update state appropriately
      const app = new FloydWarshallPage(page);
      await app.goto();

      await app.clickRun();
      await app.waitForAlgorithmCompletion(5000);

      // Confirm initial state: at step 0
      expect(await app.getPrevDisabled()).toBe(true);

      // Click Next to go to step 1
      await app.clickNext();
      // After clicking next, prev should be enabled
      expect(await app.getPrevDisabled()).toBe(false);

      // Output should reflect considering some vertex (step content changes)
      const afterNextText = await app.getOutputText();
      expect(afterNextText).toContain('Considering if vertex');

      // Click Previous to go back to step 0
      await app.clickPrev();
      // Prev should be disabled again
      expect(await app.getPrevDisabled()).toBe(true);
      const afterPrevText = await app.getOutputText();
      expect(afterPrevText).toContain('Considering if vertex');

      // Ensure no uncaught errors during navigation
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('AutoPlay (S2 -> S3 and back) and Reset', () => {
    test('AutoPlay toggles to Pause on start and returns to Auto Play on stop', async ({ page }) => {
      // Validate AutoPlay event: button text changes and stopAutoPlay resets text
      const app = new FloydWarshallPage(page);
      await app.goto();

      await app.clickRun();
      await app.waitForAlgorithmCompletion(5000);

      // Start autoplay - should set button text to 'Pause' (S3 entry action)
      await app.clickAutoPlay();
      expect(await app.getAutoPlayText()).toBe('Pause');

      // Wait a short time for at least one autoplay tick to have rendered
      await page.waitForTimeout(250);

      // Stop autoplay by clicking again - should return to 'Auto Play' (S3 exit action)
      await app.clickAutoPlay();
      expect(await app.getAutoPlayText()).toBe('Auto Play');

      // Ensure no uncaught page errors occurred during autoplay
      expect(pageErrors.length).toBe(0);
    });

    test('ResetSteps resets currentStep to 0 and renders first step', async ({ page }) => {
      // Validate ResetSteps event brings the UI back to first step
      const app = new FloydWarshallPage(page);
      await app.goto();

      await app.clickRun();
      await app.waitForAlgorithmCompletion(5000);

      // Move forward a few steps
      await app.clickNext();
      await app.clickNext();

      // Ensure prev is enabled (we are not at 0)
      expect(await app.getPrevDisabled()).toBe(false);

      // Click Reset, should stop autoplay if any and set currentStep = 0
      await app.clickReset();

      // After reset, prev should be disabled because currentStep is 0
      expect(await app.getPrevDisabled()).toBe(true);

      // Output area should now show the first step info again (k should be 0 in first step)
      const out = await app.getOutputText();
      expect(out).toContain('Considering if vertex 0'); // first step considers k=0

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Input validation and edge cases', () => {
    test('Invalid JSON input produces a user-friendly error message', async ({ page }) => {
      // This verifies parseMatrix error handling for invalid JSON
      const app = new FloydWarshallPage(page);
      await app.goto();

      // Set invalid JSON
      await app.setMatrixInput('not a json');
      await app.clickRun();

      // Wait for status to update with error message
      await page.waitForFunction(() => {
        const s = document.getElementById('status');
        return s && s.textContent && s.textContent.includes('Invalid input');
      }, null, { timeout: 2000 });

      const statusText = await app.getStatusText();
      expect(statusText).toContain('Invalid input: Please enter a valid JSON array of arrays.');

      // Ensure no uncaught page errors despite the invalid input (handled by code)
      expect(pageErrors.length).toBe(0);
    });

    test('Non-square matrix triggers validation error', async ({ page }) => {
      const app = new FloydWarshallPage(page);
      await app.goto();

      // Provide a non-square matrix
      const badMatrix = `[
        [0, 1, 2],
        [1, 0],
        [2, 1, 0]
      ]`;
      await app.setMatrixInput(badMatrix);
      await app.clickRun();

      // Expect validation message about square matrix
      await page.waitForFunction(() => {
        const s = document.getElementById('status');
        return s && s.textContent && s.textContent.includes('Matrix must be square');
      }, null, { timeout: 2000 });

      const statusText = await app.getStatusText();
      expect(statusText).toContain('Matrix must be square (all rows must have same number of elements as columns).');

      expect(pageErrors.length).toBe(0);
    });

    test('Non-zero diagonal triggers validation error', async ({ page }) => {
      const app = new FloydWarshallPage(page);
      await app.goto();

      const badDiagonal = `[
        [1, 1],
        [1, 0]
      ]`;
      await app.setMatrixInput(badDiagonal);
      await app.clickRun();

      await page.waitForFunction(() => {
        const s = document.getElementById('status');
        return s && s.textContent && s.textContent.includes('Diagonal elements must be zero');
      }, null, { timeout: 2000 });

      const statusText = await app.getStatusText();
      expect(statusText).toContain('Diagonal elements must be zero.');

      expect(pageErrors.length).toBe(0);
    });

    test('Accepts "INF" (case-insensitive) as Infinity and completes algorithm', async ({ page }) => {
      const app = new FloydWarshallPage(page);
      await app.goto();

      // Use INF token (uppercase) and expect it to parse correctly
      const matrixWithINF = `[
        [0, 3, INF, 7],
        [8, 0, 2, INF],
        [5, INF, 0, 1],
        [2, INF, INF, 0]
      ]`;
      await app.setMatrixInput(matrixWithINF);
      await app.clickRun();

      // Should start running
      await app.waitForRunningMessage();

      // Should complete successfully
      await app.waitForAlgorithmCompletion(5000);
      const statusText = await app.getStatusText();
      expect(statusText).toMatch(/Algorithm completed:\s*64\s*steps\./);

      expect(pageErrors.length).toBe(0);
    });
  });

  test.afterEach(async ({ page }) => {
    // Final assertions around console and errors:
    // - No uncaught page errors should have been emitted throughout tests
    expect(pageErrors.length).toBe(0);

    // - Optionally ensure console messages didn't include severe 'error' entries from the page
    const hasSevereConsole = consoleMessages.some(msg => /^error:/i.test(msg));
    expect(hasSevereConsole).toBe(false);
  });
});