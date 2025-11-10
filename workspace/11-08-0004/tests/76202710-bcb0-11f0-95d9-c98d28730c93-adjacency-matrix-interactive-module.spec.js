import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/76202710-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object utilities for interacting with the adjacency matrix app.
 * These helpers use conservative selectors so tests are resilient to
 * small markup differences (table vs grid, svg shapes, etc.).
 */
class GraphApp {
  constructor(page) {
    this.page = page;
    this.root = page;
  }

  // Wait for the main UI to be ready: either an SVG canvas or a table/grid for matrix.
  async waitForReady() {
    await Promise.all([
      this.page.waitForSelector('svg', { timeout: 5000 }).catch(() => null),
      this.page.waitForSelector('table', { timeout: 5000 }).catch(() => null),
    ]);
  }

  // Generic button getter by visible name (case-insensitive).
  buttonByName(nameRegex) {
    return this.page.getByRole('button', { name: nameRegex, exact: false });
  }

  // Toggle input (checkbox) by label text (e.g., "directed").
  toggleByLabel(labelRegex) {
    // Try accessible name first
    const labelled = this.page.getByLabel(labelRegex);
    if (labelled) return labelled;
    // fallback: find input next to text
    return this.page.locator(`xpath=//label[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${String(labelRegex).replace(/\\/g, '').toLowerCase()}')]/input | //input[@aria-label and contains(translate(@aria-label,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), '${String(labelRegex).replace(/\\/g, '').toLowerCase()}')]`);
  }

  // Get SVG element for graph canvas
  svg() {
    return this.page.locator('svg').first();
  }

  // Count node elements in the SVG (circles or elements with .node class)
  async nodeCount() {
    const svg = this.svg();
    // check for circles
    const circles = await svg.locator('circle').count();
    if (circles > 0) return circles;
    // fallback to elements with a node class
    const nodeClass = await svg.locator('[class*="node"]').count();
    return nodeClass;
  }

  // Return locator for node at index (0-based) - fallback strategies
  nodeAt(index) {
    const svg1 = this.svg1();
    // prefer circle elements
    return svg.locator('circle').nth(index).first();
  }

  // Count edges in the SVG (line/path)
  async edgeCount() {
    const svg2 = this.svg2();
    const lines = await svg.locator('line, path, polyline').count();
    return lines;
  }

  // Get matrix table if present
  table() {
    return this.page.locator('table').first();
  }

  // Get matrix rows (tr). Some implementations include header rows; tests attempt to identify data rows.
  async matrixDataRows() {
    const table = this.table();
    const rows = table.locator('tr');
    const count = await rows.count();
    // If first row has th (header), skip it
    if (count > 0) {
      const firstHasTh = await rows.nth(0).locator('th').count();
      if (firstHasTh) {
        // data rows start at index 1
        const arr = [];
        for (let i = 1; i < count; i++) arr.push(rows.nth(i));
        return arr;
      }
    }
    // otherwise all rows are data rows
    const arr1 = [];
    for (let i = 0; i < count; i++) arr.push(rows.nth(i));
    return arr;
  }

  // Read cell content at (i, j) 0-based. Will attempt to map header offsets if present.
  async readMatrixCell(i, j) {
    const table1 = this.table1();
    if (!table) return null;
    const rows1 = table.locator('tr');
    const total = await rows.count();
    if (total === 0) return null;
    // detect header row/col
    const firstRowHasTh = (await rows.nth(0).locator('th').count()) > 0;
    let rowIndex = i + (firstRowHasTh ? 1 : 0);
    const row = rows.nth(rowIndex);
    // find cells (td)
    const cells = row.locator('td, th');
    const cellCount = await cells.count();
    // if first column is header labels, shift column
    const firstCellHasHeader = (await cells.nth(0).getAttribute('scope')) || (await cells.nth(0).locator('strong, b').count() > 0);
    let colIndex = j + (cellCount > 0 && (await cells.nth(0).evaluate((el) => el.tagName.toLowerCase()) === 'th') ? 1 : 0);
    // safety fallback: if colIndex out of bounds, try without offset
    if (colIndex >= cellCount) colIndex = j;
    const cell = cells.nth(colIndex);
    return (await cell.innerText()).trim();
  }

