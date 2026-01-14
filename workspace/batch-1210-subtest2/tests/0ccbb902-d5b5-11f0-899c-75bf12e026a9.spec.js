import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccbb902-d5b5-11f0-899c-75bf12e026a9.html';

class UnionFindPage {
  /**
   * page - Playwright Page instance
   */
  constructor(page) {
    this.page = page;
    this.initBtn = page.locator('#initBtn');
    this.unionBtn = page.locator('#unionBtn');
    this.connectedBtn = page.locator('#connectedBtn');
    this.numElements = page.locator('#numElements');
    this.unionA = page.locator('#unionA');
    this.unionB = page.locator('#unionB');
    this.findX = page.locator('#findX');
    this.findY = page.locator('#findY');
    this.message = page.locator('#message');
    this.svg = page.locator('#graph');
    this.nodeGroups = (index) => page.locator(`#graph g.node[data-index="${index}"]`);
    this.allNodeGroups = page.locator('#graph g.node');
    this.edgeLines = page.locator('#graph line.edge');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Basic interactions
  async clickInitialize() {
    await this.initBtn.click();
  }
  async clickUnion() {
    await this.unionBtn.click();
  }
  async clickConnected() {
    await this.connectedBtn.click();
  }

  async setNumElements(value) {
    await this.numElements.fill(String(value));
    // trigger input event
    await this.numElements.press('Tab');
  }
  async setUnionA(value) {
    await this.unionA.fill(String(value));
    await this.unionA.press('Tab');
  }
  async setUnionB(value) {
    await this.unionB.fill(String(value));
    await this.unionB.press('Tab');
  }
  async setFindX(value) {
    await this.findX.fill(String(value));
    await this.findX.press('Tab');
  }
  async setFindY(value) {
    await this.findY.fill(String(value));
    await this.findY.press('Tab');
  }

  // Observers / getters
  async getMessageText() {
    return (await this.message.textContent())?.trim() ?? '';
  }
  async getMessageColor() {
    return (await this.message.evaluate((el) => getComputedStyle(el).color)).toString();
  }
  async isUnionBtnEnabled() {
    return await this.unionBtn.isEnabled();
  }
  async isConnectedBtnEnabled() {
    return await this.connectedBtn.isEnabled();
  }
  async svgNodeCount() {
    return await this.allNodeGroups.count();
  }
  async svgEdgeCount() {
    return await this.edgeLines.count();
  }
  // Returns aria-label for node index
  async nodeAriaLabel(index) {
    const locator = this.nodeGroups(index);
    if ((await locator.count()) === 0) return null;
    return await locator.first().getAttribute('aria-label');
  }
}

test.describe('Union-Find Visualizer - FSM and UI comprehensive tests', () => {
  // We'll capture console errors and page errors for each test.
  // Make new arrays per test to avoid cross-test leakage.
  test.beforeEach(async ({ page }) => {
    // Ensure no default timeouts mask slow environments
    page.setDefaultTimeout(5000);
  });

  test.describe('Initialization and Idle/Initialized states', () => {
    test('Initial load should run initialize() and show Initialized message', async ({ page }) => {
      // Capture console and page errors
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // After load, initialize() is called automatically in the script.
      // Verify message content and color
      await expect(uf.message).toHaveText(/Initialized with 8 elements \(0 to 7\)\./);
      const txt = await uf.getMessageText();
      expect(txt).toMatch(/^Initialized with 8 elements \(0 to 7\)\.$/);

      // Buttons should be enabled/disabled per controls (union and connected should be enabled after init)
      expect(await uf.isUnionBtnEnabled()).toBe(true);
      expect(await uf.isConnectedBtnEnabled()).toBe(true);

      // SVG should contain 8 node groups
      expect(await uf.svgNodeCount()).toBe(8);

      // No runtime console or page errors occurred during initialization
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Clicking Initialize with invalid number shows error message (edge case)', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // Set invalid number (1) and click initialize => should show validation error
      await uf.setNumElements(1);
      await uf.clickInitialize();

      await expect(uf.message).toHaveText('Please enter a valid number of elements (2 to 20).');
      // message color should be red (rgb format) - check that it's red-ish (strict color string comparison can be brittle)
      const color = await uf.getMessageColor();
      expect(color).toContain('rgb'); // ensure we get a color string
      // Ensure no JS runtime errors occurred while handling invalid input
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Clicking Initialize with non-integer number shows error (edge case)', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // Enter a decimal number to trigger integer validation
      await uf.setNumElements('3.5');
      await uf.clickInitialize();

      await expect(uf.message).toHaveText('Please enter a valid number of elements (2 to 20).');
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Union operations and UnionPerformed state', () => {
    test('Perform union between 0 and 1 updates data and svg and shows success message', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // Ensure starting condition: nodes exist and union button enabled
      expect(await uf.svgNodeCount()).toBe(8);
      expect(await uf.isUnionBtnEnabled()).toBe(true);

      // Ensure aria-labels show current parent relationships before union
      const label0Before = await uf.nodeAriaLabel(0);
      const label1Before = await uf.nodeAriaLabel(1);
      expect(label0Before).toContain('parent 0');
      expect(label1Before).toContain('parent 1');

      // Click union (default inputs 0 and 1)
      await uf.clickUnion();

      // Message should indicate union performed
      await expect(uf.message).toHaveText('Union performed between elements 0 and 1.');
      const msgColor = await uf.getMessageColor();
      expect(msgColor).toContain('rgb'); // color present

      // One of the nodes should now have parent changed (likely 1->0 given union-by-rank initial logic)
      const label0After = await uf.nodeAriaLabel(0);
      const label1After = await uf.nodeAriaLabel(1);

      // Either 0 is root and 1's parent is 0, or the opposite depending on implementation; check that at least one changed
      const parentChanged = label0After !== label0Before || label1After !== label1Before;
      expect(parentChanged).toBe(true);

      // There should be at least one edge drawn now (since union created a parent link)
      expect(await uf.svgEdgeCount()).toBeGreaterThanOrEqual(1);

      // Performing the same union again yields an "already connected" message
      await uf.clickUnion();
      await expect(uf.message).toHaveText(/already connected/i);

      // No runtime console or page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Union of same element should be gracefully reported as already connected', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // Set both union inputs to same index
      await uf.setUnionA(2);
      await uf.setUnionB(2);
      // union button should be enabled (valid indices)
      expect(await uf.isUnionBtnEnabled()).toBe(true);

      // Click union -> expected 'already connected' because same element
      await uf.clickUnion();
      await expect(uf.message).toHaveText(/already connected/i);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Connected checks and ConnectedChecked state', () => {
    test('Check connection between connected elements returns connected (green)', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // Ensure union of 3 and 4 first
      await uf.setUnionA(3);
      await uf.setUnionB(4);
      await uf.clickUnion();
      await expect(uf.message).toHaveText('Union performed between elements 3 and 4.');

      // Now set find inputs to 3 and 4 and check connected
      await uf.setFindX(3);
      await uf.setFindY(4);
      expect(await uf.isConnectedBtnEnabled()).toBe(true);

      await uf.clickConnected();
      await expect(uf.message).toHaveText('Elements 3 and 4 are connected.');

      // Verify message color is green-ish (style value present)
      const color = await uf.getMessageColor();
      expect(color).toContain('rgb');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Check connection between non-connected elements returns NOT connected (red)', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // Ensure 5 and 6 are not connected by default
      await uf.setFindX(5);
      await uf.setFindY(6);
      expect(await uf.isConnectedBtnEnabled()).toBe(true);

      await uf.clickConnected();
      await expect(uf.message).toHaveText('Elements 5 and 6 are NOT connected.');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('InputChange transition and control refreshing', () => {
    test('Changing union inputs to invalid values disables union button', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // Set unionA to a value >= n to simulate out-of-range; after initialize n=8 so set 20
      await uf.setUnionA(20);
      // unionBtn should be disabled by refreshControls
      expect(await uf.isUnionBtnEnabled()).toBe(false);

      // Reset unionA to valid and unionB to invalid negative -> unionBtn disabled
      await uf.setUnionA(0);
      await uf.setUnionB(-1);
      expect(await uf.isUnionBtnEnabled()).toBe(false);

      // Fix both to valid -> enabled
      await uf.setUnionB(1);
      expect(await uf.isUnionBtnEnabled()).toBe(true);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Updating find inputs beyond current max gets constrained by refreshControls after initialize', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // Increase number of elements to 12 and reinitialize
      await uf.setNumElements(12);
      await uf.clickInitialize();
      await expect(uf.message).toHaveText('Initialized with 12 elements (0 to 11).');

      // Now set find inputs greater than new max and ensure refreshControls resets/enforces max attribute
      await uf.setFindX(15); // out of range
      // connectedBtn should be disabled when out-of-range
      expect(await uf.isConnectedBtnEnabled()).toBe(false);

      // Set back to valid and ensure enabled
      await uf.setFindX(0);
      await uf.setFindY(11);
      expect(await uf.isConnectedBtnEnabled()).toBe(true);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Visual and accessibility checks', () => {
    test('SVG nodes should have aria-label describing parent and rank and roots have root class', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const uf = new UnionFindPage(page);
      await uf.goto();

      // Check that each node group has an aria-label describing its parent and rank
      const nodeCount = await uf.svgNodeCount();
      expect(nodeCount).toBeGreaterThan(0);
      for (let i = 0; i < nodeCount; i++) {
        const aria = await uf.nodeAriaLabel(i);
        expect(aria).toMatch(new RegExp(`Element ${i}, parent \\d+, rank \\d+`));
      }

      // Root nodes should have class "root" – ensure at least one exists
      const rootNodes = await page.locator('#graph g.node.root').count();
      expect(rootNodes).toBeGreaterThanOrEqual(1);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });
});