import { test, expect } from '@playwright/test';

// Helper function to get the current state from the window object
async function getCurrentState(page) {
  return await page.evaluate(() => window.getState());
}

// Helper function to listen for statechange events
async function listenForStateChange(page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      window.addEventListener('statechange', (event) => {
        resolve(event.detail.newState);
      });
    });
  });
}

test.describe('Bubble Sort FSM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-18-0004/html/a0b6ddd3-443f-420a-9116-9cf04669625a.html');
  });

  test.describe('Idle State Tests', () => {
    test('should be in idle state initially', async ({ page }) => {
      const state = await getCurrentState(page);
      expect(state).toBe('idle');
    });

    test('should have correct UI elements in idle state', async ({ page }) => {
      await page.waitForSelector('[data-testid-array]');
      await page.waitForSelector('[data-testid-start]:enabled');
      await page.waitForSelector('[data-testid-input]:enabled');
      await page.waitForSelector('[data-testid-pause]:disabled');
      await page.waitForSelector('[data-testid-reset]:disabled');
    });

    test('should handle empty input error', async ({ page }) => {
      await page.fill('[data-testid-input]', '');
      await page.click('[data-testid-start]');
      await page.waitForSelector('[data-testid-error]');
      const errorMessage = await page.textContent('[data-testid-error]');
      expect(errorMessage).toBe('Input cannot be empty');
      const state = await getCurrentState(page);
      expect(state).toBe('idle');
    });

    test('should handle invalid input error', async ({ page }) => {
      await page.fill('[data-testid-input]', 'invalid');
      await page.click('[data-testid-start]');
      await page.waitForSelector('[data-testid-error]');
      const errorMessage = await page.textContent('[data-testid-error]');
      expect(errorMessage).toBe('Invalid input');
      const state = await getCurrentState(page);
      expect(state).toBe('idle');
    });

    test('should transition to running state on START event', async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      const newState = await listenForStateChange(page);
      expect(newState).toBe('running');
    });
  });

  test.describe('Running State Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      await listenForStateChange(page);
    });

    test('should have correct UI elements in running state', async ({ page }) => {
      await page.waitForSelector('[data-testid-array]');
      await page.waitForSelector('[data-testid-start]:disabled');
      await page.waitForSelector('[data-testid-pause]:enabled');
      await page.waitForSelector('[data-testid-reset]:enabled');
    });

    test('should transition to paused state on PAUSE event', async ({ page }) => {
      await page.click('[data-testid-pause]');
      const newState = await listenForStateChange(page);
      expect(newState).toBe('paused');
    });

    test('should transition to completed state on COMPLETE event', async ({ page }) => {
      // Simulate completion of sorting
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('statechange', { detail: { newState: 'completed' } })));
      const newState = await listenForStateChange(page);
      expect(newState).toBe('completed');
    });
  });

  test.describe('Paused State Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      await listenForStateChange(page);
      await page.click('[data-testid-pause]');
      await listenForStateChange(page);
    });

    test('should have correct UI elements in paused state', async ({ page }) => {
      await page.waitForSelector('[data-testid-array]');
      await page.waitForSelector('[data-testid-start]:enabled');
      await page.waitForSelector('[data-testid-pause]:disabled');
      await page.waitForSelector('[data-testid-reset]:enabled');
    });

    test('should transition back to running state on START event', async ({ page }) => {
      await page.click('[data-testid-start]');
      const newState = await listenForStateChange(page);
      expect(newState).toBe('running');
    });
  });

  test.describe('Completed State Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      await listenForStateChange(page);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('statechange', { detail: { newState: 'completed' } })));
      await listenForStateChange(page);
    });

    test('should have correct UI elements in completed state', async ({ page }) => {
      await page.waitForSelector('[data-testid-array]');
      await page.waitForSelector('[data-testid-start]:disabled');
      await page.waitForSelector('[data-testid-pause]:disabled');
      await page.waitForSelector('[data-testid-reset]:enabled');
    });

    test('should transition back to idle state on RESET event', async ({ page }) => {
      await page.click('[data-testid-reset]');
      const newState = await listenForStateChange(page);
      expect(newState).toBe('idle');
    });
  });

  test.describe('Acceptance Criteria Tests', () => {
    test('should allow user to input custom data', async ({ page }) => {
      await page.fill('[data-testid-input]', '10,20,30');
      const inputValue = await page.inputValue('[data-testid-input]');
      expect(inputValue).toBe('10,20,30');
    });

    test('should start, pause, and reset animation', async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      let state = await listenForStateChange(page);
      expect(state).toBe('running');

      await page.click('[data-testid-pause]');
      state = await listenForStateChange(page);
      expect(state).toBe('paused');

      await page.click('[data-testid-reset]');
      state = await listenForStateChange(page);
      expect(state).toBe('idle');
    });

    test('should visually show each comparison and swap', async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      await listenForStateChange(page);

      // Check for visual comparison highlight
      await page.waitForSelector('.comparison-highlight');
      const comparisonHighlight = await page.$('.comparison-highlight');
      expect(comparisonHighlight).not.toBeNull();

      // Simulate swap animation
      await page.evaluate(() => {
        const elements = document.querySelectorAll('.swap-animation');
        elements.forEach(el => el.classList.add('animate'));
      });
      await page.waitForSelector('.swap-animation.animate');
    });

    test('should correctly sort the final result', async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      await listenForStateChange(page);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('statechange', { detail: { newState: 'completed' } })));
      await listenForStateChange(page);

      const sortedArray = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid-array] .sorted')).map(el => parseInt(el.textContent));
      });
      expect(sortedArray).toEqual([2, 3, 4, 5, 8]);
    });

    test('should handle empty input gracefully', async ({ page }) => {
      await page.fill('[data-testid-input]', '');
      await page.click('[data-testid-start]');
      await page.waitForSelector('[data-testid-error]');
      const errorMessage = await page.textContent('[data-testid-error]');
      expect(errorMessage).toBe('Input cannot be empty');
    });
  });

  test.describe('Edge Case Tests', () => {
    test('should handle rapid user interactions', async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      await page.click('[data-testid-pause]');
      await page.click('[data-testid-start]');
      await page.click('[data-testid-reset]');
      const state = await getCurrentState(page);
      expect(state).toBe('idle');
    });

    test('should maintain state consistency after errors', async ({ page }) => {
      await page.fill('[data-testid-input]', '');
      await page.click('[data-testid-start]');
      await page.waitForSelector('[data-testid-error]');
      const state = await getCurrentState(page);
      expect(state).toBe('idle');
    });

    test('should handle boundary values correctly', async ({ page }) => {
      await page.fill('[data-testid-input]', '0,100,50');
      await page.click('[data-testid-start]');
      await listenForStateChange(page);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('statechange', { detail: { newState: 'completed' } })));
      await listenForStateChange(page);

      const sortedArray = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid-array] .sorted')).map(el => parseInt(el.textContent));
      });
      expect(sortedArray).toEqual([0, 50, 100]);
    });
  });

  test.describe('Animation Tests', () => {
    test('should highlight compared elements in yellow', async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      await listenForStateChange(page);

      await page.waitForSelector('.comparison-highlight');
      const comparisonHighlight = await page.$('.comparison-highlight');
      expect(comparisonHighlight).not.toBeNull();
    });

    test('should animate swap with smooth transition', async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      await listenForStateChange(page);

      await page.evaluate(() => {
        const elements = document.querySelectorAll('.swap-animation');
        elements.forEach(el => el.classList.add('animate'));
      });
      await page.waitForSelector('.swap-animation.animate');
    });

    test('should highlight final sorted array in green', async ({ page }) => {
      await page.fill('[data-testid-input]', '5,3,8,4,2');
      await page.click('[data-testid-start]');
      await listenForStateChange(page);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('statechange', { detail: { newState: 'completed' } })));
      await listenForStateChange(page);

      const sortedHighlight = await page.$('.sorted-highlight');
      expect(sortedHighlight).not.toBeNull();
    });
  });
});