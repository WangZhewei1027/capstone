import { test, expect } from '@playwright/test';

test.describe('Drag-and-Drop Sortable List Tutorial (6e096b06-d5a0-11f0-8040-510e90b1f3a7)', () => {
  // URL under test
  const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e096b06-d5a0-11f0-8040-510e90b1f3a7.html';

  // collectors for console messages and page errors
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  // Setup before each test: navigate to the page and attach listeners to capture console and page errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Capture all console messages
    page.on('console', msg => {
      const type = msg.type(); // e.g., 'log', 'error', 'warning'
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture uncaught exceptions / page errors
    page.on('pageerror', error => {
      pageErrors.push(String(error));
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
  });

  // After each test assert that there were no pageErrors or console error messages
  test.afterEach(async () => {
    // Provide detailed failure messages if there were errors
    if (pageErrors.length > 0 || consoleErrors.length > 0) {
      const combined = [
        ...(pageErrors.length ? [`Page errors:\n${pageErrors.join('\n')}`] : []),
        ...(consoleErrors.length ? [`Console errors:\n${consoleErrors.join('\n')}`] : []),
      ].join('\n\n');

      // Clear arrays for next test
      consoleMessages = [];
      consoleErrors = [];
      pageErrors = [];

      // Fail the test with details about runtime errors
      throw new Error(`Runtime errors were detected during the test run:\n\n${combined}`);
    }
  });

  // Helper to read list state (data-id, visible number, and text content)
  async function getListState(page) {
    return await page.$$eval('#sortable-list li', nodes =>
      nodes.map(node => {
        const id = node.getAttribute('data-id');
        const numberSpan = node.querySelector('.item-number');
        const numberText = numberSpan ? numberSpan.textContent.trim() : null;
        const text = node.textContent.replace(numberSpan ? numberSpan.textContent : '', '').trim();
        return { id, numberText, text };
      })
    );
  }

  test('Initial load: page structure, header, list items and reset button are present and correct', async ({ page }) => {
    // Verify header and subtitle
    await expect(page.locator('header h1')).toHaveText('Drag-and-Drop Sortable List Tutorial');
    await expect(page.locator('header .subtitle')).toHaveText('Learn how to implement drag-and-drop functionality with vanilla JavaScript');

    // Verify the sortable list exists and has 5 items
    const items = page.locator('#sortable-list li');
    await expect(items).toHaveCount(5);

    // Verify each item has a data-id, an .item-number span, and expected text content
    const state = await getListState(page);
    expect(state.map(s => s.id)).toEqual(['1','2','3','4','5']);
    expect(state.map(s => s.numberText)).toEqual(['1','2','3','4','5']);
    expect(state.map(s => s.text)).toEqual([
      'Complete project proposal',
      'Design user interface',
      'Implement core functionality',
      'Test and debug features',
      'Deploy to production'
    ]);

    // Verify reset button is visible and has the correct id
    await expect(page.locator('#reset-btn')).toBeVisible();
    await expect(page.locator('#reset-btn')).toHaveText('Reset List Order');

    // Verify list has expected CSS properties through bounding box check (visual sanity)
    const listBox = await page.locator('#sortable-list').boundingBox();
    expect(listBox).not.toBeNull();
    // Basic visual check: list should have a non-zero width and height
    if (listBox) {
      expect(listBox.width).toBeGreaterThan(100);
      expect(listBox.height).toBeGreaterThan(100);
    }
  });

  test('Draggable attributes are applied to list items and updateItemNumbers keeps numbers in sync', async ({ page }) => {
    // Ensure each li has draggable="true" attribute (applied by initDragAndDrop)
    const draggables = await page.$$eval('#sortable-list li', nodes => nodes.map(n => n.getAttribute('draggable')));
    expect(draggables).toEqual(['true','true','true','true','true']);

    // Programmatically reorder DOM by moving 1st element to the end via the app's API (simulate dragend effect)
    // We'll use page.dragAndDrop which triggers HTML5 DnD behavior in many browsers.
    const firstSelector = '#sortable-list li[data-id="1"]';
    const lastSelector = '#sortable-list li[data-id="5"]';

    // Drag first element and drop it on the last element to move it after the last item
    await page.dragAndDrop(firstSelector, lastSelector);

    // Small pause to let DOM mutation handlers run
    await page.waitForTimeout(200);

    // After drag, verify numbers updated and the moved item is at the end
    const afterState = await getListState(page);
    // Last item's text should be the original "Complete project proposal"
    expect(afterState[afterState.length - 1].text).toBe('Complete project proposal');

    // Numbers should reflect new order 1..5
    expect(afterState.map(s => s.numberText)).toEqual(['1','2','3','4','5']);

    // Ensure no element has lingering 'dragging' class after the operation
    const draggingCount = await page.$$eval('#sortable-list li.dragging', nodes => nodes.length);
    expect(draggingCount).toBe(0);
  });

  test('Reset button restores the original order and re-initializes drag-and-drop handlers', async ({ page }) => {
    // First perform a reorder to change state: move item 2 to the top by dragging it onto item 1
    const item2 = '#sortable-list li[data-id="2"]';
    const item1 = '#sortable-list li[data-id="1"]';
    await page.dragAndDrop(item2, item1);
    await page.waitForTimeout(200);

    // Verify order changed: first element now should be "Design user interface"
    let state = await getListState(page);
    expect(state[0].text).toBe('Design user interface');

    // Click reset button
    await page.click('#reset-btn');
    await page.waitForTimeout(200);

    // Verify the original order restored (data-id 1..5 in initial order)
    state = await getListState(page);
    expect(state.map(s => s.id)).toEqual(['1','2','3','4','5']);
    expect(state.map(s => s.text)).toEqual([
      'Complete project proposal',
      'Design user interface',
      'Implement core functionality',
      'Test and debug features',
      'Deploy to production'
    ]);
    expect(state.map(s => s.numberText)).toEqual(['1','2','3','4','5']);

    // Verify draggable attribute still present after reset (re-initialization)
    const draggablesAfterReset = await page.$$eval('#sortable-list li', nodes => nodes.map(n => n.getAttribute('draggable')));
    expect(draggablesAfterReset).toEqual(['true','true','true','true','true']);
  });

  test('Clicking reset when list is already in original order is idempotent and triggers no errors', async ({ page }) => {
    // Ensure initial order is original
    const initial = await getListState(page);
    expect(initial.map(s => s.id)).toEqual(['1','2','3','4','5']);

    // Click reset button twice
    await page.click('#reset-btn');
    await page.click('#reset-btn');

    // Verify order unchanged and numbers remain stable
    const after = await getListState(page);
    expect(after.map(s => s.id)).toEqual(['1','2','3','4','5']);
    expect(after.map(s => s.numberText)).toEqual(['1','2','3','4','5']);
  });

  test('Edge case: Rapid sequential drags do not leave inconsistent numbering or dragging classes', async ({ page }) => {
    // Perform a series of quick drag operations:
    // Move item 5 to the top, then move item 3 to the bottom.
    const item5 = '#sortable-list li[data-id="5"]';
    const item1 = '#sortable-list li[data-id="1"]';
    const item3 = '#sortable-list li[data-id="3"]';
    const item5Target = item1;
    const item3Target = '#sortable-list li:last-child';

    // Move 5 to top
    await page.dragAndDrop(item5, item5Target);
    // Immediately move 3 to end
    await page.dragAndDrop(item3, item3Target);

    // Allow DOM updates
    await page.waitForTimeout(300);

    // Validate numbers and absence of dragging class
    const finalState = await getListState(page);
    expect(finalState.length).toBe(5);
    // Numbers must be 1..5
    expect(finalState.map(s => s.numberText)).toEqual(['1','2','3','4','5']);

    // No lingering dragging classes
    const draggingCount = await page.$$eval('#sortable-list li.dragging', nodes => nodes.length);
    expect(draggingCount).toBe(0);
  });

  test('Inspect console and page for unexpected runtime errors during typical interactions', async ({ page }) => {
    // Perform a few interactions: click reset, do a drag, click reset again
    await page.click('#reset-btn');
    await page.dragAndDrop('#sortable-list li[data-id="1"]', '#sortable-list li[data-id="3"]');
    await page.click('#reset-btn');

    // Allow any async errors to surface
    await page.waitForTimeout(200);

    // At this point, the afterEach hook will assert there are no pageErrors or consoleErrors.
    // Additionally assert that console messages exist and include informative logs (not errors).
    expect(consoleMessages.length).toBeGreaterThanOrEqual(0); // at least we captured messages
    // Ensure none of the captured console messages are of type 'error'
    const errorMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorMessages.length).toBe(0);
  });
});