import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde1c71-cd36-11f0-b98e-a1744d282049.html';

test.describe('Red-Black Tree Visualizer - UI and behavior', () => {
  // Collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions surfaced as pageerror
    page.on('pageerror', (err) => {
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Navigate to the app
    await page.goto(APP, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Basic assertion that no unexpected console/page errors were emitted during the test run.
    // This helps catch runtime issues while leaving actual application exceptions to surface naturally.
    expect(pageErrors, 'No uncaught page errors should have occurred').toEqual([]);
    expect(consoleErrors, 'No console.error messages should have been emitted').toEqual([]);
  });

  test('Initial load shows empty tree state and baseline UI elements', async ({ page }) => {
    // Verify main heading exists
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Red-Black Tree Visualizer');

    // The SVG should contain text indicating '(empty tree)' for the initial state
    const svgText = page.locator('#svg text', { hasText: '(empty tree)' });
    await expect(svgText).toHaveCount(1);

    // Step index label should exist and indicate Step 1 / N
    const stepLabel = page.locator('#stepIndex');
    await expect(stepLabel).toBeVisible();
    await expect(stepLabel).toContainText('Step');

    // Status should indicate Tree size: 0
    const status = page.locator('#status');
    await expect(status).toContainText('Tree size: 0');

    // Controls should be visible
    await expect(page.locator('#valueInput')).toBeVisible();
    await expect(page.locator('#insertBtn')).toBeVisible();
    await expect(page.locator('#deleteBtn')).toBeVisible();
    await expect(page.locator('#searchBtn')).toBeVisible();
  });

  test('Alert shown when Insert/Search/Delete clicked with empty or invalid input', async ({ page }) => {
    // Ensure value input is empty
    const valueInput = page.locator('#valueInput');
    await valueInput.fill('');

    // Listen for dialog and assert alert text for Insert
    const [insertDialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click('#insertBtn'),
    ]);
    expect(insertDialog.message()).toBe('Enter a numeric value');
    await insertDialog.accept();

    // Delete should also trigger alert
    const [deleteDialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click('#deleteBtn'),
    ]);
    expect(deleteDialog.message()).toBe('Enter a numeric value');
    await deleteDialog.accept();

    // Search should also trigger alert
    const [searchDialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click('#searchBtn'),
    ]);
    expect(searchDialog.message()).toBe('Enter a numeric value');
    await searchDialog.accept();
  });

  test('Insert a value updates snapshots, log, SVG and status', async ({ page }) => {
    const valueInput1 = page.locator('#valueInput1');
    const insertBtn = page.locator('#insertBtn');
    const stepIndexLabel = page.locator('#stepIndex');
    const status1 = page.locator('#status1');
    const log = page.locator('#log');

    // Insert the value 42
    await valueInput.fill('42');
    await insertBtn.click();

    // After insertion, step label should point to the new snapshot start (Step X / Y)
    await expect(stepIndexLabel).toContainText('Step');

    // Log should contain messages relating to the insertion (look for 'Inserted 42' or 'Final state after inserting 42')
    await expect(log).toContainText('Inserted 42').or.toContainText('Final state after inserting 42');

    // The SVG should contain a text node with '42' (node label)
    const nodeText = page.locator('#svg text', { hasText: '42' });
    await expect(nodeText).toHaveCountGreaterThan(0);

    // Status must update to reflect tree size at least 1
    await expect(status).toContainText('Tree size: 1');
  });

  test('Searching for an existing value adds search snapshots and highlights visited nodes via log entries', async ({ page }) => {
    const valueInput2 = page.locator('#valueInput2');
    const searchBtn = page.locator('#searchBtn');
    const log1 = page.locator('#log1');

    // Ensure value 42 exists by inserting if needed
    await valueInput.fill('42');
    await page.click('#insertBtn');

    // Trigger a search for 42
    await valueInput.fill('42');
    await searchBtn.click();

    // Log should contain search visit entries and "Search finished: found 42"
    await expect(log).toContainText('Search: visited').and.toContainText('Search finished: found 42');

    // The current highlighted log line should be present (renderCurrent marks current with background color)
    const highlighted = log.locator('.log-line').filter({ hasCSS: { background: '' } });
    await expect(log).toBeVisible(); // presence is important - exact highlight style can vary
  });

  test('Deleting an existing value produces delete snapshots and updates the tree size', async ({ page }) => {
    const valueInput3 = page.locator('#valueInput3');
    const deleteBtn = page.locator('#deleteBtn');
    const status2 = page.locator('#status2');
    const log2 = page.locator('#log2');

    // Insert 77 then delete it
    await valueInput.fill('77');
    await page.click('#insertBtn');

    // Confirm it exists
    await expect(page.locator('#svg text', { hasText: '77' })).toHaveCountGreaterThan(0);

    // Delete 77
    await valueInput.fill('77');
    await deleteBtn.click();

    // Log should indicate deleting node or final state after deleting 77
    await expect(log).toContainText('Deleting node 77').or.toContainText('Final state after deleting 77');

    // Status should reflect size decreased (since we inserted one then deleted, size likely back to original)
    await expect(status).toContainText('Tree size:');

    // The SVG should not contain '77' anymore in its text labels (at least not as a visible node label)
    const node77 = page.locator('#svg text', { hasText: '77' });
    // It might be present in a message text element (snapshot messages include numbers). Ensure there is no circle label '77' by checking the group that has radius circle and text; a simpler assert: expect count to be 0 or message-only existence. We'll check that at least a node label '77' is not present as a node group: the node text inside groups will still be 'text' nodes, so here we check that there is no element with exact text '77' where parent is a <g> (node rendering uses a <g> per node). Use JS evaluation to detect text inside <g>.
    const hasNode77InsideGroup = await page.evaluate(() => {
      const svg = document.getElementById('svg');
      if (!svg) return false;
      // find text nodes with exact content '77' that are children of <g>
      const texts = Array.from(svg.querySelectorAll('g > text'));
      return texts.some(t => t.textContent === '77');
    });
    expect(hasNode77InsideGroup).toBeFalsy();
  });

  test('Clear button resets the tree and SVG to empty state', async ({ page }) => {
    const valueInput4 = page.locator('#valueInput4');
    const clearBtn = page.locator('#clearBtn');
    const status3 = page.locator('#status3');
    const svg1 = page.locator('#svg1');

    // Insert a value so tree is not empty
    await valueInput.fill('15');
    await page.click('#insertBtn');
    await expect(status).not.toContainText('Tree size: 0');

    // Click Clear
    await clearBtn.click();

    // Status should indicate Tree size: 0
    await expect(status).toContainText('Tree size: 0');

    // SVG should display '(empty tree)' message
    await expect(svg.locator('text', { hasText: '(empty tree)' })).toHaveCount(1);
  });

  test('Sample and Random sequence buttons produce multiple snapshots and update step index', async ({ page }) => {
    const sampleBtn = page.locator('#sampleBtn');
    const randomBtn = page.locator('#randomBtn');
    const stepLabel1 = page.locator('#stepIndex');
    const log3 = page.locator('#log3');

    // Click sample to load known sample
    await sampleBtn.click();

    // After sample, step index and log should reflect multiple steps
    await expect(stepLabel).toContainText('Step');
    await expect(log).toContainText('Inserted sample sequence').or.toContainText('About to insert');

    // Click random to add 7 random inserts
    await randomBtn.click();

    // After random, log should include "Final state after adding"
    await expect(log).toContainText('Final state after adding');

    // The step label must reflect there are multiple steps remaining
    await expect(stepLabel).toContainText('/');
  });

  test('Play/Pause toggles playback state text and Next/Prev step buttons change step index', async ({ page }) => {
    const playPause = page.locator('#playPause');
    const nextBtn = page.locator('#nextStep');
    const prevBtn = page.locator('#prevStep');
    const stepLabel2 = page.locator('#stepIndex');

    // Record initial step label
    const initialLabel = await stepLabel.textContent();

    // Click Play -> should change button text to Pause style
    await playPause.click();
    await expect(playPause).toHaveText(/Pause/);

    // Clicking Play again (pause) should change back
    await playPause.click();
    await expect(playPause).toHaveText(/Play/);

    // Use Next to advance a step
    await nextBtn.click();
    const afterNext = await stepLabel.textContent();
    expect(afterNext).not.toBe(initialLabel);

    // Use Prev to go back
    await prevBtn.click();
    const afterPrev = await stepLabel.textContent();
    // After prev, should be equal or less than afterNext (could be initialLabel)
    expect(afterPrev).not.toBeUndefined();
  });

  test('Keyboard and speed slider UI elements exist and changing speed while playing restarts interval behavior (UI-level check)', async ({ page }) => {
    // This test focuses on UI elements and that speed input exists and is interactive.
    const speed = page.locator('#speed');
    const playPause1 = page.locator('#playPause1');

    // Verify speed input exists and has default value
    await expect(speed).toBeVisible();
    const defaultVal = await speed.getAttribute('value');
    expect(Number(defaultVal)).toBeGreaterThanOrEqual(200);

    // Start playing and then change speed; verify playPause text and no exceptions thrown (captured in afterEach)
    await playPause.click();
    await expect(playPause).toHaveText(/Pause/);

    // Change the speed slider value - this will cause the script to restart autoplay if playing
    await speed.fill('400');
    await speed.press('Enter');

    // Pause playback to clean up UI state
    await playPause.click();
    await expect(playPause).toHaveText(/Play/);
  });
});