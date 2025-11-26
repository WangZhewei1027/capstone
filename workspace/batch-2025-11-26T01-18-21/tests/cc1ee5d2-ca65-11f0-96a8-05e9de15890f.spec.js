import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1ee5d2-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Recursion Explorer Interactive Application', () => {
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

  test('Initial state should be Idle', async () => {
    const playBtnDisabled = await page.isDisabled('#play');
    const pauseBtnDisabled = await page.isDisabled('#pause');
    const stepBtnDisabled = await page.isDisabled('#step');
    expect(playBtnDisabled).toBe(false);
    expect(pauseBtnDisabled).toBe(true);
    expect(stepBtnDisabled).toBe(false);
  });

  test('Generate Trace transitions to Generating state', async () => {
    await page.fill('#param', '6');
    await page.click('#generate');
    await expect(page.locator('#log')).toContainText('Generated 7 events for factorial(6).');
  });

  test('Generated Trace transitions to Ready state', async () => {
    await page.fill('#param', '6');
    await page.click('#generate');
    await page.waitForTimeout(1000); // wait for generation to complete
    const playBtnDisabled = await page.isDisabled('#play');
    expect(playBtnDisabled).toBe(false);
  });

  test('Play transitions to Playing state', async () => {
    await page.fill('#param', '6');
    await page.click('#generate');
    await page.waitForTimeout(1000);
    await page.click('#play');
    const pauseBtnDisabled = await page.isDisabled('#pause');
    expect(pauseBtnDisabled).toBe(false);
  });

  test('Pause transitions back to Paused state', async () => {
    await page.fill('#param', '6');
    await page.click('#generate');
    await page.waitForTimeout(1000);
    await page.click('#play');
    await page.click('#pause');
    const playBtnDisabled = await page.isDisabled('#play');
    expect(playBtnDisabled).toBe(false);
  });

  test('Step transitions to Stepping state', async () => {
    await page.fill('#param', '6');
    await page.click('#generate');
    await page.waitForTimeout(1000);
    await page.click('#step');
    const logContent = await page.locator('#log').innerText();
    expect(logContent).toContain('CALL fact(6)');
  });

  test('Reset transitions back to Idle state', async () => {
    await page.fill('#param', '6');
    await page.click('#generate');
    await page.waitForTimeout(1000);
    await page.click('#reset');
    const resultText = await page.locator('#result').innerText();
    expect(resultText).toBe('—');
  });

  test('Changing example updates parameter label', async () => {
    await page.selectOption('#example', 'fractal_tree');
    const paramLabelText = await page.locator('#paramLabel').innerText();
    expect(paramLabelText).toBe('depth');
  });

  test('Changing parameter value respects bounds', async () => {
    await page.fill('#param', '15'); // exceed max
    const paramValue = await page.locator('#param').inputValue();
    expect(paramValue).toBe('12'); // should clamp to max
  });

  test('Playback finishes correctly', async () => {
    await page.fill('#param', '6');
    await page.click('#generate');
    await page.waitForTimeout(1000);
    await page.click('#play');
    await page.waitForTimeout(5000); // wait for playback to finish
    const resultText = await page.locator('#result').innerText();
    expect(resultText).not.toBe('—'); // should show a result
  });

  test('Error handling for naive Fibonacci', async () => {
    await page.selectOption('#example', 'fib_naive');
    await page.fill('#param', '15'); // exceed max
    await page.click('#generate');
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('Naive Fibonacci grows exponentially');
    await alertText.dismiss();
  });

  test('Error handling for fractal tree', async () => {
    await page.selectOption('#example', 'fractal_tree');
    await page.fill('#param', '15'); // exceed max
    await page.click('#generate');
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('High fractal depth may be slow');
    await alertText.dismiss();
  });
});