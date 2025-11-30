import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6c3-cd33-11f0-bdf9-b3d97e91273d.html';

// Page object to encapsulate common interactions with the app
class DijkstraPage {
  constructor(page) {
    this.page = page;
    this.startNodeSelect = '#startNode';
    this.runBtn = '#runBtn';
    this.resetBtn = '#resetBtn';
    this.distanceRows = '#distanceTable tbody tr';
    this.stepsDiv = '#steps';
    this.canvas = '#graphCanvas';
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Return array of option values in the start node select
  async getStartOptions() {
    return this.page.$$eval(`${this.startNodeSelect} option`, opts => opts.map(o => o.value));
  }

  // Select a start node by value
  async selectStartNode(value) {
    await this.page.selectOption(this.startNodeSelect, value);
    // give a tiny pause for UI update
    await this.page.waitForTimeout(50);
  }

  // Click the Run Algorithm button
  async clickRun() {
    await this.page.click(this.runBtn);
  }

  // Click Reset button
  async clickReset() {
    await this.page.click(this.resetBtn);
  }

  // Wait until the algorithm indicates it finished by text in steps div
  async waitForAlgorithmFinish(timeout = 30000) {
    await this.page.waitForFunction(
      selector => {
        const el = document.querySelector(selector);
        return el && el.textContent.includes('Algorithm finished!');
      },
      this.stepsDiv,
      { timeout }
    );
  }

  // Read the distances table and return a map { nodeId: distance (number or Infinity) }
  async getDistancesMap() {
    return this.page.$$eval(this.distanceRows, rows => {
      const map = {};
      for (const r of rows) {
        const cells = r.querySelectorAll('td');
        if (cells.length >= 2) {
          const node = cells[0].textContent.trim();
          const distText = cells[1].textContent.trim();
          map[node] = distText === '∞' ? Infinity : Number(distText);
        }
      }
      return map;
    });
  }

  // Helper to get the steps text
  async getStepsText() {
    return this.page.$eval(this.stepsDiv, el => el.textContent || '');
  }

  // Simulate dragging a node on canvas by approximate coordinates.
  // Uses the known initial positions from the app: A: (100,150), etc.
  // offsetX/Y are movement deltas applied to the initial coordinate.
  async dragNode(nodeId, offsetX = 20, offsetY = 0) {
    // Map of initial node coords as in the app initialization
    const positions = {
      A: { x: 100, y: 150 },
      B: { x: 270, y: 80 },
      C: { x: 450, y: 140 },
      D: { x: 380, y: 280 },
      E: { x: 150, y: 300 },
      F: { x: 600, y: 200 }
    };

    const pos = positions[nodeId];
    if (!pos) throw new Error(`Unknown nodeId ${nodeId} for dragNode helper`);

    const canvasBox = await this.page.locator(this.canvas).boundingBox();
    if (!canvasBox) throw new Error('Canvas bounding box not found');

    // Compute absolute coords within page
    const startX = canvasBox.x + pos.x;
    const startY = canvasBox.y + pos.y;
    const endX = startX + offsetX;
    const endY = startY + offsetY;

    // Perform drag sequence
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // small move to trigger drag
    await this.page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 6 });
    await this.page.mouse.move(endX, endY, { steps: 6 });
    await this.page.mouse.up();

    // wait a moment to let the app redraw
    await this.page.waitForTimeout(150);
  }
}

