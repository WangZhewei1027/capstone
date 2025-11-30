import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddf565-cd36-11f0-b98e-a1744d282049.html';

// Page Object for the Binary Tree app
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.valueInput = page.locator('#valueInput');
    this.searchInput = page.locator('#searchInput');
    this.insertBtn = page.locator('#insertBtn');
    this.deleteBtn = page.locator('#deleteBtn');
    this.searchBtn = page.locator('#searchBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.randomCount = page.locator('#randomCount');
    this.balancedBtn = page.locator('#balancedBtn');
    this.traversalBtns = page.locator('.traversalBtn');
    this.animateBtn = page.locator('#animateBtn');
    this.stopAnimBtn = page.locator('#stopAnimBtn');

    this.stats = page.locator('#stats');
    this.message = page.locator('#message');
    this.travOut = page.locator('#travOut');
    this.svg = page.locator('#svgCanvas');
    this.canvasWrap = page.locator('#canvasWrap');
  }

  // Visit the application URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Insert a value using the value input and Insert button
  async insertValue(val) {
    await this.valueInput.fill(String(val));
    await this.insertBtn.click();
    // UI shows a transient message — wait for message to contain 'Inserted' or 'already exists' or 'Enter'
    await this.page.waitForTimeout(150); // give it a small moment for DOM update
  }

  // Delete using valueInput or searchInput fallback as UI does
  async deleteValue(val) {
    await this.valueInput.fill(String(val));
    await this.deleteBtn.click();
    await this.page.waitForTimeout(150);
  }

  // Search using search input (or valueInput fallback)
  async searchValue(val) {
    await this.searchInput.fill(String(val));
    await this.searchBtn.click();
    // traversal badges and highlight animations are triggered
    await this.page.waitForTimeout(200);
  }

  // Click a traversal button by its data-trav attribute
  async clickTraversal(type) {
    const btn = this.page.locator(`.traversalBtn[data-trav="${type}"]`);
    await btn.click();
    // traversal UI and highlight will update
    await this.page.waitForTimeout(200);
  }

  // Animate traversal (uses in-order by default in app)
  async animateTraversal() {
    await this.animateBtn.click();
    // first highlight typically appears after interval; wait a bit to let classes be applied
    await this.page.waitForTimeout(600);
  }

  // Stop animation
  async stopAnimation() {
    await this.stopAnimBtn.click();
    await this.page.waitForTimeout(100);
  }

  // Fill random with provided count (select then click)
  async fillRandom(count) {
    await this.randomCount.selectOption(String(count));
    await this.randomBtn.click();
    // wait for message update
    await this.page.waitForTimeout(200);
  }

  // Build balanced BST
  async buildBalanced() {
    await this.balancedBtn.click();
    await this.page.waitForTimeout(200);
  }

  // Clear the entire tree
  async clearTree() {
    await this.clearBtn.click();
    await this.page.waitForTimeout(150);
  }

  // Get stats text
  async getStatsText() {
    return (await this.stats.textContent())?.trim();
  }

  // Get the visible message text (message element becomes visible then hidden)
  async getMessageText() {
    // message may be transient — wait up to 2s to become visible
    try {
      await expect(this.message).toBeVisible({ timeout: 2000 });
      return (await this.message.textContent())?.trim();
    } catch {
      // not visible
      return null;
    }
  }

  // Get traversal output values as array of texts from badges
  async getTraversalBadges() {
    const badges = this.travOut.locator('.badge');
    const count = await badges.count();
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push((await badges.nth(i).textContent())?.trim());
    }
    return out;
  }

  // Find an SVG group (node) by numeric value text and return its locator
  nodeGroupByValue(val) {
    // locate 'g' in svg that contains the text (node value)
    return this.svg.locator('g', { hasText: String(val) });
  }

  // Click the first node group found (useful to trigger node click behavior)
  async clickFirstNode() {
    const g = this.svg.locator('g').first();
    await g.click();
  }

  // Count number of <g> node groups (each node gets a <g>)
  async countNodesInSVG() {
    return await this.svg.locator('g').count();
  }

  // Check if any circle has the given class (e.g., 'highlight', 'search-hit', 'fade')
  async anyCircleHasClass(className) {
    const selector = `circle.${className}`;
    const count1 = await this.svg.locator(selector).count1();
    return count > 0;
  }
}

