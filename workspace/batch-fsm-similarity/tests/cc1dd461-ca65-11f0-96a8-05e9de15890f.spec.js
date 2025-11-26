import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1dd461-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Merge Sort Visualizer Tests', () => {
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
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Ready — generate an array to begin.');
  });

  test('Generate array and transition to Idle', async () => {
    await page.click('#randomizeBtn');
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Array generated. Click Start to record merges and animate.');
  });

  test('Start button transitions to Recording state', async () => {
    await page.click('#randomizeBtn');
    await page.click('#startBtn');
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Playing...');
  });

  test('Pause button transitions to Paused state', async () => {
    await page.click('#randomizeBtn');
    await page.click('#startBtn');
    await page.click('#pauseBtn');
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Paused.');
  });

  test('Step button transitions to Stepping state', async () => {
    await page.click('#randomizeBtn');
    await page.click('#startBtn');
    await page.click('#pauseBtn');
    await page.click('#stepBtn');
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Paused.');
  });

  test('Reset button transitions to Idle state', async () => {
    await page.click('#randomizeBtn');
    await page.click('#startBtn');
    await page.click('#pauseBtn');
    await page.click('#resetBtn');
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Reset.');
  });

  test('Randomize button generates a new array', async () => {
    await page.click('#randomizeBtn');
    const initialArray = await page.$$eval('.bar', bars => bars.map(bar => bar.style.height));
    await page.click('#randomizeBtn');
    const newArray = await page.$$eval('.bar', bars => bars.map(bar => bar.style.height));
    expect(initialArray).not.toEqual(newArray);
  });

  test('Adjusting size updates display', async () => {
    await page.fill('#size', '50');
    const sizeValText = await page.textContent('#sizeVal');
    expect(sizeValText).toContain('50');
  });

  test('Adjusting speed updates display', async () => {
    await page.fill('#speed', '300');
    const speedValText = await page.textContent('#speedVal');
    expect(speedValText).toContain('300 ms');
  });

  test('Toggling order checkbox updates comparator', async () => {
    await page.check('#order');
    const isChecked = await page.isChecked('#order');
    expect(isChecked).toBe(true);
  });

  test('Keyboard shortcuts work correctly', async () => {
    await page.click('#randomizeBtn');
    await page.keyboard.press('Enter');
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Playing...');
    
    await page.keyboard.press('Space');
    const pausedStatusText = await page.textContent('#status');
    expect(pausedStatusText).toContain('Paused.');
  });

  test('Playback completes all actions', async () => {
    await page.click('#randomizeBtn');
    await page.click('#startBtn');
    await page.waitForTimeout(5000); // Wait for playback to finish
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Finished.');
  });

  test('Stepping through actions until done', async () => {
    await page.click('#randomizeBtn');
    await page.click('#startBtn');
    await page.click('#pauseBtn');

    let statusText;
    for (let i = 0; i < 5; i++) {
      await page.click('#stepBtn');
      statusText = await page.textContent('#status');
      expect(statusText).toContain('Paused.');
    }
    expect(statusText).toContain('Paused.');
  });

  test('Resetting while playing stops playback', async () => {
    await page.click('#randomizeBtn');
    await page.click('#startBtn');
    await page.waitForTimeout(1000); // Let it play for a bit
    await page.click('#resetBtn');
    const statusText = await page.textContent('#status');
    expect(statusText).toContain('Reset.');
  });

  test('Edge case: Start without generating an array', async () => {
    await page.click('#resetBtn'); // Ensure we are in Idle state
    await page.click('#startBtn');
    const logText = await page.textContent('#log');
    expect(logText).toContain('No recorded actions. Click Start first.');
  });

  test('Edge case: Step without starting', async () => {
    await page.click('#stepBtn');
    const logText = await page.textContent('#log');
    expect(logText).toContain('Cannot step while playing — pause first.');
  });
});