test.describe('Dijkstra Algorithm Visualization - Interactive Tests', () => {
  let page;
  let app;
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Capture console error messages and page errors for assertions later
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      // Only track errors (not warnings/info/log)
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
      // Still keep other console messages accessible under debug if needed
    });

    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    app = new DijkstraPage(page);
    await app.goto();

    // Ensure the UI has had a moment to initialize/draw
    await page.waitForTimeout(200);
  });

  test.afterEach(async () => {
    // Close page to clean up
    await page.close();
  });

  test('Initial load: UI elements exist and start node options are populated', async () => {
    // Verify no console errors or page errors right after load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    // The start node select should contain the expected node ids
    const options = await app.getStartOptions();
    // Must include nodes A-F as defined in HTML's initGraph
    expect(options.sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F'].sort());

    // Distance table should initially be empty (no rows)
    const rows = await page.$$eval('#distanceTable tbody tr', rows => rows.length);
    expect(rows).toBe(0);

    // Steps div should be empty at start
    const stepsText = await app.getStepsText();
    expect(stepsText.trim()).toBe('');
  });

  test('Run algorithm from start node A updates distances correctly and finishes', async () => {
    // Select start node A explicitly (should be default, but ensure selection)
    await app.selectStartNode('A');

    // Start algorithm
    await app.clickRun();

    // Wait for algorithm to finish (look for completion text)
    await app.waitForAlgorithmFinish(30000);

    // After finish, ensure no runtime console errors or page errors happened
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    // Read distances map and assert expected distances from A
    const distances = await app.getDistancesMap();

    // Expected distances from node A (computed from graph in HTML):
    // A:0, B:4, E:7, C:12, D:14, F:19
    expect(distances['A']).toBe(0);
    expect(distances['B']).toBe(4);
    expect(distances['E']).toBe(7);
    expect(distances['C']).toBe(12);
    expect(distances['D']).toBe(14);
    expect(distances['F']).toBe(19);

    // Steps div should contain narrative text including "Start from node A" and "Algorithm finished!"
    const steps = await app.getStepsText();
    expect(steps).toContain('Start from node A');
    expect(steps).toContain('Algorithm finished!');
  });

  test('Reset button clears UI state after running the algorithm', async () => {
    // Run algorithm first
    await app.selectStartNode('A');
    await app.clickRun();
    await app.waitForAlgorithmFinish(30000);

    // Ensure table has rows after run
    let rowsCount = await page.$$eval('#distanceTable tbody tr', rows => rows.length);
    expect(rowsCount).toBeGreaterThan(0);

    // Click reset
    await app.clickReset();

    // After reset, the distance table body should be empty and steps cleared
    await page.waitForTimeout(100); // small wait to allow reset logic to run
    rowsCount = await page.$$eval('#distanceTable tbody tr', rows => rows.length);
    expect(rowsCount).toBe(0);

    const stepsTextAfterReset = await app.getStepsText();
    expect(stepsTextAfterReset.trim()).toBe('');
  });

  test('Running algorithm from a different start node (C) yields correct distances', async () => {
    // Select start node C
    await app.selectStartNode('C');

    // Start algorithm
    await app.clickRun();

    // Wait for algorithm to finish
    await app.waitForAlgorithmFinish(30000);

    // Ensure no console or page errors occurred during run
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    // Expected distances from node C:
    // C:0, B:8, A:12, D:2, E:8, F:7
    const distances1 = await app.getDistancesMap();
    expect(distances['C']).toBe(0);
    expect(distances['B']).toBe(8);
    expect(distances['A']).toBe(12);
    expect(distances['D']).toBe(2);
    expect(distances['E']).toBe(8);
    expect(distances['F']).toBe(7);
  });

  test('Dragging a node on the canvas does not throw errors and redraws graph', async () => {
    // We'll drag node A slightly and verify no page errors or console errors occur
    // Also assert that steps div remains unaffected (still empty) if no algorithm was run
    await app.dragNode('A', 40, 20);

    // Short wait for redraw
    await page.waitForTimeout(150);

    // No console or page errors should have been recorded
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    // Steps should remain empty since we didn't run the algorithm
    const stepsText1 = await app.getStepsText();
    expect(stepsText.trim()).toBe('');
  });

  test('Accessibility and keyboard: pressing Enter on startNode select triggers run', async () => {
    // Focus on select element and press Enter to trigger run (enter triggers runBtn.click)
    await page.focus('#startNode');
    // Press Enter - the app listens for 'Enter' on the select and triggers runBtn.click()
    await page.keyboard.press('Enter');

    // Wait for algorithm to finish
    await app.waitForAlgorithmFinish(30000);

    // Confirm algorithm finished and no errors
    const stepsText2 = await app.getStepsText();
    expect(stepsText).toContain('Algorithm finished!');
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Canvas right-click (contextmenu) on an edge does not cause uncaught exceptions when not clicking an edge', async () => {
    // Perform a contextmenu at a place without edges (far corner)
    const box = await page.locator('#graphCanvas').boundingBox();
    if (box) {
      await page.mouse.click(box.x + 10, box.y + 10, { button: 'right' });
      // Wait briefly for any dialogs or potential errors (we do not accept or dismiss any prompts here)
      await page.waitForTimeout(150);
    }

    // Ensure no page errors occurred
    expect(pageErrors).toEqual([]);
    // There may be console logs, but assert no console error messages
    expect(consoleErrors).toEqual([]);
  });
});