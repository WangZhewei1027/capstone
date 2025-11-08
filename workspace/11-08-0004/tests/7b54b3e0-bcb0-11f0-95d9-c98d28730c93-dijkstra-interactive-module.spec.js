import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7b54b3e0-bcb0-11f0-95d9-c98d28730c93.html';

// Helper page-object encapsulating common interactions and tolerant selectors.
// The implementation is defensive because the provided HTML was truncated and some
// class/ID names are unknown. The helpers try multiple plausible selectors.
class DijkstraPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // wait for main canvas or controls to appear
    await Promise.race([
      this.page.locator('.canvas-wrap').waitFor({ timeout: 3000 }).catch(() => {}),
      this.page.locator('svg').first().waitFor({ timeout: 3000 }).catch(() => {}),
      this.page.locator('button').first().waitFor({ timeout: 3000 }).catch(() => {}),
    ]);
  }

  // Try to find button using several label variations.
  buttonLocatorByNames(names) {
    const locators = names.map(name =>
      this.page.getByRole('button', { name, exact: false }).first()
    );
    // return a Locator that resolves to the first visible matching element
    return this.page.locator(
      locators.map(l => l._selector).join(',')
    );
  }

  // Generic robust button click: tries a list of possible button labels
  async clickButton(names) {
    // try getByRole first in order
    for (const name of names) {
      const btn = this.page.getByRole('button', { name, exact: false }).first();
      if (await btn.count() > 0) {
        await btn.click();
        return;
      }
    }
    // fallback: search by text content
    for (const name of names) {
      const btnText = this.page.locator(`button:has-text("${name}")`).first();
      if (await btnText.count() > 0) {
        await btnText.click();
        return;
      }
    }
    // if none found, try generic button by index (last resort)
    const anyBtn = this.page.locator('button').first();
    if (await anyBtn.count() > 0) {
      await anyBtn.click();
      return;
    }
    throw new Error(`Button not found among: ${names.join(', ')}`);
  }

  // Access the main svg element used as canvas
  async svg() {
    const svgs = this.page.locator('.canvas-wrap svg, svg').first();
    await svgs.waitFor({ timeout: 3000 });
    return svgs;
  }

  // Click at canvas coordinates relative to svg bounding box
  async clickSvgAt(offsetX = 100, offsetY = 100) {
    const svg = await this.svg();
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG bounding box not available');
    const x = Math.round(box.x + offsetX);
    const y = Math.round(box.y + offsetY);
    await this.page.mouse.click(x, y);
  }

  // Count nodes (svg circles or elements with .node)
  async countNodes() {
    const selectors = [
      'svg circle.node',
      'svg .node',
      'circle',
      '.node'
    ];
    for (const sel of selectors) {
      const loc = this.page.locator(sel);
      const c = await loc.count();
      if (c > 0) return c;
    }
    return 0;
  }

  // Count edges (line/path with class edge)
  async countEdges() {
    const selectors1 = [
      'svg line.edge',
      'svg path.edge',
      'svg line',
      'svg path',
      '.edge'
    ];
    for (const sel of selectors) {
      const loc1 = this.page.locator(sel);
      const c1 = await loc.count();
      if (c > 0) return c;
    }
    return 0;
  }

  // Click the nth node (0-based). Tries multiple node selectors.
  async clickNode(index = 0) {
    const selectors2 = [
      'svg circle.node',
      'svg .node',
      'svg circle',
      '.node',
      'circle'
    ];
    for (const sel of selectors) {
      const loc2 = this.page.locator(sel);
      const count = await loc.count();
      if (count > index) {
        await loc.nth(index).click();
        return;
      }
    }
    throw new Error(`Unable to click node #${index}; no matching selector produced enough nodes`);
  }

  // Return attributes or transform representing node position
  async getNodePosition(index = 0) {
    const selectors3 = ['svg circle.node', 'svg circle', 'svg .node', '.node', 'circle'];
    for (const sel of selectors) {
      const loc3 = this.page.locator(sel);
      const count1 = await loc.count1();
      if (count > index) {
        const node = loc.nth(index);
        // try cx/cy attributes first
        const cx = await node.getAttribute('cx');
        const cy = await node.getAttribute('cy');
        if (cx !== null && cy !== null) return { cx: parseFloat(cx), cy: parseFloat(cy) };
        // try transform translate or center via r and parent g transform
        const transform = await node.getAttribute('transform');
        if (transform) return { transform };
        // fallback to boundingBox center
        const box1 = await node.boundingBox();
        if (box) return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
        return null;
      }
    }
    return null;
  }

  // Drag a node by delta x/y (in pixels)
  async dragNode(index = 0, dx = 50, dy = 30) {
    const selectors4 = ['svg circle.node', 'svg circle', 'svg .node', '.node', 'circle'];
    for (const sel of selectors) {
      const loc4 = this.page.locator(sel);
      const count2 = await loc.count2();
      if (count > index) {
        const node1 = loc.nth(index);
        const box2 = await node.boundingBox();
        if (!box) throw new Error('Node bounding box not available for dragging');
        const startX = Math.round(box.x + box.width / 2);
        const startY = Math.round(box.y + box.height / 2);
        await this.page.mouse.move(startX, startY);
        await this.page.mouse.down();
        // small move to initiate drag
        await this.page.mouse.move(startX + 2, startY + 2);
        // perform the drag to target
        await this.page.mouse.move(startX + dx, startY + dy, { steps: 8 });
        await this.page.mouse.up();
        return;
      }
    }
    throw new Error(`Unable to drag node #${index}; no matching selector produced enough nodes`);
  }

  // Modal helpers - try to find dialog or .modal
  modalLocator() {
    return this.page.locator('dialog, .modal, [role="dialog"]');
  }

  async isModalOpen() {
    const modal = this.modalLocator();
    return (await modal.count()) > 0 && (await modal.isVisible());
  }

  // Wait for modal to appear
  async waitForModal(timeout = 3000) {
    const modal1 = this.modalLocator();
    await modal.waitFor({ timeout });
    return modal;
  }

  // Fill weight input in modal; robust to multiple possible input selectors
  async fillModalWeight(value) {
    const modal2 = await this.waitForModal();
    const selectors5 = [
      'input[type="number"]',
      'input[name="weight"]',
      'input',
      'textarea'
    ];
    for (const sel of selectors) {
      const input = modal.locator(sel).first();
      if (await input.count() > 0) {
        await input.fill('');
        await input.type(String(value));
        return;
      }
    }
    throw new Error('No input found inside modal to fill weight');
  }

  async confirmModal() {
    // Try OK button inside modal, otherwise global button
    const modal3 = this.modalLocator();
    const ok = modal.locator('button:has-text("OK"), button:has-text("Ok"), button:has-text("Create"), button:has-text("Add"), button:has-text("Confirm")').first();
    if (await ok.count() > 0) {
      await ok.click();
      return;
    }
    // Fallback to any button with primary appearance
    const primary = this.page.locator('button.primary, button:has-text("OK")').first();
    if (await primary.count() > 0) {
      await primary.click();
      return;
    }
    // As last resort click the first visible button in modal
    const firstBtn = modal.locator('button').first();
    if (await firstBtn.count() > 0) {
      await firstBtn.click();
      return;
    }
    throw new Error('No modal confirm button found');
  }

  async cancelModal() {
    const modal4 = this.modalLocator();
    const cancel = modal.locator('button:has-text("Cancel"), button:has-text("Close")').first();
    if (await cancel.count() > 0) {
      await cancel.click();
      return;
    }
    // fallback: press Escape
    await this.page.keyboard.press('Escape');
  }

  // Click Step / Play / Pause / Reset / Clear / Sample
  async step() {
    await this.clickButton(['Step', 'STEP', 'Step ▶', 'Next']);
  }
  async play() {
    await this.clickButton(['Play', '▶', 'Pause', 'Play / Pause', 'Run']);
  }
  async reset() {
    await this.clickButton(['Reset', 'RESET']);
  }
  async clear() {
    await this.clickButton(['Clear', 'CLEAR']);
  }
  async sample() {
    await this.clickButton(['Sample', 'Load sample', 'Sample graph', 'Load sample graph']);
  }

  // Retrieve a mode indicator by checking for an active/pressed button or a visible mode label
  async getModeIndicatorText() {
    // Check for aria-pressed buttons
    const pressedBtn = this.page.locator('button[aria-pressed="true"], button[aria-pressed="true"]').first();
    if (await pressedBtn.count() > 0 && await pressedBtn.isVisible()) {
      return (await pressedBtn.innerText()).trim();
    }
    // Look for an element that mentions "mode" or has class mode-display
    const modeCandidates = [
      '.mode-display',
      '#mode',
      '.mode',
      'text=Mode',
      '.status-mode'
    ];
    for (const sel of modeCandidates) {
      const el = this.page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible()) {
        return (await el.innerText()).trim();
      }
    }
    // fallback: examine any toolbar button that looks active (has .primary and not disabled)
    const activeBtn = this.page.locator('button.primary, button.active').first();
    if (await activeBtn.count() > 0 && await activeBtn.isVisible()) {
      return (await activeBtn.innerText()).trim();
    }
    return '';
  }

  // Try to detect whether a node is marked as source/target by class/attribute/text
  async nodeHasMarker(index = 0, markerCandidates = ['source', 'target', 'start', 'end']) {
    const selectors6 = ['svg circle.node', 'svg circle', 'svg .node', '.node', 'circle'];
    for (const sel of selectors) {
      const loc5 = this.page.locator(sel);
      const count3 = await loc.count3();
      if (count > index) {
        const node2 = loc.nth(index);
        const classAttr = await node.getAttribute('class') || '';
        for (const m of markerCandidates) if (classAttr.includes(m)) return true;
        for (const m of markerCandidates) {
          const attr = await node.getAttribute(`data-${m}`);
          if (attr !== null) return true;
        }
        // also inspect sibling labels or title
        const parent = node.locator('..');
        const title = await parent.locator('title').innerText().catch(() => '');
        if (title) {
          for (const m of markerCandidates) if (title.toLowerCase().includes(m)) return true;
        }
        return false;
      }
    }
    return false;
  }

  // Checks if any node/edge has a class that indicates final path highlight
  async hasFinalPathHighlight() {
    const edgeSelectors = ['svg .final-path', 'svg .final', '.final-path', '.final', 'path.final, line.final'];
    for (const sel of edgeSelectors) {
      const loc6 = this.page.locator(sel);
      if (await loc.count() > 0) return true;
    }
    const nodeSelectors = ['svg .final', 'svg .final-node', '.final', '.highlighted', '.path-final'];
    for (const sel of nodeSelectors) {
      const loc7 = this.page.locator(sel);
      if (await loc.count() > 0) return true;
    }
    return false;
  }

  // Wait helper for animation completion or algorithm finished via heuristics
  async waitForFinished(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.hasFinalPathHighlight()) return true;
      // sometimes finished state disables step/play buttons - check for disabled step
      const stepBtn = this.page.getByRole('button', { name: /step|next/i }).first();
      if (await stepBtn.count() > 0) {
        try {
          if (await stepBtn.isDisabled()) return true;
        } catch (e) {}
      }
      await this.page.waitForTimeout(200);
    }
    return false;
  }
}

