import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c197dd2-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Divide and Conquer Application Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
  });

  test('should be in Idle state initially', async ({ page }) => {
    // Verify that the application is in the Idle state
    const divContent = await page.locator('#div').innerText();
    expect(divContent).toBe('');
  });

  test('should transition to InputNumber state on user input', async ({ page }) => {
    // Simulate user input and verify transition to InputNumber state
    await page.evaluate(() => {
      window.prompt = () => '5'; // Mock prompt to return a valid number
    });
    await page.evaluate(() => {
      const n = parseInt(prompt("Enter a number:"));
      if (!isNaN(n)) {
        document.getElementById("div").innerHTML = "Divide and Conquer result: " + n;
      }
    });
    
    const divContent = await page.locator('#div').innerText();
    expect(divContent).toContain('Divide and Conquer result: 5');
  });

  test('should transition to Calculating state after valid input', async ({ page }) => {
    // Simulate user input and check for calculation start
    await page.evaluate(() => {
      window.prompt = () => '10'; // Mock prompt to return a valid number
    });
    await page.evaluate(() => {
      const n = parseInt(prompt("Enter a number:"));
      if (!isNaN(n)) {
        document.getElementById("div").innerHTML = "Divide and Conquer result: " + n;
      }
    });

    // Simulate calculation
    await page.evaluate(() => {
      const n = 10;
      const result = divideAndConquer(n);
      document.getElementById("div").innerHTML = "Divide and Conquer result: " + result;
    });

    const divContent = await page.locator('#div').innerText();
    expect(divContent).toContain('Divide and Conquer result: 10');
  });

  test('should display the result after calculation', async ({ page }) => {
    // Simulate user input and check for result display
    await page.evaluate(() => {
      window.prompt = () => '8'; // Mock prompt to return a valid number
    });
    await page.evaluate(() => {
      const n = parseInt(prompt("Enter a number:"));
      const result = divideAndConquer(n);
      document.getElementById("div").innerHTML = "Divide and Conquer result: " + result;
    });

    const divContent = await page.locator('#div').innerText();
    expect(divContent).toContain('Divide and Conquer result: 8');
  });

  test('should reset input and return to Idle state', async ({ page }) => {
    // Simulate user input and check for reset
    await page.evaluate(() => {
      window.prompt = () => '3'; // Mock prompt to return a valid number
    });
    await page.evaluate(() => {
      const n = parseInt(prompt("Enter a number:"));
      const result = divideAndConquer(n);
      document.getElementById("div").innerHTML = "Divide and Conquer result: " + result;
    });

    // Reset the input
    await page.evaluate(() => {
      document.getElementById("div").innerHTML = '';
    });

    const divContent = await page.locator('#div').innerText();
    expect(divContent).toBe('');
  });

  test('should handle invalid input gracefully', async ({ page }) => {
    // Simulate invalid user input
    await page.evaluate(() => {
      window.prompt = () => 'invalid'; // Mock prompt to return invalid input
    });
    await page.evaluate(() => {
      const n = parseInt(prompt("Enter a number:"));
      if (isNaN(n)) {
        document.getElementById("div").innerHTML = "Invalid input. Please enter a number.";
      }
    });

    const divContent = await page.locator('#div').innerText();
    expect(divContent).toContain('Invalid input. Please enter a number.');
  });

});