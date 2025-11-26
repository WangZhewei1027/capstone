import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92ff6a21-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Two Pointers Technique Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('State: Idle (S0_Idle)', () => {
    test('should enable controls on idle state', async ({ page }) => {
      const findPairsButton = await page.locator('#findPairsButton');
      await expect(findPairsButton).toBeEnabled();
    });

    test('should transition to InputtingData state on button click', async ({ page }) => {
      await page.click('#findPairsButton');
      const output = await page.locator('#output');
      await expect(output).toHaveText('');
    });
  });

  test.describe('State: InputtingData (S1_InputtingData)', () => {
    test('should highlight inputs when entering data', async ({ page }) => {
      await page.click('#findPairsButton');
      const arrayInput = await page.locator('#arrayInput');
      await arrayInput.fill('1, 2, 3, 4, 5');
      await expect(arrayInput).toHaveValue('1, 2, 3, 4, 5');
    });

    test('should validate inputs and transition to ValidatingInput state', async ({ page }) => {
      await page.click('#findPairsButton');
      await page.fill('#arrayInput', '1, 2, 3, 4, 5');
      await page.fill('#targetInput', '5');
      await page.click('#findPairsButton');
      const output = await page.locator('#output');
      await expect(output).toHaveText('');
    });
  });

  test.describe('State: ValidatingInput (S2_ValidatingInput)', () => {
    test('should show error for invalid input', async ({ page }) => {
      await page.fill('#arrayInput', '1, 2, 3, 4, a');
      await page.fill('#targetInput', '5');
      await page.click('#findPairsButton');
      const output = await page.locator('#output');
      await expect(output).toHaveText(/Error: Array must contain only integers/);
    });

    test('should transition to FindingPairs state on valid input', async ({ page }) => {
      await page.fill('#arrayInput', '1, 2, 3, 4, 5');
      await page.fill('#targetInput', '5');
      await page.click('#findPairsButton');
      await page.waitForTimeout(1000); // Wait for validation to complete
      const output = await page.locator('#output');
      await expect(output).toHaveText('');
    });
  });

  test.describe('State: FindingPairs (S4_FindingPairs)', () => {
    test('should find pairs and transition to DisplayResults state', async ({ page }) => {
      await page.fill('#arrayInput', '1, 2, 3, 4, 5');
      await page.fill('#targetInput', '5');
      await page.click('#findPairsButton');
      await page.waitForTimeout(1500); // Wait for finding pairs to complete
      const output = await page.locator('#output');
      await expect(output).toHaveText(/Pairs that sum to 5:/);
    });
  });

  test.describe('State: DisplayResults (S5_DisplayResults)', () => {
    test('should display results and allow reset', async ({ page }) => {
      await page.fill('#arrayInput', '1, 2, 3, 4, 5');
      await page.fill('#targetInput', '5');
      await page.click('#findPairsButton');
      await page.waitForTimeout(1500); // Wait for results to be displayed
      const output = await page.locator('#output');
      await expect(output).toHaveText(/Pairs that sum to 5:/);
      
      // Reset the state
      await page.click('#findPairsButton');
      const resetOutput = await page.locator('#output');
      await expect(resetOutput).toHaveText('');
    });
  });

  test.describe('Error Handling', () => {
    test('should show error when input array is not sorted', async ({ page }) => {
      await page.fill('#arrayInput', '3, 1, 2, 4');
      await page.fill('#targetInput', '5');
      await page.click('#findPairsButton');
      const output = await page.locator('#output');
      await expect(output).toHaveText(/Error: Array must be sorted in non-decreasing order/);
    });

    test('should dismiss error alert and return to idle state', async ({ page }) => {
      await page.fill('#arrayInput', '3, 1, 2, 4');
      await page.fill('#targetInput', '5');
      await page.click('#findPairsButton');
      const output = await page.locator('#output');
      await expect(output).toHaveText(/Error: Array must be sorted in non-decreasing order/);
      
      // Simulating dismissing error
      await page.fill('#arrayInput', '1, 2, 3, 4');
      await page.fill('#targetInput', '5');
      await page.click('#findPairsButton');
      const resetOutput = await page.locator('#output');
      await expect(resetOutput).toHaveText('');
    });
  });
});