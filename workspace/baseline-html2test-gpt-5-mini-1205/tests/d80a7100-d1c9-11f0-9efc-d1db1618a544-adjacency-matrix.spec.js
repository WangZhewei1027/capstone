import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a7100-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Adjacency Matrix Interactive Demo (d80a7100-...-adjacency-matrix)', () => {
  // Arrays to capture runtime diagnostics for each test
  let consoleMessages = [];
  let pageErrors = [];
  let dialogsSeen = [];

  // Setup a fresh page for each test and attach listeners for console, pageerror and dialogs.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    dialogsSeen = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      // Capture error messages thrown by the page (ReferenceError, TypeError, etc.)
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Central dialog handler to accept/dismiss prompts/confirms/alerts deterministically.
    page.on('dialog', async dialog => {
      dialogsSeen.push({ type: dialog.type(), message: dialog.message() });
      // Provide default responses depending on the prompt/confirm content.
      const msg = dialog.message();

      try {
        if (dialog.type() === 'prompt') {
          // Many prompts in the app ask for number of nodes, edge probability, or weight.
          if (msg.toLowerCase().includes('number of nodes')) {
            await dialog.accept('4'); // create a small random graph when requested
            return;
          }
          if (msg.toLowerCase().includes('edge probability')) {
            await dialog.accept('0.2');
            return;
          }
          if (msg.toLowerCase().includes('enter weight')) {
            await dialog.accept('3'); // provide a numeric weight for weighted edge edits
            return;
          }
          // Generic accept with default
          await dialog.accept('1');
          return;
        } else if (dialog.type() === 'confirm') {
          // For confirmations, accept by default unless message indicates we want to cancel
          // (tests will control specific cancel scenarios explicitly if needed)
          await dialog.accept();
          return;
        } else {
          // alert() - just accept
          await dialog.accept();
          return;
        }
      } catch (e) {
        // If anything goes wrong interacting with dialog, record it in consoleMessages
        consoleMessages.push({ type: 'handler-error', text: String(e) });
      }
    });

    await page.goto(APP_URL);
    // Wait for the seeded content to render: the node count element should be visible.
    await expect(page.locator('#nodeCount')).toBeVisible();
  });

  test.afterEach(async ({ }, testInfo) => {
    // After each test, assert there were no unexpected runtime page errors.
    // This is an important diagnostic to ensure the page did not throw uncaught exceptions.
    expect(pageErrors, `Page errors were detected (console logs: ${JSON.stringify(consoleMessages.slice(0,5))})`).toEqual([]);
  });

  test.describe('Initial load and basic DOM expectations', () => {
    test('loads with seeded graph and shows 5 nodes and matrix', async ({ page }) => {
      // Verify the seeded node count shown in the UI (seed creates 5 nodes: A..E)
      const nodeCount = await page.locator('#nodeCount').innerText();
      expect(nodeCount.trim()).toBe('5');

      // The matrix should be rendered as a table inside #matrixWrap
      const matrixTable = page.locator('#matrixWrap table.matrix');
      await expect(matrixTable).toBeVisible();

      // Headers (skip the corner cell) should reflect the seeded labels A..E
      const headerCells = matrixTable.locator('thead th');
      // first header is corner, so there should be 6 ths in the header row (corner + 5 nodes)
      expect(await headerCells.count()).toBe(6);
      const labels = [];
      for (let i = 1; i < 6; i++) {
        labels.push((await headerCells.nth(i).innerText()).trim());
      }
      expect(labels).toEqual(['A', 'B', 'C', 'D', 'E']);

      // SVG should contain 5 node groups for the seeded nodes
      const svgNodes = page.locator('svg#svgCanvas g.node-g');
      await expect(svgNodes).toHaveCount(5);

      // There should be matrix body rows equal to the node count (5)
      const bodyRows = page.locator('#matrixWrap table.matrix tbody tr');
      await expect(bodyRows).toHaveCount(5);
    });

    test('no uncaught page errors on initial load', async ({ page }) => {
      // pageErrors captured in beforeEach/afterEach; assert none present
      expect(pageErrors.length).toBe(0);
      // Also sanity check that the console did not emit error-level messages
      const errorConsole = consoleMessages.filter(c => c.type === 'error');
      expect(errorConsole.length).toBe(0);
    });
  });

  test.describe('Control interactions and IO', () => {
    test('Add node button increases node count and updates DOM', async ({ page }) => {
      // Get initial node count
      const initial = Number((await page.locator('#nodeCount').innerText()).trim());
      await page.click('#addNodeBtn');
      // After clicking add, nodeCount should increment by 1
      await expect(page.locator('#nodeCount')).toHaveText(String(initial + 1));
      // SVG nodes and matrix rows should reflect the new count
      await expect(page.locator('svg#svgCanvas g.node-g')).toHaveCount(initial + 1);
      await expect(page.locator('#matrixWrap table.matrix tbody tr')).toHaveCount(initial + 1);
    });

    test('Export JSON writes graph to textarea and triggers an alert', async ({ page }) => {
      // Clear any previous dialogs captured
      dialogsSeen.length = 0;
      // Click export - this triggers exportJSON which sets textarea and calls alert
      await page.click('#exportBtn');
      // Expect that an alert dialog was seen
      const alertDialog = dialogsSeen.find(d => d.type === 'alert' || d.type === 'alert' || (d.type === 'dialog' && d.message.includes('Export')));
      expect(dialogsSeen.length).toBeGreaterThanOrEqual(1);
      // Ensure the ioArea textarea contains valid JSON with nodes and matrix
      const ioValue = await page.locator('#ioArea').inputValue();
      expect(ioValue.trim().length).toBeGreaterThan(0);
      const parsed = JSON.parse(ioValue);
      expect(parsed).toHaveProperty('nodes');
      expect(parsed).toHaveProperty('matrix');
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(Array.isArray(parsed.matrix)).toBe(true);
    });

    test('Import JSON updates the graph when valid JSON is provided', async ({ page }) => {
      // Prepare a small 3-node graph JSON
      const sample = {
        nodes: [
          { id: 'n1', label: 'X', x: 50, y: 50 },
          { id: 'n2', label: 'Y', x: 150, y: 150 },
          { id: 'n3', label: 'Z', x: 250, y: 250 }
        ],
        matrix: [
          [0,1,0],
          [0,0,1],
          [1,0,0]
        ],
        directed: true,
        weighted: false
      };
      // Inject JSON into textarea and click import
      await page.fill('#ioArea', JSON.stringify(sample, null, 2));
      dialogsSeen.length = 0;
      await page.click('#importBtn');
      // importJSON shows an alert confirming import; ensure we saw it
      expect(dialogsSeen.length).toBeGreaterThanOrEqual(1);
      // The UI node count should update to 3
      await expect(page.locator('#nodeCount')).toHaveText('3');
      // Matrix rows should be 3
      await expect(page.locator('#matrixWrap table.matrix tbody tr')).toHaveCount(3);
      // SVG nodes should be 3
      await expect(page.locator('svg#svgCanvas g.node-g')).toHaveCount(3);
      // Validate that header labels reflect the imported labels
      const headers = page.locator('#matrixWrap table.matrix thead th');
      const headerLabels = [];
      for (let i = 1; i <= 3; i++) headerLabels.push((await headers.nth(i).innerText()).trim());
      expect(headerLabels).toEqual(['X', 'Y', 'Z']);
    });

    test('Random graph prompts for inputs and creates graph of requested size', async ({ page }) => {
      // Clear dialogs seen
      dialogsSeen.length = 0;
      // Click Random graph; our dialog handler will respond with 4 and 0.2 as configured
      await page.click('#randomBtn');
      // The two prompts should have been captured among dialogsSeen
      const promptMessages = dialogsSeen.filter(d => d.type === 'prompt');
      expect(promptMessages.length).toBeGreaterThanOrEqual(1);
      // After the prompts and graph generation, nodeCount should be 4
      await expect(page.locator('#nodeCount')).toHaveText('4');
      // Validate matrix/table rows equal 4
      await expect(page.locator('#matrixWrap table.matrix tbody tr')).toHaveCount(4);
    });

    test('Clear button clears graph when confirmed', async ({ page }) => {
      // Ensure there are nodes initially
      await expect(page.locator('#nodeCount')).toHaveText(/\d+/);
      // Click clear and our dialog handler will accept the confirmation
      await page.click('#clearBtn');
      // After confirmation accepted, node count should be 0
      await expect(page.locator('#nodeCount')).toHaveText('0');
      // Matrix wrap should show the "No nodes yet" message
      await expect(page.locator('#matrixWrap')).toContainText('No nodes yet');
    });
  });

  test.describe('Matrix and SVG interactions', () => {
    test('Clicking two nodes in add mode creates an edge and updates matrix and SVG', async ({ page }) => {
      // Ensure in 'add' mode
      await page.selectOption('#mode', 'add');
      // Ensure directed is unchecked (default)
      await page.locator('#directed').uncheck().catch(()=>{});

      // Ensure there are at least 2 nodes to click
      const nodes = page.locator('svg#svgCanvas g.node-g');
      const count = await nodes.count();
      expect(count).toBeGreaterThanOrEqual(2);

      // Choose first two nodes
      const first = nodes.nth(0);
      const second = nodes.nth(1);

      // Click first node - this should set lastClickedNode and highlight its row header
      await first.click();
      // The corresponding row header gets a background style inline (highlightNodeHeader)
      const headerRowTh = page.locator(`#matrixWrap table.matrix tbody tr:nth-child(1) th`);
      // Wait for style attribute to be applied (non-empty)
      await page.waitForFunction(selector => {
        const el = document.querySelector(selector);
        return el && el.style && el.style.background && el.style.background.length > 0;
      }, {}, '#matrixWrap table.matrix tbody tr:nth-child(1) th');

      const styleVal = await headerRowTh.getAttribute('style');
      expect(styleVal).toBeTruthy();

      // Click the second node to create/toggle the edge from first->second
      await second.click();

      // After creation, the matrix cell [0][1] should be '1' (or a numeric weight if weighted)
      const cell01 = page.locator('#matrixWrap table.matrix td.matrix-cell[data-i="0"][data-j="1"]');
      await expect(cell01).toHaveText(/^\d+$/);

      // Verify that the SVG now contains a path element representing the edge (edge-line)
      const edgePaths = page.locator('svg#svgCanvas path.edge-line');
      // There should be at least one edge path present
      await expect(edgePaths).toHaveCountGreaterThan(0);
    });

    test('Clicking a matrix cell toggles an undirected edge symmetrically', async ({ page }) => {
      // For this test ensure directed is unchecked (undirected) and weighted is unchecked
      await page.locator('#directed').uncheck().catch(()=>{});
      await page.locator('#weighted').uncheck().catch(()=>{});

      // Use cell [0][1] - read current value
      const cell01 = page.locator('#matrixWrap table.matrix td.matrix-cell[data-i="0"][data-j="1"]');
      const cell10 = page.locator('#matrixWrap table.matrix td.matrix-cell[data-i="1"][data-j="0"]');
      const before01 = (await cell01.innerText()).trim();
      const before10 = (await cell10.innerText()).trim();

      // Click the cell to toggle
      await cell01.click();

      // After toggling, both symmetric cells should be equal and reflect toggled value
      const after01 = (await cell01.innerText()).trim();
      const after10 = (await cell10.innerText()).trim();
      expect(after01).toBe(after10);
      // Value should have changed from before
      expect(after01).not.toBe(before01);
    });

    test('Hovering over a column header highlights the column and associated SVG node', async ({ page }) => {
      // Hover over the 3rd column header (index 2 in zero-based nodes; th position is index+1 because of corner)
      const headerTh = page.locator('#matrixWrap table.matrix thead th').nth(3); // nth(0)=corner, nth(1)=col0, nth(2)=col1, nth(3)=col2
      await headerTh.hover();

      // The column header should get the 'col-hover' class (added in highlightColumn)
      await expect(headerTh).toHaveClass(/col-hover/);

      // Also the corresponding SVG node should have changed stroke to the highlight color.
      // The highlightSVGNode sets stroke to rgba(79,209,197,0.95) for the matched node circle.
      // We will check the circle stroke attribute for node index 2.
      const targetNodeCircle = page.locator('svg#svgCanvas g.node-g').nth(2).locator('circle').first();
      // Wait for attribute to reflect highlight stroke (may be applied to either first or second circle in group)
      await page.waitForFunction(selector => {
        const el = document.querySelector(selector);
        return el && el.getAttribute && (el.getAttribute('stroke') === 'rgba(79,209,197,0.95)');
      }, {}, 'svg#svgCanvas g.node-g:nth-child(3) circle');

      const stroke = await targetNodeCircle.getAttribute('stroke');
      expect(stroke).toBe('rgba(79,209,197,0.95)');
    });
  });

  test.describe('Transformations and weighted interactions', () => {
    test('Transpose flips matrix entries (matrix[i][j] moves to matrix[j][i])', async ({ page }) => {
      // Read a sample cell value before transpose (0,1)
      const cell01 = page.locator('#matrixWrap table.matrix td.matrix-cell[data-i="0"][data-j="1"]');
      const cell10 = page.locator('#matrixWrap table.matrix td.matrix-cell[data-i="1"][data-j="0"]');
      const before01 = (await cell01.innerText()).trim();
      const before10 = (await cell10.innerText()).trim();

      // Click transpose button
      await page.click('#transposeBtn');

      // After transpose, the previous [0][1] should now appear at [1][0]
      const after01 = (await cell01.innerText()).trim();
      const after10 = (await cell10.innerText()).trim();

      expect(after10).toBe(before01);
      expect(after01).toBe(before10);
    });

    test('Complement toggles non-diagonal edges when confirmed', async ({ page }) => {
      // Capture some sample cells for later comparison
      const idxPairs = [
        ['0', '1'],
        ['0', '2'],
        ['1', '2']
      ];
      const before = {};
      for (const [i, j] of idxPairs) {
        const val = (await page.locator(`#matrixWrap table.matrix td.matrix-cell[data-i="${i}"][data-j="${j}"]`).innerText()).trim();
        before[`${i}-${j}`] = val;
      }

      // Click complement and our dialog handler will accept confirmation
      await page.click('#complementBtn');

      // After complement, the non-diagonal entries should have been toggled (0->1 or 1->0)
      for (const [i, j] of idxPairs) {
        const after = (await page.locator(`#matrixWrap table.matrix td.matrix-cell[data-i="${i}"][data-j="${j}"]`).innerText()).trim();
        expect(after).not.toBe(before[`${i}-${j}`]);
      }
    });

    test('Editing a matrix cell in weighted mode uses prompt and sets the specified weight', async ({ page }) => {
      // Enable weighted checkbox
      await page.locator('#weighted').check();

      // Choose cell [0][1]; current value will be replaced by prompt result handled by dialog handler ('3')
      const cell01 = page.locator('#matrixWrap table.matrix td.matrix-cell[data-i="0"][data-j="1"]');
      const beforeValue = (await cell01.innerText()).trim();

      // Click cell to trigger prompt (dialog handler will provide '3')
      await cell01.click();

      // After prompt accepted, cell text should be '3' (as our dialog handler provided)
      await expect(cell01).toHaveText('3');

      // For undirected graphs (default directed unchecked), symmetry should hold
      const cell10 = page.locator('#matrixWrap table.matrix td.matrix-cell[data-i="1"][data-j="0"]');
      const after10 = (await cell10.innerText()).trim();
      // Either symmetric or direct depending on directed checkbox; default is undirected, so should be '3'
      expect(after10).toBe('3');

      // Reset weighted for other tests
      await page.locator('#weighted').uncheck().catch(()=>{});
    });
  });

  test.describe('Header selection and alerts', () => {
    test('Clicking a row header selects that node as source and shows an alert', async ({ page }) => {
      // Click the first row header - this triggers selectRow which shows an alert and sets lastClickedNode
      dialogsSeen.length = 0;
      await page.locator('#matrixWrap table.matrix tbody tr th').first().click();
      // There should have been an alert dialog visible (selectRow uses alert)
      expect(dialogsSeen.length).toBeGreaterThanOrEqual(1);
      const lastDialog = dialogsSeen[dialogsSeen.length - 1];
      expect(lastDialog.message).toContain('Selected node');
    });
  });
});