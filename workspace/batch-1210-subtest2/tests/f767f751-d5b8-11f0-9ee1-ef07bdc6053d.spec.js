import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f767f751-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the BFS visualization page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startBtn = page.locator('#startBtn');
    this.node = (id) => page.locator(`#${id}`);
    this.allNodes = page.locator('.node');
    // capture page errors and console messages
    this.pageErrors = [];
    this.consoleMessages = [];
    page.on('pageerror', (err) => {
      this.pageErrors.push(err);
    });
    page.on('console', (msg) => {
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait a short moment to allow initial script execution/errors to surface
    await this.page.waitForTimeout(100);
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async getNodeText(id) {
    return this.node(id).innerText();
  }

  async expectNodeVisited(id, options = {}) {
    // Wait for the node to gain the 'visited' class
    await expect(this.node(id)).toHaveClass(/visited/, options);
  }

  async expectNodeNotVisited(id, options = {}) {
    await expect(this.node(id)).not.toHaveClass(/visited/, options);
  }
}

test.describe('BFS Visualization - FSM and DOM behavior', () => {
  // Increase timeout slightly for BFS timing (multiple 1s delays)
  test.setTimeout(40_000);

  test('Initial state (S0_Idle): UI elements created and entry actions executed', async ({ page }) => {
    // This test validates the Idle state entry actions: createGraph() and createEdges()
    // We will load the page, assert that nodes are created (createGraph executed),
    // and assert that createEdges produced a runtime error (graphDiv is undefined in createEdges).
    const gp = new GraphPage(page);
    await gp.goto();

    // Check Start button exists (evidence of S0_Idle)
    await expect(gp.startBtn).toBeVisible();

    // createGraph() should have created node elements for keys A-F
    const expectedNodes = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const id of expectedNodes) {
      await expect(gp.node(id)).toBeVisible();
      // verify inner text matches id (sanity)
      await expect(gp.node(id)).toHaveText(id);
    }

    // The createEdges() function in the provided implementation references graphDiv
    // which is not defined in createEdges, so a ReferenceError is expected during initial load.
    // Assert that a page error was emitted and it mentions 'graphDiv'.
    // Wait briefly to ensure any pageerror events fired.
    await page.waitForTimeout(200); // give a little time for pageerror event to be emitted

    // pageErrors captured on the page object
    const pageErrors = gp.pageErrors;
    // There should be at least one page error
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // At least one of the errors' message should mention graphDiv (ReferenceError)
    const hasGraphDivRef = pageErrors.some(err => String(err && err.message).includes('graphDiv'));
    expect(hasGraphDivRef).toBeTruthy();
  });

  test('StartBFS event triggers BFS and nodes become visited in BFS order (S1_BFS_Running)', async ({ page }) => {
    // This test validates the transition S0_Idle -> S1_BFS_Running via clicking #startBtn.
    // It checks that nodes gain the "visited" class in BFS traversal order A,B,C,D,E,F,
    // and that the "visited" class is added to the DOM (evidence of onEnter actions for BFS steps).
    const gp = new GraphPage(page);
    await gp.goto();

    // Ensure nodes start not visited
    for (const id of ['A', 'B', 'C', 'D', 'E', 'F']) {
      await gp.expectNodeNotVisited(id);
    }

    // Click Start BFS (StartBFS event)
    await gp.clickStart();

    // The BFS implementation awaits 1 second after visiting each node.
    // We'll assert that nodes become visited in the expected BFS order.
    // We give an appropriate timeout per node; total will be within the test timeout.
    const order = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const id of order) {
      // Wait up to 3000ms for each node to be marked visited; BFS uses ~1s per node,
      // so this should be sufficient even with scheduling jitter.
      await gp.expectNodeVisited(id, { timeout: 3000 });
    }

    // After full traversal, ensure all nodes have the visited class
    for (const id of order) {
      await gp.expectNodeVisited(id);
    }
  });

  test('Clicking Start BFS multiple times clears visited and re-runs BFS (edge case)', async ({ page }) => {
    // This test validates the button's click handler behavior where it clears visited classes
    // and invokes bfs('A') again. We assert that clicking twice does not crash the page
    // and that nodes end up visited after the second click as well.
    const gp = new GraphPage(page);
    await gp.goto();

    // First run
    await gp.clickStart();

    // Wait for first node to be visited
    await gp.expectNodeVisited('A', { timeout: 2000 });

    // Click start again while a run may be in progress; the handler removes visited classes
    // then calls bfs('A') again. We assert no new page errors are emitted by this action.
    const beforeErrorCount = gp.pageErrors.length;
    await gp.clickStart();

    // Give a small moment for any synchronous errors to surface
    await page.waitForTimeout(200);

    const afterErrorCount = gp.pageErrors.length;
    // No additional page errors should be introduced by clicking the start button again
    expect(afterErrorCount).toBe(beforeErrorCount);

    // Wait for full BFS to complete (ensure all nodes visited)
    const allNodes = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const id of allNodes) {
      await gp.expectNodeVisited(id, { timeout: 3000 });
    }
  });

  test('FSM evidence: ensure BFS step includes DOM change and uses a delay (S1_BFS_Running repeated transition)', async ({ page }) => {
    // This test inspects that during BFS steps, each visited node had its classList updated,
    // and that a delay is present between visits (best-effort timing assertion).
    const gp = new GraphPage(page);
    await gp.goto();

    // Hook into timestamps to measure time between node visits
    const visitTimestamps = {};
    // Observe mutations to nodes' class attribute to detect when 'visited' is added
    await page.exposeFunction('__recordVisited', (id) => {
      visitTimestamps[id] = Date.now();
    });

    // Inject a small observer into the page to call our exposed function whenever a node becomes visited.
    // Note: This does not modify the application's functions; it only observes DOM mutations.
    await page.evaluate(() => {
      // set up MutationObservers for each node
      const ids = ['A', 'B', 'C', 'D', 'E', 'F'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const obs = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.attributeName === 'class') {
              if (el.classList.contains('visited')) {
                // @ts-ignore call exposed function
                window.__recordVisited(id);
              }
            }
          }
        });
        obs.observe(el, { attributes: true });
      });
    });

    const startTime = Date.now();
    await gp.clickStart();

    // Wait for all nodes to be visited, measured by our callbacks.
    // We'll poll the visitTimestamps until all expected nodes have entries or timeout.
    const expected = ['A', 'B', 'C', 'D', 'E', 'F'];
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const keys = Object.keys(visitTimestamps);
      if (expected.every(k => keys.includes(k))) break;
      await page.waitForTimeout(100);
    }

    // Ensure we recorded visits for all nodes
    expect(Object.keys(visitTimestamps).length).toBeGreaterThanOrEqual(expected.length);

    // Basic check that there's roughly ~1s between sequential visits (allowing jitter).
    // We'll sort by timestamp and ensure average delta >= ~900ms (best-effort).
    const visits = expected.map(id => ({ id, t: visitTimestamps[id] })).sort((a, b) => a.t - b.t);
    // Compute deltas between consecutive visited nodes
    const deltas = [];
    for (let i = 1; i < visits.length; i++) {
      deltas.push(visits[i].t - visits[i - 1].t);
    }
    // Average delta
    const avgDelta = deltas.reduce((s, v) => s + v, 0) / deltas.length;
    // Expect average delta to be at least 700ms (allowing some scheduling variation)
    expect(avgDelta).toBeGreaterThanOrEqual(700);
  });

  test('Console and page error observation: ensure the ReferenceError is observable via Playwright events', async ({ page }) => {
    // This test explicitly asserts that the page error was emitted and is observable
    // through Playwright's 'pageerror' event stream.
    const gp = new GraphPage(page);

    // Wait for a pageerror to occur; we expect at least one due to createEdges referencing graphDiv.
    // Use page.waitForEvent to ensure we capture at least one pageerror.
    let caught = null;
    const waitPromise = page.waitForEvent('pageerror', { timeout: 3000 }).then(err => { caught = err; }).catch(() => { /* ignore */ });

    await gp.goto();
    await waitPromise;

    // There should be a captured pageerror object
    expect(caught || gp.pageErrors.length > 0).toBeTruthy();

    // If we caught an error via waitForEvent, assert message mentions graphDiv
    if (caught) {
      expect(String(caught.message)).toContain('graphDiv');
    } else {
      // fallback: inspect captured pageErrors array
      const found = gp.pageErrors.some(e => String(e && e.message).includes('graphDiv'));
      expect(found).toBeTruthy();
    }
  });
});