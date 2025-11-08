import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/091010d0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Binary Search Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that the initial state is idle
        const nextStepButton = await page.locator('#nextStepBtn');
        const restartButton = await page.locator('#restartBtn');
        await expect(nextStepButton).toBeDisabled();
        await expect(restartButton).toBeDisabled();
    });

    test('should transition to searching state on search button click', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');
        await page.click('#searchBtn');

        // Verify that the state has transitioned to searching
        const resultSection = await page.locator('#resultSection');
        await expect(resultSection).toContainText('Searching...');
    });

    test('should handle invalid input and return to idle state', async ({ page }) => {
        await page.fill('#arrayInput', 'invalid');
        await page.fill('#targetInput', '3');
        await page.click('#searchBtn');

        // Verify that the state returns to idle due to invalid input
        const resultSection1 = await page.locator('#resultSection1');
        await expect(resultSection).toContainText('Invalid input');
        
        const nextStepButton1 = await page.locator('#nextStepBtn');
        const restartButton1 = await page.locator('#restartBtn');
        await expect(nextStepButton).toBeDisabled();
        await expect(restartButton).toBeDisabled();
    });

    test('should transition to visualizing state after search completion', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');
        await page.click('#searchBtn');

        // Simulate search completion
        await page.evaluate(() => {
            document.getElementById('resultSection').innerText = 'Search completed';
        });

        // Verify that the state has transitioned to visualizing
        const nextStepButton2 = await page.locator('#nextStepBtn');
        await expect(nextStepButton).toBeEnabled();
    });

    test('should visualize steps correctly', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');
        await page.click('#searchBtn');

        // Simulate search completion
        await page.evaluate(() => {
            document.getElementById('resultSection').innerText = 'Search completed';
        });

        await page.click('#nextStepBtn');

        // Verify that the visualization updates
        const visualization = await page.locator('#visualization');
        await expect(visualization).toHaveCount(3); // Assuming 3 steps for the search
    });

    test('should transition to done state after all steps are completed', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');
        await page.click('#searchBtn');

        // Simulate search completion
        await page.evaluate(() => {
            document.getElementById('resultSection').innerText = 'Search completed';
        });

        // Simulate going through all steps
        await page.click('#nextStepBtn');
        await page.click('#nextStepBtn');
        await page.click('#nextStepBtn'); // Assuming 3 steps

        // Verify that the state has transitioned to done
        const restartButton2 = await page.locator('#restartBtn');
        await expect(restartButton).toBeEnabled();
    });

    test('should restart and return to idle state', async ({ page }) => {
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');
        await page.click('#searchBtn');

        // Simulate search completion
        await page.evaluate(() => {
            document.getElementById('resultSection').innerText = 'Search completed';
        });

        // Simulate going through all steps
        await page.click('#nextStepBtn');
        await page.click('#nextStepBtn');
        await page.click('#nextStepBtn'); // Assuming 3 steps

        // Restart the process
        await page.click('#restartBtn');

        // Verify that we are back in idle state
        const nextStepButton3 = await page.locator('#nextStepBtn');
        const restartButton3 = await page.locator('#restartBtn');
        await expect(nextStepButton).toBeDisabled();
        await expect(restartButton).toBeDisabled();
    });
});