import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fef4f1-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Prim\'s Algorithm Visualization Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.reload();
  });

  test('Initial state is Idle', async () => {
    const stepButtonDisabled = await page.isDisabled('#stepBtn');
    const runButtonDisabled = await page.isDisabled('#runBtn');
    const resetButtonDisabled = await page.isDisabled('#resetBtn');
    expect(stepButtonDisabled).toBe(true);
    expect(runButtonDisabled).toBe(true);
    expect(resetButtonDisabled).toBe(true);
  });

  test('Load Graph transitions to LoadingGraph state', async () => {
    await page.fill('#edgesList', 'A B 4\nA C 3\nB C 1');
    await page.fill('#startNode', 'A');
    await page.click('#loadGraphBtn');

    const logContent = await page.textContent('#log');
    expect(logContent).toContain('Graph loaded with');
    expect(logContent).toContain('Start node set to \'A\'');
    expect(await page.isDisabled('#loadGraphBtn')).toBe(true);
    expect(await page.isDisabled('#stepBtn')).toBe(false);
    expect(await page.isDisabled('#runBtn')).toBe(false);
    expect(await page.isDisabled('#resetBtn')).toBe(false);
  });

  test('Next Step transitions to StepExecution state', async () => {
    await page.fill('#edgesList', 'A B 4\nA C 3\nB C 1');
    await page.fill('#startNode', 'A');
    await page.click('#loadGraphBtn');
    await page.click('#stepBtn');

    const logContent = await page.textContent('#log');
    expect(logContent).toContain('STEP:');
    expect(await page.isDisabled('#stepBtn')).toBe(false);
  });

  test('Run Automatically transitions to AutomaticRun state', async () => {
    await page.fill('#edgesList', 'A B 4\nA C 3\nB C 1');
    await page.fill('#startNode', 'A');
    await page.click('#loadGraphBtn');
    await page.click('#runBtn');

    const logContent = await page.textContent('#log');
    expect(logContent).toContain('Running automatically with 1 sec delay per step...');
    expect(await page.isDisabled('#runBtn')).toBe(true);
  });

  test('Automatic run completes and transitions to Completed state', async () => {
    await page.fill('#edgesList', 'A B 4\nA C 3\nB C 1');
    await page.fill('#startNode', 'A');
    await page.click('#loadGraphBtn');
    await page.click('#runBtn');

    await page.waitForTimeout(5000); // Wait for the automatic run to complete

    const logContent = await page.textContent('#log');
    expect(logContent).toContain('Algorithm finished automatically.');
    expect(await page.isDisabled('#resetBtn')).toBe(false);
  });

  test('Reset transitions back to Idle state', async () => {
    await page.fill('#edgesList', 'A B 4\nA C 3\nB C 1');
    await page.fill('#startNode', 'A');
    await page.click('#loadGraphBtn');
    await page.click('#resetBtn');

    const logContent = await page.textContent('#log');
    expect(logContent).toContain('Enter graph edges and press "Load Graph"');
    expect(await page.isDisabled('#stepBtn')).toBe(true);
    expect(await page.isDisabled('#runBtn')).toBe(true);
    expect(await page.isDisabled('#resetBtn')).toBe(true);
  });

  test('Load Graph with invalid input shows alert', async () => {
    await page.fill('#edgesList', '');
    await page.fill('#startNode', 'A');
    await page.click('#loadGraphBtn');

    const alert = await page.waitForEvent('dialog');
    expect(alert.message()).toContain('Please enter edges.');
    await alert.dismiss();
  });

  test('Load Graph with non-existent start node shows alert', async () => {
    await page.fill('#edgesList', 'A B 4\nA C 3\nB C 1');
    await page.fill('#startNode', 'D');
    await page.click('#loadGraphBtn');

    const alert = await page.waitForEvent('dialog');
    expect(alert.message()).toContain('Start node \'D\' not found in edges.');
    await alert.dismiss();
  });

  test('Next Step does not proceed when algorithm is complete', async () => {
    await page.fill('#edgesList', 'A B 4\nA C 3\nB C 1');
    await page.fill('#startNode', 'A');
    await page.click('#loadGraphBtn');
    await page.click('#stepBtn'); // First step
    await page.click('#stepBtn'); // Second step
    await page.click('#stepBtn'); // Third step

    const logContent = await page.textContent('#log');
    expect(logContent).toContain('Algorithm finished. No more steps.');
    expect(await page.isDisabled('#stepBtn')).toBe(true);
  });
});