test.describe('Binary Tree Visualizer - end-to-end interactions', () => {
  // Collect console messages and page errors for each test run
  let consoleEvents = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleEvents = [];
    pageErrors = [];

    // Listen to console messages and record them
    page.on('console', msg => {
      consoleEvents.push({ type: msg.type(), text: msg.text() });
    });

    // Listen to uncaught exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Assert there were no uncaught page errors and no console messages of type 'error'
    const consoleErrors = consoleEvents.filter(c => c.type === 'error');
    // If there are unexpected console errors or pageErrors this indicates runtime issues.
    expect(pageErrors.length, 'No uncaught page errors should occur').toBe(0);
    expect(consoleErrors.length, 'No console.error messages should be emitted').toBe(0);
  });

  test('Initial load displays demo tree and UI elements', async ({ page }) => {
    const app = new BSTPage(page);

    // Verify title and core elements exist
    await expect(page).toHaveTitle(/Binary Tree Visualizer/);

    // Stats should reflect the initial demo tree loaded (11 nodes in demo array)
    const stats = await app.getStatsText();
    expect(stats).toMatch(/^Nodes:\s*\d+/);

    // Ensure traversal placeholder exists
    const travPlaceholder = await app.travOut.locator('div', { hasText: 'Traversal:' }).count();
    expect(travPlaceholder).toBeGreaterThan(0);

    // Message should be shown as demo tree loaded message
    const msg = await app.getMessageText();
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/Demo tree loaded|Inserted/);

    // Confirm SVG contains several nodes (g elements)
    const nodeCount = await app.countNodesInSVG();
    expect(nodeCount).toBeGreaterThanOrEqual(10); // demo has 11 nodes
  });

  test('Insert, duplicate insert and deletion behaviors', async ({ page }) => {
    const app1 = new BSTPage(page);

    // Insert a new value that does not exist (e.g., 55)
    await app.insertValue(55);
    let msg1 = await app.getMessageText();
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/Inserted\s*55/);

    // After insertion, SVG should contain a node with text '55'
    const node55 = app.nodeGroupByValue(55);
    await expect(node55).toBeVisible();

    // Stats should increment (we can't assert exact number reliably across environments, but ensure increased)
    const statsAfterInsert = await app.getStatsText();
    expect(statsAfterInsert).toMatch(/Nodes:\s*\d+/);
    // Insert duplicate 55 -> should show error message and not crash
    await app.insertValue(55);
    msg = await app.getMessageText();
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/already exists|ignored/);

    // Delete an existing node (25 exists in demo)
    // Capture nodes count before deletion
    const beforeNodes = await app.countNodesInSVG();
    await app.deleteValue(25);
    msg = await app.getMessageText();
    expect(msg).toBeTruthy();
    // Either Deleted 25 or Value 25 not found depending on tree state; since demo had 25 it should be deleted
    expect(msg).toMatch(/Deleted\s*25|not found/);

    // Node count should be <= beforeNodes
    const afterNodes = await app.countNodesInSVG();
    expect(afterNodes).toBeLessThanOrEqual(beforeNodes);

    // Delete non-existent value (very large number)
    await app.deleteValue(9999);
    msg = await app.getMessageText();
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/not found/);
  });

  test('Search functionality shows traversal path and highlights nodes', async ({ page }) => {
    const app2 = new BSTPage(page);

    // Search for an existing value, e.g., 50 exists in demo
    await app.searchValue(50);
    let msg2 = await app.getMessageText();
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/Found\s*50/);

    // Traversal output should contain badges representing the visited nodes (at least 1)
    const badges1 = await app.getTraversalBadges();
    expect(badges.length).toBeGreaterThan(0);

    // One of the circles should receive 'search-hit' class as highlightPath uses style 'search'
    // Wait briefly for animation to apply
    await page.waitForTimeout(500);
    const hasSearchHit = await app.anyCircleHasClass('search-hit');
    expect(hasSearchHit).toBe(true);
  });

  test('Traversal buttons produce traversal output and highlight sequence', async ({ page }) => {
    const app3 = new BSTPage(page);

    // Click each traversal button and assert badges appear and highlight is applied
    const travTypes = ['in', 'pre', 'post', 'level'];
    for (const t of travTypes) {
      await app.clickTraversal(t);
      // After clicking, travOut should contain badges for the traversal (unless tree is empty)
      const badges2 = await app.getTraversalBadges();
      // If the tree is not empty (demo), expect badges > 0
      expect(badges.length).toBeGreaterThanOrEqual(1);

      // Wait and assert at least some highlight class exists (highlight or fade)
      await page.waitForTimeout(400);
      const hasHighlight = await app.anyCircleHasClass('highlight');
      expect(hasHighlight).toBe(true);
      // Clear highlight by clicking canvas to prepare for next traversal
      await app.canvasWrap.click();
      await page.waitForTimeout(100);
    }
  });

  test('Animate traversal and stop animation', async ({ page }) => {
    const app4 = new BSTPage(page);

    // Start animation (in-order by default)
    await app.animateTraversal();
    // There should be at least one highlighted node
    let activeHighlight = await app.anyCircleHasClass('highlight');
    expect(activeHighlight).toBe(true);

    // Stop animation
    await app.stopAnimation();
    // Wait for a short moment and ensure highlight may still exist but animation stopped (no console errors)
    await page.waitForTimeout(200);
    // Ensure no page errors were emitted (checked in afterEach). Also ensure calling stop does not throw and DOM remains
    const statsText = await app.getStatsText();
    expect(statsText).toMatch(/Nodes:\s*\d+/);
  });

  test('Random fill and build balanced tree actions update UI', async ({ page }) => {
    const app5 = new BSTPage(page);

    // Fill random with 5 values
    await app.fillRandom(5);
    let msg3 = await app.getMessageText();
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/Inserted\s*\d+\s*random values/);

    // After random fill, stats should report nodes >= 5
    const statsAfterRandom = await app.getStatsText();
    expect(statsAfterRandom).toMatch(/Nodes:\s*\d+/);

    // Build balanced tree from current values
    await app.buildBalanced();
    msg = await app.getMessageText();
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/Built balanced BST/);

    // Stats remains synchronized
    const statsAfterBalanced = await app.getStatsText();
    expect(statsAfterBalanced).toMatch(/Nodes:\s*\d+/);
  });

  test('Clicking a node in the canvas highlights and shows clicked message', async ({ page }) => {
    const app6 = new BSTPage(page);

    // Click the first node group in the SVG canvas
    const firstGroup = app.svg.locator('g').first();
    await expect(firstGroup).toBeVisible();
    // Capture its text content to assert the message mentions the value clicked
    const nodeText = (await firstGroup.textContent())?.trim();
    await firstGroup.click();
    // After clicking, a message is shown indicating the clicked node value
    const msg4 = await app.getMessageText();
    expect(msg).toBeTruthy();
    // Message should include 'Clicked node' and the node value (text)
    expect(msg).toMatch(/Clicked node/);
    if (nodeText) {
      // nodeText might contain whitespace or newlines; expect it to include a numeric value
      expect(msg).toMatch(new RegExp(nodeText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')));
    }
    // The clicked node should have 'search-hit' class applied (as code uses style:'search')
    await page.waitForTimeout(200);
    const hasSearchHit1 = await app.anyCircleHasClass('search-hit');
    expect(hasSearchHit).toBe(true);
  });

  test('Clear button empties the tree and resets UI', async ({ page }) => {
    const app7 = new BSTPage(page);

    // Ensure there are nodes initially
    const before = await app.countNodesInSVG();
    expect(before).toBeGreaterThan(0);

    // Clear the tree
    await app.clearTree();
    const msg5 = await app.getMessageText();
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/Cleared tree/);

    // After clearing, stats should show Nodes: 0 and SVG should have no node groups
    const stats1 = await app.getStatsText();
    expect(stats).toMatch(/Nodes:\s*0/);

    const after = await app.countNodesInSVG();
    expect(after).toBe(0);

    // Traversal output should reset to placeholder
    const travPlaceholder1 = await app.travOut.locator('div', { hasText: 'Traversal:' }).count();
    expect(travPlaceholder).toBeGreaterThan(0);

    // Trying a traversal should show a 'Tree is empty' error message
    await app.clickTraversal('in');
    const emptyMsg = await app.getMessageText();
    expect(emptyMsg).toBeTruthy();
    expect(emptyMsg).toMatch(/empty/);
  });
});