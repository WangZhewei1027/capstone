import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccc7c51-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object for the BFS Visualization page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.svg = page.locator('#graph');
    this.startInput = page.locator('#startNodeLabel');
    this.startBtn = page.locator('#startBFS');
    this.resetBtn = page.locator('#resetGraph');
    this.logEl = page.locator('#log');
    this.nodeGroup = (id) => page.locator(`g.node-group[aria-label="Node ${id}"]`);
    this.nodeCircle = (id) => page.locator(`circle[data-node="${id}"]`);
    this.edgeByKey = (u, v) => page.locator(`line[data-edge="${u}-${v}"]`);
    this.edgeHighlighted = () => page.locator('line.edge.highlighted');
  }

  // Select a node by clicking its group element
  async selectNodeByClick(id) {
    await this.nodeGroup(id).click();
  }

  // Select a node by focusing the group and pressing Enter
  async selectNodeByKey(id) {
    const group = this.nodeGroup(id);
    await group.focus();
    await this.page.keyboard.press('Enter');
  }

  // Press the Start BFS button
  async pressStart() {
    await this.startBtn.click();
  }

  // Press the Reset button
  async pressReset() {
    await this.resetBtn.click();
  }

  // Get the textual log content
  async getLogText() {
    return (await this.logEl.textContent()) || '';
  }

  // Return an array of log lines (trimmed)
  async getLogLines() {
    const text = await this.getLogText();
    return text.split('\n').map(l => l.trim()).filter(l => l.length);
  }

  // Wait until the log contains a substring (with timeout)
  async waitForLogContains(substring, timeout = 20000) {
    await this.page.waitForFunction(
      (sel, sub) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        return el.textContent.includes(sub);
      },
      '#log',
      substring,
      { timeout }
    );
  }

  // Wait until BFS complete message appears
  async waitForBFSComplete(timeout = 30000) {
    await this.waitForLogContains('BFS Complete!', timeout);
  }

  // Return whether start button is disabled
  async isStartDisabled() {
    return await this.startBtn.isDisabled();
  }

  // Return whether reset button is disabled
  async isResetDisabled() {
    return await this.resetBtn.isDisabled();
  }

  // Get start input value
  async getStartInputValue() {
    return await this.startInput.inputValue();
  }

  // Get attributes for node circle
  async getNodeAttributes(id) {
    const circle = this.nodeCircle(id);
    const classAttr = await circle.getAttribute('class') || '';
    const stroke = await circle.getAttribute('stroke');
    const strokeWidth = await circle.getAttribute('stroke-width');
    const fill = await circle.getAttribute('fill');
    return { classAttr, stroke, strokeWidth, fill };
  }

  // Count highlighted edges
  async countHighlightedEdges() {
    return await this.edgeHighlighted().count();
  }
}

