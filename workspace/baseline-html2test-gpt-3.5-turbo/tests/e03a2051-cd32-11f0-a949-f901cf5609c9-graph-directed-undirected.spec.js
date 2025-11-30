import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a2051-cd32-11f0-a949-f901cf5609c9.html';

// Page Object encapsulating interactions with the Graph page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#graphCanvas');
    this.info = page.locator('#info');
    this.randomBtn = page.locator('#randomGraphBtn');
    this.radios = page.locator('input[name="graphType"]');
    // Graph layout constants mirrored from the page JS (for clicking nodes)
    this.canvasWidth = 800;
    this.canvasHeight = 600;
    this.centerX = this.canvasWidth / 2; // 400
    this.centerY = this.canvasHeight / 2; // 300
    this.nodeCount = 8; // default in generateRandomGraph
    this.radius = Math.min(this.canvasWidth, this.canvasHeight) / 2 - 60; // 240
    this.NODE_RADIUS = 20;
  }

  // Select graph type radio by value: "undirected" | "directed"
  async selectGraphType(value) {
    const radio = this.page.locator(`input[name="graphType"][value="${value}"]`);
    await radio.click();
  }

  // Click the "Generate Random Graph" button
  async clickGenerateRandom() {
    await this.randomBtn.click();
  }

  // Get the current info text content
  async getInfoText() {
    return (await this.info.textContent()) || '';
  }

  // Check whether a radio is checked
  async isRadioChecked(value) {
    const radio1 = this.page.locator(`input[name="graphType"][value="${value}"]`);
    return await radio.isChecked();
  }

  // Compute on-canvas coordinates for node index (0..nodeCount-1)
  nodeCanvasCoords(index) {
    const angle = (2 * Math.PI * index) / this.nodeCount - Math.PI / 2;
    const x = this.centerX + this.radius * Math.cos(angle);
    const y = this.centerY + this.radius * Math.sin(angle);
    return { x, y };
  }

  // Click a node by index (maps canvas coordinates to page coordinates)
  // clicks near center of node
  async clickNodeByIndex(index) {
    const canvasBox = await this.canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas bounding box not available');
    const { x: cx, y: cy } = this.nodeCanvasCoords(index);
    const pageX = canvasBox.x + cx;
    const pageY = canvasBox.y + cy;
    await this.page.mouse.click(pageX, pageY);
  }

  // Click at the canvas center (expected to be outside any node)
  async clickCanvasCenter() {
    const canvasBox1 = await this.canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas bounding box not available');
    const pageX1 = canvasBox.x + this.centerX;
    const pageY1 = canvasBox.y + this.centerY;
    await this.page.mouse.click(pageX, pageY);
  }
}

