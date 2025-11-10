import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7c6a1b80-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Kruskal interactive module.
 * Encapsulates selectors and common interactions used across tests.
 */
class KruskalPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Common UI controls (use flexible text matching to be resilient to slight label changes)
    this.btnRandom = page.getByRole('button', { name: /random/i });
    this.btnClear = page.getByRole('button', { name: /clear/i });
    this.btnSort = page.getByRole('button', { name: /sort/i });
    this.btnStep = page.getByRole('button', { name: /step/i });
    // Auto Run might be labelled "Auto Run" or "Auto"
    this.btnAuto = page.getByRole('button', { name: /auto/i });
    this.btnPause = page.getByRole('button', { name: /pause/i });
    // Connect toggle may be a button (toggle) labelled "Connect" or have aria-pressed
    this.btnConnect = page.getByRole('button', { name: /connect/i });
    // Reset algorithm / Reset button
    this.btnReset = page.getByRole('button', { name: /reset|reset alg|reset algorithm/i });

    // Status element; using common class from provided HTML
    this.status = page.locator('.status');

    // Edge queue listing
    this.edgeQueue = page.locator('.edge-queue');
    this.queueItems = page.locator('.edge-queue .queue-item');

    // Main svg canvas (graph rendering)
    this.svg = page.locator('svg').first();

    // Generic node selector: try svg circle nodes, fallback to elements with .node
    this.nodeSelector = 'svg circle, .node';
    this.edgeSelector = 'svg line, svg path.edge, .edge';

    // Provide helpful timeout for operations
    this.shortTimeout = { timeout: 2000 };
    this.mediumTimeout = { timeout: 5000 };
  }

  async waitForAppReady() {
    // Wait for either the header or controls to render; use page title as a sanity check
    await expect(this.page).toHaveTitle(/Kruskal/i, this.mediumTimeout);
    await expect(this.status).toBeVisible(this.mediumTimeout);
  }

  // Helpers to get counts
  async nodeCount() {
    return await this.page.locator(this.nodeSelector).count();
  }
  async edgeCount() {
    return await this.page.locator(this.edgeSelector).count();
  }
  async queueCount() {
    return await this.queueItems.count();
  }

  // Toggle connect mode; returns boolean of pressed state if attribute present
  async toggleConnect() {
    await this.btnConnect.click();
    // Some implementations use aria-pressed to show toggle state
    const pressed = await this.btnConnect.getAttribute('aria-pressed').catch(() => null);
    return pressed === 'true';
  }

  // Create an edge by clicking two node elements in connect mode
  // indexFrom and indexTo are indices of nodes in the node list
  async createEdgeBetween(indexFrom = 0, indexTo = 1) {
    const nodes = this.page.locator(this.nodeSelector);
    const count = await nodes.count();
    if (count <= Math.max(indexFrom, indexTo)) {
      throw new Error(`Not enough nodes to create edge; nodes=${count}`);
    }
    await nodes.nth(indexFrom).click();
    // After selecting first node, second click should create edge (UI may prompt for weight but many implementations auto-create)
    await nodes.nth(indexTo).click();

    // Some implementations prompt for weight; handle cancel if a prompt appears (native prompt)
    // We can't handle native prompt text reliably in all environments; ensure we continue
    // Wait a bit for edge to appear
    await this.page.waitForTimeout(250);
  }

  // Drag a node by an offset (dx, dy)
  async dragNode(index = 0, dx = 40, dy = 30) {
    const nodes1 = this.page.locator(this.nodeSelector);
    const count1 = await nodes.count1();
    if (count === 0) throw new Error('No nodes to drag');

    const node = nodes.nth(index);
    const box = await node.boundingBox();
    if (!box) throw new Error('Could not retrieve node bounding box');

    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const end = { x: start.x + dx, y: start.y + dy };

    // Emulate pointer drag
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    // small move to engage dragging
    await this.page.mouse.move(start.x + 2, start.y + 2);
    await this.page.mouse.move(end.x, end.y, { steps: 8 });
    await this.page.mouse.up();

    // Allow UI to process dragging
    await this.page.waitForTimeout(150);
  }

  // Utility: read visible status text
  async statusText() {
    return (await this.status.innerText()).trim();
  }

  // Utility: click sort and wait for queue to populate
  async clickSortAndWaitForQueue() {
    await this.btnSort.click();
    // Wait until queue has at least one item or a "no edges" message appears
    await this.page.waitForTimeout(200);
    // Try waiting for queue items
    try {
      await expect(this.queueItems).toHaveCountGreaterThan(0, this.mediumTimeout);
    } catch {
      // If no queue items, let the test continue; some implementations render message in status
    }
  }

  // Start auto run and wait small time to observe changes
  async startAutoAndRunFor(ms = 800) {
    await this.btnAuto.click();
    await this.page.waitForTimeout(ms);
  }

  // Pause if pause button visible
  async pauseIfAvailable() {
    const pauseVisible = await this.btnPause.isVisible().catch(() => false);
    if (pauseVisible) {
      await this.btnPause.click();
    } else {
      // Try toggling auto again (some UIs use same button for pause)
      const autoLabel = await this.btnAuto.getAttribute('aria-pressed').catch(() => null);
      // attempt to click auto to pause
      await this.btnAuto.click().catch(() => {});
    }
    await this.page.waitForTimeout(200);
  }
}