test.describe('BFS Visualization - FSM states and transitions', () => {
  let pageErrors = [];
  let consoleMessages = [];

  // Setup: navigate to page for each test and wire up listeners
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      // Collect uncaught exceptions from the page
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      // Collect console messages for assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    await page.goto(BASE);
  });

  test.afterEach(async () => {
    // nothing to teardown beyond Playwright's defaults
  });

  test('Initial Idle state on load - resetGraph() executed and no page errors', async ({ page }) => {
    // Validate initial Idle state behaviors:
    // - resetGraph() entry action should have been invoked on load and thus the log should contain 'Graph reset.'
    // - start input should be empty and start button disabled
    // - console should include the accessibility info printed by the script
    // - there should be no page errors (no unexpected runtime exceptions)

    const gp = new GraphPage(page);

    // The script calls resetGraph() during initialization, which appends 'Graph reset.' to the log
    await gp.waitForLogContains('Graph reset.');

    const logLines = await gp.getLogLines();
    expect(logLines.some(l => l.includes('Graph reset.'))).toBeTruthy();

    // Start input empty and start button disabled in Idle
    expect(await gp.getStartInputValue()).toBe('');
    expect(await gp.isStartDisabled()).toBeTruthy();

    // The page script logs an info message explaining accessibility - ensure it's in the console
    const infoMsgs = consoleMessages.filter(m => m.type === 'info' && m.text.includes('BFS Visualization'));
    expect(infoMsgs.length).toBeGreaterThanOrEqual(1);

    // There should be no uncaught page errors on load
    expect(pageErrors.length, `Page errors: ${pageErrors.map(e=>String(e)).join('\n')}`).toBe(0);
  });

  test('Clicking a node transitions Idle -> NodeSelected; UI updates and log entry created', async ({ page }) => {
    // Validate NodeClick event and transition to NodeSelected:
    // - clicking node 'C' selects it
    // - start input shows 'C', Start button becomes enabled
    // - node stroke indicates selection
    // - log has 'Selected start node: C'
    const gp = new GraphPage(page);

    // Ensure initial Idle state ready
    await gp.waitForLogContains('Graph reset.');

    await gp.selectNodeByClick('C');

    // start input should show C
    expect(await gp.getStartInputValue()).toBe('C');

    // start button should be enabled after selection
    expect(await gp.isStartDisabled()).toBeFalsy();

    // Node C circle should have highlighted stroke
    const attrs = await gp.getNodeAttributes('C');
    expect(attrs.stroke).toBe('#ff6f61');
    expect(attrs.strokeWidth === '4' || attrs.strokeWidth === 4).toBeTruthy();

    // Log should include selection message
    const logLines = await gp.getLogLines();
    expect(logLines.some(l => l.includes('Selected start node: C'))).toBeTruthy();

    // No page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Keyboard selection (Enter) transitions Idle -> NodeSelected', async ({ page }) => {
    // Validate NodeKeyDown event:
    // - focusing node 'G' and pressing Enter selects it
    // - Start input and button update correctly
    const gp = new GraphPage(page);

    await gp.waitForLogContains('Graph reset.');

    await gp.selectNodeByKey('G');

    expect(await gp.getStartInputValue()).toBe('G');
    expect(await gp.isStartDisabled()).toBeFalsy();

    const attrs = await gp.getNodeAttributes('G');
    expect(attrs.stroke).toBe('#ff6f61');

    // Log entry should exist
    const logLines = await gp.getLogLines();
    expect(logLines.some(l => l.includes('Selected start node: G'))).toBeTruthy();

    expect(pageErrors.length).toBe(0);
  });

  test('Start BFS transitions NodeSelected -> BFS_Running and ultimately BFS_Complete', async ({ page }) => {
    // Validate StartBFS event and BFS run:
    // - After selecting node 'A' and clicking Start BFS:
    //   * startBtn becomes disabled, resetBtn disabled during running
    //   * log contains 'Starting BFS from node A...'
    //   * nodes become visited (class/attributes) and edges get highlighted during run
    //   * eventually log contains 'BFS Complete!'
    const gp = new GraphPage(page);

    await gp.waitForLogContains('Graph reset.');

    // Select node A and start BFS
    await gp.selectNodeByClick('A');
    expect(await gp.getStartInputValue()).toBe('A');
    await gp.pressStart();

    // Immediately after pressing start, startBtn should be disabled and resetBtn disabled
    expect(await gp.isStartDisabled()).toBeTruthy();
    expect(await gp.isResetDisabled()).toBeTruthy();

    // Wait for BFS start log
    await gp.waitForLogContains('Starting BFS from node A...');

    // Wait for BFS completion - this will wait for the 'BFS Complete!' log line
    await gp.waitForBFSComplete(40000); // allow generous timeout for the full traversal

    // After completion, reset button should be enabled
    expect(await gp.isResetDisabled()).toBeFalsy();

    // Verify that at least some nodes are marked visited and have the teal fill
    const visitedChecks = ['A','B','C','D','E','F','G'].map(async id => {
      const attrs = await gp.getNodeAttributes(id);
      return {
        id,
        isVisited: attrs.classAttr.includes('visited'),
        fill: attrs.fill
      };
    });
    const results = await Promise.all(visitedChecks);

    // All nodes should have been visited in BFS Complete for a connected graph
    for (const r of results) {
      expect(r.isVisited, `Node ${r.id} should be marked visited`).toBeTruthy();
      expect(r.fill).toBe('#76c7c0');
    }

    // At least one edge should be highlighted as explored during BFS
    const highlightedCount = await gp.countHighlightedEdges();
    expect(highlightedCount).toBeGreaterThan(0);

    // The log should contain both start and complete messages
    const logText = await gp.getLogText();
    expect(logText).toContain('Starting BFS from node A...');
    expect(logText).toContain('BFS Complete!');

    // No uncaught page errors during the run
    expect(pageErrors.length).toBe(0);
  }, 45000); // extend test timeout to allow BFS to run to completion

  test('Reset during BFS stops algorithm and returns to Idle', async ({ page }) => {
    // Validate ResetGraph while BFS is running:
    // - Start BFS from 'B'
    // - After first "Visiting node B" appears, click Reset
    // - Log should contain 'Graph reset.' and subsequent BFS visiting messages should cease
    const gp = new GraphPage(page);

    await gp.waitForLogContains('Graph reset.');

    // Select and start BFS
    await gp.selectNodeByClick('B');
    await gp.pressStart();

    // Wait until the 'Visiting node B' appears (first visiting log)
    await gp.waitForLogContains('Visiting node B');

    // Record current number of 'Visiting node' entries
    const beforeResetLog = await gp.getLogText();
    const beforeCount = (beforeResetLog.match(/Visiting node/g) || []).length;

    // Now click reset while BFS is running; this should cancel timeouts and stop BFS
    await gp.pressReset();

    // The reset action appends 'Graph reset.' - wait for it
    await gp.waitForLogContains('Graph reset.');

    // Capture logs for a short while to ensure BFS does not continue
    await page.waitForTimeout(2000); // small delay to observe any further log activity after reset

    const afterResetLog = await gp.getLogText();
    const afterCount = (afterResetLog.match(/Visiting node/g) || []).length;

    // After reset there should be no additional 'Visiting node' entries
    expect(afterCount).toBe(beforeCount);

    // Start input should still show the selected node (reset preserves selection) or be empty depending on implementation;
    // The implementation keeps selectedStartNode, so expect start input equals the selected node (B)
    expect(await gp.getStartInputValue()).toBe('B');

    // No page errors produced by resetting mid-run
    expect(pageErrors.length).toBe(0);
  }, 20000);

  test('Edge case: clicking Start BFS when no node selected does nothing', async ({ page }) => {
    // Validate that clicking the disabled Start BFS button when no node selected does not start BFS
    // - On initial load, start button is disabled; attempting to click it should not produce 'Starting BFS' in log
    const gp = new GraphPage(page);

    await gp.waitForLogContains('Graph reset.');

    // Ensure no selection
    expect(await gp.getStartInputValue()).toBe('');
    expect(await gp.isStartDisabled()).toBeTruthy();

    // Try to click the Start button (Playwright will still click, but element is disabled and the handler checks disabled state)
    // To simulate user clicking the disabled control, we perform the click - but no action should be taken by the page.
    // Note: clicking disabled elements may still be dispatched; the app protects by checking selectedStartNode and disabled state.
    await gp.startBtn.click();

    // Wait a moment and ensure 'Starting BFS' is not in the log
    await page.waitForTimeout(500);
    const logText = await gp.getLogText();
    expect(logText).not.toContain('Starting BFS');

    // No page errors
    expect(pageErrors.length).toBe(0);
  });
});