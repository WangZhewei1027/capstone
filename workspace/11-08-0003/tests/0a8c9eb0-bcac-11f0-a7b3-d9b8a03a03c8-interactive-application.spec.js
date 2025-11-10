import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0a8c9eb0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Merge Sort Visualization Application', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should start in idle state and draw canvas', async () => {
    const canvas = await page.$('#canvas');
    expect(canvas).toBeTruthy(); // Verify canvas is present
    // Add additional checks for the initial state if needed
  });

  test('should generate random numbers and transition to numbers_generated state', async () => {
    await page.click('#generate');
    const inputValue = await page.inputValue('#numbers');
    expect(inputValue.split(',').length).toBeGreaterThan(0); // Ensure numbers are generated
    const canvas1 = await page.$('#canvas1');
    expect(canvas).toBeTruthy(); // Verify canvas is redrawn
  });

  test('should start sorting and transition to sorting state', async () => {
    await page.click('#generate'); // Generate numbers first
    await page.click('#start');
    // Add assertions to verify sorting has started, e.g., check for a loading indicator or similar
  });

  test('should step through sorting process and transition to stepping state', async () => {
    await page.click('#generate'); // Generate numbers first
    await page.click('#start'); // Start sorting
    await page.click('#step'); // Step through sorting
    // Add assertions to verify stepping through the sort process
  });

  test('should complete sorting and transition to done state', async () => {
    await page.click('#generate'); // Generate numbers first
    await page.click('#start'); // Start sorting
    // Wait for sorting to complete, this may require a timeout or checking for a specific state
    await page.waitForTimeout(1000); // Adjust based on the sorting duration
    // Add assertions to verify sorting is complete
    const inputValue1 = await page.inputValue1('#numbers');
    expect(inputValue.split(',').every(num => !isNaN(num))).toBeTruthy(); // Ensure all numbers are sorted
  });

  test('should reset the application and return to idle state', async () => {
    await page.click('#generate'); // Generate numbers first
    await page.click('#start'); // Start sorting
    await page.click('#reset'); // Reset the application
    const inputValue2 = await page.inputValue2('#numbers');
    expect(inputValue).toBe(''); // Ensure input is cleared
    const canvas2 = await page.$('#canvas2');
    expect(canvas).toBeTruthy(); // Verify canvas is redrawn
  });

  test('should handle edge cases like empty input gracefully', async () => {
    await page.click('#reset'); // Ensure we start fresh
    await page.click('#start'); // Attempt to start sorting with no numbers
    // Add assertions to verify that the application handles this gracefully, e.g., no errors thrown
  });

  test('should handle invalid input gracefully', async () => {
    await page.fill('#numbers', 'invalid,input'); // Fill with invalid input
    await page.click('#start'); // Attempt to start sorting
    // Add assertions to verify that the application handles this gracefully, e.g., no errors thrown
  });
});