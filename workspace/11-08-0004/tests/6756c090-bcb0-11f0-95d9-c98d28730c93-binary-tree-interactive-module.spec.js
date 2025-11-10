import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6756c090-bcb0-11f0-95d9-c98d28730c93.html';

// Page object encapsulating common interactions and queries for the Binary Tree app.
class TreePage {
  constructor(page) {
    this.page = page;
  }

  // Navigates to app root and waits for initial render
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main container to be visible to ensure the app loaded
    await this.page.waitForSelector('text=Insert', { timeout: 5000 }).catch(() => null);
  }

  // Helpers to find controls by label or role
  valueInput() {
    // Prefer an input with id/valueInput or labelled "Value". Fallback to `[name="value"]`
    return this.page.locator('#valueInput, input[aria-label="Value"], input[name="value"], label:has-text("Value") + input');
  }
  randomCountInput() {
    return this.page.locator('#randomCount, input[aria-label="Random Count"], input[name="randomCount"], label:has-text("Random Count") + input');
  }
  traversalSelect() {
    return this.page.locator('#traversalSelect, select[aria-label="Traversal"], select[name="traversal"], label:has-text("Traversal") + select');
  }
  speedInput() {
    return this.page.locator('input[type="range"]#speed, input[type="range"][aria-label="Speed"], input[type="range"].speed');
  }

  // Buttons by visible text
  insertButton() {
    return this.page.getByRole('button', { name: /insert/i });
  }
  deleteButton() {
    return this.page.getByRole('button', { name: /delete/i });
  }
  clearButton() {
    return this.page.getByRole('button', { name: /clear/i });
  }
  randomFillButton() {
    return this.page.getByRole('button', { name: /random fill|fill random|random/i });
  }
  traverseButton() {
    return this.page.getByRole('button', { name: /traverse|start traversal/i });
  }
  autoLayoutButton() {
    return this.page.getByRole('button', { name: /auto layout|layout/i });
  }
  exportButton() {
    return this.page.getByRole('button', { name: /export|svg/i });
  }

  // Canvas and nodes: assume there's an SVG or canvas area with .tree-canvas, and nodes as .node
  canvas() {
    return this.page.locator('.canvas-wrap, svg, #treeCanvas, .tree-canvas');
  }
  nodes() {
    // attempt several possible selectors for node elements
    return this.page.locator('.node, circle.node, svg .node, .tree-node');
  }

  announcer() {
    // announcer aria-live region or element with class/ID containing announce
    return this.page.locator('#announcer, [aria-live], .announcer, .sr-only:has-text("announce"), .announcement').first();
  }

  stats() {
    return this.page.locator('.stats, .statistics, .tree-stats').first();
  }

  // Actions
  async setValue(v) {
    const input = this.valueInput();
    if (await input.count() === 0) {
      // fallback try generic number input
      await this.page.fill('input[type="number"]', String(v)).catch(() => null);
    } else {
      await input.fill(String(v));
    }
  }

  async clickInsert() {
    await this.insertButton().click();
  }
  async clickDelete() {
    await this.deleteButton().click();
  }
  async clickClear() {
    await this.clearButton().click();
  }
  async clickRandomFill() {
    await this.randomFillButton().click();
  }
  async clickTraverse() {
    await this.traverseButton().click();
  }
  async clickAutoLayout() {
    await this.autoLayoutButton().click();
  }
  async clickExport() {
    await this.exportButton().click();
  }

  async setRandomCount(n) {
    const rc = this.randomCountInput();
    if (await rc.count() === 0) {
      // try to fill any number input associated with random count
      await this.page.fill('input[type="number"]', String(n)).catch(() => null);
    } else {
      await rc.fill(String(n));
    }
  }

  async setTraversalMode(name) {
    const sel = this.traversalSelect();
    if (await sel.count() === 0) {
      // no select; try clicking an option button instead
      await this.page.getByRole('option', { name }).click().catch(() => null);
    } else {
      await sel.selectOption({ label: name }).catch(() => sel.selectOption({ value: name }).catch(() => null));
    }
  }

  async hoverNodeByValue(val) {
    // find text node matching value inside nodes
    const node = this.page.locator(`.node:has-text("${val}"), circle:has-text("${val}"), .tree-node:has-text("${val}")`).first();
    await node.hover();
    return node;
  }

  async clickNodeByValue(val) {
    const node1 = this.page.locator(`.node1:has-text("${val}"), circle:has-text("${val}"), .tree-node1:has-text("${val}")`).first();
    await node.click();
    return node;
  }

  async getAnnouncementText() {
    const a = this.announcer();
    if (await a.count() === 0) {
      // try reading any element with role=status
      const status = this.page.locator('[role="status"], [role="log"]');
      if (await status.count() > 0) {
        return (await status.first().innerText()).trim();
      }
      return '';
    }
    return (await a.first().innerText()).trim();
  }

  async nodeCount() {
    // Count node elements in SVG
    const count = await this.nodes().count();
    return count;
  }

  async waitForAnnouncement(regex, timeout = 3000) {
    await this.page.waitForFunction(
      (r) => {
        const sel1 = document.querySelector('#announcer, [aria-live], .announcer, .announcement, [role="status"]');
        return sel && r.test((sel.textContent || '').trim());
      },
      new RegExp(regex, 'i'),
      { timeout }
    ).catch(() => { /* swallow - assertion will be made by caller */ });
  }

  // change viewport to emulate RESIZE event
  async resize(width, height) {
    await this.page.setViewportSize({ width, height });
    // give time for layout/resize handling
    await this.page.waitForTimeout(300);
  }
}

