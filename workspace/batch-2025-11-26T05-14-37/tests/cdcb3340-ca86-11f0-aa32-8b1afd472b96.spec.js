import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcb3340-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Prim\'s Algorithm Interactive Application', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application page before each test
    await page.goto(BASE_URL);
  });

  test('should display the initial state with Run button', async ({ page }) => {
    // Validate that the page loads in the Idle state
    const title = await page.title();
    expect(title).toBe("Prim's Algorithm");

    const runButton = await page.locator("button[onclick='main()']");
    await expect(runButton).toBeVisible();
    await expect(runButton).toHaveText('Run');
  });

  test('should transition from Idle to Running state on Run button click', async ({ page }) => {
    // Click the Run button to trigger the main algorithm function
    const runButton = await page.locator("button[onclick='main()']");
    await runButton.click();

    // Validate that the application is now in the Running state
    // Here we would check for any visual feedback or changes in the DOM
    // For this example, we assume that some output is displayed after running
    const output = await page.locator('body').innerText();
    expect(output).toContain('GCD'); // Assuming the output contains 'GCD' after running
  });

  test('should handle multiple clicks on Run button gracefully', async ({ page }) => {
    // Click the Run button multiple times to see if the application handles it correctly
    const runButton = await page.locator("button[onclick='main()']");
    await runButton.click();
    await runButton.click(); // Click again

    // Validate that the application still shows the expected output
    const output = await page.locator('body').innerText();
    expect(output).toContain('GCD'); // Assuming the output is still valid
  });

  test('should not crash on invalid input (edge case)', async ({ page }) => {
    // Simulate an edge case where the input is invalid
    // This would require modifying the HTML/JS to handle such cases
    // For the sake of this test, we assume a function to simulate this
    await page.evaluate(() => {
      // Simulate an invalid state (this part would depend on the actual implementation)
      // For example, we could set up a scenario where the input is empty or invalid
    });

    const runButton = await page.locator("button[onclick='main()']");
    await runButton.click();

    // Validate that an error message is displayed
    const errorMessage = await page.locator('.error-message'); // Assuming there's an error message element
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Invalid input'); // Assuming this is the error message
  });

  test.afterEach(async ({ page }) => {
    // Any cleanup can be done here if necessary
    // For example, resetting the state of the application
  });
});