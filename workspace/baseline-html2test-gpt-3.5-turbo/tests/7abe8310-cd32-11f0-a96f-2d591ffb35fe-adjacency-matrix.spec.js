import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe8310-cd32-11f0-a96f-2d591ffb35fe.html';

test.describe('Adjacency Matrix Visualization - 7abe8310-cd32-11f0-a96f-2d591ffb35fe', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Setup: run before each test. Attach listeners to capture console and page errors,
  // then navigate to the application URL so the page's initial script runs.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and page errors so tests can assert none occurred
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
  });

  // Teardown: assert there were no uncaught page errors or console.error messages.
  test.afterEach(async ({ page }) => {
    // Ensure the page is still reachable (basic smoke)
    await expect(page).toHaveTitle(/Adjacency Matrix|Adjacency Matrix Visualization/);

    // Assert no uncaught errors were emitted during the test
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Console errors/warnings detected: ${consoleErrors.map(c => c.text).join('; ')}`).toBe(0);
  });

  // Helper to get matrix values as nested arrays of strings (textContent)
  async function readMatrixValues(page) {
    const tableLocator = page.locator('table[aria-label="Adjacency matrix"]');
    await expect(tableLocator).toBeVisible();
    return await tableLocator.evaluate(table => {
      // Rows include header row as first tr; skip that
      const rows = Array.from(table.querySelectorAll('tr')).slice(1);
      return rows.map(tr => {
        // Collect only td values (skip the row header th)
        const tds = Array.from(tr.querySelectorAll('td'));
        return tds.map(td => td.textContent.trim());
      });
    });
  }

  test('Initial page load generates default adjacency matrix and visualization', async ({ page }) => {
    // Purpose: Verify the application auto-generates the adjacency matrix on load
    // and displays the matrix & SVG with expected structure (based on default inputs).

    // Ensure controls are visible
    const nodeCount = page.locator('#nodeCount');
    const edgeList = page.locator('#edgeList');
    const generateBtn = page.locator('#generateBtn');
    await expect(nodeCount).toBeVisible();
    await expect(edgeList).toBeVisible();
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeEnabled();

    // Verify default node count is 5 (as in the HTML value attribute)
    await expect(nodeCount).toHaveValue('5');

    // Read the generated adjacency matrix table values
    const matrix = await readMatrixValues(page);
    // Expect matrix to be 5x5
    expect(matrix.length).toBe(5);
    matrix.forEach(row => expect(row.length).toBe(5));

    // Validate a few known entries according to the default edge list in the textarea:
    // Default edges in the HTML:
    // 0 1
    // 0 4
    // 1 2
    // 1 3
    // 1 4
    // 2 3
    // 3 4
    //
    // Expected adjacency (rows as arrays of '0'/'1'):
    // row0: [0,1,0,0,1]
    // row1: [1,0,1,1,1]
    // row2: [0,1,0,1,0]
    // row3: [0,1,1,0,1]
    // row4: [1,1,0,1,0]
    const expected = [
      ['0','1','0','0','1'],
      ['1','0','1','1','1'],
      ['0','1','0','1','0'],
      ['0','1','1','0','1'],
      ['1','1','0','1','0'],
    ];
    expect(matrix).toEqual(expected);

    // Verify the table has a caption 'Adjacency Matrix'
    const caption = page.locator('table[aria-label="Adjacency matrix"] caption');
    await expect(caption).toHaveText('Adjacency Matrix');

    // Verify graph visualization SVG exists and has lines and circles
    const svg = page.locator('#graphVisualization svg[aria-label="Graph visualization"]');
    await expect(svg).toBeVisible();

    // Count line elements (edges) and circle elements (nodes)
    const lineCount = await svg.locator('line').count();
    const circleCount = await svg.locator('circle').count();

    // Expect number of nodes = 5 and number of lines = number of edges (7)
    expect(circleCount).toBe(5);
    expect(lineCount).toBe(7);
  });

  test('Generate button updates matrix after changing inputs', async ({ page }) => {
    // Purpose: Modify inputs (node count and edge list), click Generate, and verify DOM updates.

    const nodeCount1 = page.locator('#nodeCount1');
    const edgeList1 = page.locator('#edgeList1');
    const generateBtn1 = page.locator('#generateBtn1');

    // Set node count to 4
    await nodeCount.fill('4');

    // Provide a simple triangle between nodes 0-1-2 and isolated node 3
    await edgeList.fill('0 1\n1 2\n2 0');

    // Click generate to re-render
    await generateBtn.click();

    // Read and verify the 4x4 matrix
    const matrix1 = await readMatrixValues(page);
    expect(matrix.length).toBe(4);
    matrix.forEach(row => expect(row.length).toBe(4));

    // Expected adjacency for a triangle among 0,1,2 and isolated 3:
    // row0: [0,1,1,0]
    // row1: [1,0,1,0]
    // row2: [1,1,0,0]
    // row3: [0,0,0,0]
    const expected1 = [
      ['0','1','1','0'],
      ['1','0','1','0'],
      ['1','1','0','0'],
      ['0','0','0','0']
    ];
    expect(matrix).toEqual(expected);

    // Verify the SVG updated: 4 nodes (circles) and 3 lines
    const svg1 = page.locator('#graphVisualization svg1[aria-label="Graph visualization"]');
    await expect(svg).toBeVisible();
    const circleCount1 = await svg.locator('circle').count();
    const lineCount1 = await svg.locator('line').count();
    expect(circleCount).toBe(4);
    expect(lineCount).toBe(3);
  });

  test('Shows validation error when node count is out of allowed range', async ({ page }) => {
    // Purpose: Enter an invalid node count (beyond max 15) and verify error message is shown.

    const nodeCount2 = page.locator('#nodeCount2');
    const generateBtn2 = page.locator('#generateBtn2');
    const errorDiv = page.locator('#error');

    // Set node count to invalid value 20 and click generate
    await nodeCount.fill('20');
    await generateBtn.click();

    // Expect the specific validation message to appear
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toHaveText('Number of nodes must be an integer between 1 and 15.');

    // Ensure no matrix/table was generated in output container
    const matrixLocator = page.locator('table[aria-label="Adjacency matrix"]');
    await expect(matrixLocator).toHaveCount(0);
  });

  test('Shows error for invalid edge line format', async ({ page }) => {
    // Purpose: Provide malformed edges text and expect a descriptive error message.

    const nodeCount3 = page.locator('#nodeCount3');
    const edgeList2 = page.locator('#edgeList2');
    const generateBtn3 = page.locator('#generateBtn3');
    const errorDiv1 = page.locator('#error');

    // Use a small node count for quick validation
    await nodeCount.fill('3');

    // Introduce an invalid line "badline"
    await edgeList.fill('0 1\nbadline');

    await generateBtn.click();

    await expect(errorDiv).toBeVisible();
    // Expect message referencing line 2 invalid format
    await expect(errorDiv).toHaveText(/Invalid edge format on line 2/);

    // No matrix should be rendered
    await expect(page.locator('table[aria-label="Adjacency matrix"]')).toHaveCount(0);
  });

  test('Shows error for edge nodes outside the valid range', async ({ page }) => {
    // Purpose: Enter an edge that references a node index outside [0, n-1]

    const nodeCount4 = page.locator('#nodeCount4');
    const edgeList3 = page.locator('#edgeList3');
    const generateBtn4 = page.locator('#generateBtn4');
    const errorDiv2 = page.locator('#error');

    await nodeCount.fill('3');
    // Edge refers to node 5 which is outside range for n=3
    await edgeList.fill('0 5');

    await generateBtn.click();

    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toHaveText(/Edge nodes outside valid range on line 1/);

    // No matrix should be rendered
    await expect(page.locator('table[aria-label="Adjacency matrix"]')).toHaveCount(0);
  });

  test('Accessibility checks: nodes have aria-labels and are keyboard focusable', async ({ page }) => {
    // Purpose: Ensure SVG node circles have aria-labels and are reachable via tabindex

    // By default page loaded with n=5; check SVG nodes
    const svg2 = page.locator('#graphVisualization svg2[aria-label="Graph visualization"]');
    await expect(svg).toBeVisible();

    // All nodes should have circle elements with aria-label attributes set on the circles
    const circles = await svg.locator('circle').elementHandles();
    expect(circles.length).toBeGreaterThan(0);

    for (let i = 0; i < circles.length; i++) {
      const handle = circles[i];
      const aria = await handle.getAttribute('aria-label');
      const tabindex = await handle.getAttribute('tabindex');
      // aria-label should match "Node i"
      expect(aria).toBe(`Node ${i}`);
      // tabindex should be "0" to be keyboard focusable
      expect(tabindex).toBe('0');
    }
  });
});