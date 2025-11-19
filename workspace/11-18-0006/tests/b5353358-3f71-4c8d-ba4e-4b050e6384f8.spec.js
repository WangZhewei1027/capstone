import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/11-18-0006/html/b5353358-3f71-4c8d-ba4e-4b050e6384f8.html';
const testIds = {
  arrayDisplay: 'data-testid-array-display',
  startButton: 'data-testid-start-button',
  pauseButton: 'data-testid-pause-button',
  resetButton: 'data-testid-reset-button',
  inputField: 'data-testid-input-field'
};

// Helper function to get current FSM state
async function getCurrentState(page) {
  return await page.evaluate(() => window.getState());
}

// Helper function to listen for statechange events
async function listenForStateChange(page) {
  await page.evaluate(() => {
    window.addEventListener('statechange', (event) => {
      window.lastStateChange = event.detail;
    });
  });
}

// Test suite for Bubble Sort FSM
test.describe('Bubble Sort FSM Tests', () => {

  // State Transition Tests
  test.describe('State Transition Tests', () => {

    test('Idle state transitions', async ({ page }) => {
      await page.goto(URL);
      await listenForStateChange(page);

      // Verify initial state is idle
      let state = await getCurrentState(page);
      expect(state).toBe('idle');

      // Test START event
      await page.click(`[${testIds.startButton}]`);
      state = await getCurrentState(page);
      expect(state).toBe('running');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('running');

      // Test INPUT_CHANGE event
      await page.fill(`[${testIds.inputField}]`, '1, 2, 3');
      state = await getCurrentState(page);
      expect(state).toBe('idle');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('idle');

      // Test RESET event
      await page.click(`[${testIds.resetButton}]`);
      state = await getCurrentState(page);
      expect(state).toBe('idle');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('idle');
    });

    test('Running state transitions', async ({ page }) => {
      await page.goto(URL);
      await listenForStateChange(page);

      // Transition to running state
      await page.click(`[${testIds.startButton}]`);
      let state = await getCurrentState(page);
      expect(state).toBe('running');

      // Test PAUSE event
      await page.click(`[${testIds.pauseButton}]`);
      state = await getCurrentState(page);
      expect(state).toBe('paused');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('paused');

      // Test COMPLETE event
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('COMPLETE')));
      state = await getCurrentState(page);
      expect(state).toBe('complete');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('complete');

      // Test ERROR event
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('ERROR')));
      state = await getCurrentState(page);
      expect(state).toBe('error');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('error');
    });

    test('Paused state transitions', async ({ page }) => {
      await page.goto(URL);
      await listenForStateChange(page);

      // Transition to paused state
      await page.click(`[${testIds.startButton}]`);
      await page.click(`[${testIds.pauseButton}]`);
      let state = await getCurrentState(page);
      expect(state).toBe('paused');

      // Test START event
      await page.click(`[${testIds.startButton}]`);
      state = await getCurrentState(page);
      expect(state).toBe('running');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('running');

      // Test RESET event
      await page.click(`[${testIds.resetButton}]`);
      state = await getCurrentState(page);
      expect(state).toBe('idle');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('idle');
    });

    test('Complete state transitions', async ({ page }) => {
      await page.goto(URL);
      await listenForStateChange(page);

      // Transition to complete state
      await page.click(`[${testIds.startButton}]`);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('COMPLETE')));
      let state = await getCurrentState(page);
      expect(state).toBe('complete');

      // Test RESET event
      await page.click(`[${testIds.resetButton}]`);
      state = await getCurrentState(page);
      expect(state).toBe('idle');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('idle');
    });

    test('Error state transitions', async ({ page }) => {
      await page.goto(URL);
      await listenForStateChange(page);

      // Transition to error state
      await page.click(`[${testIds.startButton}]`);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('ERROR')));
      let state = await getCurrentState(page);
      expect(state).toBe('error');

      // Test RESET event
      await page.click(`[${testIds.resetButton}]`);
      state = await getCurrentState(page);
      expect(state).toBe('idle');
      expect(await page.evaluate(() => window.lastStateChange)).toBe('idle');
    });
  });

  // UI Element Tests
  test.describe('UI Element Tests', () => {

    test('Verify required UI elements exist', async ({ page }) => {
      await page.goto(URL);
      await page.waitForSelector(`[${testIds.arrayDisplay}]`);
      await page.waitForSelector(`[${testIds.startButton}]`);
      await page.waitForSelector(`[${testIds.pauseButton}]`);
      await page.waitForSelector(`[${testIds.resetButton}]`);
      await page.waitForSelector(`[${testIds.inputField}]`);
    });

    test('Element visibility and interactivity in idle state', async ({ page }) => {
      await page.goto(URL);

      // Verify element states in idle
      expect(await page.isVisible(`[${testIds.startButton}]`)).toBe(true);
      expect(await page.isEnabled(`[${testIds.startButton}]`)).toBe(true);
      expect(await page.isEnabled(`[${testIds.inputField}]`)).toBe(true);
      expect(await page.isDisabled(`[${testIds.pauseButton}]`)).toBe(true);
      expect(await page.isDisabled(`[${testIds.resetButton}]`)).toBe(true);
    });

    test('Element visibility and interactivity in running state', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);

      // Verify element states in running
      expect(await page.isDisabled(`[${testIds.startButton}]`)).toBe(true);
      expect(await page.isEnabled(`[${testIds.pauseButton}]`)).toBe(true);
      expect(await page.isEnabled(`[${testIds.resetButton}]`)).toBe(true);
    });

    test('Element visibility and interactivity in paused state', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      await page.click(`[${testIds.pauseButton}]`);

      // Verify element states in paused
      expect(await page.isEnabled(`[${testIds.startButton}]`)).toBe(true);
      expect(await page.isDisabled(`[${testIds.pauseButton}]`)).toBe(true);
      expect(await page.isEnabled(`[${testIds.resetButton}]`)).toBe(true);
    });

    test('Element visibility and interactivity in complete state', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('COMPLETE')));

      // Verify element states in complete
      expect(await page.isDisabled(`[${testIds.startButton}]`)).toBe(true);
      expect(await page.isDisabled(`[${testIds.pauseButton}]`)).toBe(true);
      expect(await page.isEnabled(`[${testIds.resetButton}]`)).toBe(true);
    });

    test('Element visibility and interactivity in error state', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('ERROR')));

      // Verify element states in error
      expect(await page.isEnabled(`[${testIds.startButton}]`)).toBe(true);
      expect(await page.isDisabled(`[${testIds.pauseButton}]`)).toBe(true);
      expect(await page.isEnabled(`[${testIds.resetButton}]`)).toBe(true);
    });
  });

  // Validation Tests
  test.describe('Validation Tests', () => {

    test('START event validation', async ({ page }) => {
      await page.goto(URL);

      // Test empty input
      await page.fill(`[${testIds.inputField}]`, '');
      await page.click(`[${testIds.startButton}]`);
      expect(await page.isVisible('text=Show error message')).toBe(true);

      // Test invalid input
      await page.fill(`[${testIds.inputField}]`, 'invalid');
      await page.click(`[${testIds.startButton}]`);
      expect(await page.isVisible('text=Show validation error')).toBe(true);
    });

    test('COMPLETE event validation', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('COMPLETE')));
      expect(await page.isVisible('text=Highlight sorted array in green')).toBe(true);
    });

    test('ERROR event validation', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('ERROR')));
      expect(await page.isVisible('text=Show error message')).toBe(true);
    });
  });

  // Acceptance Criteria Tests
  test.describe('Acceptance Criteria Tests', () => {

    test('User can input custom data', async ({ page }) => {
      await page.goto(URL);
      await page.fill(`[${testIds.inputField}]`, '10, 20, 30');
      expect(await page.inputValue(`[${testIds.inputField}]`)).toBe('10, 20, 30');
    });

    test('Animation can be started, paused, and reset', async ({ page }) => {
      await page.goto(URL);

      // Start animation
      await page.click(`[${testIds.startButton}]`);
      let state = await getCurrentState(page);
      expect(state).toBe('running');

      // Pause animation
      await page.click(`[${testIds.pauseButton}]`);
      state = await getCurrentState(page);
      expect(state).toBe('paused');

      // Reset animation
      await page.click(`[${testIds.resetButton}]`);
      state = await getCurrentState(page);
      expect(state).toBe('idle');
    });

    test('Each step is visually clear', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      expect(await page.isVisible('text=Highlight compared elements in yellow')).toBe(true);
    });

    test('Final result is correct and sorted', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('COMPLETE')));
      expect(await page.isVisible('text=Highlight final sorted array in green')).toBe(true);
    });

    test('Error messages are displayed for invalid inputs', async ({ page }) => {
      await page.goto(URL);
      await page.fill(`[${testIds.inputField}]`, 'invalid');
      await page.click(`[${testIds.startButton}]`);
      expect(await page.isVisible('text=Show validation error')).toBe(true);
    });
  });

  // Edge Case Tests
  test.describe('Edge Case Tests', () => {

    test('Empty input handling', async ({ page }) => {
      await page.goto(URL);
      await page.fill(`[${testIds.inputField}]`, '');
      await page.click(`[${testIds.startButton}]`);
      expect(await page.isVisible('text=Show error message')).toBe(true);
    });

    test('Boundary values handling', async ({ page }) => {
      await page.goto(URL);
      await page.fill(`[${testIds.inputField}]`, '0, 100');
      await page.click(`[${testIds.startButton}]`);
      expect(await page.isVisible('text=Highlight compared elements in yellow')).toBe(true);
    });

    test('Rapid user interactions', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      await page.click(`[${testIds.pauseButton}]`);
      await page.click(`[${testIds.startButton}]`);
      await page.click(`[${testIds.resetButton}]`);
      let state = await getCurrentState(page);
      expect(state).toBe('idle');
    });

    test('State consistency after errors', async ({ page }) => {
      await page.goto(URL);
      await page.fill(`[${testIds.inputField}]`, 'invalid');
      await page.click(`[${testIds.startButton}]`);
      await page.click(`[${testIds.resetButton}]`);
      let state = await getCurrentState(page);
      expect(state).toBe('idle');
    });
  });

  // Animation Tests
  test.describe('Animation Tests', () => {

    test('Verify comparison animation', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      expect(await page.isVisible('text=Highlight compared elements in yellow')).toBe(true);
    });

    test('Verify swap animation', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      expect(await page.isVisible('text=Animate swap with smooth transition')).toBe(true);
    });

    test('Verify complete animation', async ({ page }) => {
      await page.goto(URL);
      await page.click(`[${testIds.startButton}]`);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('COMPLETE')));
      expect(await page.isVisible('text=Highlight final sorted array in green')).toBe(true);
    });
  });
});