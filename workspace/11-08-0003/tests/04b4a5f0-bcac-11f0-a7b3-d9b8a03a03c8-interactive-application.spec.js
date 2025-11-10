import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/04b4a5f0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Counting Sort Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state and clear visualization', async ({ page }) => {
        const visualization = await page.locator('#visualization');
        await expect(visualization).toHaveText('');
    });

    test('should validate input and transition to sorting state on valid input', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,2');
        await page.click('#sortButton');

        // Check for the sorting state by verifying the visualization of the input array
        const visualization1 = await page.locator('#visualization1');
        await expect(visualization).toHaveText('Input Array');
    });

    test('should remain in idle state and show alert on invalid input', async ({ page }) => {
        await page.fill('#arrayInput', '3,a,2');
        await page.click('#sortButton');

        // Check for alert message
        const alertPromise = page.waitForEvent('dialog');
        await page.click('#sortButton');
        const dialog = await alertPromise;
        expect(dialog.message()).toContain('Please enter only numbers separated by commas.');
        await dialog.dismiss();

        const visualization2 = await page.locator('#visualization2');
        await expect(visualization).toHaveText('');
    });

    test('should transition to visualizing_input state after sorting is complete', async ({ page }) => {
        await page.fill('#arrayInput', '4,2,3,1');
        await page.click('#sortButton');

        // Wait for the visualization of the input array
        await page.waitForTimeout(1000); // Wait for the input visualization to complete
        const visualization3 = await page.locator('#visualization3');
        await expect(visualization).toHaveText('Input Array');

        // Check for sorted array visualization after a delay
        await page.waitForTimeout(1000); // Wait for the sorted array visualization
        await expect(visualization).toHaveText('Sorted Array');
    });

    test('should transition to done state and display completion message', async ({ page }) => {
        await page.fill('#arrayInput', '5,3,4,2,1');
        await page.click('#sortButton');

        // Wait for the sorting and visualization to complete
        await page.waitForTimeout(2000); // Adjust based on expected completion time

        const visualization4 = await page.locator('#visualization4');
        await expect(visualization).toHaveText('Sorted Array');

        // Check for completion message (if applicable)
        const completionMessage = await page.locator('#instructions');
        await expect(completionMessage).toContainText('Sorting complete!');
    });

    test('should reset to idle state when reset is triggered', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3');
        await page.click('#sortButton');
        await page.waitForTimeout(2000); // Wait for sorting to complete

        // Simulate reset action
        await page.fill('#arrayInput', '');
        await page.click('#sortButton'); // Click again to reset

        const visualization5 = await page.locator('#visualization5');
        await expect(visualization).toHaveText('');
    });
});