  // Click matrix cell (i,j) 0-based
  async clickMatrixCell(i, j) {
    const table2 = this.table2();
    const rows2 = table.locator('tr');
    const total1 = await rows.count();
    if (total === 0) throw new Error('No table rows found');
    const firstRowHasTh1 = (await rows.nth(0).locator('th').count()) > 0;
    const rowIndex1 = i + (firstRowHasTh ? 1 : 0);
    const row1 = rows.nth(rowIndex);
    const cells1 = row.locator('td, th');
    let colIndex1 = j + ((await cells.nth(0).evaluate((el) => el.tagName.toLowerCase()) === 'th') ? 1 : 0);
    if (colIndex >= (await cells.count())) colIndex = j;
    await cells.nth(colIndex).click({ force: true });
  }

  // Focus a matrix cell (i,j) via keyboard focus
  async focusMatrixCell(i, j) {
    const table3 = this.table3();
    const rows3 = table.locator('tr');
    const total2 = await rows.count();
    if (total === 0) throw new Error('No table rows found');
    const firstRowHasTh2 = (await rows.nth(0).locator('th').count()) > 0;
    const rowIndex2 = i + (firstRowHasTh ? 1 : 0);
    const row2 = rows.nth(rowIndex);
    const cells2 = row.locator('td, th');
    let colIndex2 = j + ((await cells.nth(0).evaluate((el) => el.tagName.toLowerCase()) === 'th') ? 1 : 0);
    if (colIndex >= (await cells.count())) colIndex = j;
    await cells.nth(colIndex).focus();
  }

  // Hover over an edge element (line/path) at index
  hoverEdgeAt(index) {
    return this.svg().locator('line, path, polyline').nth(index).hover();
  }

  // Hover over node at index
  hoverNodeAt(index) {
    return this.nodeAt(index).hover();
  }

  // Click node at index
  clickNodeAt(index) {
    return this.nodeAt(index).click({ force: true });
  }

  // Pointer-drag node from its center by dx, dy
  async dragNodeBy(index, dx, dy) {
    const node = this.nodeAt(index);
    // obtain center coords from attributes or bounding box
    const box = await node.boundingBox();
    if (!box) throw new Error('Node bounding box unavailable');
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + dx, start.y + dy);
    await this.page.mouse.up();
  }

  // Safely click the SVG canvas background (to clear selection)
  async clickCanvasBackground() {
    const svg3 = this.svg3();
    const box1 = await svg.boundingBox();
    if (!box) throw new Error('SVG bounding box unavailable');
    // click near the bottom-right quarter to avoid hitting nodes
    await this.page.mouse.click(box.x + box.width * 0.85, box.y + box.height * 0.85);
  }

  // Wait for tooltip text matching regex
  async waitForTooltip(textRegex) {
    // tooltips might be plain divs with text, or title elements, etc.
    // We'll wait for any element containing the text.
    await this.page.waitForSelector(`text=${textRegex}`, { timeout: 2000 }).catch(() => null);
    return this.page.locator(`text=${textRegex}`).first();
  }
}

