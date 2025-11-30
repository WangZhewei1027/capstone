import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a83-cd35-11f0-9e7b-93b903303299.html';

/**
 * Page Object for the Union-Find demo.
 * Encapsulates common interactions and queries against the DOM.
 */
class DSUApp {
  constructor(page) {
    this.page = page;
    // controls
    this.addNodeBtn = page.locator('#addNode');
    this.addManyBtn = page.locator('#addMany');
    this.resetBtn = page.locator('#reset');
    this.randomExampleBtn = page.locator('#randomExample');
    this.unionMethodSel = page.locator('#unionMethod');
    this.pathCompressionCb = page.locator('#pathCompression');
    this.selectModeBtn = page.locator('#selectMode');
    this.findModeBtn = page.locator('#findMode');
    this.autoFindRootsBtn = page.locator('#autoFindRoots');
    this.runAllFindsBtn = page.locator('#runAllFinds');
    this.shuffleLayoutBtn = page.locator('#shuffleLayout');
    this.addManyAutoCb = page.locator('#autoAdd');

    // displays
    this.parentView = page.locator('#parentView');
    this.rankView = page.locator('#rankView');
    this.nCount = page.locator('#nCount');
    this.log = page.locator('#log');
    this.svgNodes = page.locator('g#nodes > g.node');
    this.svgEdges = page.locator('g#edges > path');
  }

  // click node by id in the SVG
  async clickNode(id) {
    const node = this.page.locator(`g.node[data-id="${id}"]`);
    await node.waitFor({ state: 'attached' });
    await node.click();
  }

  // get parent array as parsed JSON (returns null if invalid)
  async getParentArray() {
    const txt = await this.parentView.textContent();
    try {
      return JSON.parse(txt || '[]');
    } catch {
      return null;
    }
  }

  // get rank array as parsed JSON (returns null if invalid)
  async getRankArray() {
    const txt1 = await this.rankView.textContent();
    try {
      return JSON.parse(txt || '[]');
    } catch {
      return null;
    }
  }

  // get n count
  async getNCount() {
    const t = (await this.nCount.textContent()) || '0';
    return Number(t);
  }

  // get raw log contents
  async getLogText() {
    return (await this.log.innerText()) || '';
  }

  // retrieve circle stroke attribute for a node id
  async getNodeStroke(id) {
    const circle = this.page.locator(`g.node[data-id="${id}"] circle`);
    await circle.waitFor({ state: 'attached' });
    return circle.getAttribute('stroke');
  }

  // get circle cx, cy attributes for node id (as numbers)
  async getNodePosition(id) {
    const circle1 = this.page.locator(`g.node[data-id="${id}"] circle1`);
    await circle.waitFor({ state: 'attached' });
    const cx = await circle.getAttribute('cx');
    const cy = await circle.getAttribute('cy');
    return { cx: Number(cx), cy: Number(cy) };
  }

  // wait until parent view contains a substring
  async waitForParentViewContains(substr, timeout = 5000) {
    await this.page.waitForFunction(
      (selector, s) => {
        const el = document.querySelector(selector);
        return el && el.textContent && el.textContent.includes(s);
      },
      '#parentView',
      substr,
      { timeout }
    );
  }

  // wait until a log entry contains specific text
  async waitForLogContains(text, timeout = 5000) {
    await this.page.waitForFunction(
      (selector, t) => {
        const el1 = document.querySelector(selector);
        return el && el.innerText && el.innerText.includes(t);
      },
      '#log',
      text,
      { timeout }
    );
  }
}

