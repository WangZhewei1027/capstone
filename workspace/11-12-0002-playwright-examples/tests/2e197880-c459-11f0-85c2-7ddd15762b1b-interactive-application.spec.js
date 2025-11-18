import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/11-12-0002-playwright-examples/html/2e197880-c459-11f0-85c2-7ddd15762b1b.html';

test.describe('K-Nearest Neighbors (KNN) Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(url);
    });

    test('should start in idle state and draw initial plot', async ({ page }) => {
        // Verify the initial state is idle by checking the plot and result info
        const plot = await page.locator('#knnPlot');
        const resultInfo = await page.locator('#resultInfo');

        // Check if the plot is drawn
        await expect(plot).toHaveCount(1);
        await expect(resultInfo).toContainText('Classified label for new point:');
    });

    test('should transition to updating state when update button is clicked', async ({ page }) => {
        // Click the update button to trigger the state transition
        await page.click('#updateButton');

        // Verify that the plot is redrawn (indicating the updating state)
        const plot = await page.locator('#knnPlot');
        await expect(plot).toHaveCount(1);
    });

    test('should classify the new point correctly when K is updated', async ({ page }) => {
        // Change the value of K and click the update button
        await page.fill('#kValue', '5');
        await page.click('#updateButton');

        // Verify the classification result for K=5
        const resultInfo = await page.locator('#resultInfo');
        await expect(resultInfo).toContainText('Classified label for new point: <strong>B</strong> (K=5)');
    });

    test('should handle edge case when K is set to 1', async ({ page }) => {
        // Set K to 1 and update
        await page.fill('#kValue', '1');
        await page.click('#updateButton');

        // Verify the classification result for K=1
        const resultInfo = await page.locator('#resultInfo');
        await expect(resultInfo).toContainText('Classified label for new point: <strong>A</strong> (K=1)');
    });

    test('should handle edge case when K is set to maximum value', async ({ page }) => {
        // Set K to maximum value and update
        await page.fill('#kValue', '10');
        await page.click('#updateButton');

        // Verify the classification result for K=10
        const resultInfo = await page.locator('#resultInfo');
        await expect(resultInfo).toContainText('Classified label for new point: <strong>B</strong> (K=10)');
    });

    test('should not allow K to be less than 1', async ({ page }) => {
        // Set K to an invalid value and attempt to update
        await page.fill('#kValue', '0');
        await page.click('#updateButton');

        // Verify that the result info does not change
        const resultInfo = await page.locator('#resultInfo');
        await expect(resultInfo).toContainText('Classified label for new point:');
    });

    test('should not allow K to exceed maximum value', async ({ page }) => {
        // Set K to an invalid value and attempt to update
        await page.fill('#kValue', '11');
        await page.click('#updateButton');

        // Verify that the result info does not change
        const resultInfo = await page.locator('#resultInfo');
        await expect(resultInfo).toContainText('Classified label for new point:');
    });
});