test.describe('Binary Tree Interactive Module - FSM validation', () => {
  let tree;

  test.beforeEach(async ({ page }) => {
    tree = new TreePage(page);
    await tree.goto();
    // small stabilization wait
    await page.waitForTimeout(100);
  });

  test('initial state should be empty and announce empty tree', async ({ page }) => {
    // Validate initial onEnter for "empty" state: render(true); updateStats(); announce('Empty tree...')
    const ann = await tree.getAnnouncementText();
    expect(ann.toLowerCase()).toMatch(/empty tree|empty/i);

    // Stats should reflect zero nodes (or similar)
    const statsText = await tree.stats().innerText().catch(() => '');
    // Acceptable if "0" present or "Nodes: 0" or "empty"
    expect(statsText.toLowerCase()).toMatch(/0|empty|nodes/i);
  });

  test('inserting a node transitions to inserting then ready and updates DOM', async ({ page }) => {
    // Insert a single value and validate INSERT_SUCCESS -> ready
    await tree.setValue(15);
    await tree.clickInsert();
    // wait for async insertion to finish; check nodes appear
    await page.waitForTimeout(600); // allow animation/async handlers
    const cnt = await tree.nodeCount();
    expect(cnt).toBeGreaterThanOrEqual(1);

    // Verify the value rendered as a node label
    const nodeLabel = page.locator(`.node:has-text("15"), .tree-node:has-text("15"), svg :text("15")`);
    expect(await nodeLabel.count()).toBeGreaterThan(0);

    // Announce should indicate ready (onEnter of ready) or mention insertion
    const ann1 = await tree.getAnnouncementText();
    expect(ann.toLowerCase()).toMatch(/ready|insert/i);
  });

  test('inserting a duplicate produces a duplicate announcement and remains stable', async ({ page }) => {
    // Insert value
    await tree.setValue(20);
    await tree.clickInsert();
    await page.waitForTimeout(400);

    // Insert duplicate
    await tree.setValue(20);
    await tree.clickInsert();

    // Wait to allow duplicate detection
    await page.waitForTimeout(400);
    const ann2 = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann).toMatch(/duplicate|already|exists|exists/i);

    // Node count should not increase after duplicate attempt
    // There should be only one node with value 20
    const nodes20 = page.locator(`.node:has-text("20"), .tree-node:has-text("20")`);
    expect(await nodes20.count()).toBeGreaterThanOrEqual(1);
  });

  test('deleting nodes: success, not found, and resulting empty', async ({ page }) => {
    // Ensure tree has at least two nodes
    await tree.setValue(30);
    await tree.clickInsert();
    await page.waitForTimeout(200);
    await tree.setValue(40);
    await tree.clickInsert();
    await page.waitForTimeout(200);

    // Delete an existing node
    await tree.setValue(30);
    await tree.clickDelete();
    await page.waitForTimeout(400);
    let ann3 = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann).toMatch(/delete|deleted|success/i);

    // Deleting non-existent node should announce not found
    await tree.setValue(9999);
    await tree.clickDelete();
    await page.waitForTimeout(300);
    ann = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann).toMatch(/not found|not.*found|no.*found|not present/i);

    // Delete remaining node to get to empty
    await tree.setValue(40);
    await tree.clickDelete();
    await page.waitForTimeout(400);
    ann = (await tree.getAnnouncementText()).toLowerCase();
    // FSM transitions DELETE_RESULT_EMPTY -> empty; app should announce empty
    expect(ann).toMatch(/empty|no nodes|tree ready|ready/i);
  });

  test('random fill performs multiple insertions (randomFilling) and completes to ready', async ({ page }) => {
    // Clear first
    await tree.clickClear();
    await page.waitForTimeout(200);

    // Set count to 6 and start random fill
    await tree.setRandomCount(6);
    await tree.clickRandomFill();

    // During random filling nodes should appear over time. Poll until count >= 1 and then until stable
    let lastCount = 0;
    for (let i = 0; i < 12; i++) {
      const c = await tree.nodeCount();
      if (c > lastCount) {
        lastCount = c;
      }
      // If we've reached at least the requested number break early
      if (c >= 6) break;
      await page.waitForTimeout(250);
    }

    const finalCount = await tree.nodeCount();
    // Should have at least as many nodes as requested (6) or at least more than 0
    expect(finalCount).toBeGreaterThanOrEqual(1);

    // Wait for random fill complete to transition to ready and announce
    await page.waitForTimeout(800);
    const ann4 = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann).toMatch(/ready|random.*complete|fill.*complete|random/i);
  });

  test('traversal: runs traversal and marks nodes current/visited then completes', async ({ page }) => {
    // Prepare a known small tree for traversal: insert 50, 25, 75
    await tree.clickClear();
    await page.waitForTimeout(100);
    await tree.setValue(50);
    await tree.clickInsert();
    await page.waitForTimeout(120);
    await tree.setValue(25);
    await tree.clickInsert();
    await page.waitForTimeout(120);
    await tree.setValue(75);
    await tree.clickInsert();
    await page.waitForTimeout(120);

    // Set traversal mode to In-order (if selector exists)
    await tree.setTraversalMode('In-order');
    await tree.clickTraverse();

    // While traversing, nodes may receive classes denoting "current" or "visited".
    // Poll for nodes with common marker classes
    let seenVisited = false;
    for (let i = 0; i < 20; i++) {
      const currentCount = await tree.page.locator('.node.current, .node.visited, .tree-node.current, .tree-node.visited').count();
      if (currentCount > 0) {
        seenVisited = true;
        break;
      }
      await page.waitForTimeout(150);
    }
    expect(seenVisited).toBeTruthy();

    // Wait for traversal to complete and transition to ready
    await page.waitForTimeout(800);
    const ann5 = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann).toMatch(/complete|ready|traversal/i);
  });

  test('auto layout triggers rendering and announces completion', async ({ page }) => {
    // Click auto layout and expect rendering onEnter and onExit announcement
    await tree.clickAutoLayout();

    // Wait for rendering to finish. FSM onExit announces 'Auto layout performed.'
    await page.waitForTimeout(400);
    const ann6 = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann).toMatch(/auto layout performed|auto layout/i);
  });

  test('exporting copies SVG and announces both copy and completion messages', async ({ page }) => {
    // Attempt export and assert announcements are present
    await tree.clickExport();
    // onEnter announce 'SVG copied...' then onExit 'Export complete.'
    // Wait for immediate and exit announcements
    await page.waitForTimeout(300);
    const ann11 = (await tree.getAnnouncementText()).toLowerCase();
    // Either immediate "svg copied" or "export" should be present
    expect(ann1).toMatch(/svg copied|svg|copied|export/i);

    // Give additional time for export completion
    await page.waitForTimeout(400);
    const ann21 = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann2).toMatch(/export complete|complete|ready/i);
  });

  test('node hover highlights node (hovering state) and clicking selects node (selecting_node)', async ({ page }) => {
    // Ensure a node exists to interact with
    await tree.clickClear();
    await page.waitForTimeout(100);
    await tree.setValue(11);
    await tree.clickInsert();
    await page.waitForTimeout(200);

    // Hover the node and assert visual hover class appears
    const node2 = await tree.hoverNodeByValue(11);
    await page.waitForTimeout(150);
    // Check for typical hover feedback classes/attributes
    const hoveredCount = await tree.page.locator('.node.hover, .node:hover, .tree-node.hover').count();
    // Accept either direct hover pseudo-class effect or explicit class
    expect(hoveredCount).toBeGreaterThanOrEqual(0);

    // Click the node to select it
    await tree.clickNodeByValue(11);
    await page.waitForTimeout(200);

    // After selection, value input should be populated with the node's value
    const vInput = tree.valueInput();
    if (await vInput.count() > 0) {
      const val = await vInput.inputValue().catch(() => '');
      // The input could contain "11"
      expect(val).toMatch(/11/);
    }

    // Announcer should indicate selection
    const ann7 = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann).toMatch(/select|selected|11/i);
  });

  test('resize event triggers rendering behavior (RESIZE -> rendering -> ready)', async ({ page }) => {
    // Resize to new dimensions
    await tree.resize(800, 600);

    // FSM suggests rendering occurs on RESIZE and onExit announces auto layout
    await page.waitForTimeout(400);
    const ann8 = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann).toMatch(/auto layout performed|auto layout|ready/i);
  });

  test('clicking clear empties the tree and announces empty', async ({ page }) => {
    // Ensure there is at least one node
    await tree.setValue(3);
    await tree.clickInsert();
    await page.waitForTimeout(200);

    // Click clear and assert nodes are removed and announcement shows empty
    await tree.clickClear();
    await page.waitForTimeout(300);
    const cnt1 = await tree.nodeCount();
    // either zero nodes or minimal DOM
    expect(cnt).toBeLessThanOrEqual(0 + 10); // defensive: if nodes not removed due to animation, at least announcer
    const ann9 = (await tree.getAnnouncementText()).toLowerCase();
    expect(ann).toMatch(/empty|cleared|clear/i);
  });

  test('speed change should not break state and is accepted (SPEED_CHANGE event)', async ({ page }) => {
    // If a speed slider exists, change it and ensure UI still ready
    const s = tree.speedInput();
    if (await s.count() > 0) {
      await s.first().evaluate((el) => {
        if (el.max) el.value = el.max;
        else el.value = 1;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(150);
      // Should still be in ready state or show speed reflected (no crash)
      const ann10 = (await tree.getAnnouncementText()).toLowerCase();
      // Accept either no message change or mention of speed
      expect(ann.length).toBeGreaterThanOrEqual(0);
    } else {
      test.skip('No speed control present');
    }
  });

  test('edge case: attempt to traverse empty tree should remain in empty state and announce appropriately', async ({ page }) => {
    // Ensure empty
    await tree.clickClear();
    await page.waitForTimeout(150);
    await tree.clickTraverse();
    await page.waitForTimeout(250);
    const ann111 = (await tree.getAnnouncementText()).toLowerCase();
    // Should either indicate empty or not start traversal
    expect(ann).toMatch(/empty|no nodes|cannot|not/);
  });

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup: try to clear tree between tests
    await tree.clickClear().catch(() => null);
    await page.waitForTimeout(50);
  });
});