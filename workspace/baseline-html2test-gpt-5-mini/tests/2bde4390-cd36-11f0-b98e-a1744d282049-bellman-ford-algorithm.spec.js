import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde4390-cd36-11f0-b98e-a1744d282049.html';

test.describe('Bellman-Ford Visualizer - E2E', () => {
  // Capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages and record error-level messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Record page runtime errors (unhandled exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP);
    // Ensure initial paint/draw to stabilize canvas and UI
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(200);
  });

  test.afterEach(async () => {
    // Assert there were no unexpected console errors or page errors during the test.
    // These assertions ensure we observed runtime without hidden exceptions.
    expect(consoleErrors, `Console errors: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${JSON.stringify(pageErrors, null, 2)}`).toHaveLength(0);
  });

  test.describe('Initial load and UI elements', () => {
    test('should load page and show sample graph with expected counts and controls', async ({ page }) => {
      // Verify page title
      await expect(page).toHaveTitle(/Bellman-Ford Algorithm Visualizer/);

      // Controls exist
      const sampleBtn = page.locator('#sampleBtn');
      const clearBtn = page.locator('#clearBtn');
      const runBtn = page.locator('#runBtn');
      const stepBtn = page.locator('#stepBtn');
      const detectBtn = page.locator('#detectBtn');
      const selectBtn = page.locator('#selectBtn');
      const modeSelect = page.locator('#mode');

      await expect(sampleBtn).toBeVisible();
      await expect(clearBtn).toBeVisible();
      await expect(runBtn).toBeVisible();
      await expect(stepBtn).toBeVisible();
      await expect(detectBtn).toBeVisible();
      await expect(selectBtn).toBeVisible();
      await expect(modeSelect).toBeVisible();

      // After the page init script calls loadSample(), the sample graph should be loaded.
      // Expect vcount = 5 and ecount = 9 (matching loadSample() data).
      const vcount = page.locator('#vcount');
      const ecount = page.locator('#ecount');
      await expect(vcount).toHaveText('5');
      await expect(ecount).toHaveText('9');

      // Iteration should be 0 initially
      await expect(page.locator('#iter')).toHaveText('0');

      // Distances list should contain node labels A..E
      const distList = await page.locator('#distList').innerText();
      expect(distList).toContain('A');
      expect(distList).toContain('B');
      expect(distList).toContain('C');
      expect(distList).toContain('D');
      expect(distList).toContain('E');

      // Log contains mention that sample loaded (the script logs it)
      const logHtml = await page.locator('#log').innerHTML();
      expect(logHtml).toMatch(/Loaded sample graph/);
    });
  });

  test.describe('Algorithm controls and behaviors', () => {
    test('step button relaxes first edge and updates distances', async ({ page }) => {
      // Ensure mode is 'step'
      await page.selectOption('#mode', 'step');

      // Confirm source is set by the sample graph load (A)
      // The code sets source=0 and dist[0]=0 during loadSample, so node A should show dist 0
      const distHtmlBefore = await page.locator('#distList').innerHTML();
      expect(distHtmlBefore).toContain('A');
      expect(distHtmlBefore).toContain('dist: <em>0</em>');

      // Click Step once; the first edge in edges[] is 0->1 weight 6 so B should get dist 6
      await page.click('#stepBtn');
      // Allow UI to update
      await page.waitForTimeout(120);

      const distHtmlAfter = await page.locator('#distList').innerHTML();
      // B should now show distance 6
      expect(distHtmlAfter).toContain('<strong>B</strong>');
      expect(distHtmlAfter).toContain('dist: <em>6</em>');

      // Iter label should remain '0' because iter is incremented only after a full edges pass
      await expect(page.locator('#iter')).toHaveText('0');

      // Log should contain an entry about relaxed edge or attempted edge
      const logText = await page.locator('#log').innerText();
      expect(logText.length).toBeGreaterThan(0);
      expect(logText).toMatch(/Relaxed edge|Tried edge/);
    });

    test('detect negative cycle shows alert when none exists (sample graph)', async ({ page }) => {
      // Click the negative cycle detection button and handle the alert dialog
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        page.click('#detectBtn'),
      ]);
      // Should be an alert informing no negative cycle reachable
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('No negative cycle reachable from the source');
      await dialog.accept();
      // After alert acceptance, UI should remain stable; dist table refreshed
      const distHtml = await page.locator('#distList').innerHTML();
      expect(distHtml.length).toBeGreaterThan(0);
    });

    test('select source toggle button changes label and behavior', async ({ page }) => {
      const selectBtn1 = page.locator('#selectBtn1');
      await expect(selectBtn).toHaveText('Select Source');

      // Toggle into selecting mode
      await selectBtn.click();
      await expect(selectBtn).toHaveText('Click a node...');

      // Toggle back
      await selectBtn.click();
      await expect(selectBtn).toHaveText('Select Source');
    });

    test('run and pause (auto) can be toggled without errors when a source exists', async ({ page }) => {
      // Ensure mode auto and click Run/Pause quickly to avoid long running timers
      await page.selectOption('#mode', 'auto');

      // Click Run - because sample has a source, should not show the "Select a source" alert
      await page.click('#runBtn');
      await page.waitForTimeout(150);

      // Pause to stop any auto timers
      await page.click('#pauseBtn');
      // If any timers were running, they should be stopped; ensure UI remained responsive
      await expect(page.locator('#iter')).toBeVisible();
    });
  });

  test.describe('Graph editing interactions', () => {
    // Utility to get canvas client rectangle
    async function canvasBox(page) {
      const box = await page.evaluate(() => {
        const c = document.getElementById('c');
        const r = c.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      });
      return box;
    }

    test('clear button empties the graph and updates counters and log', async ({ page }) => {
      await page.click('#clearBtn');
      await page.waitForTimeout(100);

      await expect(page.locator('#vcount')).toHaveText('0');
      await expect(page.locator('#ecount')).toHaveText('0');

      const logText1 = await page.locator('#log').innerText();
      expect(logText).toMatch(/Cleared graph/);
    });

    test('clicking canvas adds a node and updates vcount and dist list', async ({ page }) => {
      // Clear first to have predictable nextId
      await page.click('#clearBtn');
      await page.waitForTimeout(100);

      const box1 = await canvasBox(page);
      // Click near top-left of the canvas
      const cx = box.left + 60;
      const cy = box.top + 60;
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(80);

      // After adding one node, vcount should be 1 and distList should contain N0
      await expect(page.locator('#vcount')).toHaveText('1');
      const distHtml1 = await page.locator('#distList').innerHTML();
      expect(distHtml).toContain('N0');
    });

    test('create an edge between two nodes using shift-click and prompt acceptance', async ({ page }) => {
      // Clear and add two nodes at different positions
      await page.click('#clearBtn');
      await page.waitForTimeout(100);
      const box2 = await canvasBox(page);
      const p1 = { x: box.left + 80, y: box.top + 80 };
      const p2 = { x: box.left + 200, y: box.top + 80 };

      // Add first node
      await page.mouse.click(p1.x, p1.y);
      await page.waitForTimeout(60);
      // Add second node
      await page.mouse.click(p2.x, p2.y);
      await page.waitForTimeout(60);

      // Now create an edge: shift-mousedown on node1, mouseup on node2 which triggers a prompt
      const promptHandler = page.waitForEvent('dialog').then(async dialog => {
        // Should be a 'prompt'
        expect(dialog.type()).toBe('prompt');
        // Accept with weight '5'
        await dialog.accept('5');
      });

      // Emulate shift-mousedown on node1, mouseup on node2
      await page.mouse.down({ button: 'left', modifiers: ['Shift'], x: p1.x, y: p1.y });
      // Move slightly then up on the second node
      await page.mouse.move(p2.x, p2.y);
      await page.mouse.up({ button: 'left', x: p2.x, y: p2.y });

      // Wait for our prompt handler to complete
      await promptHandler;
      // Allow UI to update
      await page.waitForTimeout(120);

      // ecount should now be 1
      await expect(page.locator('#ecount')).toHaveText('1');

      // Log should reflect added edge
      const logText2 = await page.locator('#log').innerText();
      expect(logText).toMatch(/Added edge/);
    });

    test('sample graph button reloads the sample and resets counters', async ({ page }) => {
      // Modify graph: clear then add a node so counts change
      await page.click('#clearBtn');
      await page.waitForTimeout(80);
      await page.mouse.click((await canvasBox(page)).left + 50, (await canvasBox(page)).top + 50);
      await page.waitForTimeout(80);
      await expect(page.locator('#vcount')).toHaveText('1');

      // Click Sample Graph to restore sample
      await page.click('#sampleBtn');
      await page.waitForTimeout(120);

      await expect(page.locator('#vcount')).toHaveText('5');
      await expect(page.locator('#ecount')).toHaveText('9');
      const logText3 = await page.locator('#log').innerText();
      expect(logText).toMatch(/Loaded sample graph/);
    });
  });
});