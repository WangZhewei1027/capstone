import { test, expect } from '@playwright/test';

// Test file: c2e312d0-bf47-11f0-a792-19f8a6073af4.spec.js

// Test setup
beforeEach(async ({ page }) => {
  await page.goto('http://127.0.0.1:5500/workspace/11-10-0005-4o-mini/html/c2e312d0-bf47-11f0-a792-19f8a6073af4.html');
});

// Test cases
test('Initial state is IDLE', async ({ page }) => {
  // Validate initial state
  const currentState = await page.evaluate(() => window.currentState);
  expect(currentState).toBe('IDLE');
});

test('Clicking Sort button transitions to SORTING state', async ({ page }) => {
  // Trigger SORT_CLICKED event
  await page.click('button');
  
  // Validate state transition
  const currentState = await page.evaluate(() => window.currentState);
  expect(currentState).toBe('SORTING');
});

test.describe('Sorting state tests', () => {
  test('Elements are highlighted during sorting', async ({ page }) => {
    // Trigger SORT_CLICKED event
    await page.click('button');
    
    // Wait for highlighting to finish
    await page.waitForTimeout(6000); // Adjust timeout based on animation duration
    
    // Validate elements are highlighted
    const highlightedElements = await page.$$eval('.element', elements => elements.filter(el => el.style.backgroundColor === 'orange').length);
    expect(highlightedElements).toBeGreaterThan(0);
  });

  test('Elements are in final positions after sorting', async ({ page }) => {
    // Trigger SORT_CLICKED event
    await page.click('button');
    
    // Wait for sorting to finish
    await page.waitForTimeout(6000); // Adjust timeout based on animation duration
    
    // Validate elements are in final positions
    const finalPositionElements = await page.$$eval('.element', elements => elements.filter(el => el.style.backgroundColor === 'lightgreen').length);
    expect(finalPositionElements).toBe(5); // All elements should be in final positions
  });

  test('Sorting completes and transitions to SORTED state', async ({ page }) => {
    // Trigger SORT_CLICKED event
    await page.click('button');
    
    // Wait for sorting to finish
    await page.waitForTimeout(6000); // Adjust timeout based on animation duration
    
    // Validate state transition to SORTED
    const currentState = await page.evaluate(() => window.currentState);
    expect(currentState).toBe('SORTED');
  });
});

test('Final state is SORTED', async ({ page }) => {
  // Trigger SORT_CLICKED event
  await page.click('button');
  
  // Wait for sorting to finish
  await page.waitForTimeout(6000); // Adjust timeout based on animation duration
  
  // Validate final state is SORTED
  const currentState = await page.evaluate(() => window.currentState);
  expect(currentState).toBe('SORTED');
});

// Test teardown
afterEach(async ({ page }) => {
  // Clean up any changes made during tests
});

// Additional tests can be added to cover edge cases and error scenarios.