test.describe('Graph Visualization (Directed / Undirected) - e03a2051-cd32-11f0-a949-f901cf5609c9', () => {
  let pageErrors = [];
  let consoleMessages = [];

  // Navigate to the page and set up listeners for console and page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      // capture uncaught exceptions from the page
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // capture console messages for later assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    await page.goto(APP_URL);
    // Ensure the canvas and controls are visible before continuing tests
    await expect(page.locator('#graphCanvas')).toBeVisible();
    await expect(page.locator('#randomGraphBtn')).toBeVisible();
  });

  test.afterEach(async () => {
    // Basic assertions about console and page errors:
    // - There should be no uncaught page errors during normal operation.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e=>e.message).join('; ')}`).toBe(0);

    // - There should be no console errors emitted by the page
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Console errors were logged: ${consoleErrors.map(e=>e.text).join('; ')}`).toBe(0);
  });

  test.describe('Initial load and default state', () => {
    test('page loads with default undirected selected and initial info text', async ({ page }) => {
      // Purpose: Verify initial elements and default state are correct.
      const gp = new GraphPage(page);

      // Default radio "undirected" should be checked
      expect(await gp.isRadioChecked('undirected')).toBe(true);
      expect(await gp.isRadioChecked('directed')).toBe(false);

      // Info element should contain the initial help text
      const info = await gp.getInfoText();
      expect(info).toContain('Click on nodes to highlight their edges and neighbors.');
      expect(info).toContain('Generate Random Graph');
    });

    test('canvas exists and is interactable', async ({ page }) => {
      // Purpose: Check that the canvas is present and can be clicked without errors.
      const gp1 = new GraphPage(page);
      await gp.clickCanvasCenter();
      const infoAfter = await gp.getInfoText();
      // After clicking center (outside nodes), info should remain or be reset to initial guidance
      expect(infoAfter).toContain('Click on nodes to highlight their edges and neighbors.');
    });
  });

  test.describe('User interactions and state transitions', () => {
    test('clicking a node highlights it and updates info text with node id and reset hint', async ({ page }) => {
      // Purpose: Click a node and assert info updates describing the node and reset instructions.
      const gp2 = new GraphPage(page);

      // Click node 0 (location derived from the same circular layout algorithm in the page)
      await gp.clickNodeByIndex(0);

      const info1 = await gp.getInfoText();
      // The info text must start with "Node 0" or mention Node 0, and include the reset hint.
      expect(info).toMatch(/Node\s*0/);
      expect(info).toContain('Click outside nodes to reset.');
    });

    test('clicking outside nodes resets highlights and info text to default', async ({ page }) => {
      // Purpose: After selecting a node, clicking outside should restore default info text.
      const gp3 = new GraphPage(page);

      // Click a node first
      await gp.clickNodeByIndex(1);
      const infoAfterNodeClick = await gp.getInfoText();
      expect(infoAfterNodeClick).toMatch(/Node\s*1/);
      expect(infoAfterNodeClick).toContain('Click outside nodes to reset.');

      // Now click the canvas center (which is outside nodes)
      await gp.clickCanvasCenter();

      const infoAfterReset = await gp.getInfoText();
      expect(infoAfterReset).toContain('Click on nodes to highlight their edges and neighbors.');
    });

    test('Generate Random Graph button regenerates graph and resets info area', async ({ page }) => {
      // Purpose: Verify clicking the button regenerates the graph and resets the info help text.
      const gp4 = new GraphPage(page);

      // Click a node to change info
      await gp.clickNodeByIndex(2);
      const infoClicked = await gp.getInfoText();
      expect(infoClicked).toMatch(/Node\s*2/);

      // Click "Generate Random Graph"
      await gp.clickGenerateRandom();

      // After regen, info should be reset to default help text
      const infoAfterGen = await gp.getInfoText();
      expect(infoAfterGen).toContain('Click on nodes to highlight their edges and neighbors.');
    });

    test('switching graph type to directed regenerates graph and clears info', async ({ page }) => {
      // Purpose: Ensure changing the radio button regenerates the graph and clears/updates the info
      const gp5 = new GraphPage(page);

      // Ensure directed is not selected initially
      expect(await gp.isRadioChecked('directed')).toBe(false);

      // Select directed
      await gp.selectGraphType('directed');

      // After selecting, directed should be checked and info reset
      expect(await gp.isRadioChecked('directed')).toBe(true);
      const infoAfter1 = await gp.getInfoText();
      expect(infoAfter).toContain('Click on nodes to highlight their edges and neighbors.');
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('click near node boundary does not throw and updates info if within node', async ({ page }) => {
      // Purpose: Click near the edge of a node, ensuring no runtime errors and info updates as expected.
      const gp6 = new GraphPage(page);

      // Compute coords for node 3 and offset by NODE_RADIUS - 2 (near the boundary)
      const coords = gp.nodeCanvasCoords(3);
      const offset = gp.NODE_RADIUS - 2;
      const canvasBox2 = await gp.canvas.boundingBox();
      if (!canvasBox) throw new Error('Canvas bounding box not available');

      // Click a point near the boundary (towards center)
      const pageX2 = canvasBox.x + coords.x - offset;
      const pageY2 = canvasBox.y + coords.y;
      await page.mouse.click(pageX, pageY);

      // Ensure info updated referencing Node 3 and no page errors were recorded
      const info2 = await gp.getInfoText();
      expect(info).toMatch(/Node\s*3/);
    });

    test('multiple rapid interactions do not produce console errors', async ({ page }) => {
      // Purpose: Rapidly toggle controls and click canvas to ensure no console errors occur.
      const gp7 = new GraphPage(page);

      // Rapid interactions
      await gp.selectGraphType('directed');
      await gp.clickGenerateRandom();
      await gp.selectGraphType('undirected');
      await gp.clickGenerateRandom();

      // Click a couple nodes quickly
      await gp.clickNodeByIndex(0);
      await gp.clickNodeByIndex(4);
      await gp.clickCanvasCenter();

      // Validate that no console.error messages were emitted during these interactions
      const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, `Console errors were logged during rapid interactions: ${consoleErrors.map(e=>e.text).join('; ')}`).toBe(0);
    });
  });
});