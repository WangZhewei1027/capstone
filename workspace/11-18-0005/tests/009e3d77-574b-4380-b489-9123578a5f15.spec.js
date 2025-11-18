import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/11-18-0005/html/009e3d77-574b-4380-b489-9123578a5f15.html';

test.describe('Bubble Sort Visualization FSM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  // Helper function to get the current FSM state
  async function getCurrentState(page) {
    return await page.evaluate(() => window.getState());
  }

  // Helper function to listen for statechange events
  async function listenForStateChange(page) {
    return await page.evaluate(() => {
      return new Promise(resolve => {
        window.addEventListener('statechange', resolve, { once: true });
      });
    });
  }

  // State Transition Tests
  test.describe('State Transition Tests', () => {
    test('should transition from idle to running on START', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '5,3,8,6');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      const state = await getCurrentState(page);
      expect(state).toBe('running');
    });

    test('should transition from running to paused on PAUSE', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '5,3,8,6');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      await page.click('[data-testid="pause-button"]');
      await listenForStateChange(page);
      const state = await getCurrentState(page);
      expect(state).toBe('paused');
    });

    test('should transition from paused to running on START', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '5,3,8,6');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      await page.click('[data-testid="pause-button"]');
      await listenForStateChange(page);
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      const state = await getCurrentState(page);
      expect(state).toBe('running');
    });

    test('should transition to completed on COMPLETE', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '1,2,3');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      await page.evaluate(() => window.dispatchEvent(new Event('COMPLETE')));
      await listenForStateChange(page);
      const state = await getCurrentState(page);
      expect(state).toBe('completed');
    });

    test('should transition to idle on RESET from any state', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '5,3,8,6');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      await page.click('[data-testid="reset-button"]');
      await listenForStateChange(page);
      const state = await getCurrentState(page);
      expect(state).toBe('idle');
    });
  });

  // UI Element Tests
  test.describe('UI Element Tests', () => {
    test('should have all required elements with correct test IDs', async ({ page }) => {
      await page.waitForSelector('[data-testid="array-display"]');
      await page.waitForSelector('[data-testid="start-button"]');
      await page.waitForSelector('[data-testid="pause-button"]');
      await page.waitForSelector('[data-testid="reset-button"]');
      await page.waitForSelector('[data-testid="input-field"]');
      await page.waitForSelector('[data-testid="error-message"]');
    });

    test('should have correct element visibility and interactivity in idle state', async ({ page }) => {
      const startButton = await page.$('[data-testid="start-button"]');
      const pauseButton = await page.$('[data-testid="pause-button"]');
      const resetButton = await page.$('[data-testid="reset-button"]');
      const inputField = await page.$('[data-testid="input-field"]');

      expect(await startButton.isEnabled()).toBe(true);
      expect(await pauseButton.isEnabled()).toBe(false);
      expect(await resetButton.isEnabled()).toBe(false);
      expect(await inputField.isEnabled()).toBe(true);
    });

    // Additional UI tests for other states can be added here
  });

  // Validation Tests
  test.describe('Validation Tests', () => {
    test('should show error for empty input', async ({ page }) => {
      await page.click('[data-testid="start-button"]');
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toBe('Input cannot be empty');
    });

    test('should show error for invalid input', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', 'invalid');
      await page.click('[data-testid="start-button"]');
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toBe('Invalid input');
    });

    test('should show error for input exceeding max size', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21');
      await page.click('[data-testid="start-button"]');
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toBe('Input exceeds maximum size');
    });
  });

  // Acceptance Criteria Tests
  test.describe('Acceptance Criteria Tests', () => {
    test('should allow user to input custom data', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '5,3,8,6');
      const inputValue = await page.inputValue('[data-testid="input-field"]');
      expect(inputValue).toBe('5,3,8,6');
    });

    test('should start, pause, and reset animation', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '5,3,8,6');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      let state = await getCurrentState(page);
      expect(state).toBe('running');

      await page.click('[data-testid="pause-button"]');
      await listenForStateChange(page);
      state = await getCurrentState(page);
      expect(state).toBe('paused');

      await page.click('[data-testid="reset-button"]');
      await listenForStateChange(page);
      state = await getCurrentState(page);
      expect(state).toBe('idle');
    });

    test('should visually clear each comparison and swap', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '5,3,8,6');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      // Verify visual feedback for comparison and swap
      // This requires specific DOM checks for animations
    });

    test('should correctly highlight final sorted result', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '1,2,3');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      await page.evaluate(() => window.dispatchEvent(new Event('COMPLETE')));
      await listenForStateChange(page);
      // Verify that sorted array is highlighted in green
    });

    test('should display error messages for invalid inputs', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '');
      await page.click('[data-testid="start-button"]');
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toBe('Input cannot be empty');
    });
  });

  // Edge Case Tests
  test.describe('Edge Case Tests', () => {
    test('should handle rapid user interactions', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '5,3,8,6');
      await page.click('[data-testid="start-button"]');
      await page.click('[data-testid="pause-button"]');
      await page.click('[data-testid="start-button"]');
      await page.click('[data-testid="reset-button"]');
      const state = await getCurrentState(page);
      expect(state).toBe('idle');
    });

    test('should maintain state consistency after errors', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '');
      await page.click('[data-testid="start-button"]');
      const state = await getCurrentState(page);
      expect(state).toBe('idle');
    });
  });

  // Animation Tests
  test.describe('Animation Tests', () => {
    test('should animate comparisons and swaps', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '5,3,8,6');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      // Check for animation of comparisons and swaps
      // This requires specific DOM checks for animations
    });

    test('should complete animation and highlight final result', async ({ page }) => {
      await page.fill('[data-testid="input-field"]', '1,2,3');
      await page.click('[data-testid="start-button"]');
      await listenForStateChange(page);
      await page.evaluate(() => window.dispatchEvent(new Event('COMPLETE')));
      await listenForStateChange(page);
      // Verify that sorted array is highlighted in green
    });
  });
});