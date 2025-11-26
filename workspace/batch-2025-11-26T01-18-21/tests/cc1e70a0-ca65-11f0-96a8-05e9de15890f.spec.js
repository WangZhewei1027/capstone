import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1e70a0-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Floyd-Warshall Algorithm Visualizer', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state should be Idle', async () => {
    const statusText = await page.textContent('#statusText');
    expect(statusText).toBe('Status: ready');
  });

  test('Editing the matrix should transition to EditingMatrix', async () => {
    await page.fill('#matrixPanel table.matrix-input tbody tr:nth-child(1) td:nth-child(2) input', '3');
    await page.click('#matrixPanel table.matrix-input tbody tr:nth-child(1) td:nth-child(2) input'); // Trigger change
    const statusText = await page.textContent('#statusText');
    expect(statusText).toBe('Matrix edited — ready');
  });

  test('Changing node count should transition to ChangingParams', async () => {
    await page.fill('#nodeCount', '6');
    await page.click('#nodeCount'); // Trigger change
    const statusText = await page.textContent('#statusText');
    expect(statusText).toBe('ready');
  });

  test('Toggling Directed should transition to ChangingParams', async () => {
    await page.selectOption('#directed', 'false');
    const statusText = await page.textContent('#statusText');
    expect(statusText).toBe('ready');
  });

  test('Toggling Allow negatives should transition to ChangingParams', async () => {
    await page.selectOption('#allowNeg', 'true');
    const statusText = await page.textContent('#statusText');
    expect(statusText).toBe('ready');
  });

  test('Randomizing the graph should transition to RandomizingGraph', async () => {
    await page.click('#makeRandom');
    const statusText = await page.textContent('#statusText');
    expect(statusText).toBe('Random graph created');
  });

  test('Resetting the matrix should transition to ResettingMatrix', async () => {
    await page.click('#resetBtn');
    const statusText = await page.textContent('#statusText');
    expect(statusText).toBe('Matrix reset');
  });

  test('Running Floyd-Warshall should transition to ConsideringSnapshot', async () => {
    await page.fill('#matrixPanel table.matrix-input tbody tr:nth-child(1) td:nth-child(2) input', '1');
    await page.click('#runBtn');
    const statusText = await page.textContent('#statusText');
    expect(statusText).toContain('Run complete (step history recorded)');
  });

  test('Stepping forward should transition between snapshots', async () => {
    await page.click('#stepForward');
    const statusText = await page.textContent('#statusText');
    expect(statusText).toContain('Considering k=');
  });

  test('Stepping back should transition back to previous snapshot', async () => {
    await page.click('#stepBack');
    const statusText = await page.textContent('#statusText');
    expect(statusText).toContain('Considering k=');
  });

  test('Play/Pause functionality should toggle state', async () => {
    await page.click('#playPause');
    let statusText = await page.textContent('#statusText');
    expect(statusText).toBe('Paused');

    await page.click('#playPause');
    statusText = await page.textContent('#statusText');
    expect(statusText).toContain('Considering k=');
  });

  test('Computing Final Only should transition to FinalResult', async () => {
    await page.click('#runFastBtn');
    const statusText = await page.textContent('#statusText');
    expect(statusText).toContain('Computed final matrices (no step history).');
  });

  test('Querying path should transition to PathQuerying', async () => {
    await page.selectOption('#fromNode', '0');
    await page.selectOption('#toNode', '1');
    await page.click('#showPath');
    const pathResult = await page.textContent('#pathResult');
    expect(pathResult).toContain('Path:');
  });

  test('Negative cycle detection should show warning', async () => {
    await page.fill('#matrixPanel table.matrix-input tbody tr:nth-child(1) td:nth-child(2) input', '-5');
    await page.click('#runBtn');
    await page.click('#showPath');
    const pathResult = await page.textContent('#pathResult');
    expect(pathResult).toContain('Warning: negative cycle exists');
  });

  test('Edge case: Invalid input should alert user', async () => {
    await page.fill('#matrixPanel table.matrix-input tbody tr:nth-child(1) td:nth-child(2) input', 'abc');
    await page.click('#matrixPanel table.matrix-input tbody tr:nth-child(1) td:nth-child(2) input'); // Trigger change
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('Please enter a finite number');
    await alertText.dismiss();
  });

  test('Edge case: Negative weights not allowed when toggled off', async () => {
    await page.selectOption('#allowNeg', 'false');
    await page.fill('#matrixPanel table.matrix-input tbody tr:nth-child(1) td:nth-child(2) input', '-3');
    await page.click('#matrixPanel table.matrix-input tbody tr:nth-child(1) td:nth-child(2) input'); // Trigger change
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('Negative weights are not allowed currently');
    await alertText.dismiss();
  });
});