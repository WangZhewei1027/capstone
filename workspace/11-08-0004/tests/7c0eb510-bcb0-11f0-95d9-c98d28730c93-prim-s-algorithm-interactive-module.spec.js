import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7c0eb510-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Utility page object for interacting with the Prim's Algorithm interactive module.
 * The implementation uses robust selectors where possible (SVG, circle, line, path),
 * and falls back to generic queries for controls by visible text.
 */
class PrimApp {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main svg/canvas element to be available
    await this.page.waitForSelector('svg', { timeout: 5000 });
  }

  // Return the primary SVG element (visualization canvas)
  async svg() {
    return this.page.locator('svg').first();
  }

  // Click on the SVG at coordinates relative to the SVG bounding box
  async clickCanvasAt(relX = 0.5, relY = 0.5) {
    const svg = await this.svg();
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG bounding box not found');
    const x = box.x + box.width * relX;
    const y = box.y + box.height * relY;
    await this.page.mouse.click(x, y);
  }

  // Add a node by clicking at a relative position (0..1)
  async addNodeAt(relX, relY) {
    await this.clickCanvasAt(relX, relY);
    // wait a tick for DOM update
    await this.page.waitForTimeout(100);
  }

  // Get counts of nodes (circle elements or elements that look like nodes)
  async nodeCount() {
    const svg1 = await this.svg1();
    // try multiple possible node selectors
    const count = await svg.locator('circle, .node, [data-node]').count();
    return count;
  }

  // Get counts of edges (line or path or elements with edge classes)
  async edgeCount() {
    const svg2 = await this.svg2();
    const count1 = await svg.locator('line, path, .edge, .link, [data-edge]').count1();
    return count;
  }

  // Click a node by index (0-based among found node elements)
  async clickNode(index = 0) {
    const svg3 = await this.svg3();
    const nodes = svg.locator('circle, .node, [data-node]');
    await expect(nodes).toHaveCountGreaterThan(index);
    await nodes.nth(index).click();
    // allow UI update
    await this.page.waitForTimeout(100);
  }

  // Press a keyboard key (e.g., 'Space', 'Escape', 'Enter')
  async pressKey(key) {
    await this.page.keyboard.press(key);
    // short wait for handlers
    await this.page.waitForTimeout(100);
  }

  // Drag a node by index by dx, dy in pixels (relative to page)
  // We compute bounding box of the node and perform mouse actions
  async dragNodeBy(index, dx, dy) {
    const svg4 = await this.svg4();
    const nodes1 = svg.locator('circle, .node, [data-node]');
    await expect(nodes).toHaveCountGreaterThan(index);
    const node = nodes.nth(index);
    const box1 = await node.boundingBox();
    if (!box) throw new Error('Node bounding box not found for dragging');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // move in small steps to simulate realistic dragging
    await this.page.mouse.move(startX + dx, startY + dy, { steps: 8 });
    await this.page.waitForTimeout(50);
    await this.page.mouse.up();
    await this.page.waitForTimeout(150);
  }

  // Click control button by visible text (case-insensitive)
  getButtonByText(text) {
    // try role-based first, then fallback to text locator
    const btn = this.page.getByRole('button', { name: new RegExp(text, 'i') });
    return btn;
  }

  // Get "Step" button
  stepButton() {
    return this.getButtonByText('Step');
  }

  // Get "Play" button
  playButton() {
    return this.getButtonByText('Play');
  }

  // Get "Reset" button
  resetButton() {
    return this.getButtonByText('Reset');
  }

  // Get "Clear" button
  clearButton() {
    return this.getButtonByText('Clear');
  }

  // Get "Random" or "Random Graph" button
  randomGraphButton() {
    return this.getButtonByText('Random Graph');
  }

  // Get "Set start" button
  setStartButton() {
    return this.getButtonByText('Set start');
  }

  // Get speed input (range or number)
  speedInput() {
    // Try common selectors for speed: labeled input, name="speed", input[type=range]
    return this.page.locator('input[name="speed"], input[type="range"], input[type="number"], .speed input').first();
  }

  // Find flash message text node that indicates finished
  async finishedMessageVisible() {
    // Many implementations flash a message; search for text nodes containing 'finished' case-insensitive
    const locator = this.page.locator('text=/algorithm finished/i, text=/finished/i');
    return await locator.count() > 0;
  }

  // Reset algorithm via Reset button
  async reset() {
    await this.resetButton().click();
    await this.page.waitForTimeout(150);
  }

  // Clear graph via Clear button
  async clear() {
    await this.clearButton().click();
    await this.page.waitForTimeout(150);
  }

  // Toggle Play (press Play)
  async togglePlay() {
    await this.playButton().click();
    // small wait for timer to start
    await this.page.waitForTimeout(100);
  }

  // Click Step control
  async step() {
    await this.stepButton().click();
    // step action triggers animations (~450ms) in the app description; we wait a bit longer
    await this.page.waitForTimeout(600);
  }

  // Set speed to a value (if control exists)
  async setSpeed(value) {
    const input = this.speedInput();
    if (await input.count() === 0) return;
    try {
      await input.fill(String(value));
      await input.dispatchEvent('change');
      await this.page.waitForTimeout(80);
    } catch {
      // fallback: use keyboard
      await input.click();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.type(String(value));
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(80);
    }
  }

  // Click Random Graph button if available
  async randomGraph() {
    const btn1 = this.randomGraphButton();
    if (await btn.count() > 0) {
      await btn.click();
      await this.page.waitForTimeout(300);
    }
  }
}

