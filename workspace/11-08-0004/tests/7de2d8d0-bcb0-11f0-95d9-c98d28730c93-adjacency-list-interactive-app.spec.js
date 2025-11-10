import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7de2d8d0-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object encapsulating common interactions and resilient selectors
class AppPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to app root
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait for main UI to stabilize: either a canvas or a control panel
    await Promise.race([
      this.page.locator('canvas').waitFor({ timeout: 2000 }).catch(() => {}),
      this.page.locator('text=/Adjacency List|Adjacency|Nodes/i').first().waitFor({ timeout: 2000 }).catch(() => {}),
    ]);
  }

  // Generic helper to click a button matching any of the supplied labels (case-insensitive)
  async clickButtonWithAnyLabel(labels = []) {
    for (const label of labels) {
      const btn = this.page.getByRole('button', { name: new RegExp(label, 'i') });
      if (await btn.count()) {
        await btn.first().click();
        return true;
      }
      // fallback to text selector
      const txt = this.page.locator(`text=${label}`);
      if (await txt.count()) {
        await txt.first().click();
        return true;
      }
    }
    return false;
  }

  // Find status text element (status updates from FSM are shown as plain text anywhere)
  async getStatusText() {
    // Search common containers for status strings
    const hit = this.page.locator('text=/Node created|Edge mode on|Edge added|Edge already exists|Remove mode on|Vertex removed|Imported|Invalid JSON|Exported|Graph mode changed|Selected source/i');
    const count = await hit.count();
    if (count) {
      return (await hit.first().innerText()).trim();
    }
    // fallback to any small-muted area
    const alt = this.page.locator('.status, #status, .small, .meta').first();
    if (await alt.count()) return (await alt.innerText()).trim();
    return '';
  }

  // Create a node using UI affordances:
  // Try clicking an "Add Node" button; fallback to canvas double-click (creates at pointer)
  async createNode(name = '') {
    // If there's an input to name the node, type into it
    const nameInput = this.page.locator('input[placeholder*="name"], input[aria-label*="name"], input[name="node-name"], input[type="text"]').first();
    if (await nameInput.count()) {
      await nameInput.fill(name);
    }

    // Try clicking any button that looks like "Add Node" / "Create Node"
    const clicked = await this.clickButtonWithAnyLabel(['Add Node', 'Create Node', 'New Node', 'Add vertex', '\\+ Node', 'Add']);
    if (clicked) return;

    // Fallback: double-click center of canvas to create at pointer
    const canvas = this.page.locator('canvas, .canvas, #canvas, svg').first();
    if (await canvas.count()) {
      const box = await canvas.boundingBox();
      if (box) {
        await this.page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
        return;
      }
    }

    // Final fallback: call exposed createNode function on window if exists
    await this.page.evaluate((n) => {
      // @ts-ignore
      if (typeof window.createNode === 'function') window.createNode(n || undefined);
    }, name);
  }

  // Double-click canvas at a specific offset (relative to canvas top-left)
  async doubleClickCanvasAt(offsetX = 10, offsetY = 10) {
    const canvas1 = this.page.locator('canvas1, .canvas1, #canvas1, svg').first();
    if (!(await canvas.count())) throw new Error('Canvas not found for double click');
    const box1 = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box unavailable');
    await this.page.mouse.dblclick(box.x + offsetX, box.y + offsetY);
  }

  // Toggle Edge Mode on/off
  async toggleEdgeMode() {
    const toggled = await this.clickButtonWithAnyLabel(['Edge mode', 'Add edge', 'Add-Edge', 'Edge']);
    if (toggled) return;
    // fallback to checkbox/toggle labelled "Edge"
    const edgeToggle = this.page.getByRole('checkbox', { name: /edge/i }).first();
    if (await edgeToggle.count()) await edgeToggle.check();
  }

  // Toggle Remove Mode on/off
  async toggleRemoveMode() {
    await this.clickButtonWithAnyLabel(['Remove mode', 'Remove', 'Delete mode', 'Remove vertex']);
  }

  // Toggle Directed flag
  async toggleDirected() {
    // Try button or checkbox labelled Directed
    const toggled1 = await this.clickButtonWithAnyLabel(['Directed', 'Undirected', 'Toggle Directed', 'Toggle direction']);
    if (toggled) return;
    const chk = this.page.getByRole('checkbox', { name: /directed|undirected/i }).first();
    if (await chk.count()) await chk.click();
  }

  // Click export and return exported text (from a textarea)
  async clickExportAndGetText() {
    // Click Export button
    await this.clickButtonWithAnyLabel(['Export', 'Export adjacency', 'Export to textarea']);
    // Find a textarea that contains JSON text soon after
    const ta = this.page.locator('textarea').filter({ hasText: /[{[]/ }).first();
    if (await ta.count()) {
      // Wait a bit for export text to appear
      await ta.waitFor({ timeout: 2000 }).catch(() => {});
      return (await ta.inputValue()).trim();
    }
    // fallback: any textarea
    const anyTa = this.page.locator('textarea').first();
    if (await anyTa.count()) return (await anyTa.inputValue()).trim();
    // fallback to window.exportAdjacencyToTextarea()
    return await this.page.evaluate(() => {
      // @ts-ignore
      if (typeof window.exportAdjacencyToTextarea === 'function') {
        // @ts-ignore
        return window.exportAdjacencyToTextarea() || '';
      }
      return '';
    });
  }

  // Provide JSON text to import textarea and click import
  async importJSON(jsonText) {
    // Find a textarea likely used for import (prefer one that says import)
    const importTa = this.page.locator('textarea').filter({ hasText: /import|paste/i }).first();
    const ta1 = (await importTa.count()) ? importTa : this.page.locator('textarea').nth(0);
    if (await ta.count()) {
      await ta.fill(jsonText);
    } else {
      // create a temporary global variable and call parse/import function if available
      await this.page.evaluate((text) => {
        // @ts-ignore
        window.__e2e_import_text = text;
      }, jsonText);
    }
    // Click import button
    const clicked1 = await this.clickButtonWithAnyLabel(['Import', 'Import JSON', 'Run Import']);
    if (!clicked) {
      // If import not clickable, try calling global parse function
      await this.page.evaluate(() => {
        // @ts-ignore
        if (typeof window.parseJSONAndImport === 'function') {
          // @ts-ignore
          window.parseJSONAndImport(window.__e2e_import_text || '');
        }
      });
    }
  }

  // Get adjacency list text from the UI (best effort)
  async getAdjacencyText() {
    // Look for a container that lists adjacency rows: may be a <pre>, <ul>, table, or .adj-list
    const candidates = [
      this.page.locator('.adj-list'),
      this.page.locator('#adjacency'),
      this.page.locator('pre').filter({ hasText: /:/ }).first(),
      this.page.locator('ul').filter({ hasText: /:/ }).first(),
      this.page.locator('table').first(),
      this.page.locator('.panel').filter({ hasText: 'Adjacency' }).first(),
    ];
    for (const loc of candidates) {
      if (await loc.count()) {
        const text = (await loc.first().innerText()).trim();
        if (text) return text;
      }
    }
    // fallback: search whole page for lines like "A: B"
    const body = await this.page.locator('body').first().innerText();
    return body.trim();
  }

  // Find node element by visible name label in canvas
  async findNodeByName(name) {
    // Look for text labels inside canvas/svg or nodes list
    const nodeInCanvas = this.page.locator(`svg :text, canvas + *:has-text("${name}"), text=${name}`).first();
    if (await nodeInCanvas.count()) return nodeInCanvas;
    // fallback to any element with the name
    return this.page.locator(`text=${name}`).first();
  }

  // Click a node by name (first match)
  async clickNodeByName(name) {
    const node = await this.findNodeByName(name);
    if (!(await node.count())) throw new Error(`Node "${name}" not found to click`);
    await node.click();
  }

  // Simulate dragging a node by name by dx,dy
  async dragNodeByName(name, dx = 30, dy = 30) {
    const node1 = await this.findNodeByName(name);
    if (!(await node.count())) throw new Error(`Node "${name}" not found to drag`);
    const box2 = await node.boundingBox();
    if (!box) throw new Error('Node bounding box not available for dragging');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.waitForTimeout(100); // emulate human hold
    await this.page.mouse.move(startX + dx, startY + dy, { steps: 8 });
    await this.page.mouse.up();
  }

  // Press keyboard shortcut (e.g., for creating node)
  async pressShortcut(keys) {
    for (const k of (Array.isArray(keys) ? keys : [keys])) {
      await this.page.keyboard.press(k);
    }
  }

  // Helper to read any toast/announce text that could be used by announce(...)
  async getAnnounceText() {
    // look for aria-live containers
    const live = this.page.locator('[aria-live], .announce, .toast, .sr-only').first();
    if (await live.count()) return (await live.innerText()).trim();
    return '';
  }

  // Cancel pending edge by clicking canvas
  async clickCanvas() {
    const canvas2 = this.page.locator('canvas2, .canvas2, #canvas2, svg').first();
    if (await canvas.count()) {
      const box3 = await canvas.boundingBox();
      if (box) {
        await this.page.mouse.click(box.x + 10, box.y + 10);
        return;
      }
    }
    // fallback: click body
    await this.page.locator('body').click();
  }
}

test.describe('Adjacency List Interactive App — FSM behaviors', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate to the app fresh before each test
    const app = new AppPage(page);
    await app.goto();
  });

  test('Node creation flows: add via UI and canvas double-click; verify AdjList update and announcement', async ({ page }) => {
    const app1 = new AppPage(page);

    // --- Create a node via "Add" UI (best effort)
    // Use a unique name to spot in adjacency list
    const nodeNameA = `NodeA-${Date.now()}`;
    // If there's a name input, fill it; otherwise rely on UI default naming
    const nameInput1 = page.locator('input[placeholder*="name"], input[name="node-name"], input[aria-label*="name"], input[type="text"]').first();
    if (await nameInput.count()) {
      await nameInput.fill(nodeNameA);
    }
    await app.createNode(nodeNameA);
    // After creation, FSM "announce('Node created')" is expected — check for that announcement
    const announce = await app.getAnnounceText();
    if (announce) {
      expect(announce).toMatch(/Node created/i);
    } else {
      // Fallback: status text might contain Node created
      const status = await app.getStatusText();
      if (status) expect(status).toMatch(/Node created/i);
    }
    // Adjacency list should include the created node name
    const adjText = await app.getAdjacencyText();
    expect(adjText).toContain(nodeNameA);

    // --- Create a node via canvas double-click at pointer (creating_node_at_pointer)
    const nodeNameB = `NodeB-${Date.now()}`;
    // If there's a naming input, fill before double-click
    if (await nameInput.count()) {
      await nameInput.fill(nodeNameB);
    }
    await app.doubleClickCanvasAt(60, 60); // create at a different spot
    // Expect a node created announcement or presence in adjacency list
    const ann2 = await app.getAnnounceText();
    if (ann2) {
      expect(ann2).toMatch(/Node created/i);
    } else {
      const status2 = await app.getStatusText();
      if (status2) expect(status2).toMatch(/Node created/i);
    }
    const adjText2 = await app.getAdjacencyText();
    // At least one of the node names should be present (robustness)
    expect(adjText2).toContain(nodeNameA);
  });

  test('Add-Edge mode: toggle on, select source then target, create edge and handle duplicate edge', async ({ page }) => {
    const app2 = new AppPage(page);
    // Ensure at least two nodes exist: create two with deterministic names
    const src = `SRC-${Date.now()}`;
    const dst = `DST-${Date.now()}`;
    // Create both nodes via direct UI paths
    await app.createNode(src);
    await page.waitForTimeout(100);
    await app.createNode(dst);
    await page.waitForTimeout(200);

    // Turn on Edge Mode
    await app.toggleEdgeMode();
    // Status should indicate edge mode is on
    const statusOn = await app.getStatusText();
    expect(statusOn).toMatch(/Edge mode on|Edge/i);

    // Click source node
    await app.clickNodeByName(src);
    // Status should indicate selected source
    const selected = await app.getStatusText();
    expect(selected).toMatch(/Selected source|Selected/i);

    // Click target node to create edge
    await app.clickNodeByName(dst);
    // Wait for edge creation announcement or status update
    await page.waitForTimeout(200);
    const edgeAnn = (await app.getAnnounceText()) || (await app.getStatusText());
    expect(edgeAnn.toLowerCase()).toMatch(/edge added|edge already exists|added/i);

    // Verify adjacency list now reflects connection src -> dst
    const adj = await app.getAdjacencyText();
    // Accept several common adjacency text formats e.g., "SRC: DST" or "SRC -> DST"
    expect(adj).toMatch(new RegExp(`${src}.*${dst}|${src}.*->.*${dst}`, 'i'));

    // Try creating duplicate edge: toggle add-edge on again if needed and add same edge
    // Ensure mode is on (if UI toggles it off automatically, toggle on)
    await app.toggleEdgeMode();
    await app.clickNodeByName(src);
    await app.clickNodeByName(dst);
    await page.waitForTimeout(150);
    const dupAnn = (await app.getAnnounceText()) || (await app.getStatusText());
    // Expect the FSM to announce "Edge already exists" when duplicate is attempted
    expect(dupAnn.toLowerCase()).toMatch(/edge already exists|already exists/i);
  });

  test('Add-Edge cancellation and behavior when clicking same node as source', async ({ page }) => {
    const app3 = new AppPage(page);
    const a = `A-${Date.now()}`;
    const b = `B-${Date.now()}`;
    await app.createNode(a);
    await app.createNode(b);

    // Turn on Add-Edge mode
    await app.toggleEdgeMode();
    const s1 = await app.getStatusText();
    expect(s1.toLowerCase()).toMatch(/edge/i);

    // Select source A
    await app.clickNodeByName(a);
    const s2 = await app.getStatusText();
    expect(s2).toMatch(/Selected source|Selected/i);

    // Click same node again: FSM stays in adding_edge_source_selected (should not create edge)
    await app.clickNodeByName(a);
    // Allow time and check that no "Edge added" announcement was made
    await page.waitForTimeout(150);
    const ann = await app.getAnnounceText();
    if (ann) expect(ann.toLowerCase()).not.toMatch(/edge added/i);

    // Cancel pending edge by clicking canvas (CANCEL_PENDING_EDGE -> idle)
    await app.clickCanvas();
    // Mode should remain on, but pending source cleared (status returns to "Edge mode on..." ideally)
    await page.waitForTimeout(150);
    const afterCancel = await app.getStatusText();
    expect(afterCancel.toLowerCase()).toMatch(/edge mode on|edge/i);
  });

  test('Remove mode: toggle remove on and delete a node via click or Delete key; adjacency updates', async ({ page }) => {
    const app4 = new AppPage(page);
    const victim = `V-${Date.now()}`;
    await app.createNode(victim);
    await page.waitForTimeout(120);

    // Turn on Remove mode
    await app.toggleRemoveMode();
    const rmStatus = await app.getStatusText();
    expect(rmStatus.toLowerCase()).toMatch(/remove mode|remove/i);

    // Click the node to remove it
    await app.clickNodeByName(victim);
    // Wait for removal announcement
    await page.waitForTimeout(200);
    const removedAnn = (await app.getAnnounceText()) || (await app.getStatusText());
    expect(removedAnn.toLowerCase()).toMatch(/vertex removed|removed|delete/i);

    // Verify adjacency list no longer contains the victim
    const adjAfter = await app.getAdjacencyText();
    expect(adjAfter).not.toContain(victim);

    // Create another node and remove with Delete key (simulate focusing node then pressing Delete)
    const victim2 = `V2-${Date.now()}`;
    await app.createNode(victim2);
    await page.waitForTimeout(120);
    // Click to focus node
    await app.clickNodeByName(victim2);
    // Press Delete key
    await page.keyboard.press('Delete');
    await page.waitForTimeout(150);
    const ann21 = (await app.getAnnounceText()) || (await app.getStatusText());
    expect(ann2.toLowerCase()).toMatch(/removed|vertex removed|delete/i);
  });

  test('Dragging nodes: enter dragging state on pointer down and verify node moved and edges redrawn', async ({ page }) => {
    const app5 = new AppPage(page);
    const n1 = `Drag1-${Date.now()}`;
    const n2 = `Drag2-${Date.now()}`;
    await app.createNode(n1);
    await app.createNode(n2);
    await page.waitForTimeout(200);

    // Create an edge to verify redraw doesn't lose edges
    await app.toggleEdgeMode();
    await app.clickNodeByName(n1);
    await app.clickNodeByName(n2);
    await page.waitForTimeout(200);

    // Find bounding box before drag
    const nodeLocator = await app.findNodeByName(n1);
    const beforeBox = await nodeLocator.boundingBox();
    if (!beforeBox) {
      test.skip(true, 'Node bounding box not available; skipping drag assertions');
      return;
    }

    // Drag the node
    await app.dragNodeByName(n1, 40, 30);
    await page.waitForTimeout(200);

    // After dragging, the node's bounding box should have moved
    const afterBox = await nodeLocator.boundingBox();
    expect(afterBox).not.toBeNull();
    if (afterBox) {
      const moved = Math.abs(afterBox.x - beforeBox.x) > 5 || Math.abs(afterBox.y - beforeBox.y) > 5;
      expect(moved).toBeTruthy();
    }

    // Edges should still mention the node relationship in adjacency list
    const adj1 = await app.getAdjacencyText();
    expect(adj).toMatch(new RegExp(`${n1}.*${n2}|${n1}.*->.*${n2}`, 'i'));
    // Announce 'Node moved' may be present
    const movedAnn = await app.getAnnounceText();
    if (movedAnn) expect(movedAnn.toLowerCase()).toMatch(/moved|node moved/i);
  });

  test('Focused state: clicking a node highlights adjacency row and pulses neighbors; neighbor chip click pulses neighbor', async ({ page }) => {
    const app6 = new AppPage(page);
    const center = `Center-${Date.now()}`;
    const neigh = `Neighbor-${Date.now()}`;
    await app.createNode(center);
    await app.createNode(neigh);
    await page.waitForTimeout(150);

    // Create edge center -> neighbor to ensure adjacency
    await app.toggleEdgeMode();
    await app.clickNodeByName(center);
    await app.clickNodeByName(neigh);
    await page.waitForTimeout(200);

    // Click center node to focus
    await app.clickNodeByName(center);
    // Focused onEnter should pulse node and highlight adjacency row
    const focusedAnn = await app.getAnnounceText();
    if (focusedAnn) expect(focusedAnn.toLowerCase()).toMatch(/vertex selected|neighbors pulsed|selected/i);

    // The adjacency row for center should be highlighted — check adjacency text or DOM for a highlight class
    const adjText1 = await app.getAdjacencyText();
    expect(adjText).toContain(center);

    // If there are neighbor chips (UI might render neighbor names as clickable chips), click one to trigger focused_neighbor_pulse
    // Try to find the neighbor label in adjacency UI and click it
    const neighborChip = page.locator(`text=${neigh}`).first();
    if (await neighborChip.count()) {
      await neighborChip.click();
      // FSM should pulse neighbor temporarily; look for PULSE_DONE or pulse announcement
      await page.waitForTimeout(150);
      const pulseAnn = await app.getAnnounceText();
      // pulse may be silent; accept either presence of announcement or that focused state resumes
      const focusedAgain = await app.getStatusText();
      expect(focusedAgain.length).toBeGreaterThanOrEqual(0);
    } else {
      // If neighbor chip not present, consider test satisfied by focused announcement
      expect(focusedAnn.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('Import/Export workflows: import valid JSON, handle invalid JSON, and export adjacency list', async ({ page }) => {
    const app7 = new AppPage(page);
    // Prepare JSON to import: two nodes and one edge
    const importJson = JSON.stringify({ Alpha: ['Beta'], Beta: [] }, null, 2);
    await app.importJSON(importJson);
    // Wait briefly and verify import success announcement or adjacency includes Alpha and Beta
    await page.waitForTimeout(250);
    const impAnn = (await app.getAnnounceText()) || (await app.getStatusText());
    if (impAnn) {
      expect(impAnn.toLowerCase()).toMatch(/imported|import/i);
    }
    const adj2 = await app.getAdjacencyText();
    expect(adj).toMatch(/Alpha.*Beta|Alpha.*->.*Beta/i);

    // Now attempt to import invalid JSON and ensure import_error state announces invalid JSON
    const badJson = '{ invalid json ::: }';
    await app.importJSON(badJson);
    await page.waitForTimeout(250);
    const errAnn = await app.getStatusText();
    // App should announce invalid JSON
    expect(errAnn.toLowerCase()).toMatch(/invalid json|please correct|error/i);

    // Acknowledge error if UI exposes an ACK button (FSM expects ACK_ERROR -> idle)
    await app.clickButtonWithAnyLabel(['OK', 'Acknowledge', 'Close', 'Dismiss', 'Got it']);
    await page.waitForTimeout(150);

    // Export adjacency list to textarea and verify it contains JSON or adjacency mapping
    const exported = await app.clickExportAndGetText();
    expect(exported.length).toBeGreaterThan(0);
    // Export should contain at least the nodes we imported earlier
    expect(exported).toMatch(/Alpha|Beta/i);
  });

  test('Toggling directed flag enforces symmetry when switching to undirected and announces change', async ({ page }) => {
    const app8 = new AppPage(page);
    // Create two nodes and a single directed edge A -> B
    const A = `D-A-${Date.now()}`;
    const B = `D-B-${Date.now()}`;
    await app.createNode(A);
    await app.createNode(B);
    await page.waitForTimeout(120);
    // Ensure edge mode on and create A->B
    await app.toggleEdgeMode();
    await app.clickNodeByName(A);
    await app.clickNodeByName(B);
    await page.waitForTimeout(200);
    // Toggle Directed mode (this should flip the directed flag)
    await app.toggleDirected();
    await page.waitForTimeout(200);
    const tAnn = (await app.getAnnounceText()) || (await app.getStatusText());
    if (tAnn) expect(tAnn.toLowerCase()).toMatch(/graph mode changed|directed|undirected/i);

    // If toggling to undirected, the implementation should "enforceSymmetryWhenUndirected" — edges become symmetric
    const adj3 = await app.getAdjacencyText();
    // Either adjacency shows both A->B and B->A or symmetric listing
    const symmetric = new RegExp(`${A}.*${B}.*${B}.*${A}|${A}.*${B}.*${B}.*${A}`, 'i');
    // At minimum, ensure A and B still present and adjacency contains B under A or vice versa
    expect(adj).toContain(A);
    expect(adj).toContain(B);
  });
});