import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcba870-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Knapsack Problem Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Verify that the page is in the Idle state
        const button = await page.locator("button[onclick='showDetails()']");
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Show Details');

        const tableBody = await page.locator('tbody');
        await expect(tableBody).toHaveCount(0); // Initially, no details should be shown
    });

    test('should show details when the Show Details button is clicked', async ({ page }) => {
        // Click the Show Details button
        await page.click("button[onclick='showDetails()']");

        // Verify that the application transitions to the Details Shown state
        const tableBody = await page.locator('tbody');
        await expect(tableBody).toHaveCount(1); // Assuming details are shown in one row

        // Check that the details are displayed correctly
        const firstRow = await tableBody.locator('tr').first();
        await expect(firstRow).toContainText('Item'); // Example check, adjust based on actual content
    });

    test('should handle edge cases when no details are available', async ({ page }) => {
        // Simulate a scenario where there are no details to show
        // This might require modifying the HTML/JS to simulate such a case
        // For now, we will just click the button and expect no rows to be added

        await page.click("button[onclick='showDetails()']");

        const tableBody = await page.locator('tbody');
        await expect(tableBody).toHaveCount(0); // No details should be shown
    });

    test('should not crash when clicking Show Details multiple times', async ({ page }) => {
        // Click the Show Details button multiple times
        for (let i = 0; i < 5; i++) {
            await page.click("button[onclick='showDetails()']");
        }

        // Verify that the application still shows the details correctly
        const tableBody = await page.locator('tbody');
        await expect(tableBody).toHaveCount(1); // Assuming details are shown in one row
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can perform cleanup actions after each test
        // For example, resetting the state if needed
    });
});