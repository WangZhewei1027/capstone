import { test, expect } from '@playwright/test';

// Test file: 28880a00-bf48-11f0-bf20-c5be43303284.spec.js

// Test setup
beforeEach(async ({ page }) => {
  await page.goto('http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/28880a00-bf48-11f0-bf20-c5be43303284.html');
});

// Test teardown
afterEach(async ({ page }) => {
  // Clean up any state after each test if needed
});

test('Initial state should be IDLE', async ({ page }) => {
  // Validate that the initial state is IDLE
  const currentState = await page.$eval('#state', (el) => el.textContent);
  expect(currentState).toBe('IDLE');
});

describe('Start Sorting Event', () => {
  test('Clicking Start Sorting button transitions to SORTING state', async ({ page }) => {
    // Click the Start Sorting button
    await page.click('#start-sorting-btn');
    
    // Validate transition to SORTING state
    const currentState = await page.$eval('#state', (el) => el.textContent);
    expect(currentState).toBe('SORTING');
  });
});

describe('Sorting State', () => {
  test('Sorting state should display sorting animation', async ({ page }) => {
    // Validate sorting animation is displayed
    const animationVisible = await page.isVisible('#sorting-animation');
    expect(animationVisible).toBeTruthy();
  });

  test('Reset event transitions back to IDLE state', async ({ page }) => {
    // Click the Reset button
    await page.click('#reset-btn');
    
    // Validate transition back to IDLE state
    const currentState = await page.$eval('#state', (el) => el.textContent);
    expect(currentState).toBe('IDLE');
  });

  test('Sorting complete event transitions to DONE state', async ({ page }) => {
    // Trigger sorting complete event
    await page.dispatchEvent('#animation-area', 'sortingComplete');
    
    // Validate transition to DONE state
    const currentState = await page.$eval('#state', (el) => el.textContent);
    expect(currentState).toBe('DONE');
  });
});

describe('Paused State', () => {
  test('Pause event transitions to PAUSED state', async ({ page }) => {
    // Click the Pause button
    await page.click('#pause-btn');
    
    // Validate transition to PAUSED state
    const currentState = await page.$eval('#state', (el) => el.textContent);
    expect(currentState).toBe('PAUSED');
  });

  test('Play event transitions back to SORTING state', async ({ page }) => {
    // Click the Play button
    await page.click('#play-btn');
    
    // Validate transition back to SORTING state
    const currentState = await page.$eval('#state', (el) => el.textContent);
    expect(currentState).toBe('SORTING');
  });
});

describe('Done State', () => {
  test('Display sorted array on entering DONE state', async ({ page }) => {
    // Validate sorted array is displayed
    const sortedArray = await page.$eval('#sorted-array', (el) => el.textContent);
    expect(sortedArray).not.toBe('-');
  });

  test('Reset event transitions back to IDLE state', async ({ page }) => {
    // Click the Reset button
    await page.click('#reset-btn');
    
    // Validate transition back to IDLE state
    const currentState = await page.$eval('#state', (el) => el.textContent);
    expect(currentState).toBe('IDLE');
  });
});

// Add more tests for edge cases and error scenarios as needed

// Additional tests can be added to cover more scenarios based on the application behavior.