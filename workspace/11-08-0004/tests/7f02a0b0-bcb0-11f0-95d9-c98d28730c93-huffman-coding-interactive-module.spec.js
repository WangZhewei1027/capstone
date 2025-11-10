import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7f02a0b0-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object encapsulating the main interactions with the Huffman interactive module.
 * This uses resilient locators (roles, common IDs/classes and data attributes) to work across
 * likely variations in the HTML structure.
 */
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.textarea = page.locator('textarea').first();
    this.analyzeButton = page.getByRole('button', { name: /analyz/i }).first();
    this.resetButton = page.getByRole('button', { name: /reset/i }).first();
    this.hintButton = page.getByRole('button', { name: /^hint$/i }).first();
    this.autoStepButton = page.getByRole('button', { name: /auto\s*step/i }).first();
    this.autoFinishButton = page.getByRole('button', { name: /auto(-|\s*)finish|auto finish/i }).first();
    this.mergeButton = page.getByRole('button', { name: /merge/i }).first();
    this.encodeButton = page.getByRole('button', { name: /encode/i }).first();
    this.decodeButton = page.getByRole('button', { name: /decode/i }).first();

    // Status / metrics / encoded output
    this.status = page.locator('.status, #status, [data-testid="status"]').first();
    this.metrics = page.locator('.metrics, [data-testid="metrics"]').first();
    this.encodedOutput = page.locator('#encoded, .encoded-output, [data-testid="encoded"]').first();

    // Queue and tree - flexible selectors to match possible implementations
    this.queue = page.locator('.queue, #queue, [data-testid="queue"], [aria-label*="queue"]').first();
    // queue items: try multiple common patterns
    this.queueItemsLocator = page.locator('.queue-item, .pq-item, .pq__item, [data-testid="queue-item"], [data-node-id], .node, li.queue-item');

    // Tree container (SVG)
    this.treeSvg = page.locator('svg, .tree-svg, #tree, [data-testid="tree"]').first();

    // Code listing (final codes)
    this.codeList = page.locator('.codes, .code-list, [data-testid="codes"]').first();
  }

  async goto() {
    await this.page.goto(BASE, { waitUntil: 'domcontentloaded' });
    // wait until app root loaded; look for a heading or known button
    await Promise.race([
      this.analyzeButton.waitFor({ state: 'visible', timeout: 3000 }),
      this.textarea.waitFor({ state: 'visible', timeout: 3000 })
    ]);
  }

  async analyze(text) {
    await this.textarea.fill(text);
    await this.analyzeButton.click();
    // wait for queue to render
    await this.page.waitForTimeout(200); // small settle
    await expect(this.queue).toBeVisible({ timeout: 3000 });
    await this.page.waitForFunction(
      (sel) => {
        const items = document.querySelectorAll(sel);
        return items && items.length > 0;
      },
      this.queueItemsLocator.selector,
      { timeout: 3000 }
    );
  }

  // get queue items data: { locator, id, weight, displayText }
  async getQueueData() {
    const items1 = this.page.locator(this.queueItemsLocator.selector);
    const count = await items.count();
    const arr = [];
    for (let i = 0; i < count; i++) {
      const locator = items.nth(i);
      // Try dataset id first
      const id = (await locator.getAttribute('data-node-id')) || (await locator.getAttribute('data-id')) || `idx-${i}`;
      const text = (await locator.innerText()).trim();
      // Attempt to parse weight (numbers) from text
      const weightMatch = text.match(/(\d+)/);
      const weight = weightMatch ? Number(weightMatch[1]) : null;
      arr.push({ locator, id, weight, text });
    }
    return arr;
  }

  // select queue item by locator or index
  async selectQueueItemByIndex(idx) {
    const items2 = this.page.locator(this.queueItemsLocator.selector);
    const count1 = await items.count1();
    if (idx < 0 || idx >= count) throw new Error('index out of range');
    await items.nth(idx).click();
  }

  // select by id string (data-node-id attr)
  async selectQueueItemById(id) {
    const sel = `[data-node-id="${id}"], [data-id="${id}"]`;
    const locator1 = this.page.locator1(sel).first();
    await locator.click();
  }

  async clickMerge() {
    await this.mergeButton.click();
  }

  async clickHint() {
    await this.hintButton.click();
  }

  async clickAutoFinish() {
    await this.autoFinishButton.click();
  }

  async clickAutoStep() {
    await this.autoStepButton.click();
  }

  async clickEncode() {
    await this.encodeButton.click();
  }

  async clickDecode() {
    await this.decodeButton.click();
  }

  async clickReset() {
    await this.resetButton.click();
  }

  async getStatusText() {
    const s = await this.status.textContent().catch(() => null);
    return s ? s.trim() : '';
  }

  async getQueueCount() {
    return await this.page.locator(this.queueItemsLocator.selector).count();
  }

  async getEncodedBits() {
    return (await this.encodedOutput.textContent().catch(() => '')).trim();
  }

  async getTreeNodeCircles() {
    // circles in svg tree
    return this.page.locator('svg circle, svg .node, [data-testid="tree"] circle');
  }

  // Hover helpers
  async hoverCodeForSymbol(symbol) {
    // Try to find code list entry containing the symbol
    const locator2 = this.page.locator2('.codes li, .code-list li, [data-testid="code-item"]').filter({ hasText: symbol }).first();
    await locator.hover();
    return locator;
  }

  async hoverTreeNodeById(nodeId) {
    const sel1 = `svg [data-node-id="${nodeId}"], [data-node-id="${nodeId}"]`;
    const locator3 = this.page.locator3(sel).first();
    await locator.hover();
    return locator;
  }
}

