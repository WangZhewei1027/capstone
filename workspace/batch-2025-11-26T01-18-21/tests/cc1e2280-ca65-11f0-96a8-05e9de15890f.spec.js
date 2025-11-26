import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1e2280-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Linear Search Visualizer Tests', () => {
  
  test('Initial State: Idle', async ({ page }) => {
    const status = await page.locator('#status').innerText();
    const subStatus = await page.locator('#subStatus').innerText();
    expect(status).toBe('Idle');
    expect(subStatus).toBe('No search running');
  });

  test('Apply Array and Target', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');

    const arraySlots = await page.locator('#arrayContainer .slot').count();
    expect(arraySlots).toBe(8); // Expect 8 elements in the array
    const status = await page.locator('#status').innerText();
    expect(status).toBe('Ready');
  });

  test('Randomize Array', async ({ page }) => {
    await page.click('#randomBtn');
    
    const arrInputValue = await page.inputValue('#arrInput');
    expect(arrInputValue).not.toBe('34, 7, 23, 32, 5, 62, 32, 7'); // Check if array is randomized
  });

  test('Reset Inputs', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', '7');
    await page.click('#clearBtn');

    const arrInputValue = await page.inputValue('#arrInput');
    const targetInputValue = await page.inputValue('#targetInput');
    expect(arrInputValue).toBe('');
    expect(targetInputValue).toBe('');
  });

  test('Step Through Comparisons', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');
    await page.click('#stepBtn');

    const status = await page.locator('#status').innerText();
    expect(status).toBe('Comparing');
  });

  test('Play and Stop', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');
    await page.click('#playBtn');

    await page.waitForTimeout(1000); // Wait for some comparisons to be made
    const status = await page.locator('#status').innerText();
    expect(status).toBe('Playing');

    await page.click('#stopBtn');
    const stoppedStatus = await page.locator('#status').innerText();
    expect(stoppedStatus).toBe('Stopped');
  });

  test('Step Back', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');
    await page.click('#stepBtn');
    await page.click('#backBtn');

    const status = await page.locator('#status').innerText();
    expect(status).toBe('Rewound');
  });

  test('Change Playback Speed', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');
    await page.click('#playBtn');

    await page.fill('#speed', '1000'); // Change speed to 1000ms
    const speedVal = await page.locator('#speedVal').innerText();
    expect(speedVal).toBe('1000ms');
  });

  test('Enter Target to Start Search', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');
    
    await page.press('#targetInput', 'Enter');
    const status = await page.locator('#status').innerText();
    expect(status).toBe('Comparing');
  });

  test('Click Array Element to Set Target', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');

    await page.click('#arrayContainer .slot[data-index="1"]'); // Click on the second element
    const targetInputValue = await page.inputValue('#targetInput');
    expect(targetInputValue).toBe('7'); // Check if the target is set to the clicked element
  });

  test('Handle Not Found Case', async ({ page }) => {
    await page.fill('#arrInput', '34, 23, 32, 5, 62, 32, 8');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');
    await page.click('#playBtn');

    await page.waitForTimeout(1000); // Wait for some comparisons to be made
    const result = await page.locator('#result').innerText();
    expect(result).toBe('-1'); // Expect -1 for not found
  });

  test('Edge Case: Empty Array Input', async ({ page }) => {
    await page.fill('#arrInput', '');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');

    const status = await page.locator('#status').innerText();
    expect(status).toBe('Idle'); // Expect to remain idle
  });

  test('Edge Case: Invalid Target Input', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', 'invalid');
    await page.click('#applyBtn');

    const status = await page.locator('#status').innerText();
    expect(status).toBe('Ready'); // Expect to be ready without errors
  });

  test('Edge Case: Array Input Modified During Run', async ({ page }) => {
    await page.fill('#arrInput', '34, 7, 23, 32, 5, 62, 32, 7');
    await page.fill('#targetInput', '7');
    await page.click('#applyBtn');
    await page.click('#playBtn');

    await page.fill('#arrInput', '1, 2, 3'); // Modify array during run
    const status = await page.locator('#status').innerText();
    expect(status).toBe('Idle'); // Expect to reset to idle
  });

});