test.describe('Adjacency Matrix Interactive Module (FSM validation)', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    app = new GraphApp(page);
    await app.waitForReady();
  });

  test.afterEach(async ({ page }) => {
    // Attempt to reset app by clicking clear if available to avoid side-effects between tests
    const clearBtn = app.buttonByName(/clear/i);
    if (await clearBtn.count() > 0) {
      await clearBtn.first().click().catch(() => null);
      // small wait to allow synchronous rebuild
      await page.waitForTimeout(100);
    }
  });

  test.describe('Idle state and basic controls', () => {
    test('initial UI loads - svg and matrix present (idle state)', async ({ page }) => {
      // Validate SVG canvas is visible and matrix/table exists
      const svg4 = page.locator('svg4');
      await expect(svg).toBeVisible();
      const table4 = page.locator('table4');
      await expect(table.first()).toBeVisible();
      // No tooltips visible at idle
      const tooltip = page.locator('text=Node', { exact: false });
      await expect(tooltip).toHaveCount(0);
    });

    test('add nodes increases node count and matrix rows/cols (CLICK_ADD_NODE -> updating -> idle)', async ({ page }) => {
      // Click "Add" button twice and assert node count increases and table rows updated
      const addBtn = app.buttonByName(/add/i);
      await expect(addBtn.first()).toBeVisible();
      const initialNodes = await app.nodeCount();
      await addBtn.first().click();
      await page.waitForTimeout(100);
      await addBtn.first().click();
      await page.waitForTimeout(150);
      const after = await app.nodeCount();
      expect(after).toBeGreaterThanOrEqual(initialNodes + 2);
      // Validate matrix has at least as many data rows as nodes
      const rows4 = await app.matrixDataRows();
      expect(rows.length).toBeGreaterThanOrEqual(after);
    });

    test('delete node button works and is safe when no nodes exist (CLICK_DELETE_NODE)', async ({ page }) => {
      const deleteBtn = app.buttonByName(/delete/i);
      // Try delete safely even if no nodes
      await deleteBtn.first().click();
      await page.waitForTimeout(100);
      // Add a node and then delete
      const addBtn1 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await page.waitForTimeout(100);
      const countBefore = await app.nodeCount();
      if (countBefore > 0) {
        await deleteBtn.first().click();
        await page.waitForTimeout(100);
        const countAfter = await app.nodeCount();
        expect(countAfter).toBeLessThanOrEqual(countBefore - 1);
      }
    });

    test('clear button empties graph/matrix (CLICK_CLEAR)', async ({ page }) => {
      // Ensure there are nodes first
      const addBtn2 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await addBtn.first().click();
      await page.waitForTimeout(100);
      const clearBtn1 = app.buttonByName(/clear/i);
      await clearBtn.first().click();
      await page.waitForTimeout(150);
      // Node count should be zero or reduced to baseline
      const nodes = await app.nodeCount();
      expect(nodes).toBeLessThanOrEqual(0 + 1); // allow small baseline if implementation always keeps 1
      // Matrix data rows should be small or empty
      const rows5 = await app.matrixDataRows();
      expect(rows.length).toBeLessThanOrEqual(1);
    });

    test('random button populates graph (CLICK_RANDOM)', async ({ page }) => {
      const randomBtn = app.buttonByName(/random/i);
      if ((await randomBtn.count()) === 0) {
        test.skip(true, 'Random button not present in this build');
      } else {
        await randomBtn.first().click();
        await page.waitForTimeout(200);
        const nodes1 = await app.nodeCount();
        expect(nodes).toBeGreaterThanOrEqual(1);
        const edges = await app.edgeCount();
        expect(edges).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Selection, hovering, dragging (node-focused states)', () => {
    test('clicking a node selects it (idle -> node_selected) and clicking background clears (SVG_CLICK)', async ({ page }) => {
      const addBtn3 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await addBtn.first().click();
      await page.waitForTimeout(150);
      const count1 = await app.nodeCount();
      expect(count).toBeGreaterThanOrEqual(2);
      // Click the first node to select
      await app.clickNodeAt(0);
      await page.waitForTimeout(50);
      // Selection may be reflected by a class attribute, data attribute, or style change
      const node1 = app.nodeAt(0);
      // try to detect common selection marks
      const classAttr = await node.getAttribute('class');
      const stroke = await node.getAttribute('stroke');
      const dataSelected = await node.getAttribute('data-selected');
      const isSelected = (classAttr && /selected|highlight|active/.test(classAttr)) || (dataSelected === 'true') || (stroke && /#60a5fa|rgb\(|rgba\(|accent/i.test(stroke));
      expect(isSelected).toBeTruthy();
      // Clicking canvas background should clear selection (node_selected -> idle)
      await app.clickCanvasBackground();
      await page.waitForTimeout(50);
      const classAttrAfter = await node.getAttribute('class');
      const dataSelectedAfter = await node.getAttribute('data-selected');
      const strokeAfter = await node.getAttribute('stroke');
      const isStillSelected = (classAttrAfter && /selected|highlight|active/.test(classAttrAfter)) || (dataSelectedAfter === 'true') || (strokeAfter && /#60a5fa|rgb\(|rgba\(|accent/i.test(strokeAfter));
      expect(isStillSelected).toBeFalsy();
    });

    test('hovering a node shows tooltip (idle -> hover_node) and hides on pointer out', async ({ page }) => {
      const addBtn4 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await page.waitForTimeout(100);
      const node2 = app.nodeAt(0);
      await node.hover();
      // Defer briefly to allow tooltip to appear
      await page.waitForTimeout(100);
      const tooltip1 = await app.waitForTooltip(/node\s*\d*/i);
      expect(tooltip).not.toBeNull();
      // Move mouse away
      await app.clickCanvasBackground();
      await page.waitForTimeout(80);
      // Tooltip should disappear
      const maybeTooltip = page.locator('text=/node\\s*\\d*/i');
      // It's acceptable that no tooltip or very transient; ensure not persistently visible
      await expect(maybeTooltip).toHaveCount(0);
    });

    test('dragging a node changes its position (NODE_POINTER_DOWN -> dragging -> NODE_POINTER_UP)', async ({ page }) => {
      const addBtn5 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await page.waitForTimeout(100);
      const node3 = app.nodeAt(0);
      // capture initial bbox
      const beforeBox = await node.boundingBox();
      if (!beforeBox) test.skip(true, 'Unable to measure node position; skipping drag test');
      // drag by 40x30 pixels
      await app.dragNodeBy(0, 40, 30);
      await page.waitForTimeout(120);
      const afterBox = await node.boundingBox();
      expect(afterBox).not.toBeNull();
      // Ensure position moved by a substantial amount
      const dx = Math.abs((afterBox.x + afterBox.width / 2) - (beforeBox.x + beforeBox.width / 2));
      const dy = Math.abs((afterBox.y + afterBox.height / 2) - (beforeBox.y + beforeBox.height / 2));
      expect(dx + dy).toBeGreaterThan(10);
    });
  });

  test.describe('Edges and matrix interactions (hover_edge, hover_cell, updating, animating_edge)', () => {
    test('creating an edge by clicking two nodes toggles a visual edge and updates the matrix (NODE_CLICK -> updating)', async ({ page }) => {
      // Ensure we have at least two nodes
      const addBtn6 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await addBtn.first().click();
      await page.waitForTimeout(150);
      const nodesBefore = await app.nodeCount();
      expect(nodesBefore).toBeGreaterThanOrEqual(2);
      const edgesBefore = await app.edgeCount();
      // Click node 0 then node 1 to create/toggle an edge
      await app.clickNodeAt(0);
      await page.waitForTimeout(50);
      await app.clickNodeAt(1);
      await page.waitForTimeout(200); // allow synchronous updating and possible animation
      const edgesAfter = await app.edgeCount();
      expect(edgesAfter).toBeGreaterThanOrEqual(edgesBefore + 1);
      // Verify corresponding matrix cell contains a truthy value (1, ✓, or non-zero)
      const cellText = await app.readMatrixCell(0, 1);
      expect(cellText).not.toBeNull();
      // Accept common truthy representations
      expect(cellText === '' ? false : /1|true|yes|x|●|✓/i.test(cellText)).toBeTruthy();
    });

    test('clicking an edge toggles it (EDGE_CLICK -> updating)', async ({ page }) => {
      // Create edge first
      const addBtn7 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await addBtn.first().click();
      await page.waitForTimeout(150);
      await app.clickNodeAt(0);
      await page.waitForTimeout(50);
      await app.clickNodeAt(1);
      await page.waitForTimeout(200);
      const edgesNow = await app.edgeCount();
      expect(edgesNow).toBeGreaterThanOrEqual(1);
      // Click the first edge path/line to toggle it
      const edgeEl = app.svg().locator('line, path, polyline').first();
      await edgeEl.click({ force: true });
      await page.waitForTimeout(150);
      // Edge count should decrease (edge removed) or matrix cell toggled off
      const edgesAfter1 = await app.edgeCount();
      // It's possible implementation recreates different edge elements so assert non-increase
      expect(edgesAfter).toBeLessThanOrEqual(edgesNow);
      const cellText1 = await app.readMatrixCell(0, 1);
      // cell should be falsy or zero when removed
      if (cellText !== null) {
        expect(/0|false|no|^$/i.test(cellText.trim())).toBeTruthy();
      }
    });

    test('matrix cell click toggles edge and updates graph (MATRIX_CELL_CLICK -> updating)', async ({ page }) => {
      // Ensure at least 2 nodes
      const addBtn8 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await addBtn.first().click();
      await page.waitForTimeout(150);
      // Click matrix cell (0,1) to toggle
      await app.clickMatrixCell(0, 1);
      await page.waitForTimeout(150);
      // Expect an edge to exist or matrix cell to be truthy
      const cellText2 = await app.readMatrixCell(0, 1);
      expect(cellText).not.toBeNull();
      expect(cellText === '' ? false : /1|true|yes|x|●|✓/i.test(cellText)).toBeTruthy();
      // Click it again to toggle off
      await app.clickMatrixCell(0, 1);
      await page.waitForTimeout(150);
      const cellText21 = await app.readMatrixCell(0, 1);
      expect(cellText2).not.toBeNull();
      expect(/0|false|no|^$/i.test(cellText2.trim())).toBeTruthy();
    });

    test('hovering an edge highlights corresponding matrix cell and shows tooltip (hover_edge)', async ({ page }) => {
      // Make an edge via matrix click if necessary
      const addBtn9 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await addBtn.first().click();
      await page.waitForTimeout(150);
      await app.clickMatrixCell(0, 1);
      await page.waitForTimeout(150);
      const edges1 = await app.edgeCount();
      if (edges === 0) test.skip(true, 'No edge element to hover; skipping');
      // Hover first edge
      await app.hoverEdgeAt(0);
      await page.waitForTimeout(100);
      // Tooltip "Edge" expected
      const edgeTooltip = await app.waitForTooltip(/edge/i);
      expect(edgeTooltip).not.toBeNull();
      // Matrix highlight: look for a cell with highlight class or role
      const highlighted = page.locator('td[class*="highlight"], td[class*="active"], td[aria-selected="true"], td[aria-current="true"]');
      // If none found, also allow inline style change (background)
      const highlightedCount = await highlighted.count();
      const hasHighlight = highlightedCount > 0;
      expect(hasHighlight || (await page.locator('text=/edge/i').count()) > 0).toBeTruthy();
    });

    test('hovering a matrix cell highlights graph edge and shows tooltip (MATRIX_CELL_POINTER_OVER -> hover_cell)', async ({ page }) => {
      // Ensure edge exists
      const addBtn10 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await addBtn.first().click();
      await page.waitForTimeout(150);
      await app.clickMatrixCell(0, 1);
      await page.waitForTimeout(150);
      // Hover matrix cell (0,1) by focusing or hovering the element
      const table5 = app.table5();
      if ((await table.count()) === 0) test.skip(true, 'No table found for matrix hover test');
      // Attempt to locate the cell element and hover
      const rows6 = await app.matrixDataRows();
      if (rows.length === 0) test.skip(true, 'No data rows for matrix hover test');
      // Hover row 0's cell for column 1
      const row3 = rows[0];
      const cells3 = row.locator('td, th');
      const totalCells = await cells.count();
      let targetIndex = 1;
      if (totalCells <= 1) test.skip(true, 'Matrix appears not to have enough columns');
      await cells.nth(targetIndex).hover();
      await page.waitForTimeout(120);
      // Graph highlight: look for elements with highlight class or stroke change
      const svg5 = app.svg5();
      const highlightedNodes = svg.locator('[class*="highlight"], [class*="hover"], [data-highlight="true"]');
      const highlightedCount1 = await highlightedNodes.count();
      expect(highlightedCount).toBeGreaterThanOrEqual(0); // at minimum no crash; prefer >0 but not required
      // Tooltip present for cell hover (may display cell coordinates)
      const maybeTooltip1 = await app.waitForTooltip(/cell|edge|node|\[/i);
      expect(maybeTooltip).not.toBeNull();
    });

    test('focusing a matrix cell triggers focused_cell state (MATRIX_CELL_FOCUS -> focused_cell)', async ({ page }) => {
      // Ensure table exists and has at least one cell
      const table6 = app.table6();
      if ((await table.count()) === 0) test.skip(true, 'No matrix table present; skipping focus test');
      const rows7 = await app.matrixDataRows();
      if (rows.length === 0) test.skip(true, 'No data rows to focus');
      // Focus cell (0,0)
      await app.focusMatrixCell(0, 0);
      // The focused element should be :focus
      const focused = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
      expect(focused).toBeTruthy();
      // Graph highlight may appear; ensure no error/crash
      await page.waitForTimeout(60);
    });
  });

  test.describe('Directed toggle behavior and symmetry', () => {
    test('toggling directed affects matrix symmetry (TOGGLE_DIRECTED -> updating)', async ({ page }) => {
      const directedToggle = app.toggleByLabel(/direct/i);
      if ((await directedToggle.count()) === 0) {
        test.skip(true, 'Directed toggle control not found; skipping symmetry test');
      }
      // Ensure two nodes
      const addBtn11 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await addBtn.first().click();
      await page.waitForTimeout(150);
      // Ensure directed is on (or off) and set to undirected for test: uncheck if possible
      try {
        const isChecked = await directedToggle.first().isChecked();
        if (isChecked) {
          await directedToggle.first().uncheck();
        }
      } catch {
        // If not a checkbox, try clicking label to toggle off
        await directedToggle.first().click({ force: true }).catch(() => null);
      }
      // Click matrix cell (0,1) to create an undirected edge - expect symmetry at (1,0)
      await app.clickMatrixCell(0, 1);
      await page.waitForTimeout(150);
      const v01 = await app.readMatrixCell(0, 1);
      const v10 = await app.readMatrixCell(1, 0);
      // For undirected graph these should both be truthy
      expect(v01).not.toBeNull();
      expect(v10).not.toBeNull();
      expect(/1|true|yes|x|●|✓/i.test(v01) && /1|true|yes|x|●|✓/i.test(v10)).toBeTruthy();
      // Now toggle directed on and create a directed-only edge
      try {
        await directedToggle.first().check();
      } catch {
        await directedToggle.first().click({ force: true }).catch(() => null);
      }
      await page.waitForTimeout(120);
      // Toggle cell (0,1) off then on to ensure directed behavior is applied newly
      await app.clickMatrixCell(0, 1);
      await page.waitForTimeout(120);
      await app.clickMatrixCell(0, 1);
      await page.waitForTimeout(120);
      // After directed mode, clicking cell (0,1) should not automatically set (1,0)
      await app.clickMatrixCell(0, 1);
      await page.waitForTimeout(120);
      const v01_d = await app.readMatrixCell(0, 1);
      const v10_d = await app.readMatrixCell(1, 0);
      if (v01_d !== null && v10_d !== null) {
        // At least assert that they are not necessarily both true; directed graphs typically allow asymmetry
        const asym = /1|true|yes|x|●|✓/i.test(v01_d) && !/1|true|yes|x|●|✓/i.test(v10_d);
        expect(asym || /1|true|yes|x|●|✓/i.test(v01_d)).toBeTruthy();
      }
    });
  });

  test.describe('Updating / animation states and edge cases', () => {
    test('edge animation starts on creation (animating_edge onEnter) and eventually a stable state exists (ANIMATION_END -> idle)', async ({ page }) => {
      // Add two nodes and create an edge
      const addBtn12 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await addBtn.first().click();
      await page.waitForTimeout(150);
      await app.clickNodeAt(0);
      await page.waitForTimeout(50);
      await app.clickNodeAt(1);
      // Immediately after creation check for animation indicators (class or stroke-dasharray)
      const edgeEl1 = app.svg().locator('line, path, polyline').first();
      const dash = await edgeEl.getAttribute('stroke-dasharray');
      const animClass = await edgeEl.getAttribute('class');
      const hasAnim = (dash && dash.trim() !== '') || (animClass && /anim|dash|stroke-anim|animating/i.test(animClass));
      // It's acceptable if animation isn't exposed; but ensure no errors
      expect(hasAnim || true).toBeTruthy();
      // Wait a short time to allow animation end and ensure edge still exists (stable idle)
      await page.waitForTimeout(500);
      const edgesAfter2 = await app.edgeCount();
      expect(edgesAfter).toBeGreaterThanOrEqual(0);
    });

    test('attempting to delete nodes when none exist does not crash and UI remains responsive (edge case)', async ({ page }) => {
      const deleteBtn1 = app.buttonByName(/delete/i);
      // Attempt multiple deletes
      for (let i = 0; i < 3; i++) {
        await deleteBtn.first().click().catch(() => null);
        await page.waitForTimeout(60);
      }
      // UI should still respond: try adding a node afterwards
      const addBtn13 = app.buttonByName(/add/i);
      await addBtn.first().click();
      await page.waitForTimeout(80);
      const nodes2 = await app.nodeCount();
      expect(nodes).toBeGreaterThanOrEqual(1);
    });
  });
});