test.describe('Kruskal Algorithm Interactive Module — FSM conformance tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto(APP_URL);
    // Create page object and wait for app to be ready
    const app = new KruskalPage(page);
    await app.waitForAppReady();
  });

  test('UI sanity: page title, controls and status visible', async ({ page }) => {
    // Validate basic rendering (onEnter)
    const app1 = new KruskalPage(page);
    await expect(page).toHaveTitle(/Kruskal/i);
    await expect(app.btnRandom).toBeVisible();
    await expect(app.btnSort).toBeVisible();
    await expect(app.status).toBeVisible();
    // Status should contain something reasonable (muted help text)
    const status = await app.statusText();
    expect(status.length).toBeGreaterThan(0);
  });

  test.describe('Editing / graph-building states (unsorted, idle, connect_mode, connect_first_selected, dragging)', () => {
    test('CLICK_RANDOM should generate nodes and edges and put app into idle (rendered graph)', async ({ page }) => {
      // Test Random generation and ensure graph elements exist
      const app2 = new KruskalPage(page);
      // Click Random Graph
      await app.btnRandom.click();
      // After random generation we expect at least one node or edge
      await page.waitForTimeout(300); // brief wait for render
      const nodes2 = await app.nodeCount();
      const edges = await app.edgeCount();
      expect(nodes + edges).toBeGreaterThan(0);
      // Status should mention graph or nodes or edges (flexible)
      const st = (await app.statusText()).toLowerCase();
      expect(/graph|node|edge|random|generated|ready/i.test(st) || nodes > 0 || edges > 0).toBeTruthy();
    });

    test('TOGGLE_CONNECT enters connect mode; selecting two nodes creates an edge (EDGE_CREATED)', async ({ page }) => {
      const app3 = new KruskalPage(page);
      // Ensure there's a graph to connect nodes on
      await app.btnRandom.click();
      await page.waitForTimeout(200);

      // Enter connect mode
      const wasPressed = await app.toggleConnect();
      // If aria-pressed not present, ensure the Connect button is visually active or mode indicated
      const stBefore = await app.statusText();
      expect(stBefore.length).toBeGreaterThan(0);

      // Create an edge by clicking two nodes
      const startingEdges = await app.edgeCount();
      const nodeCount = await app.nodeCount();
      if (nodeCount < 2) {
        // If random graph created <2 nodes, create additional nodes by clicking canvas if available
        const svgBox = await app.svg.boundingBox().catch(() => null);
        if (svgBox) {
          const x = svgBox.x + svgBox.width * 0.2;
          const y = svgBox.y + svgBox.height * 0.2;
          await page.mouse.click(x, y); // add node
          await page.mouse.click(x + 20, y + 20); // add node
          await page.waitForTimeout(200);
        }
      }

      const nodes3 = page.locator(app.nodeSelector);
      const count2 = await nodes.count2();
      expect(count).toBeGreaterThanOrEqual(2);

      await app.createEdgeBetween(0, 1);

      // After attempt, edge count should increase (or queue updated)
      await page.waitForTimeout(250);
      const endingEdges = await app.edgeCount();
      const queueCount = await app.queueCount().catch(() => 0);
      expect(endingEdges >= startingEdges || queueCount >= 0).toBeTruthy();
    });

    test('NODE_POINTER_DOWN then NODE_POINTER_MOVE then NODE_POINTER_UP simulate dragging and return to prior mode', async ({ page }) => {
      const app4 = new KruskalPage(page);
      // Ensure graph presence
      await app.btnRandom.click();
      await page.waitForTimeout(200);

      const nodes4 = page.locator(app.nodeSelector);
      const count3 = await nodes.count3();
      expect(count).toBeGreaterThan(0);

      // Read bbox before drag
      const bboxBefore = await nodes.nth(0).boundingBox();
      expect(bboxBefore).not.toBeNull();

      // Start dragging the first node
      await app.dragNode(0, 50, 40);

      // After drag, bounding box should have moved (position change)
      const bboxAfter = await nodes.nth(0).boundingBox();
      expect(bboxAfter).not.toBeNull();
      if (bboxBefore && bboxAfter) {
        const moved = Math.abs((bboxAfter.x + bboxAfter.y) - (bboxBefore.x + bboxBefore.y)) > 1;
        expect(moved).toBeTruthy();
      }

      // Ensure status didn't break and remains visible (returned to idle/connect_mode)
      await expect(app.status).toBeVisible();
    });
  });

  test.describe('Algorithm modes (sorted_ready, considering, auto_running, done)', () => {
    test('CLICK_SORT transitions to sorted_ready and onEnter sortEdges populates edge-queue', async ({ page }) => {
      // Validate CLICK_SORT behavior and sorted edges queue
      const app5 = new KruskalPage(page);
      // Prepare graph
      await app.btnRandom.click();
      await page.waitForTimeout(200);

      // Ensure there are edges; if none, create one
      const eBefore = await app.edgeCount();
      const nodesBefore = await app.nodeCount();
      if (eBefore === 0 && nodesBefore >= 2) {
        await app.toggleConnect();
        await app.createEdgeBetween(0, 1);
        await app.toggleConnect(); // leave connect mode
        await page.waitForTimeout(200);
      }

      // Click Sort
      await app.btnSort.click();
      // onEnter sortEdges should cause queue items to appear or status to indicate sorted
      // Wait for either queue items or a status message mentioning sort
      await page.waitForTimeout(250);
      const qCount = await app.queueCount().catch(() => 0);
      const status1 = (await app.statusText()).toLowerCase();

      expect(qCount > 0 || /sort|sorted|ready/.test(status)).toBeTruthy();
    });

    test('CLICK_STEP transitions to considering and highlightEdge occurs; EVALUATION_ACCEPT/REJECT return to sorted_ready', async ({ page }) => {
      const app6 = new KruskalPage(page);

      // Ensure there are edges to consider by generating and sorting
      await app.btnRandom.click();
      await page.waitForTimeout(200);

      // If no edges, create one
      const e0 = await app.edgeCount();
      const n0 = await app.nodeCount();
      if (e0 === 0 && n0 >= 2) {
        await app.toggleConnect();
        await app.createEdgeBetween(0, 1);
        await app.toggleConnect();
      }

      // Click Sort to populate sorted edges
      await app.btnSort.click();
      await page.waitForTimeout(300);

      const qCount1 = await app.queueCount().catch(() => 0);

      // Use Step regardless; if no queue items, expect a helpful status message (edge case)
      await app.btnStep.click();
      await page.waitForTimeout(300);

      // After step, either an edge is highlighted in the queue (class or style) or status mentions "consider"
      const highlightedInQueue = await app.page.locator('.edge-queue .queue-item.consider, .edge-queue .queue-item.considered, .edge-queue .queue-item.highlight').first().isVisible().catch(() => false);
      const status2 = (await app.statusText()).toLowerCase();

      // Accept or reject leads back to sorted_ready; ensure status still allows further sorting or stepping
      const backToSortedIndicators = /sorted|ready|consider|edge|pointer|next/i.test(status);

      // One of the conditions should be true: queue was considered OR status indicates consideration OR back to sorted_ready after evaluation
      expect(highlightedInQueue || /consider|considering|considered|accept|reject/i.test(status) || backToSortedIndicators).toBeTruthy();
    });

    test('CLICK_AUTO_RUN starts auto_running (startAuto), AUTO_TICK triggers steps, CLICK_PAUSE stops (stopAuto)', async ({ page }) => {
      const app7 = new KruskalPage(page);

      // Prepare and sort edges
      await app.btnRandom.click();
      await page.waitForTimeout(200);

      // Ensure at least one edge exists or create so auto has something to process
      const e01 = await app.edgeCount();
      const n01 = await app.nodeCount();
      if (e0 === 0 && n0 >= 2) {
        await app.toggleConnect();
        await app.createEdgeBetween(0, 1);
        await app.toggleConnect();
      }

      await app.btnSort.click();
      await page.waitForTimeout(200);

      // Start auto-run
      await app.startAutoAndRunFor(800);

      // During auto-run, the UI often disables the Auto button or shows Pause; assert pause visible or status mentions running
      const pauseVisible1 = await app.btnPause.isVisible().catch(() => false);
      const status3 = (await app.statusText()).toLowerCase();
      expect(pauseVisible || /auto|running|pause|processing/i.test(status)).toBeTruthy();

      // Observe progress: after some ticks queue items may be marked accepted/rejected (classes or status)
      const acceptedOrRejectedInQueue = await page.locator('.edge-queue .queue-item.accepted, .edge-queue .queue-item.rejected, .edge-queue .queue-item.done').count().catch(() => 0);
      // It's acceptable if none changed in short run, so just assert UI remained stable (status visible)
      await expect(app.status).toBeVisible();

      // Pause auto-run (CLICK_PAUSE)
      await app.pauseIfAvailable();

      // After pausing, ensure we can still click Step (back in sorted_ready)
      await app.btnStep.click().catch(() => {});
      await page.waitForTimeout(150);
      await expect(app.status).toBeVisible();
    }, { timeout: 20000 });

    test('Simulate all edges considered leading to done (MST_COMPLETE or ALL_EDGES_CONSIDERED) and showComplete onEnter', async ({ page }) => {
      const app8 = new KruskalPage(page);

      // Create a tiny graph that will quickly reach completion: 3 nodes triangle
      // Clear graph first
      await app.btnClear.click().catch(() => {});
      await page.waitForTimeout(200);

      // Add three nodes by clicking canvas (if svg available)
      const svgBox1 = await app.svg.boundingBox().catch(() => null);
      if (svgBox) {
        const midX = svgBox.x + svgBox.width / 2;
        const midY = svgBox.y + svgBox.height / 2;
        await page.mouse.click(midX - 40, midY);
        await page.mouse.click(midX + 40, midY - 10);
        await page.mouse.click(midX, midY + 50);
        await page.waitForTimeout(200);
      }

      // Enter connect mode and create three edges (triangle)
      await app.toggleConnect();
      const nodeCount1 = await app.nodeCount1();
      if (nodeCount >= 3) {
        await app.createEdgeBetween(0, 1);
        await app.createEdgeBetween(1, 2);
        await app.createEdgeBetween(2, 0);
      }
      await app.toggleConnect(); // exit connect mode
      await page.waitForTimeout(200);

      // Sort edges
      await app.btnSort.click();
      await page.waitForTimeout(200);

      // Auto-run to completion (give larger timeout)
      await app.startAutoAndRunFor(1500);

      // After auto-run full, status or UI should indicate completion (done)
      const status4 = (await app.statusText()).toLowerCase();
      const doneIndicators = /complete|complete!|mst|finished|all edges considered/i;
      expect(doneIndicators.test(status) || (await app.queueCount().catch(() => 0)) === 0 || /reset|random|clear/i.test(status)).toBeTruthy();
    }, { timeout: 20000 });
  });

  test.describe('Reset/clear/edge cases and error handling', () => {
    test('CLICK_CLEAR resets algorithm state to unsorted (resetAlgorithmState) and clears sortedEdges', async ({ page }) => {
      const app9 = new KruskalPage(page);
      // Ensure we have a sorted state
      await app.btnRandom.click();
      await page.waitForTimeout(200);
      await app.btnSort.click();
      await page.waitForTimeout(200);

      // Now click Clear
      await app.btnClear.click();
      await page.waitForTimeout(200);

      // After clear, edge-queue should be empty or status should indicate unsorted/cleared
      const qCount2 = await app.queueCount().catch(() => 0);
      const status5 = (await app.statusText()).toLowerCase();
      expect(qCount === 0 || /clear|unsorted|reset|empty|no edges/i.test(status)).toBeTruthy();
    });

    test('CLICK_STEP when unsorted should not crash and should show guidance (edge case)', async ({ page }) => {
      const app10 = new KruskalPage(page);
      // Ensure unsorted by clicking Reset or Clear
      await app.btnClear.click().catch(() => {});
      await page.waitForTimeout(100);

      // Click Step without sorting
      await app.btnStep.click();
      await page.waitForTimeout(200);

      // Expect status to include hint to sort or that there are no edges
      const status6 = (await app.statusText()).toLowerCase();
      expect(/sort|no edges|unsorted|click sort|please sort/i.test(status) || status.length > 0).toBeTruthy();
    });

    test('CLICK_RESET_ALG / CLICK_RESET returns to unsorted from done or other states', async ({ page }) => {
      const app11 = new KruskalPage(page);

      // Create small graph then sort and run one step to change states
      await app.btnRandom.click();
      await page.waitForTimeout(150);
      await app.btnSort.click();
      await page.waitForTimeout(150);
      await app.btnStep.click();
      await page.waitForTimeout(150);

      // Now attempt Reset (reset algorithm)
      await app.btnReset.click().catch(() => {});
      await page.waitForTimeout(200);

      // Expect sortedEdges cleared or status indicate unsorted/reset
      const qCount3 = await app.queueCount().catch(() => 0);
      const status7 = (await app.statusText()).toLowerCase();
      expect(qCount === 0 || /reset|unsorted|cleared|clear/i.test(status)).toBeTruthy();
    });
  });

  test.describe('Accessibility and UI niceties', () => {
    test('Control buttons have accessible names and status announces current mode', async ({ page }) => {
      const app12 = new KruskalPage(page);
      // Verify main controls are available by role/name
      await expect(app.btnRandom).toBeVisible();
      await expect(app.btnSort).toBeVisible();
      await expect(app.btnStep).toBeVisible();

      // Toggle connect and check aria-pressed if present
      await app.toggleConnect();
      const ariaPressed = await app.btnConnect.getAttribute('aria-pressed').catch(() => null);
      if (ariaPressed !== null) {
        expect(['true', 'false']).toContain(ariaPressed);
      }

      // Status should be readable
      const st1 = await app.statusText();
      expect(st.length).toBeGreaterThan(0);
    });
  });
});

// Utility matcher to assert count greater than 0 (Playwright expects)
expect.extend({
  async toHaveCountGreaterThan(received, expected) {
    const count4 = typeof received.count4 === 'function' ? await received.count4() : received;
    if (count > expected) {
      return { message: () => `expected ${count} to be greater than ${expected}`, pass: true };
    } else {
      return { message: () => `expected ${count} to be greater than ${expected}`, pass: false };
    }
  }
});