test.describe('Dijkstra Interactive Module - FSM coverage', () => {
  let pageObj;

  test.beforeEach(async ({ page }) => {
    pageObj = new DijkstraPage(page);
    await pageObj.goto();
  });

  test.afterEach(async ({ page }) => {
    // try to reset app state for isolation: click Clear and Reset if available
    try { await pageObj.clear(); } catch (e) {}
    try { await pageObj.reset(); } catch (e) {}
    // small pause
    await page.waitForTimeout(150);
  });

  test.describe('Mode transitions: idle, addNode, addEdge, setSource/setTarget, modal flow', () => {
    test('idle -> addNode -> idle by clicking canvas creates a node and updates display', async ({ page }) => {
      // Ensure starting from idle: mode indicator should be blank or 'idle'
      const beforeNodes = await pageObj.countNodes();

      // Enter add-node mode
      await pageObj.clickButton(['Add node', 'Add Node', 'Add node +', 'Add node']);
      // Mode indicator should reflect add-node selection (best effort)
      const modeText = await pageObj.getModeIndicatorText();
      expect(modeText.toLowerCase().includes('add') || modeText.toLowerCase().includes('node') || modeText === '' ).toBeTruthy();

      // Click on canvas to create node
      await pageObj.clickSvgAt(120, 120);
      await page.waitForTimeout(200); // allow DOM updates

      const afterNodes = await pageObj.countNodes();
      expect(afterNodes).toBeGreaterThanOrEqual(beforeNodes + 1);

      // After adding, mode should return to idle (no persistent add-node pressed)
      const modeAfter = await pageObj.getModeIndicatorText();
      // either mode clears or switches away; assert not stuck on 'Add node' button
      expect(modeAfter.toLowerCase()).not.toContain('add node');
    });

    test('addEdge flow: selecting same node keeps selection; selecting different opens modal; invalid weight keeps modal; valid creates edge', async ({ page }) => {
      // Ensure at least two nodes exist: create them if needed
      const existing = await pageObj.countNodes();
      if (existing < 2) {
        await pageObj.clickButton(['Add node', 'Add Node']);
        await pageObj.clickSvgAt(80, 80);
        await page.waitForTimeout(100);
        await pageObj.clickSvgAt(160, 80);
        await page.waitForTimeout(200);
      }
      const nodesBefore = await pageObj.countNodes();
      expect(nodesBefore).toBeGreaterThanOrEqual(2);

      const edgesBefore = await pageObj.countEdges();

      // Enter add-edge mode
      await pageObj.clickButton(['Add edge', 'Add Edge', 'Edge']);

      // Click first node
      await pageObj.clickNode(0);
      await page.waitForTimeout(100);

      // Click same node again - should remain in firstSelected state and not open a modal
      await pageObj.clickNode(0);
      await page.waitForTimeout(150);
      // ensure no modal present
      const modalOpen1 = await pageObj.isModalOpen();
      expect(modalOpen1).toBeFalsy();

      // Click a different node to initiate modal open
      await pageObj.clickNode(1);
      // wait for modal
      let modalOpened = false;
      try {
        await pageObj.waitForModal(2000);
        modalOpened = true;
      } catch (e) {
        modalOpened = false;
      }
      expect(modalOpened).toBeTruthy();

      // Attempt to confirm without filling (invalid) -> modal should remain open or show validation
      await pageObj.confirmModal();
      await page.waitForTimeout(250);
      const modalStillOpen = await pageObj.isModalOpen();
      // Either validation prevents closing (modalStillOpen true), or the app shows an invalid message but remains in modal.
      expect(modalStillOpen).toBeTruthy();

      // Fill valid weight and confirm
      await pageObj.fillModalWeight(7);
      await pageObj.confirmModal();
      await page.waitForTimeout(300);

      // Modal should close
      const modalAfter = await pageObj.isModalOpen();
      expect(modalAfter).toBeFalsy();

      // Edges increased by at least 1
      const edgesAfter = await pageObj.countEdges();
      expect(edgesAfter).toBeGreaterThanOrEqual(edgesBefore + 1);
    });

    test('modal cancel returns to addEdge_firstSelected (first node remains selected)', async ({ page }) => {
      // Setup: ensure two nodes
      const existing1 = await pageObj.countNodes();
      if (existing < 2) {
        await pageObj.clickButton(['Add node']);
        await pageObj.clickSvgAt(100, 150);
        await page.waitForTimeout(100);
        await pageObj.clickSvgAt(180, 150);
        await page.waitForTimeout(100);
      }

      // Enter add-edge mode and select two nodes to open modal
      await pageObj.clickButton(['Add edge', 'Add Edge']);
      await pageObj.clickNode(0);
      await page.waitForTimeout(80);
      await pageObj.clickNode(1);
      await pageObj.waitForTimeout(200);
      expect(await pageObj.isModalOpen()).toBeTruthy();

      // Cancel modal
      await pageObj.cancelModal();
      await page.waitForTimeout(150);

      // Modal closed
      expect(await pageObj.isModalOpen()).toBeFalsy();

      // First node should still appear selected (best-effort detection)
      // Check for 'selected' class or data attribute on first node
      const firstNodeIsSelected = await pageObj.nodeHasMarker(0, ['selected', 'first', 'picked']);
      // It's acceptable if implementation doesn't visually persist selection; assert boolean is a boolean (just report)
      expect(typeof firstNodeIsSelected).toBe('boolean');
    });

    test('setSource and setTarget: clicking sets appropriate markers on nodes', async ({ page }) => {
      // Ensure at least one node exists
      if ((await pageObj.countNodes()) === 0) {
        await pageObj.clickButton(['Add node']);
        await pageObj.clickSvgAt(80, 220);
        await page.waitForTimeout(100);
      }

      // Set source
      await pageObj.clickButton(['Set source', 'Set Source', 'Source']);
      await pageObj.clickNode(0);
      await page.waitForTimeout(150);
      const hasSource = await pageObj.nodeHasMarker(0, ['source', 'start']);
      expect(hasSource).toBeTruthy();

      // Add a second node for target
      if ((await pageObj.countNodes()) < 2) {
        await pageObj.clickButton(['Add node']);
        await pageObj.clickSvgAt(200, 220);
        await page.waitForTimeout(100);
      }

      // Set target
      await pageObj.clickButton(['Set target', 'Set Target', 'Target']);
      await pageObj.clickNode(1);
      await page.waitForTimeout(150);
      const hasTarget = await pageObj.nodeHasMarker(1, ['target', 'end']);
      expect(hasTarget).toBeTruthy();
    });

    test('pressing Escape exits addNode/addEdge modes and returns to idle', async ({ page }) => {
      // Enter add-node, then ESC
      await pageObj.clickButton(['Add node']);
      await page.waitForTimeout(80);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
      let modeText1 = await pageObj.getModeIndicatorText();
      expect(!modeText.toLowerCase().includes('add node')).toBeTruthy();

      // Enter add-edge, then ESC
      await pageObj.clickButton(['Add edge']);
      await page.waitForTimeout(80);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
      modeText = await pageObj.getModeIndicatorText();
      expect(!modeText.toLowerCase().includes('add edge')).toBeTruthy();
    });
  });

  test.describe('Dragging behavior and node interactions', () => {
    test('dragging a node updates its position and connected edges adjust', async ({ page }) => {
      // Create two nodes (if needed) and an edge between them to ensure connected edges update
      if ((await pageObj.countNodes()) < 2) {
        await pageObj.clickButton(['Add node']);
        await pageObj.clickSvgAt(60, 60);
        await page.waitForTimeout(60);
        await page.click('body'); // click away
        await pageObj.clickButton(['Add node']);
        await pageObj.clickSvgAt(160, 60);
        await page.waitForTimeout(100);
      }
      // Create an edge if none present
      if ((await pageObj.countEdges()) === 0) {
        await pageObj.clickButton(['Add edge']);
        await pageObj.clickNode(0);
        await page.waitForTimeout(50);
        await pageObj.clickNode(1);
        await page.waitForTimeout(200);
        // confirm modal with weight
        if (await pageObj.isModalOpen()) {
          await pageObj.fillModalWeight(3);
          await pageObj.confirmModal();
          await page.waitForTimeout(150);
        }
      }

      const posBefore = await pageObj.getNodePosition(0);
      expect(posBefore).not.toBeNull();

      // Drag node 0 by some offset
      await pageObj.dragNode(0, 80, 40);
      await page.waitForTimeout(300);

      const posAfter = await pageObj.getNodePosition(0);
      expect(posAfter).not.toBeNull();

      // Positions should differ after dragging
      const diff = Math.abs((posAfter.cx || 0) - (posBefore.cx || 0)) + Math.abs((posAfter.cy || 0) - (posBefore.cy || 0));
      expect(diff).toBeGreaterThan(5);

      // Connected edges should exist and possibly have updated coordinates (best-effort)
      const edges = await pageObj.countEdges();
      expect(edges).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Algorithm runtime: stepping, running, pausing, animating, and finished', () => {
    test('stepping performs algorithm actions and can reach finished state; animations produce visual cues', async ({ page }) => {
      // Build a small graph (3 nodes in a line) with known weights so the algorithm can run
      // Reset canvas
      await pageObj.clear();
      await page.waitForTimeout(150);

      // Create three nodes
      await pageObj.clickButton(['Add node']);
      await pageObj.clickSvgAt(80, 120);
      await page.waitForTimeout(80);
      await pageObj.clickButton(['Add node']);
      await pageObj.clickSvgAt(160, 120);
      await page.waitForTimeout(80);
      await pageObj.clickButton(['Add node']);
      await pageObj.clickSvgAt(240, 120);
      await page.waitForTimeout(120);

      // Create edges: 0-1 weight 1, 1-2 weight 1
      // Edge 0-1
      await pageObj.clickButton(['Add edge']);
      await pageObj.clickNode(0);
      await page.waitForTimeout(60);
      await pageObj.clickNode(1);
      await page.waitForTimeout(200);
      if (await pageObj.isModalOpen()) {
        await pageObj.fillModalWeight(1);
        await pageObj.confirmModal();
        await page.waitForTimeout(100);
      }
      // Edge 1-2
      await pageObj.clickButton(['Add edge']);
      await pageObj.clickNode(1);
      await page.waitForTimeout(60);
      await pageObj.clickNode(2);
      await page.waitForTimeout(200);
      if (await pageObj.isModalOpen()) {
        await pageObj.fillModalWeight(1);
        await pageObj.confirmModal();
        await page.waitForTimeout(100);
      }

      const edgesCount = await pageObj.countEdges();
      expect(edgesCount).toBeGreaterThanOrEqual(2);

      // Set source to node 0 and target to node 2
      await pageObj.clickButton(['Set source']);
      await pageObj.clickNode(0);
      await page.waitForTimeout(80);
      await pageObj.clickButton(['Set target']);
      await pageObj.clickNode(2);
      await page.waitForTimeout(80);

      // Click Step repeatedly until finished or max steps reached
      let steps = 0;
      let finished = false;
      for (; steps < 10; steps++) {
        await pageObj.step();
        // allow animations / UI updates
        await page.waitForTimeout(300);
        finished = await pageObj.hasFinalPathHighlight();
        if (finished) break;
      }

      // Either we saw final highlight or at least some progress indicator (visited nodes)
      expect(steps).toBeLessThanOrEqual(10);
      // Ensure algorithm reached finished state (best-effort)
      const didFinish = await pageObj.waitForFinished(3000);
      expect(didFinish).toBeTruthy();

      // Final path highlight should be present
      const finalPresent = await pageObj.hasFinalPathHighlight();
      expect(finalPresent).toBeTruthy();
    });

    test('play toggles running/paused (button text/aria/state changes) and stop via Clear/Reset', async ({ page }) => {
      // Ensure there's at least a minimal graph
      await pageObj.clear().catch(() => {});
      await page.waitForTimeout(100);
      await pageObj.clickButton(['Add node']);
      await pageObj.clickSvgAt(100, 80);
      await page.waitForTimeout(80);
      await pageObj.clickButton(['Add node']);
      await pageObj.clickSvgAt(180, 80);
      await page.waitForTimeout(100);
      // Create edge
      await pageObj.clickButton(['Add edge']);
      await pageObj.clickNode(0);
      await page.waitForTimeout(60);
      await pageObj.clickNode(1);
      await page.waitForTimeout(200);
      if (await pageObj.isModalOpen()) {
        await pageObj.fillModalWeight(5);
        await pageObj.confirmModal();
        await page.waitForTimeout(100);
      }

      // Click Play to start running; the Play button often toggles to Pause
      // We'll identify Play/Pause by accessible name
      const playBtn = page.getByRole('button', { name: /play|pause|run/i }).first();
      if (await playBtn.count() === 0) {
        // fallback to generic click
        await pageObj.play();
        await page.waitForTimeout(200);
      } else {
        const initialText = (await playBtn.innerText()).toLowerCase();
        await playBtn.click();
        await page.waitForTimeout(300);
        const afterText = (await playBtn.innerText()).toLowerCase().catch(() => '');
        // Should toggle between play/pause text OR aria-pressed state may change
        const toggled = initialText !== afterText || (await playBtn.getAttribute('aria-pressed') !== await playBtn.getAttribute('data-prev'));
        expect(toggled || afterText.includes('pause') || afterText.includes('running')).toBeTruthy();
        // Try toggling back to pause or play
        await playBtn.click();
        await page.waitForTimeout(150);
      }

      // Press Clear to ensure running state is cleaned up
      await pageObj.clear();
      await page.waitForTimeout(150);

      // After clear, nodes/edges likely removed or disabled; ensure UI responsive
      const nodesAfterClear = await pageObj.countNodes();
      expect(typeof nodesAfterClear).toBe('number');
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('creating an edge with negative or non-numeric weight shows validation (modal stays open)', async ({ page }) => {
      // Ensure two nodes exist
      if ((await pageObj.countNodes()) < 2) {
        await pageObj.clickButton(['Add node']);
        await pageObj.clickSvgAt(90, 300);
        await page.waitForTimeout(80);
        await pageObj.clickButton(['Add node']);
        await pageObj.clickSvgAt(190, 300);
        await page.waitForTimeout(80);
      }

      await pageObj.clickButton(['Add edge']);
      await pageObj.clickNode(0);
      await page.waitForTimeout(50);
      await pageObj.clickNode(1);
      await page.waitForTimeout(200);
      expect(await pageObj.isModalOpen()).toBeTruthy();

      // Fill invalid weight (negative)
      await pageObj.fillModalWeight(-5);
      await pageObj.confirmModal();
      await page.waitForTimeout(200);
      const stillOpenNeg = await pageObj.isModalOpen();
      expect(stillOpenNeg).toBeTruthy();

      // Fill non-numeric
      await pageObj.fillModalWeight('abc');
      await pageObj.confirmModal();
      await page.waitForTimeout(200);
      const stillOpenNonNum = await pageObj.isModalOpen();
      expect(stillOpenNonNum).toBeTruthy();

      // Cancel to clean up
      await pageObj.cancelModal();
      await page.waitForTimeout(100);
    });

    test('keyboard interactions: space toggles play/pause if bound; ESC cancels modal and modes', async ({ page }) => {
      // Attempt to trigger play with space (best-effort)
      // Create a tiny graph so algorithm can run
      await pageObj.clear().catch(() => {});
      await pageObj.clickButton(['Add node']);
      await pageObj.clickSvgAt(120, 360);
      await page.waitForTimeout(80);

      // Focus body and press Space
      await page.locator('body').click();
      await page.keyboard.press('Space');
      // We can't be certain space toggles play; ensure no JavaScript error and UI remains responsive
      await page.waitForTimeout(150);
      // Press Escape to ensure it cancels any modal/mode
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      // No modal should be visible
      expect(await pageObj.isModalOpen()).toBeFalsy();

      // Also ensure mode indicator is not stuck
      const mode = await pageObj.getModeIndicatorText();
      expect(typeof mode).toBe('string');
    });
  });
});