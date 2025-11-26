import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1ebec1-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Fibonacci Sequence Explorer', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Initial State - Idle', () => {
    test('should display initial values correctly', async () => {
      const resultText = await page.textContent('#result');
      expect(resultText).toBe('—');
      const timeText = await page.textContent('#timeTaken');
      expect(timeText).toBe('—');
    });

    test('should enable controls on idle state', async () => {
      const computeButton = await page.isEnabled('#compute');
      expect(computeButton).toBe(true);
      const clearButton = await page.isEnabled('#clear');
      expect(clearButton).toBe(true);
    });
  });

  test.describe('Computing Fibonacci Numbers', () => {
    test('should compute Fibonacci number on button click', async () => {
      await page.fill('#n', '12');
      await page.selectOption('#method', 'fast');
      await page.click('#compute');

      await page.waitForTimeout(1000); // Wait for computation to finish

      const resultText = await page.textContent('#result');
      expect(resultText).toContain('144'); // F(12) = 144
      const timeText = await page.textContent('#timeTaken');
      expect(timeText).not.toBe('…');
    });

    test('should show error alert for negative input', async () => {
      await page.fill('#n', '-1');
      await page.click('#compute');

      const alertText = await page.waitForEvent('dialog');
      expect(alertText.message()).toBe('Please enter a non-negative integer for n.');
      await alertText.dismiss();
    });

    test('should confirm before computing with naive method for n > 40', async () => {
      await page.fill('#n', '41');
      await page.selectOption('#method', 'naive');
      await page.click('#compute');

      const alertText = await page.waitForEvent('dialog');
      expect(alertText.message()).toBe('Naive recursion for n > 40 will be very slow. Continue?');
      await alertText.accept(); // Confirm to continue computation
    });

    test('should display full sequence when mode is set to sequence', async () => {
      await page.fill('#n', '5');
      await page.selectOption('#mode', 'sequence');
      await page.click('#compute');

      await page.waitForTimeout(1000); // Wait for computation to finish

      const sequenceList = await page.innerHTML('#sequenceList');
      expect(sequenceList).toContain('F(0) = 0');
      expect(sequenceList).toContain('F(1) = 1');
      expect(sequenceList).toContain('F(2) = 1');
      expect(sequenceList).toContain('F(3) = 2');
      expect(sequenceList).toContain('F(4) = 3');
      expect(sequenceList).toContain('F(5) = 5');
    });
  });

  test.describe('Clearing Output', () => {
    test('should clear results and reset state', async () => {
      await page.click('#clear');

      const resultText = await page.textContent('#result');
      expect(resultText).toBe('—');
      const timeText = await page.textContent('#timeTaken');
      expect(timeText).toBe('—');
      const sequenceList = await page.innerHTML('#sequenceList');
      expect(sequenceList).toBe('');
    });
  });

  test.describe('Copying Result', () => {
    test('should copy result to clipboard', async () => {
      await page.fill('#n', '10');
      await page.selectOption('#method', 'fast');
      await page.click('#compute');

      await page.waitForTimeout(1000); // Wait for computation to finish

      await page.click('#copyResult');
      const alertText = await page.waitForEvent('dialog');
      expect(alertText.message()).toBe('Copied to clipboard');
      await alertText.dismiss();
    });
  });

  test.describe('Drawing and Animating Spiral', () => {
    test('should draw spiral with specified k', async () => {
      await page.fill('#kDraw', '5');
      await page.click('#draw');

      const canvas = await page.$('#canvas');
      expect(canvas).not.toBeNull(); // Ensure canvas is present
    });

    test('should animate spiral', async () => {
      await page.click('#animate');
      await page.waitForTimeout(2000); // Allow some time for animation

      const animateButtonText = await page.textContent('#animate');
      expect(animateButtonText).toBe('Stop');

      await page.click('#animate'); // Stop animation
      const stoppedButtonText = await page.textContent('#animate');
      expect(stoppedButtonText).toBe('Animate');
    });
  });

  test.describe('Canvas Resizing', () => {
    test('should resize canvas on window resize', async () => {
      const initialWidth = await page.evaluate(() => window.innerWidth);
      await page.setViewportSize({ width: initialWidth - 100, height: 800 });
      await page.waitForTimeout(500); // Allow time for resize

      const canvasWidth = await page.evaluate(() => document.getElementById('canvas').width);
      expect(canvasWidth).toBeLessThan(initialWidth);
    });
  });
});