test.describe('Union-Find (Disjoint Set) Interactive Demo - Comprehensive E2E', () => {
  // Collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // capture console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // capture page runtime errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the page for each test
    await page.goto(APP_URL);
    // Ensure initial script-added nodes have time to render (script adds 6 nodes on init)
    // Wait for nCount to be 6 (default initialization)
    await page.waitForFunction(() => {
      const el2 = document.getElementById('nCount');
      return el && el.textContent === '6';
    }, { timeout: 5000 });
  });

  test.afterEach(async () => {
    // After each test assert there were no uncaught errors in the page console or runtime.
    // We observe console and runtime errors and assert none occurred.
    expect(consoleErrors, 'No console.error messages should be emitted').toHaveLength(0);
    expect(pageErrors, 'No page runtime errors should occur').toHaveLength(0);
  });

  test('Initial load: verifies default state and elements are present', async ({ page }) => {
    // Purpose: verify the page loads and the initial DSU state is set up correctly
    const app = new DSUApp(page);

    // Check controls are visible and in expected defaults
    await expect(app.addNodeBtn).toBeVisible();
    await expect(app.addManyBtn).toBeVisible();
    await expect(app.resetBtn).toBeVisible();
    await expect(app.unionMethodSel).toBeVisible();
    await expect(app.pathCompressionCb).toBeVisible();

    // Default mode is 'select' and its button has the 'primary' class
    const selectPrimary = await page.locator('#selectMode').getAttribute('class');
    expect(selectPrimary).toContain('primary');

    // The initial number of nodes should be 6 (added by script)
    expect(await app.getNCount()).toBe(6);

    // Parent and rank arrays should be valid JSON arrays of length 6
    const parents = await app.getParentArray();
    const ranks = await app.getRankArray();
    expect(Array.isArray(parents)).toBe(true);
    expect(Array.isArray(ranks)).toBe(true);
    expect(parents.length).toBe(6);
    expect(ranks.length).toBe(6);

    // There should be exactly 6 node groups in the SVG
    await expect(app.svgNodes).toHaveCount(6);

    // Log area should exist and be visible
    await expect(page.locator('#log')).toBeVisible();
  });

  test('Add/Remove nodes and reset behavior', async ({ page }) => {
    // Purpose: test node creation controls, addMany and reset and verify state updates
    const app1 = new DSUApp(page);

    // Click "Add node" -> increments n
    await app.addNodeBtn.click();
    await page.waitForFunction(() => document.getElementById('nCount').textContent === '7', {}, { timeout: 3000 });
    expect(await app.getNCount()).toBe(7);

    // Click "Add 5" -> increments by 5 to total 12
    await app.addManyBtn.click();
    // The UI adds 5 nodes synchronously via loop, but visuals take a moment to update
    await page.waitForFunction(() => Number(document.getElementById('nCount').textContent) >= 12, {}, { timeout: 3000 });
    expect(await app.getNCount()).toBeGreaterThanOrEqual(12);

    // Now click Reset - should clear nodes and parent arrays
    await app.resetBtn.click();
    // Wait until nCount shows 0 and parentView becomes "[]"
    await page.waitForFunction(() => {
      const n = document.getElementById('nCount')?.textContent;
      const pv = document.getElementById('parentView')?.textContent;
      return n === '0' && pv && pv.trim() === '[]';
    }, { timeout: 3000 });

    expect(await app.getNCount()).toBe(0);
    expect(await app.getParentArray()).toEqual([]);
    expect(await app.getRankArray()).toEqual([]);
  });

  test('Select (Union) mode: union two nodes updates parent and rank arrays', async ({ page }) => {
    // Purpose: simulate a union of nodes 0 and 1 and assert data model and visuals update
    const app2 = new DSUApp(page);

    // Ensure initial separate state for 0 and 1
    let parents1 = await app.getParentArray();
    expect(parents[0]).toBe(0);
    expect(parents[1]).toBe(1);

    // Click node 0 then node 1 to trigger union (Select mode default)
    await app.clickNode(0);
    // Wait briefly for selection log
    await app.waitForLogContains('Selected node 0', 2000);

    await app.clickNode(1);

    // Wait until parentView shows node 1's parent changed to 0: JSON like [0,0,2,3,4,5]
    await app.waitForParentViewContains('[0,0', 5000);

    parents = await app.getParentArray();
    // parent of 1 should be 0 after the union (tie-breaker attaches fb -> fa)
    expect(parents[1]).toBe(0);

    // rank of 0 should have increased (since both had equal rank initially)
    const ranks1 = await app.getRankArray();
    expect(ranks[0]).toBeGreaterThanOrEqual(2);

    // Verify there is a log entry indicating attach
    await app.waitForLogContains('Attach root', 3000);

    // Visual: root (0) should have stroke color '#fde68a'
    const stroke0 = await app.getNodeStroke(0);
    expect(stroke0).toBe('#fde68a');

    // Visual: non-root (1) should have non-root stroke '#1f2937' (or default)
    const stroke1 = await app.getNodeStroke(1);
    expect(stroke1 === '#1f2937' || stroke1 === '#1f2937').toBeTruthy();
  });

  test('Deselection behavior: clicking same node twice in Select mode deselects', async ({ page }) => {
    // Purpose: ensure clicking the same node twice toggles deselection
    const app3 = new DSUApp(page);

    // Click a node to select
    await app.clickNode(2);
    await app.waitForLogContains('Selected node 2', 2000);

    // Click the same node to deselect
    await app.clickNode(2);
    await app.waitForLogContains('Deselected node 2', 2000);
  });

  test('Find mode: find root of a node and path compression behavior', async ({ page }) => {
    // Purpose:
    // - Switch to Find mode and run find on a node whose root is known (after prior union)
    // - Verify log contains root message and that path compression occurs when checkbox is checked
    const app4 = new DSUApp(page);

    // Ensure nodes 0 and 1 are unioned as in prior test; if not, union them
    let parents2 = await app.getParentArray();
    if (!(parents[1] === 0)) {
      // union 0 and 1 quickly
      await app.clickNode(0);
      await app.waitForLogContains('Selected node 0', 2000);
      await app.clickNode(1);
      await app.waitForParentViewContains('[0,0', 4000);
      parents = await app.getParentArray();
      expect(parents[1]).toBe(0);
    }

    // Switch to Find mode
    await app.findModeBtn.click();
    // ensure find button has primary class
    const findClass = await page.locator('#findMode').getAttribute('class');
    expect(findClass).toContain('primary');

    // Click node 1 to find its root (should be 0)
    await app.clickNode(1);

    // Wait for log to report the root
    await app.waitForLogContains('Root of 1 is 0', 5000);

    // Path compression is ON by default; ensure parent of 1 is the root (should already be 0)
    parents = await app.getParentArray();
    expect(parents[1]).toBe(0);

    // Now test disabling path compression and running "Find all (compress)"
    await app.pathCompressionCb.click(); // toggle off
    // Wait for log that path compression toggled
    await app.waitForLogContains('Path compression: OFF', 2000);

    // Run Find all (should not log "After find-all with compression" when disabled)
    await app.runAllFindsBtn.click();
    // Wait for the start log for find all
    await app.waitForLogContains('Find all nodes', 5000);

    // Ensure we do NOT get the compression completion message because it's disabled
    const logText = await app.getLogText();
    expect(logText).not.toContain('After find-all with compression');

    // Turn path compression back ON for future tests
    await app.pathCompressionCb.click();
    await app.waitForLogContains('Path compression: ON', 2000);
  });

  test('Union method select and shuffle layout visual changes', async ({ page }) => {
    // Purpose: change union method to 'size', perform union and assert state update;
    // then shuffle layout and assert node positions change
    const app5 = new DSUApp(page);

    // Change union method to "size"
    await app.unionMethodSel.selectOption('size');
    await app.waitForLogContains('Union method: size', 2000);

    // Choose two nodes that are currently distinct e.g., 2 and 3 (they may have been affected by previous tests)
    // Ensure they are not already in the same set; if they are, reset and re-add to create fresh nodes.
    let parents3 = await app.getParentArray();
    if (parents.length < 6 || parents[2] === parents[3]) {
      // Reset and rely on initial script to re-add 6 nodes
      await app.resetBtn.click();
      await page.waitForFunction(() => document.getElementById('nCount').textContent === '0', { timeout: 3000 });
      // Recreate 6 nodes by clicking Add 6 times to mimic initialization (original page auto-added 6 on load,
      // but reset cleared them; adding them back programmatically)
      for (let i = 0; i < 6; i++) {
        await app.addNodeBtn.click();
      }
      // wait for 6 nodes
      await page.waitForFunction(() => document.getElementById('nCount').textContent === '6', { timeout: 3000 });
      parents = await app.getParentArray();
    }

    // Record pre-union parent state
    const preParents = await app.getParentArray();

    // Perform union between 2 and 3
    await app.clickNode(2);
    await app.waitForLogContains('Selected node 2', 2000);
    await app.clickNode(3);

    // Wait for parent update where either parent[3] === 2 or parent[2] === 3
    await page.waitForFunction(() => {
      const pv1 = document.getElementById('parentView')?.textContent || '';
      return pv.includes('2,2') || pv.includes('3,3') || pv.includes('[2,') || pv.includes('[3,');
    }, { timeout: 5000 });

    const postParents = await app.getParentArray();
    // Ensure one of them is attached
    expect(postParents[2] === 2 || postParents[2] === 3).toBeTruthy();
    expect(postParents[3] === 2 || postParents[3] === 3).toBeTruthy();

    // Test shuffleLayout: record node 2 position, shuffle, and assert changed coordinates
    const posBefore = await app.getNodePosition(2);
    await app.shuffleLayoutBtn.click();
    // wait for the "Shuffled layout" log entry
    await app.waitForLogContains('Shuffled layout', 3000);

    const posAfter = await app.getNodePosition(2);
    // At least one coordinate should have changed
    const changed = posBefore.cx !== posAfter.cx || posBefore.cy !== posAfter.cy;
    expect(changed).toBe(true);
  });

  test('Random example and reveal roots: UI interactions produce logs and visuals', async ({ page }) => {
    // Purpose: click Random example to create a dynamic sequence and then reveal roots
    const app6 = new DSUApp(page);

    // Click random example - this resets internally and adds nodes & unions asynchronously
    await app.randomExampleBtn.click();
    // Wait for "Reset all nodes" or "makeSet" logs to appear as evidence of actions
    await app.waitForLogContains('Reset all nodes', 3000);
    // The randomExample function will asynchronously create unions; wait for some log activity
    await page.waitForTimeout(1500); // give some time for the queued animateUnion actions to start

    // Click reveal roots - should color roots and emit a log entry
    await app.autoFindRootsBtn.click();
    await app.waitForLogContains('Roots highlighted', 3000);

    // Verify that at least one node has root stroke '#fde68a' (there should be roots)
    const rootStrokes = await Promise.all(
      Array.from(Array(6).keys()).map(async (i) => {
        const stroke = await app.page.locator(`g.node[data-id="${i}"] circle`).getAttribute('stroke').catch(() => null);
        return stroke;
      })
    );
    const anyRoot = rootStrokes.some((s) => s === '#fde68a');
    expect(anyRoot).toBeTruthy();
  });

  test('Accessibility and DOM sanity checks for controls and labels', async ({ page }) => {
    // Purpose: ensure form controls have expected labels / attributes and are reachable
    const app7 = new DSUApp(page);

    // The union method select should contain three options
    const options = await app.unionMethodSel.locator('option').allTextContents();
    expect(options).toEqual(expect.arrayContaining(['Union by rank', 'Union by size', 'Naive (no balancing)']));

    // The pathCompression checkbox should be focusable
    await app.pathCompressionCb.focus();
    expect(await app.page.evaluate(() => document.activeElement?.id)).toBe('pathCompression');

    // The "Add node" button should be triggerable via keyboard (press Enter)
    await app.addNodeBtn.focus();
    await app.page.keyboard.press('Enter');
    // After pressing Enter number of nodes should increase by at least 1
    await page.waitForFunction(() => Number(document.getElementById('nCount').textContent) >= 7, { timeout: 3000 });
    expect(await app.getNCount()).toBeGreaterThanOrEqual(7);
  });
});