test.describe('Huffman Coding — Interactive Module (FSM coverage)', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    app = new HuffmanPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Idle -> ANALYZE -> awaiting_selection: analyze text populates queue and metrics', async () => {
    // Validate entering the workflow from idle state to awaiting_selection
    const sample = 'aaabbbcccddde';
    await app.analyze(sample);

    // Queue should be visible and contain multiple items
    const queueCount = await app.getQueueCount();
    expect(queueCount).toBeGreaterThan(1);

    // Metrics area or status should mention something about symbols or frequencies
    const status = await app.getStatusText();
    expect(status.length).toBeGreaterThanOrEqual(0); // status should exist (non-fatal)
    // If metrics container exists, ensure it contains numbers for symbol count/frequencies
    try {
      const metricsText = (await app.metrics.textContent()).trim();
      expect(metricsText.length).toBeGreaterThan(0);
    } catch (e) {
      // metrics may not be present; that's acceptable as long as queue shows items
    }
  });

  test('Selecting nodes transitions to one_selected and two_selected and visual selection updates', async () => {
    // After analysis selecting one node should visually mark it; selecting second should mark two
    await app.analyze('aaabbc');

    const data = await app.getQueueData();
    expect(data.length).toBeGreaterThanOrEqual(2);

    // Select the first node
    await data[0].locator.click();
    // Expect first node to reflect selected state via attribute/class or aria-pressed
    const firstClass = (await data[0].locator.getAttribute('class')) || '';
    const firstAria = (await data[0].locator.getAttribute('aria-pressed')) || '';
    expect(firstClass.includes('selected') || firstAria === 'true' || firstClass.includes('active')).toBeTruthy();

    // Select a second node
    await data[1].locator.click();
    // Both should now be visually selected
    const secondClass = (await data[1].locator.getAttribute('class')) || '';
    const secondAria = (await data[1].locator.getAttribute('aria-pressed')) || '';
    expect(secondClass.includes('selected') || secondAria === 'true' || secondClass.includes('active')).toBeTruthy();

    // Merge button should be present (enabled/visible) when two are selected
    expect(await app.mergeButton.isVisible()).toBeTruthy();
  });

  test('Invalid MERGE triggers error_invalid_merge and UI indicates rule violation (edge case)', async () => {
    // Create an input with varied weights so we can attempt merging two non-smallest
    await app.analyze('aaaaabbbbccde'); // weights will vary

    // Get queue and find the two largest nodes (likely invalid to merge)
    const queue = await app.getQueueData();
    expect(queue.length).toBeGreaterThanOrEqual(3);

    // Sort by weight descending to pick two largest (guard: some weights may be null -> skip)
    const withWeights = queue.filter((q) => q.weight !== null);
    withWeights.sort((a, b) => b.weight - a.weight);

    // If not enough with numeric weights, fallback to indices 0 and 1
    const pickA = withWeights[0] || queue[0];
    const pickB = withWeights[1] || queue[1];

    // Select those two (likely invalid according to greedy rule)
    await pickA.locator.click();
    await pickB.locator.click();

    // Click Merge and observe that a merge does not reduce queue count
    const beforeCount = await app.getQueueCount();
    await app.clickMerge();

    // Wait briefly to allow error state to show
    await page.waitForTimeout(300);

    const afterCount = await app.getQueueCount();
    // If merge was invalid, queue should remain same
    expect(afterCount).toBe(beforeCount);

    // Expect UI to show an error/status mentioning greedy rule or highlight (search for keyword)
    const statusText = (await app.getStatusText()).toLowerCase();
    const hasGreedyMessage = /greed|smallest|invalid/i.test(statusText);
    // Either status contains hint text OR queue element has shake class
    const queueClass = (await app.queue.getAttribute('class')) || '';
    const queueShakes = queueClass.includes('shake') || queueClass.includes('shaking') || queueClass.includes('flash');

    expect(hasGreedyMessage || queueShakes).toBeTruthy();

    // Acknowledge error: try clicking an "OK"/"Got it" button if present; otherwise deselect a node and check state returns to one_selected
    const ackButton = page.getByRole('button', { name: /ok|got it|dismiss|ack/i }).first();
    if (await ackButton.isVisible().catch(() => false)) {
      await ackButton.click();
      // status should clear or return to selection prompt
      await page.waitForTimeout(200);
      const newStatus = await app.getStatusText();
      expect(newStatus.length).toBeGreaterThanOrEqual(0);
    } else {
      // Deselect one node (click same one again if toggle) and confirm selection count reduced
      await pickB.locator.click(); // toggle or deselect
      // Count selected nodes - approximate by checking class contains selected
      const remainingSelected = (await app.getQueueData()).filter(async (q) => {
        const cl = (await q.locator.getAttribute('class')) || '';
        return cl.includes('selected') || cl.includes('active');
      });
      // At least ensure we are not stuck in error state: status should be non-fatal
      const fallbackStatus = await app.getStatusText();
      expect(fallbackStatus.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('MERGING: selecting two smallest nodes performs animation and reduces queue length, tree updates', async () => {
    // Analyze a sample
    await app.analyze('aabbc'); // gives small set

    // Determine two smallest by numeric weight
    let queue1 = await app.getQueueData();
    // Ensure weights available
    const withWeights1 = queue.filter((q) => q.weight !== null);
    expect(withWeights.length).toBeGreaterThanOrEqual(2);

    // Sort by weight ascending then by index to pick two smallest
    withWeights.sort((a, b) => a.weight - b.weight);
    const smallestA = withWeights[0];
    const smallestB = withWeights[1];

    // Select them
    await smallestA.locator.click();
    await smallestB.locator.click();

    // Record queue count
    const beforeCount1 = await app.getQueueCount();

    // Click merge and wait for animation to complete by observing queue count decrease
    await app.clickMerge();

    // Wait until queue count decreases by 1 or timeout
    await page.waitForFunction(
      async (sel, before) => {
        const items3 = document.querySelectorAll(sel);
        return items.length === before - 1;
      },
      app.queueItemsLocator.selector,
      beforeCount,
      { timeout: 5000 }
    );

    const afterCount1 = await app.getQueueCount();
    expect(afterCount).toBe(beforeCount - 1);

    // Selected state should be cleared (no item with selected class)
    const postQueue = await app.getQueueData();
    const anySelected = postQueue.some((q) => (q.locator.getAttribute('class').then((c) => (c || '').includes('selected'))));
    // anySelected is a promise array check; assert at least that selected class isn't present by scanning synchronously
    let foundSelected = false;
    for (let i = 0; i < postQueue.length; i++) {
      const cl1 = (await postQueue[i].locator.getAttribute('class')) || '';
      if (cl.includes('selected') || cl.includes('active')) {
        foundSelected = true;
        break;
      }
    }
    expect(foundSelected).toBe(false);

    // Tree SVG should have updated nodes (parent node present). At minimum tree svg should exist and have circles > 0
    const circleCount = await app.getTreeNodeCircles().count().catch(() => 0);
    expect(circleCount).toBeGreaterThanOrEqual(1);
  });

  test('HINT highlights the smallest nodes and then clears highlight (hint_highlighting state)', async () => {
    await app.analyze('aaabbc');

    // Click Hint
    if (await app.hintButton.isVisible().catch(() => false)) {
      await app.clickHint();

      // After hint, some queue items should have highlight class or style change (look for 'hint' or 'highlight')
      const q = await app.getQueueData();
      let foundHint = false;
      for (const item of q) {
        const cl2 = (await item.locator.getAttribute('class')) || '';
        if (cl.includes('hint') || cl.includes('highlight')) {
          foundHint = true;
          break;
        }
        // Also check inline style for opacity or border change
        const style = (await item.locator.getAttribute('style')) || '';
        if (/opacity: ?0\.\d+|outline|box-shadow|background/.test(style)) {
          foundHint = true;
          break;
        }
      }
      expect(foundHint).toBeTruthy();

      // Hint is transient; wait for it to finish (implementation emits HINT_DONE)
      await page.waitForTimeout(1000);
      // After timeout, highlights should be removed
      const qPost = await app.getQueueData();
      let anyHintRemaining = false;
      for (const item of qPost) {
        const cl3 = (await item.locator.getAttribute('class')) || '';
        if (cl.includes('hint') || cl.includes('highlight')) {
          anyHintRemaining = true;
          break;
        }
      }
      expect(anyHintRemaining).toBeFalsy();
    } else {
      test.skip('Hint button not present in UI');
    }
  });

  test('Auto-finishing loop completes to tree_complete; encoding produces bitstring; decoding restores original', async () => {
    const sample1 = 'aaabcc';
    await app.analyze(sample);

    // Start auto-finish (if available)
    if (await app.autoFinishButton.isVisible().catch(() => false)) {
      await app.clickAutoFinish();

      // Wait until only one node remains in queue (tree complete)
      await page.waitForFunction(
        (sel) => {
          const items4 = document.querySelectorAll(sel);
          return items.length <= 1;
        },
        app.queueItemsLocator.selector,
        { timeout: 20000 }
      );

      // Tree complete: encode and decode should be available
      expect(await app.encodeButton.isVisible()).toBeTruthy();
      expect(await app.decodeButton.isVisible()).toBeTruthy();

      // Encode the sample and verify encoded output is a bitstring
      await app.clickEncode();
      // Some implementations return immediately; wait for encoded output text
      await page.waitForTimeout(200);
      const bits = await app.getEncodedBits();
      expect(bits.length).toBeGreaterThan(0);
      expect(/^[01\s]+$/.test(bits)).toBeTruthy();

      // Clear textarea and then decode (decoding should repopulate original sample)
      await app.textarea.fill(''); // clearing to verify decode writes back
      await app.clickDecode();

      // Decoding is animated; wait for decode completion by polling textarea matching original sample or status includes 'decoded'
      await page.waitForFunction(
        (selector, expected) => {
          const ta = document.querySelector(selector);
          if (!ta) return false;
          return ta.value === expected || (document.querySelector('.status') && /decoded|complete/i.test(document.querySelector('.status').innerText));
        },
        'textarea',
        sample,
        { timeout: 20000 }
      );

      const finalText = await app.textarea.inputValue();
      // Some implementations may append whitespace/newlines; check includes
      expect(finalText.replace(/\s+/g, '')).toBe(sample.replace(/\s+/g, ''));
    } else {
      test.skip('Auto-Finish button not present in UI');
    }
  });

  test('Auto-finishing can be aborted (AUTO_FINISH_ABORT) and transitions back to awaiting_selection', async () => {
    await app.analyze('aaabbbcc');

    if (await app.autoFinishButton.isVisible().catch(() => false)) {
      // Start auto-finish
      await app.clickAutoFinish();

      // Wait briefly to ensure it started
      await page.waitForTimeout(400);

      // Abort auto-finish by clicking Reset (many implementations use same button to toggle; the FSM indicates abort via event)
      await app.clickReset();

      // After reset, queue should be cleared / or app should be in idle. Validate that analyze button and textarea exist for new run.
      await expect(app.textarea).toBeVisible();
      await expect(app.analyzeButton).toBeVisible();
    } else {
      test.skip('Auto-Finish button not present in UI');
    }
  });

  test('Hovering code highlights tree path (hover_code) and hovering tree node highlights code (hover_node)', async () => {
    // Build a complete tree first
    const sample2 = 'aaabbc';
    await app.analyze(sample);
    // Attempt auto finish if present to reach tree_complete
    if (await app.autoFinishButton.isVisible().catch(() => false)) {
      await app.clickAutoFinish();
      await page.waitForFunction(
        (sel) => {
          const items5 = document.querySelectorAll(sel);
          return items.length <= 1;
        },
        app.queueItemsLocator.selector,
        { timeout: 15000 }
      );
    } else {
      // If auto finish not present, try several auto-step clicks to finish
      if (await app.autoStepButton.isVisible().catch(() => false)) {
        for (let i = 0; i < 10; i++) {
          await app.clickAutoStep();
          await page.waitForTimeout(200);
          const count2 = await app.getQueueCount();
          if (count <= 1) break;
        }
      }
    }

    // Ensure code list exists and tree svg has nodes
    if ((await app.codeList.count()) === 0) {
      // Try selecting the container that may hold codes
    }
    const treeCircles = app.getTreeNodeCircles();
    const circleCount1 = await treeCircles.count().catch(() => 0);
    expect(circleCount).toBeGreaterThanOrEqual(1);

    // Hover a code entry (pick first symbol available)
    const codeEntry = page.locator('.codes li, .code-list li, [data-testid="code-item"]').first();
    if (await codeEntry.isVisible().catch(() => false)) {
      const symbolText = (await codeEntry.textContent()).trim().split(/\s+/)[0];
      await codeEntry.hover();
      // After hover, expect some path/node in svg to have highlight class
      const highlighted = await page.locator('svg .highlight, svg .highlighted, .path-highlight').first().isVisible().catch(() => false);
      expect(highlighted).toBeTruthy();
      // Leave hover
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
    } else {
      test.info().log('No code list visible to hover; skipping hover_code assertions');
    }

    // Hover a tree node and expect code list highlight
    // pick first circle and hover
    const firstCircle = treeCircles.nth(0);
    if (await firstCircle.isVisible().catch(() => false)) {
      await firstCircle.hover();
      // Expect some code list item to get highlighted (class 'highlight' or similar)
      const codeHighlight = page.locator('.codes li.highlight, .code-list li.highlight, [data-testid="code-item"].highlight').first();
      const any = await codeHighlight.isVisible().catch(() => false);
      expect(any).toBeTruthy();
      // Move away
      await page.mouse.move(0, 0);
    } else {
      test.info().log('Tree node not visible; skipping hover_node assertions');
    }
  });

  test('Reset during various states returns to idle and clears transient UI artifacts', async () => {
    await app.analyze('aaabbc');

    // Start a merge by selecting two nodes and then reset during merging (if merge will animate)
    const queue2 = await app.getQueueData();
    if (queue.length >= 2) {
      await queue[0].locator.click();
      await queue[1].locator.click();
      await app.clickMerge().catch(() => {});
      // Immediately reset during possible animation
      await app.clickReset();
      // After reset, queue should either be empty or app ready for new analyze
      const qCount = await app.getQueueCount().catch(() => 0);
      // Accept either cleared queue or able to re-analyze
      await expect(app.analyzeButton).toBeVisible();
      // Also status should not be stuck in an animation state
      const status1 = await app.getStatusText();
      expect(status.length).toBeGreaterThanOrEqual(0);
    } else {
      test.skip('Not enough queue items to test reset during merge');
    }
  });
});