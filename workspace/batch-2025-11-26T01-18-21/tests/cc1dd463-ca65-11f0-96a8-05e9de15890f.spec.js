import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1dd463-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Heap Sort Visualization Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is Idle', async () => {
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('Idle — generate an array and press Start.');
  });

  test('Generate a new array', async () => {
    await page.click('#random');
    const bars = await page.locator('#vis .bar').count();
    expect(bars).toBeGreaterThan(0);
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('Array generated. Ready.');
  });

  test('Start the sorting process', async () => {
    await page.click('#start');
    const startButtonText = await page.locator('#start').textContent();
    expect(startButtonText).toBe('Pause');
  });

  test('Pause the sorting process', async () => {
    await page.click('#start');
    const startButtonText = await page.locator('#start').textContent();
    expect(startButtonText).toBe('Start');
  });

  test('Step through the sorting process', async () => {
    await page.click('#start'); // Start the sorting
    await page.click('#step'); // Step once
    const activeLine = await page.locator('#pcode .line.active').count();
    expect(activeLine).toBeGreaterThan(0);
  });

  test('Reset the sorting process', async () => {
    await page.click('#reset');
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('Array generated. Ready.');
  });

  test('Change array size', async () => {
    await page.locator('#size').fill('50');
    await page.click('#random');
    const bars = await page.locator('#vis .bar').count();
    expect(bars).toBe(50);
  });

  test('Change speed of sorting', async () => {
    await page.locator('#speed').fill('500');
    const speedValue = await page.locator('#speed').inputValue();
    expect(speedValue).toBe('500');
  });

  test('Show values briefly on visualization area click', async () => {
    await page.click('#vis');
    const barsText = await page.locator('#vis .bar').allTextContents();
    expect(barsText).not.toEqual(Array(barsText.length).fill(''));
    await page.waitForTimeout(800); // Wait for the timeout to clear values
    const clearedBarsText = await page.locator('#vis .bar').allTextContents();
    expect(clearedBarsText).toEqual(Array(clearedBarsText.length).fill(''));
  });

  test('Handle keyboard space to start/pause', async () => {
    await page.keyboard.press('Space');
    let startButtonText = await page.locator('#start').textContent();
    expect(startButtonText).toBe('Pause');
    await page.keyboard.press('Space');
    startButtonText = await page.locator('#start').textContent();
    expect(startButtonText).toBe('Start');
  });

  test('Handle keyboard arrow right to step', async () => {
    await page.click('#reset'); // Reset before stepping
    await page.click('#random'); // Generate a new array
    await page.keyboard.press('ArrowRight');
    const activeLine = await page.locator('#pcode .line.active').count();
    expect(activeLine).toBeGreaterThan(0);
  });

  test('Complete sorting process', async () => {
    await page.click('#start'); // Start sorting
    await page.waitForTimeout(3000); // Wait for some time to allow sorting to complete
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('Sorting complete!');
  });
});