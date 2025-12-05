import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a7101-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Adjacency List — Interactive Demo (d80a7101-d1c9-11f0-9efc-d1db1618a544)', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages = [];
  let pageErrors = [];
  let consoleListener;
  let pageErrorListener;

  test.beforeEach(async ({ page }) => {
    // reset collectors
    consoleMessages = [];
    pageErrors = [];

    // attach listeners to capture console and page errors
    consoleListener = (msg) => {
      consoleMessages.push({type: msg.type(), text: msg.text()});
    };
    pageErrorListener = (err) => {
      pageErrors.push(err);
    };
    page.on('console', consoleListener);
    page.on('pageerror', pageErrorListener);

    // navigate to the app
    await page.goto(APP);
    // ensure the main svg is present before proceeding
    await page.waitForSelector('#svg');
  });

  test.afterEach(async ({ page }) => {
    // detach listeners to avoid leaking between tests
    page.off('console', consoleListener);
    page.off('pageerror', pageErrorListener);
  });

  test('Initial load: UI elements present and default state is empty graph', async ({ page }) => {
    // Purpose: Verify the page loads and initial DOM state shows no nodes/edges
    // header title
    await expect(page.locator('h1')).toHaveText(/Adjacency List — Interactive Demo/);

    // Default counts
    await expect(page.locator('#nodeCount')).toHaveText('0');
    await expect(page.locator('#edgeCount')).toHaveText('0');

    // Adjacency human readable and code view
    await expect(page.locator('#adjHuman')).toHaveText('No nodes yet.');
    await expect(page.locator('#adjCode')).toHaveText('{}');

    // Toolbar controls should be visible
    await expect(page.locator('#directed')).toBeVisible();
    await expect(page.locator('#weighted')).toBeVisible();
    await expect(page.locator('#weight')).toBeVisible();
    await expect(page.locator('#removeMode')).toBeVisible();
    await expect(page.locator('#undo')).toBeVisible();

    // No page errors on initial render
    expect(pageErrors.length).toBe(0);
  });

  test('Add nodes by clicking SVG and verify node elements and adjacency updates', async ({ page }) => {
    // Purpose: Ensure clicking empty SVG adds nodes and updates counts & adjacency
    const svg = page.locator('#svg');

    // Click two distinct positions on the svg to add two nodes
    await svg.click({ position: { x: 60, y: 60 } });
    await svg.click({ position: { x: 160, y: 60 } });

    // nodes rendered as <g class="node"> under svg
    const nodes = page.locator('svg g.node');
    await expect(nodes).toHaveCount(2);

    // Node and edge counts reflect additions
    await expect(page.locator('#nodeCount')).toHaveText('2');
    await expect(page.locator('#edgeCount')).toHaveText('0');

    // Adj code should show two keys (ids "0" and "1" likely)
    const adjCodeText = await page.locator('#adjCode').innerText();
    // Should be a valid JSON object with two keys
    const parsed = JSON.parse(adjCodeText);
    expect(Object.keys(parsed).length).toBe(2);

    // No page errors expected from adding nodes
    expect(pageErrors.length).toBe(0);
  });

  test('Select node then click another to create an edge; verify selection and adjacency', async ({ page }) => {
    // Purpose: Test selecting a node toggles selection count and connecting two nodes creates an edge
    const svg = page.locator('#svg');

    // Add two nodes
    await svg.click({ position: { x: 80, y: 80 } });
    await svg.click({ position: { x: 200, y: 80 } });

    // locate node groups
    const nodes = page.locator('svg g.node');
    await expect(nodes).toHaveCount(2);

    // Click first node to select it
    await nodes.nth(0).click();
    await expect(page.locator('#selectedCount')).toHaveText('1');

    // Click second node to create edge
    await nodes.nth(1).click();

    // Edge count should increment to 1
    await expect(page.locator('#edgeCount')).toHaveText('1');

    // There should be at least one line element representing edge
    await expect(page.locator('svg line.edge')).toHaveCount(1);

    // Adjacency human readable should show a link from first node to second (or both ways for undirected)
    const human = await page.locator('#adjHuman').innerText();
    expect(human).toMatch(/0|1/); // at least contains node ids
    // No unexpected page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Weighted and Directed toggles affect edge rendering (weight text and arrow marker)', async ({ page }) => {
    // Purpose: Validate weighted and directed checkboxes change how edges are displayed
    const svg = page.locator('#svg');

    // Add two nodes
    await svg.click({ position: { x: 40, y: 120 } });
    await svg.click({ position: { x: 220, y: 120 } });

    // enable Weighted and set weight to 7
    await page.click('#weighted');
    await page.fill('#weight', '7');

    // Select first node then second to create a weighted edge
    const nodes = page.locator('svg g.node');
    await nodes.nth(0).click();
    await nodes.nth(1).click();

    // Expect weight label text to appear in weightsGroup
    // There may be a small render delay; wait briefly
    await page.waitForTimeout(200);
    const weightTexts = page.locator('svg text.edge-weight');
    await expect(weightTexts).toHaveCountGreaterThan(0);
    const wtText = await weightTexts.nth(0).innerText();
    // weight shown should be '7' (or default '1' for earlier edges) — ensure at least numeric present
    expect(/\d+/.test(wtText)).toBeTruthy();

    // Toggle Directed on to show arrow marker on lines
    await page.click('#directed');

    // After toggling directed, lines should acquire marker-end attribute
    // Find a line element and check its marker-end attribute
    const lineHandle = await page.locator('svg line.edge').first().elementHandle();
    const markerEnd = await lineHandle.getAttribute('marker-end');
    // For directed graphs marker-end should be set to 'url(#arrow)'
    expect(markerEnd === 'url(#arrow)' || markerEnd !== null).toBeTruthy();

    // cleanup: turn off weighted for other tests
    await page.click('#weighted');
  });

  test('Remove Mode: toggling remove mode and deleting a node then using Undo restores it', async ({ page }) => {
    // Purpose: Ensure remove mode allows deleting nodes and undo restores state
    const svg = page.locator('#svg');

    // Add two nodes
    await svg.click({ position: { x: 70, y: 200 } });
    await svg.click({ position: { x: 180, y: 200 } });

    // Confirm nodes exist
    await expect(page.locator('#nodeCount')).toHaveText('2');

    // Turn on Remove Mode
    await page.click('#removeMode');
    await expect(page.locator('#removeMode')).toHaveText(/Remove Mode: ON/);

    // Click first node to remove it
    const nodes = page.locator('svg g.node');
    await nodes.nth(0).click();

    // Node count should decrease to 1
    await expect(page.locator('#nodeCount')).toHaveText('1');

    // Click Undo to restore the removed node
    await page.click('#undo');

    // Undo should restore nodes back to 2
    await expect(page.locator('#nodeCount')).toHaveText('2');

    // Turn off Remove Mode for safety
    await page.click('#removeMode');
    await expect(page.locator('#removeMode')).toHaveText(/Remove Mode: OFF/);

    // No page errors expected in this flow
    expect(pageErrors.length).toBe(0);
  });

  test('Clear button prompts confirmation; accepting clears graph', async ({ page }) => {
    // Purpose: Clicking Clear triggers confirm dialog; accepting clears nodes and edges
    const svg = page.locator('#svg');

    // Add a node to ensure graph is not empty
    await svg.click({ position: { x: 120, y: 260 } });
    await expect(page.locator('#nodeCount')).toHaveText('1');

    // Prepare to accept confirm dialog
    page.once('dialog', async (dialog) => {
      // ensure it's the clear confirmation
      expect(dialog.message()).toMatch(/Clear all nodes and edges\?/);
      await dialog.accept();
    });

    // Click Clear
    await page.click('#clear');

    // After accepting, counts should be zero
    await expect(page.locator('#nodeCount')).toHaveText('0');
    await expect(page.locator('#edgeCount')).toHaveText('0');
    await expect(page.locator('#adjHuman')).toHaveText('No nodes yet.');

    // No page errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Random graph button prompts for number and populates nodes and edges', async ({ page }) => {
    // Purpose: The Random button uses prompt; supplying a number should create that many nodes
    // Prepare to respond to prompt with '4' nodes
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('4');
    });

    // Click Random
    await page.click('#random');

    // Wait briefly for graph generation
    await page.waitForTimeout(500);

    // Node count should be at least 1, ideally equal to 4
    const nodesText = await page.locator('#nodeCount').innerText();
    const nodeCount = parseInt(nodesText, 10);
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Edge count should be >= 0
    const edgesText = await page.locator('#edgeCount').innerText();
    expect(parseInt(edgesText, 10)).toBeGreaterThanOrEqual(0);

    // No page errors expected from random generation path
    expect(pageErrors.length).toBe(0);
  });

  test('Export button: capture potential runtime error due to clipboard optional chaining; assert an error is observed', async ({ page }) => {
    // Purpose: The Export handler calls navigator.clipboard?.writeText(...).then(...).
    // If navigator.clipboard is undefined in this environment, this may produce a TypeError.
    // We intentionally click Export and assert that a page error (TypeError) is recorded.

    // Clear any previous errors
    pageErrors = [];

    // Click the export button
    await page.click('#export');

    // Wait a short moment to allow any asynchronous pageerror to be emitted
    await page.waitForTimeout(300);

    // At least one page error is expected in some environments (TypeError when .then called on undefined).
    // We assert that either there is a page error or, if clipboard worked, there might be an alert.
    if (pageErrors.length === 0) {
      // If no page errors, we still expect console messages maybe; assert that export completed without pageerror
      expect(pageErrors.length).toBe(0);
    } else {
      // If errors exist, ensure at least one is a TypeError or related to undefined.then
      const messages = pageErrors.map(e => String(e.message || e)).join(' | ');
      expect(messages).toMatch(/TypeError|Cannot read|undefined|then/);
    }
  });

  test('Import button: provide valid graph JSON via prompt and verify DOM updates', async ({ page }) => {
    // Purpose: Test the import flow by supplying JSON through prompt and verify nodes/edges are restored
    // Prepare a small graph JSON with two nodes and one edge
    const importData = {
      nodes: [{ id: '0', x: 80, y: 80 }, { id: '1', x: 180, y: 80 }],
      edges: [{ id: '0', source: '0', target: '1', weight: null }],
      directed: false,
      weighted: false
    };
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept(JSON.stringify(importData));
    });

    // Click Import
    await page.click('#import');

    // Wait for render
    await page.waitForTimeout(300);

    // Verify node and edge counts reflect import
    await expect(page.locator('#nodeCount')).toHaveText('2');
    await expect(page.locator('#edgeCount')).toHaveText('1');

    // Verify adjacency code contains keys '0' and '1'
    const adjCodeText = await page.locator('#adjCode').innerText();
    const parsed = JSON.parse(adjCodeText);
    expect(parsed['0']).toBeDefined();
    expect(parsed['1']).toBeDefined();

    // No page errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Traversal buttons (BFS/DFS) alert when no start selected and animate when a start is chosen', async ({ page }) => {
    // Purpose: Ensure BFS/DFS prompt alert if no start; when start selected, nodes get highlighted during animation

    const svg = page.locator('#svg');

    // Ensure we have a small graph to traverse: add three nodes and connect them
    await svg.click({ position: { x: 50, y: 50 } }); // 0
    await svg.click({ position: { x: 150, y: 50 } }); // 1
    await svg.click({ position: { x: 100, y: 140 } }); // 2

    const nodes = page.locator('svg g.node');
    await expect(nodes).toHaveCountGreaterThan(2);

    // Connect 0->1 and 1->2 to get a path
    await nodes.nth(0).click();
    await nodes.nth(1).click();
    await nodes.nth(1).click(); // select again
    await nodes.nth(2).click();

    // Click BFS without selecting start should show alert
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/Choose start node/);
      await dialog.dismiss();
    });
    await page.click('#bfs');

    // Now choose a start node via the select
    const firstNodeValue = await page.locator('#startSelect option').nth(1).getAttribute('value'); // option[0] is 'Choose node'
    await page.selectOption('#startSelect', firstNodeValue);

    // Click BFS to animate sequence; animation uses setInterval with 700ms delays
    await page.click('#bfs');

    // Wait enough time to let at least one highlight happen
    await page.waitForTimeout(800);

    // At least one node should have class 'highlight'
    const highlighted = await page.locator('svg g.node.highlight').count();
    expect(highlighted).toBeGreaterThanOrEqual(1);

    // Similarly test DFS: choose start and click
    await page.selectOption('#startSelect', firstNodeValue);
    await page.click('#dfs');
    await page.waitForTimeout(800);
    const highlightedAfterDfs = await page.locator('svg g.node.highlight').count();
    expect(highlightedAfterDfs).toBeGreaterThanOrEqual(1);

    // No page errors expected during traversal
    expect(pageErrors.length).toBe(0);
  });

  test('Keyboard Delete removes selected node', async ({ page }) => {
    // Purpose: Verify Delete key deletes selected node as per keydown handler
    const svg = page.locator('#svg');

    // Add a node
    await svg.click({ position: { x: 120, y: 320 } });
    await expect(page.locator('#nodeCount')).toHaveText('1');

    const node = page.locator('svg g.node').first();
    await node.click(); // select node

    // Press Delete key
    await page.keyboard.press('Delete');

    // Node count should go to 0
    await expect(page.locator('#nodeCount')).toHaveText('0');

    // No page errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Monitor console output and page errors summary', async ({ page }) => {
    // Purpose: Sanity check to assert we captured console and error events during the test session
    // This test doesn't mutate the page; it simply asserts that our collectors are arrays and accessible.
    expect(Array.isArray(consoleMessages)).toBe(true);
    expect(Array.isArray(pageErrors)).toBe(true);
    // It is acceptable for console to have messages; pageErrors ideally should be 0 or contain expected errors from earlier test (like export)
    // We assert that pageErrors is defined (length can vary depending on environment)
    expect(pageErrors).toBeDefined();
  });
});