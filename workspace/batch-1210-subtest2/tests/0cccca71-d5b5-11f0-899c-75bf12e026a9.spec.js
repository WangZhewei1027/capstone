import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0cccca71-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object for the Prim visualization app
class PrimApp {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.loadGraphBtn = page.locator('#loadGraphBtn');
    this.startBtn = page.locator('#startBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.exampleSelect = page.locator('#exampleGraphs');
    this.textarea = page.locator('#graphInputArea');
    this.startNodeInput = page.locator('#startNodeInput');
    this.logDiv = page.locator('#log');
    this.canvas = page.locator('#graphCanvas');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure the canvas and controls are present
    await expect(this.canvas).toBeVisible();
    await expect(this.loadGraphBtn).toBeVisible();
  }

  async selectExample(value) {
    await this.exampleSelect.selectOption(value);
  }

  async fillTextarea(text) {
    await this.textarea.fill(text);
  }

  async setStartNode(val) {
    await this.startNodeInput.fill(String(val));
  }

  async clickLoad() {
    await this.loadGraphBtn.click();
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async getLogText() {
    return (await this.logDiv.textContent()) || '';
  }

  async waitForLogContains(substr, timeout = 5000) {
    await this.page.waitForFunction(
      (selector, s) => {
        const el = document.querySelector(selector);
        if(!el) return false;
        return el.textContent.includes(s);
      },
      this.logDiv.selector,
      substr,
      { timeout }
    );
  }
}

test.describe('Prim Algorithm Visualization - FSM and UI integration tests', () => {
  let consoleMessages;
  let consoleErrors;
  let pageErrors;
  let dialogMessages;

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for each test
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];
    dialogMessages = [];

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push(text);
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    page.on('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      // Accept dialogs so they don't block test flows
      await dialog.accept();
    });
  });

  test('S0 Idle: initial UI state should be idle (buttons disabled and canvas drawn)', async ({ page }) => {
    // Validate initial (Idle) state described by S0
    const app = new PrimApp(page);
    await app.goto();

    // The canvas should be visible and controls present
    await expect(app.canvas).toBeVisible();

    // Buttons start, step, reset should be disabled initially
    await expect(app.startBtn).toBeDisabled();
    await expect(app.stepBtn).toBeDisabled();
    await expect(app.resetBtn).toBeDisabled();

    // Log should be empty at startup (drawGraph is called but it does not write to log)
    const logText = await app.getLogText();
    expect(logText.trim()).toBe('');

    // No console/runtime errors on initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Transition LoadGraph (S0 -> S1): selecting example and loading graph enables Start and logs graph info', async ({ page }) => {
    const app = new PrimApp(page);
    await app.goto();

    // Select an example graph (graph1 has 7 nodes and 11 edges)
    await app.selectExample('graph1');

    // Selecting a graph should auto-fill the textarea and set start node to 0
    const textareaVal = await app.textarea.inputValue();
    expect(textareaVal.split('\n').length).toBeGreaterThan(0);
    const startInputVal = await app.startNodeInput.inputValue();
    expect(startInputVal).toBe('0');

    // Click Load Graph -> this should log graph loaded messages and enable Start
    await app.clickLoad();

    // Wait for the expected log entry from S1 entry_actions
    await app.waitForLogContains('Graph loaded with 7 nodes and 11 edges.');

    const logText = await app.getLogText();
    expect(logText).toContain('Graph loaded with 7 nodes and 11 edges.');
    expect(logText).toContain("Click \"Start Prim's Algorithm\" to begin.");

    // UI state: Start enabled, Step and Reset remain disabled
    await expect(app.startBtn).toBeEnabled();
    await expect(app.stepBtn).toBeDisabled();
    await expect(app.resetBtn).toBeDisabled();

    // No runtime errors on load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Transition StartAlgorithm (S1 -> S2): starting algorithm initializes prim and updates UI + log', async ({ page }) => {
    const app = new PrimApp(page);
    await app.goto();

    // Prepare by selecting and loading graph1
    await app.selectExample('graph1');
    await app.clickLoad();
    await app.waitForLogContains('Graph loaded with 7 nodes and 11 edges.');

    // Click Start - S2 entry actions should clear log and log start messages
    await app.clickStart();

    // After starting, the UI should disable start and enable step + reset. Other inputs should be disabled.
    await expect(app.startBtn).toBeDisabled();
    await expect(app.stepBtn).toBeEnabled();
    await expect(app.resetBtn).toBeEnabled();
    await expect(app.loadGraphBtn).toBeDisabled();
    await expect(app.exampleSelect).toBeDisabled();
    await expect(app.textarea).toBeDisabled();
    await expect(app.startNodeInput).toBeDisabled();

    // Log should include starting lines specified by S2 entry_actions
    const logText = await app.getLogText();
    expect(logText).toContain("Starting Prim's Algorithm from node 0.");
    expect(logText).toContain('Added start node 0 to MST.');

    // No runtime errors triggered by starting
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Transition StepAlgorithm (S2 -> S3 -> S4): stepping through algorithm logs considerations and completion', async ({ page }) => {
    const app = new PrimApp(page);
    await app.goto();

    // Load and start graph1
    await app.selectExample('graph1');
    await app.clickLoad();
    await app.waitForLogContains('Graph loaded with 7 nodes and 11 edges.');
    await app.clickStart();

    // During stepping we expect repetitive "Considering edge" and "Added node" logs.
    // Keep clicking Step until the algorithm reports completion or until a safety max steps reached.
    const MAX_STEPS = 50;
    let completed = false;
    for (let i = 0; i < MAX_STEPS; i++) {
      // If step button became disabled, algorithm completed
      const stepDisabled = await app.stepBtn.isDisabled();
      if (stepDisabled) {
        completed = true;
        break;
      }

      await app.clickStep();

      // Wait briefly for UI/log to update
      // Check for evidence of a step: either "Considering edge" or "Added node" appended
      const recentLog = await app.getLogText();
      // If algorithm finished it will include the completion message
      if (recentLog.includes("Prim's MST construction complete.")) {
        completed = true;
        break;
      }
      // Otherwise ensure at least one of the expected messages appears eventually
      if (recentLog.includes('Considering edge') || recentLog.includes('Added node')) {
        // continue stepping
      }
    }

    // Expect that algorithm completes within MAX_STEPS
    const finalLog = await app.getLogText();
    expect(finalLog).toContain("Prim's MST construction complete.");

    // After completion, Step button should be disabled (per implementation)
    await expect(app.stepBtn).toBeDisabled();

    // Reset should still be enabled
    await expect(app.resetBtn).toBeEnabled();

    // No runtime errors during stepping
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Transition ResetAlgorithm (S4 -> S0): reset returns UI to idle and clears primState (via UI effects)', async ({ page }) => {
    const app = new PrimApp(page);
    await app.goto();

    // Load, start and fully step to completion
    await app.selectExample('graph1');
    await app.clickLoad();
    await app.waitForLogContains('Graph loaded with 7 nodes and 11 edges.');
    await app.clickStart();

    // Step until completion
    await page.waitForFunction(() => {
      // if step button is disabled, we're done
      const btn = document.querySelector('#stepBtn');
      return btn && btn.disabled;
    }, { timeout: 10000 });

    // Click reset to go back to S0
    await app.clickReset();

    // After reset: start enabled, step and reset disabled, load/exampleselect/input enabled
    await expect(app.startBtn).toBeEnabled();
    await expect(app.stepBtn).toBeDisabled();
    await expect(app.resetBtn).toBeDisabled();
    await expect(app.loadGraphBtn).toBeEnabled();
    await expect(app.exampleSelect).toBeEnabled();
    await expect(app.textarea).toBeEnabled();
    await expect(app.startNodeInput).toBeEnabled();

    // Log should be cleared after reset
    const logAfterReset = await app.getLogText();
    expect(logAfterReset.trim()).toBe('');

    // No runtime errors across reset
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('SelectExampleGraph event: selecting an example populates textarea and sets start node', async ({ page }) => {
    const app = new PrimApp(page);
    await app.goto();

    // Choose graph2 and verify textarea auto-fills and start node reset to 0 (as implementation does)
    await app.selectExample('graph2');

    const text = await app.textarea.inputValue();
    expect(text).toContain('0 1'); // part of graph2 edges
    const startVal = await app.startNodeInput.inputValue();
    expect(startVal).toBe('0');

    // No dialogs or errors triggered by onchange
    expect(dialogMessages.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: invalid edge input triggers parse error alert (parseGraphInput) and does not load graph', async ({ page }) => {
    const app = new PrimApp(page);
    await app.goto();

    // Provide invalid input in textarea
    await app.fillTextarea('this is invalid');

    // Click load - parseGraphInput should alert about invalid format, and we attached dialog handler to accept
    await app.clickLoad();

    // The dialog message should have been captured and should indicate invalid format
    // The exact alert string in the implementation: `Invalid edge format at line ${i+1}. Expected: u v weight`
    expect(dialogMessages.length).toBeGreaterThan(0);
    const foundInvalidFormat = dialogMessages.some(m => m.includes('Invalid edge format') || m.includes('Invalid numbers'));
    expect(foundInvalidFormat).toBe(true);

    // Start button should remain disabled because graph failed to load
    await expect(app.startBtn).toBeDisabled();

    // No unexpected console/runtime errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: invalid start node triggers alert and graph not loaded', async ({ page }) => {
    const app = new PrimApp(page);
    await app.goto();

    // Select a sample but set start node to an invalid large value and attempt load
    await app.selectExample('graph1');

    // Overwrite start node to out-of-range number
    await app.setStartNode(999);

    await app.clickLoad();

    // Expect an alert about start node bounds
    const foundStartNodeAlert = dialogMessages.some(m => m.includes('Start node must be between'));
    expect(foundStartNodeAlert).toBe(true);

    // The graph should not be considered successfully loaded (startBtn should remain disabled)
    await expect(app.startBtn).toBeDisabled();

    // No uncaught runtime errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test.afterEach(async ({ page }) => {
    // A final sanity check: no unhandled page errors should be present from the page's runtime
    expect(pageErrors.length).toBe(0);
    // Also assert there were no console errors captured
    expect(consoleErrors.length).toBe(0);
  });
});