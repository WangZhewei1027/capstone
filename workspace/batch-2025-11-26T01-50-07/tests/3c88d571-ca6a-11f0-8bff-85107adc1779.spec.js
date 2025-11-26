import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c88d571-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Selection Sort Visualization', () => {
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

  test.describe('Initial State', () => {
    test('should render the initial array', async () => {
      const bars = await page.$$('#arrayContainer .bar');
      expect(bars.length).toBeGreaterThan(0); // Ensure there are bars rendered
    });

    test('controls should be enabled initially', async () => {
      const startBtn = await page.$('#startBtn');
      const resetBtn = await page.$('#resetBtn');
      const sizeInput = await page.$('#sizeInput');
      const speedRange = await page.$('#speedRange');
      expect(await startBtn.isEnabled()).toBe(true);
      expect(await resetBtn.isEnabled()).toBe(true);
      expect(await sizeInput.isEnabled()).toBe(true);
      expect(await speedRange.isEnabled()).toBe(true);
    });
  });

  test.describe('Sorting Process', () => {
    test('should start sorting when Start button is clicked', async () => {
      await page.click('#startBtn');
      await page.waitForTimeout(2000); // Wait for sorting to start

      const startBtn = await page.$('#startBtn');
      expect(await startBtn.isEnabled()).toBe(false); // Start button should be disabled
    });

    test('should highlight the current and minimum elements during sorting', async () => {
      await page.click('#startBtn');
      await page.waitForTimeout(500); // Wait for some sorting steps

      const currentBars = await page.$$('.current');
      const minBars = await page.$$('.min');
      expect(currentBars.length).toBeGreaterThan(0); // Ensure current element is highlighted
      expect(minBars.length).toBeGreaterThan(0); // Ensure minimum element is highlighted
    });

    test('should mark the last element as sorted', async () => {
      await page.click('#startBtn');
      await page.waitForTimeout(3000); // Wait for sorting to complete

      const sortedBars = await page.$$('.sorted');
      expect(sortedBars.length).toBeGreaterThan(0); // Ensure at least one element is marked as sorted
    });
  });

  test.describe('Reset Functionality', () => {
    test('should reset the array when Reset button is clicked', async () => {
      await page.click('#startBtn');
      await page.waitForTimeout(1000); // Allow some sorting
      await page.click('#resetBtn');

      const bars = await page.$$('#arrayContainer .bar');
      expect(bars.length).toBeGreaterThan(0); // Ensure bars are rendered after reset
      const startBtn = await page.$('#startBtn');
      expect(await startBtn.isEnabled()).toBe(true); // Start button should be enabled
    });
  });

  test.describe('Change Array Size', () => {
    test('should change the array size and reset the array', async () => {
      await page.fill('#sizeInput', '10');
      await page.dispatchEvent('#sizeInput', 'change');

      const bars = await page.$$('#arrayContainer .bar');
      expect(bars.length).toBe(10); // Ensure the array size is updated
    });
  });

  test.describe('Change Sorting Speed', () => {
    test('should change the sorting speed', async () => {
      await page.fill('#speedRange', '1000');
      await page.dispatchEvent('#speedRange', 'input');

      const speedLabel = await page.$('#speedLabel');
      const labelText = await speedLabel.innerText();
      expect(labelText).toBe('1000 ms'); // Ensure the speed label updates correctly
    });
  });

  test.describe('Edge Cases', () => {
    test('should not start sorting if already sorting', async () => {
      await page.click('#startBtn');
      await page.click('#startBtn'); // Click again while sorting

      const startBtn = await page.$('#startBtn');
      expect(await startBtn.isEnabled()).toBe(false); // Start button should still be disabled
    });

    test('should not reset while sorting', async () => {
      await page.click('#startBtn');
      await page.click('#resetBtn'); // Click reset while sorting

      const bars = await page.$$('#arrayContainer .bar');
      expect(bars.length).toBeGreaterThan(0); // Ensure bars are still rendered
    });
  });
});