import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1f0ce2-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Two Pointers Interactive Playground', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Initial State Tests', () => {
    test('should display initial status message', async () => {
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Choose a demo and prepare an array. Use Step or Auto to advance.');
    });

    test('should initialize with default demo selected', async () => {
      const demoValue = await page.inputValue('#demoSelect');
      expect(demoValue).toBe('pairSum');
    });
  });

  test.describe('Demo Change Tests', () => {
    test('should change demo and update UI', async () => {
      await page.selectOption('#demoSelect', 'reverse');
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Demo changed');
      const pseudocodeText = await page.textContent('#pseudocode');
      expect(pseudocodeText).toContain('Reverse Array (in-place)');
    });
  });

  test.describe('Array Input Tests', () => {
    test('should apply valid array input', async () => {
      await page.fill('#arrInput', '1,2,3,4');
      await page.click('#applyArr');
      const arrayCells = await page.$$('.cell');
      expect(arrayCells.length).toBe(4);
    });

    test('should show error for invalid array input', async () => {
      await page.fill('#arrInput', 'invalid');
      await page.click('#applyArr');
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Invalid array. Use comma separated numbers.');
    });
  });

  test.describe('Random Array Generation Tests', () => {
    test('should generate a random array', async () => {
      await page.click('#genBtn');
      const arrayCells = await page.$$('.cell');
      expect(arrayCells.length).toBeGreaterThan(0);
    });
  });

  test.describe('Step Functionality Tests', () => {
    test('should step through the algorithm', async () => {
      await page.click('#stepBtn');
      const stepInfoText = await page.textContent('#stepInfo');
      expect(stepInfoText).toContain('Steps: 1');
    });

    test('should show finished status when complete', async () => {
      await page.click('#fastBtn');
      await page.waitForTimeout(2000); // wait for fast run to complete
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Finished');
    });
  });

  test.describe('Auto Mode Tests', () => {
    test('should start auto mode', async () => {
      await page.click('#autoBtn');
      const autoButtonText = await page.textContent('#autoBtn');
      expect(autoButtonText).toBe('Auto ■');
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Auto running...');
    });

    test('should stop auto mode', async () => {
      await page.click('#autoBtn');
      const autoButtonText = await page.textContent('#autoBtn');
      expect(autoButtonText).toBe('Auto ▶');
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Auto stopped');
    });
  });

  test.describe('Reset Functionality Tests', () => {
    test('should reset the state', async () => {
      await page.click('#resetBtn');
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Choose a demo and prepare an array. Use Step or Auto to advance.');
    });
  });

  test.describe('Target Setting Tests', () => {
    test('should set a valid target', async () => {
      await page.fill('#targetInput', '5');
      await page.click('#setTarget');
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Target set to 5');
    });

    test('should show error for invalid target', async () => {
      await page.fill('#targetInput', 'invalid');
      await page.click('#setTarget');
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Invalid target');
    });
  });

  test.describe('Cell Click Tests', () => {
    test('should display clicked cell value', async () => {
      await page.fill('#arrInput', '1,2,3,4');
      await page.click('#applyArr');
      await page.click('.cell'); // click the first cell
      const statusText = await page.textContent('#status');
      expect(statusText).toContain('Clicked index 0. Value: 1');
    });
  });
});