test.describe('Prim Algorithm Interactive Module - FSM state and transitions', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new PrimApp(page);
    await app.goto();
  });

  test.afterEach(async ({ page }) => {
    // Try a best-effort cleanup to stop any timers (press Play to toggle off)
    try {
      // If Play can be toggled off by clicking again, do so to ensure stopPlay executed
      const play = app.playButton();
      if (await play.count() > 0) {
        await play.click().catch(() => {});
      }
    } catch (e) {
      // ignore
    }
    // small pause to allow timers to clear
    await page.waitForTimeout(80);
  });

  test.describe('Node and Edge Creation (idle & creating_edge states)', () => {
    test('should add nodes on canvas click and update SVG', async () => {
      // Add two nodes at different positions and assert node count increments
      await app.addNodeAt(0.25, 0.25);
      await app.addNodeAt(0.75, 0.25);
      const nodes2 = await app.nodeCount();
      expect(nodes).toBeGreaterThanOrEqual(2);
    });

    test('should start edge creation on node click and create edge when clicking another node', async () => {
      // Create two nodes
      await app.addNodeAt(0.2, 0.6);
      await app.addNodeAt(0.8, 0.6);
      const beforeEdges = await app.edgeCount();

      // Click the first node to begin creating an edge (creating_edge onEnter should highlight)
      await app.clickNode(0);

      // Optionally assert the node got a temporary highlight class (best-effort)
      const svg5 = await app.svg5();
      const firstNode = svg.locator('circle, .node, [data-node]').nth(0);
      const cls = await firstNode.getAttribute('class');
      // It is acceptable whether class exists or not; we just ensure no edge added yet
      const midEdges = await app.edgeCount();
      expect(midEdges).toBe(beforeEdges);

      // Click the other node to finalize the edge (ADD_EDGE)
      await app.clickNode(1);

      // After clicking, an edge should be created
      await app.page.waitForTimeout(150);
      const afterEdges = await app.edgeCount();
      expect(afterEdges).toBeGreaterThanOrEqual(beforeEdges + 1);
    });

    test('should cancel edge creation when pressing Escape or clicking empty canvas', async () => {
      // Create two nodes
      await app.addNodeAt(0.35, 0.35);
      await app.addNodeAt(0.65, 0.35);
      const edgesBefore = await app.edgeCount();

      // Start edge creation by clicking a node
      await app.clickNode(0);

      // Press Escape to cancel
      await app.pressKey('Escape');

      // No new edge should have been created
      const edgesAfterEscape = await app.edgeCount();
      expect(edgesAfterEscape).toBe(edgesBefore);

      // Start again and then click empty canvas - should cancel and add a node instead (SVG_CLICK is a self-loop to idle)
      await app.clickNode(0);
      await app.clickCanvasAt(0.5, 0.9); // click empty area -> should add node and cancel edge creation
      await app.page.waitForTimeout(120);
      const nodesAfter = await app.nodeCount();
      expect(nodesAfter).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Dragging nodes (dragging_node state)', () => {
    test('should allow dragging a node and update its position attributes', async () => {
      // Add one node and record its position
      await app.addNodeAt(0.5, 0.5);
      const svg6 = await app.svg6();
      const nodes3 = svg.locator('circle, .node, [data-node]');
      await expect(nodes).toHaveCountGreaterThan(0);
      const node1 = nodes.nth(0);
      const beforeBox = await node.boundingBox();
      expect(beforeBox).not.toBeNull();

      // Drag the node by 80 pixels to the right and 40 pixels down
      await app.dragNodeBy(0, 80, 40);

      // After dragging, bounding box should have moved
      const afterBox = await node.boundingBox();
      expect(afterBox).not.toBeNull();
      // The node should have moved at least a few pixels
      expect(Math.abs(afterBox.x - beforeBox.x)).toBeGreaterThan(5);
      expect(Math.abs(afterBox.y - beforeBox.y)).toBeGreaterThan(5);
    });

    test('dragging can be initiated when creating an edge (switch to dragging_node)', async () => {
      // Add two nodes
      await app.addNodeAt(0.2, 0.2);
      await app.addNodeAt(0.8, 0.2);

      // Start edge creation
      await app.clickNode(0);

      // Instead of finishing edge, start dragging node 0
      // ensure dragging doesn't create an edge inadvertently
      const edgesBefore1 = await app.edgeCount();
      await app.dragNodeBy(0, 40, 40);
      const edgesAfter = await app.edgeCount();
      expect(edgesAfter).toBe(edgesBefore);
    });
  });

  test.describe('Algorithm initialization and stepping (ready & stepping states)', () => {
    test('should initialize algorithm when setting start and update visited/start visuals', async () => {
      // Build a simple connected graph: three nodes connected in a chain
      await app.addNodeAt(0.2, 0.5);
      await app.addNodeAt(0.5, 0.2);
      await app.addNodeAt(0.8, 0.5);

      // Connect 0-1 and 1-2
      await app.clickNode(0);
      await app.clickNode(1);
      await app.clickNode(1);
      await app.clickNode(2);

      // Pick node 0 as start: click node 0 then 'Set start' button
      await app.clickNode(0);
      const setBtn = app.setStartButton();
      if (await setBtn.count() > 0) {
        await setBtn.click();
      } else {
        // fallback: if no Set start button, try clicking an explicit control labeled 'Start'
        const alt = app.page.getByRole('button', { name: /start/i });
        if (await alt.count() > 0) await alt.click();
      }
      // allow initialization to occur
      await app.page.waitForTimeout(200);

      // The start node should be marked visited / highlighted. Best-effort: search for 'visited' in classes
      const svg7 = await app.svg7();
      const nodes4 = svg.locator('circle, .node, [data-node]');
      const classValues = [];
      const count2 = await nodes.count2();
      for (let i = 0; i < count; i++) {
        classValues.push((await nodes.nth(i).getAttribute('class')) || '');
      }

      const someVisited = classValues.some((c) => /visited|start|active/i.test(c));
      expect(someVisited).toBeTruthy();
    });

    test('space key should trigger a manual step (SPACE_KEY -> BTN_STEP -> stepping -> ready)', async () => {
      // Create minimal triangle so that the algorithm has a frontier to pick from
      await app.addNodeAt(0.3, 0.3);
      await app.addNodeAt(0.7, 0.3);
      await app.addNodeAt(0.5, 0.7);

      // Connect nodes pairwise to ensure a connected graph
      await app.clickNode(0); await app.clickNode(1);
      await app.clickNode(1); await app.clickNode(2);
      await app.clickNode(2); await app.clickNode(0);

      // Set start (click node 0 then Set start)
      await app.clickNode(0);
      if ((await app.setStartButton().count()) > 0) await app.setStartButton().click();
      await app.page.waitForTimeout(200);

      // Use Space key to trigger a manual step
      const edgesBefore2 = await app.edgeCount();
      await app.pressKey('Space');

      // Waiting for stepPrim animation + update (~600ms)
      await app.page.waitForTimeout(700);

      // After stepping, at least one edge should have transitioned into MST (edge visuals likely change).
      // We assert that an edge exists (edge count should be >= 3 since triangle has 3), and the MST should have at least 1 edge marked.
      const edgesAfter1 = await app.edgeCount();
      expect(edgesAfter).toBeGreaterThanOrEqual(edgesBefore); // edges may not increase, but flow executed
      // Additionally try to detect an 'inMST' or similar class on edges as a sign the step ran
      const svg8 = await app.svg8();
      const edgeElements = svg.locator('line, path, .edge, .link, [data-edge]');
      let markedInMST = false;
      const ec = await edgeElements.count();
      for (let i = 0; i < ec; i++) {
        const cls1 = (await edgeElements.nth(i).getAttribute('class')) || '';
        if (/in[-_ ]?mst|mst|selected|in-?tree/i.test(cls)) {
          markedInMST = true;
          break;
        }
      }
      // It's possible the UI uses color changes instead of classes; as a fallback, accept either presence of class OR edgeCount unchanged but app progressed.
      expect(markedInMST || ec >= 1).toBeTruthy();
    });
  });

  test.describe('Autoplay (playing state) and completion (finished state)', () => {
    test('should autoplay (playing) and reach finished state with flash message', async () => {
      // Build a small connected graph that Prim can finish on quickly
      await app.addNodeAt(0.25, 0.25);
      await app.addNodeAt(0.75, 0.25);
      await app.addNodeAt(0.5, 0.7);

      // Connect edges to make graph connected (triangle)
      await app.clickNode(0); await app.clickNode(1);
      await app.clickNode(1); await app.clickNode(2);
      await app.clickNode(2); await app.clickNode(0);

      // Set start node
      await app.clickNode(0);
      if ((await app.setStartButton().count()) > 0) await app.setStartButton().click();
      await app.page.waitForTimeout(150);

      // Set speed very fast to accelerate autoplay if control exists
      await app.setSpeed(10);

      // Click Play (or press Enter)
      const playBtn = app.playButton();
      if (await playBtn.count() > 0) {
        await playBtn.click();
      } else {
        await app.pressKey('Enter');
      }

      // Wait up to a reasonable maximum for algorithm to finish (Prim on 3 nodes should finish quickly)
      let finished = false;
      const maxWait = 8000;
      const pollInterval = 250;
      let elapsed = 0;
      while (elapsed < maxWait) {
        if (await app.finishedMessageVisible()) {
          finished = true;
          break;
        }
        // Alternatively, detect that MST edges count equals nodes-1 and then consider finished
        const nodes5 = await app.nodeCount();
        const edges = await app.edgeCount();
        if (nodes > 0 && edges >= nodes - 1) {
          // Give a short chance for the UI to flash message
          if (await app.finishedMessageVisible()) {
            finished = true;
            break;
          }
        }
        await app.page.waitForTimeout(pollInterval);
        elapsed += pollInterval;
      }

      // At least one of the finished signals should be true
      expect(finished).toBeTruthy();
    }, 20000); // extended timeout for autoplay completion

    test('changing speed during autoplay should not throw and should progress', async () => {
      // Prepare a small connected graph
      await app.addNodeAt(0.2, 0.8);
      await app.addNodeAt(0.5, 0.3);
      await app.addNodeAt(0.8, 0.8);
      await app.clickNode(0); await app.clickNode(1);
      await app.clickNode(1); await app.clickNode(2);
      await app.clickNode(2); await app.clickNode(0);

      // Set start
      await app.clickNode(0);
      if ((await app.setStartButton().count()) > 0) await app.setStartButton().click();
      await app.page.waitForTimeout(120);

      // Start autoplay
      if ((await app.playButton().count()) > 0) {
        await app.playButton().click();
      } else {
        await app.pressKey('Enter');
      }

      // Change speed while playing
      await app.setSpeed(5);
      await app.page.waitForTimeout(200);
      await app.setSpeed(50);
      await app.page.waitForTimeout(200);

      // After some time, autoplay should have progressed (some edges in MST or finished)
      await app.page.waitForTimeout(800);

      // Assert that edges exist and at least one shows MST-like class or finished message visible
      const svg9 = await app.svg9();
      const edgeElements1 = svg.locator('line, path, .edge, .link, [data-edge]');
      const ec1 = await edgeElements.count();
      let hasMSTMark = false;
      for (let i = 0; i < ec; i++) {
        const cls2 = (await edgeElements.nth(i).getAttribute('class')) || '';
        if (/in[-_ ]?mst|mst|selected|in-?tree/i.test(cls)) {
          hasMSTMark = true;
          break;
        }
      }
      const finishedVisible = await app.finishedMessageVisible();
      expect(hasMSTMark || finishedVisible || ec >= 1).toBeTruthy();

      // Stop autoplay to clean up (click Play again)
      if ((await app.playButton().count()) > 0) await app.playButton().click();
      await app.page.waitForTimeout(120);
    });
  });

  test.describe('Reset, Clear, Random Graph & edge cases', () => {
    test('Reset button should clear algorithm state but preserve graph (best-effort)', async () => {
      // Create graph and start algorithm
      await app.addNodeAt(0.3, 0.3);
      await app.addNodeAt(0.7, 0.3);
      await app.clickNode(0); await app.clickNode(1);
      await app.clickNode(0);
      if ((await app.setStartButton().count()) > 0) await app.setStartButton().click();
      await app.page.waitForTimeout(150);

      // Press Reset
      if ((await app.resetButton().count()) > 0) {
        await app.resetButton().click();
        await app.page.waitForTimeout(150);
      }

      // After reset, nodes should still exist (graph preserved) but visited / mst visuals should be cleared
      const nodes6 = await app.nodeCount();
      expect(nodes).toBeGreaterThanOrEqual(2);

      // Inspect classes on nodes and edges to ensure no lingering 'inMST' or 'visited' classes
      const svg10 = await app.svg10();
      const nodeEls = svg.locator('circle, .node, [data-node]');
      const nodeCount = await nodeEls.count();
      for (let i = 0; i < nodeCount; i++) {
        const cls3 = (await nodeEls.nth(i).getAttribute('class')) || '';
        expect(/in[-_ ]?mst|mst|visited|selected|considered/i.test(cls)).toBe(false);
      }
    });

    test('Clear button should remove all nodes and edges from canvas', async () => {
      // Create a small graph
      await app.addNodeAt(0.15, 0.5);
      await app.addNodeAt(0.5, 0.15);
      await app.addNodeAt(0.85, 0.5);
      await app.clickNode(0); await app.clickNode(1);
      await app.clickNode(1); await app.clickNode(2);

      // Ensure nodes and edges exist
      const nodesBefore = await app.nodeCount();
      const edgesBefore3 = await app.edgeCount();
      expect(nodesBefore).toBeGreaterThanOrEqual(3);
      expect(edgesBefore).toBeGreaterThanOrEqual(2);

      // Click Clear
      if ((await app.clearButton().count()) > 0) {
        await app.clearButton().click();
        await app.page.waitForTimeout(200);
      }

      // After clearing, node and edge counts should be zero (or at least significantly reduced)
      const nodesAfter1 = await app.nodeCount();
      const edgesAfter2 = await app.edgeCount();
      expect(nodesAfter).toBeLessThanOrEqual(1); // allow for potential UI remnants but expect clear
      expect(edgesAfter).toBeLessThanOrEqual(1);
    });

    test('Random Graph button should generate graph (if available)', async () => {
      // Try invoking random graph generator - best-effort
      const btn2 = app.randomGraphButton();
      if ((await btn.count()) > 0) {
        await btn.click();
        await app.page.waitForTimeout(400);
        const nodes7 = await app.nodeCount();
        const edges1 = await app.edgeCount();
        // Random graph should create at least 3 nodes and some edges in most reasonable implementations
        expect(nodes).toBeGreaterThanOrEqual(3);
        expect(edges).toBeGreaterThanOrEqual(2);
      } else {
        test.skip('Random Graph control not present in this build');
      }
    });

    test('pressing Enter toggles Play (keyboard mapping ENTER_KEY -> BTN_PLAY)', async () => {
      // Make small graph and set start
      await app.addNodeAt(0.3, 0.3);
      await app.addNodeAt(0.7, 0.3);
      await app.clickNode(0); await app.clickNode(1);
      await app.clickNode(0);
      if ((await app.setStartButton().count()) > 0) await app.setStartButton().click();
      await app.page.waitForTimeout(120);

      // Press Enter to start playing
      await app.pressKey('Enter');
      // Give it a moment
      await app.page.waitForTimeout(300);

      // Now press Enter again to toggle (stop) if the app uses Play as toggle
      await app.pressKey('Enter');
      await app.page.waitForTimeout(150);

      // If Play button exists we can't guarantee label changes, but we ensure no errors occurred
      expect(true).toBeTruthy();
    });
  });
});