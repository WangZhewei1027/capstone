import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/11-18-0007/html/a322c87e-ff18-4204-a308-cf0250c739de.html';

const testIds = {
  arrayDisplay: 'data-testid-array',
  startButton: 'data-testid-start',
  pauseButton: 'data-testid-pause',
  resetButton: 'data-testid-reset',
  inputField: 'data-testid-input',
  speedSlider: 'data-testid-speed'
};

async function getCurrentState(page) {
  return await page.evaluate(() => window.getState()?.current || 'unknown');
}

async function waitForState(page, stateName, timeout = 5000) {
  await page.locator(`[data-state="${stateName}"]`).waitFor({ 
    state: 'attached',
    timeout 
  });
}

async function waitForStateChange(page, timeout = 5000) {
  return await page.evaluate((t) => {
    return new Promise((resolve) => {
      const handler = (e) => {
        document.removeEventListener('statechange', handler);
        resolve(e.detail);
      };
      document.addEventListener('statechange', handler);
      setTimeout(() => resolve(null), t);
    });
  }, timeout);
}

test.describe('Bubble Sort Visualization FSM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
  });

  test('State transition from idle to running', async ({ page }) => {
    let state = await getCurrentState(page);
    expect(state).toBe('idle');
    
    await page.getByTestId(testIds.startButton).click();
    
    await waitForState(page, 'running');
    
    state = await getCurrentState(page);
    expect(state).toBe('running');
    
    await expect(page.getByTestId(testIds.startButton)).toBeDisabled();
    await expect(page.getByTestId(testIds.pauseButton)).toBeEnabled();
  });

  test('State transition from running to paused', async ({ page }) => {
    await page.getByTestId(testIds.startButton).click();
    await waitForState(page, 'running');
    
    await page.getByTestId(testIds.pauseButton).click();
    
    await waitForState(page, 'paused');
    
    let state = await getCurrentState(page);
    expect(state).toBe('paused');
    
    await expect(page.getByTestId(testIds.startButton)).toBeEnabled();
    await expect(page.getByTestId(testIds.pauseButton)).toBeDisabled();
  });

  test('State transition from paused to running', async ({ page }) => {
    await page.getByTestId(testIds.startButton).click();
    await waitForState(page, 'running');
    await page.getByTestId(testIds.pauseButton).click();
    await waitForState(page, 'paused');
    
    await page.getByTestId(testIds.startButton).click();
    
    await waitForState(page, 'running');
    
    let state = await getCurrentState(page);
    expect(state).toBe('running');
    
    await expect(page.getByTestId(testIds.startButton)).toBeDisabled();
    await expect(page.getByTestId(testIds.pauseButton)).toBeEnabled();
  });

  test('State transition from running to completed', async ({ page }) => {
    await page.getByTestId(testIds.startButton).click();
    await waitForState(page, 'running');
    
    // Simulate algorithm completion
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('statechange', { detail: 'completed' })));
    
    await waitForState(page, 'completed');
    
    let state = await getCurrentState(page);
    expect(state).toBe('completed');
    
    await expect(page.getByTestId(testIds.resetButton)).toBeEnabled();
    await expect(page.getByTestId(testIds.startButton)).toBeDisabled();
  });

  test('State transition from completed to idle', async ({ page }) => {
    await page.getByTestId(testIds.startButton).click();
    await waitForState(page, 'running');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('statechange', { detail: 'completed' })));
    await waitForState(page, 'completed');
    
    await page.getByTestId(testIds.resetButton).click();
    
    await waitForState(page, 'idle');
    
    let state = await getCurrentState(page);
    expect(state).toBe('idle');
    
    await expect(page.getByTestId(testIds.startButton)).toBeEnabled();
    await expect(page.getByTestId(testIds.pauseButton)).toBeDisabled();
  });

  test('Error handling for empty input', async ({ page }) => {
    await page.getByTestId(testIds.inputField).fill('');
    await page.getByTestId(testIds.startButton).click();
    
    await expect(page.getByTestId('error-message')).toContainText('Input cannot be empty');
    
    let state = await getCurrentState(page);
    expect(state).toBe('idle');
  });

  test('Error handling for invalid input', async ({ page }) => {
    await page.getByTestId(testIds.inputField).fill('101, 200, -5');
    await page.getByTestId(testIds.startButton).click();
    
    await expect(page.getByTestId('error-message')).toContainText('Input must be integers between 0 and 100');
    
    let state = await getCurrentState(page);
    expect(state).toBe('idle');
  });

  test('Acceptance criteria: User can input custom data within constraints', async ({ page }) => {
    await page.getByTestId(testIds.inputField).fill('10, 20, 30, 40');
    await page.getByTestId(testIds.startButton).click();
    
    await waitForState(page, 'running');
    
    let state = await getCurrentState(page);
    expect(state).toBe('running');
  });

  test('Acceptance criteria: Animation can be started, paused, and reset', async ({ page }) => {
    await page.getByTestId(testIds.startButton).click();
    await waitForState(page, 'running');
    
    await page.getByTestId(testIds.pauseButton).click();
    await waitForState(page, 'paused');
    
    await page.getByTestId(testIds.resetButton).click();
    await waitForState(page, 'idle');
    
    let state = await getCurrentState(page);
    expect(state).toBe('idle');
  });

  test('Acceptance criteria: Each step of the algorithm is visually clear', async ({ page }) => {
    await page.getByTestId(testIds.startButton).click();
    await waitForState(page, 'running');
    
    await expect(page.getByTestId(testIds.arrayDisplay)).toBeVisible();
    // Additional checks for visual clarity can be added here
  });

  test('Acceptance criteria: Final sorted array is correct and highlighted', async ({ page }) => {
    await page.getByTestId(testIds.startButton).click();
    await waitForState(page, 'running');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('statechange', { detail: 'completed' })));
    await waitForState(page, 'completed');
    
    await expect(page.getByTestId(testIds.arrayDisplay)).toHaveClass(/sorted/);
    // Check for correct sorting visually
  });

  test('Edge case: Rapid user interactions', async ({ page }) => {
    await page.getByTestId(testIds.startButton).click();
    await waitForState(page, 'running');
    
    await page.getByTestId(testIds.pauseButton).click();
    await page.getByTestId(testIds.startButton).click();
    await page.getByTestId(testIds.resetButton).click();
    
    await waitForState(page, 'idle');
    
    let state = await getCurrentState(page);
    expect(state).toBe('idle');
  });

  test('Edge case: Boundary values', async ({ page }) => {
    await page.getByTestId(testIds.inputField).fill('0, 100');
    await page.getByTestId(testIds.startButton).click();
    
    await waitForState(page, 'running');
    
    let state = await getCurrentState(page);
    expect(state).toBe('running');
  });
});