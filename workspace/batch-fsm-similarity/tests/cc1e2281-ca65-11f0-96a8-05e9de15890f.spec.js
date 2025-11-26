import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1e2281-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Binary Search Interactive Demo', () => {
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

  test('Initial state is idle', async () => {
    const message = await page.locator('#message').textContent();
    expect(message).toBe('Ready');
    const status = await page.locator('#statusTxt').textContent();
    expect(status).toBe('idle');
  });

  test('Generate random sorted array', async () => {
    await page.click('#generateBtn');
    const arrayInputValue = await page.locator('#arrayInput').inputValue();
    expect(arrayInputValue).not.toBe('');
    const arrayRowCount = await page.locator('#arrayRow .cell').count();
    expect(arrayRowCount).toBeGreaterThan(0);
  });

  test('Apply settings with valid array', async () => {
    await page.fill('#arrayInput', '2,5,7,9,13,18,21,34,55');
    await page.click('#applyBtn');
    const message = await page.locator('#message').textContent();
    expect(message).toBe('Computing steps...');
    const status = await page.locator('#statusTxt').textContent();
    expect(status).toBe('ready');
  });

  test('Handle empty array scenario', async () => {
    await page.fill('#arrayInput', '');
    await page.click('#applyBtn');
    const message = await page.locator('#message').textContent();
    expect(message).toBe('Array empty');
    const submessage = await page.locator('#submessage').textContent();
    expect(submessage).toContain('Please provide numbers separated by commas or generate an array.');
  });

  test('Handle invalid target scenario', async () => {
    await page.fill('#arrayInput', '2,5,7,9');
    await page.fill('#targetInput', 'invalid');
    await page.click('#applyBtn');
    const message = await page.locator('#message').textContent();
    expect(message).toBe('Target not set');
    const status = await page.locator('#statusTxt').textContent();
    expect(status).toBe('idle');
  });

  test('Pick random target', async () => {
    await page.fill('#arrayInput', '2,5,7,9,13,18,21,34,55');
    await page.click('#applyBtn');
    await page.click('#randomTargetBtn');
    const targetValue = await page.locator('#targetVal').textContent();
    expect(targetValue).not.toBe('—');
  });

  test('Play and pause functionality', async () => {
    await page.fill('#arrayInput', '2,5,7,9,13,18,21,34,55');
    await page.fill('#targetInput', '9');
    await page.click('#applyBtn');
    await page.click('#playBtn');
    const playButtonText = await page.locator('#playBtn').textContent();
    expect(playButtonText).toContain('Pause');
    await page.click('#playBtn');
    const pauseButtonText = await page.locator('#playBtn').textContent();
    expect(pauseButtonText).toContain('Play');
  });

  test('Step through the algorithm', async () => {
    await page.fill('#arrayInput', '2,5,7,9,13,18,21,34,55');
    await page.fill('#targetInput', '9');
    await page.click('#applyBtn');
    await page.click('#nextBtn');
    const stepIndex = await page.locator('#stepIdx').textContent();
    expect(stepIndex).toBe('1');
    await page.click('#prevBtn');
    const prevStepIndex = await page.locator('#stepIdx').textContent();
    expect(prevStepIndex).toBe('0');
  });

  test('Reset functionality', async () => {
    await page.fill('#arrayInput', '2,5,7,9,13,18,21,34,55');
    await page.fill('#targetInput', '9');
    await page.click('#applyBtn');
    await page.click('#playBtn');
    await page.click('#resetBtn');
    const stepIndex = await page.locator('#stepIdx').textContent();
    expect(stepIndex).toBe('0');
  });

  test('Change algorithm variant', async () => {
    await page.fill('#arrayInput', '2,5,7,9,13,18,21,34,55');
    await page.fill('#targetInput', '9');
    await page.click('#applyBtn');
    await page.selectOption('#variantSelect', 'recursive');
    const message = await page.locator('#message').textContent();
    expect(message).toBe('Computing steps...');
  });

  test('Change animation speed', async () => {
    await page.fill('#arrayInput', '2,5,7,9,13,18,21,34,55');
    await page.fill('#targetInput', '9');
    await page.click('#applyBtn');
    await page.fill('#speedRange', '300');
    const speedValue = await page.locator('#speedRange').inputValue();
    expect(speedValue).toBe('300');
  });

  test('Handle state transition to found', async () => {
    await page.fill('#arrayInput', '2,5,7,9,13,18,21,34,55');
    await page.fill('#targetInput', '9');
    await page.click('#applyBtn');
    await page.click('#playBtn');
    await page.waitForTimeout(1000); // Wait for a few steps
    const status = await page.locator('#statusTxt').textContent();
    expect(status).toBe('found');
  });

  test('Handle state transition to not found', async () => {
    await page.fill('#arrayInput', '2,5,7,9,13,18,21,34,55');
    await page.fill('#targetInput', '100');
    await page.click('#applyBtn');
    await page.click('#playBtn');
    await page.waitForTimeout(1000); // Wait for a few steps
    const status = await page.locator('#statusTxt').textContent();
    expect(status).toBe('not found');
  });

  test('Ensure array remains sorted when checkbox is checked', async () => {
    await page.fill('#arrayInput', '5,2,9,1,3');
    await page.check('#sortChk');
    await page.click('#applyBtn');
    const arrayCells = await page.locator('#arrayRow .cell');
    const values = await arrayCells.evaluateAll(cells => cells.map(cell => parseInt(cell.textContent)));
    expect(values).toEqual(values.sort((a, b) => a - b));
  });
});