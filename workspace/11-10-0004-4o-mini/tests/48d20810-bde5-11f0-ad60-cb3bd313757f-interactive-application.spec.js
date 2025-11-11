import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0004-4o-mini/html/48d20810-bde5-11f0-ad60-cb3bd313757f.html';

test.describe('Binary Search Tree Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const input = await page.locator('#nodeValue');
        const button = await page.locator('#insertBtn');
        const treeArea = await page.locator('#treeArea');

        await expect(input).toBeVisible();
        await expect(button).toBeVisible();
        await expect(treeArea).toHaveText('');
    });

    test('should transition to inserting state on insert button click', async ({ page }) => {
        const button = await page.locator('#insertBtn');
        await button.click();

        // Expecting to stay in idle state since no input is provided
        await expect(page.locator('#nodeValue')).toHaveValue('');
    });

    test('should validate input and transition to visualizing state on valid input', async ({ page }) => {
        const input = await page.locator('#nodeValue');
        const button = await page.locator('#insertBtn');

        await input.fill('5');
        await button.click();

        // Simulate INPUT_VALID event
        await page.evaluate(() => {
            document.getElementById('nodeValue').dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Expecting to transition to visualizing state
        await expect(page.locator('#treeArea')).toHaveText('Visualizing tree with node 5'); // Assuming this is the expected text
    });

    test('should return to idle state after visualization is complete', async ({ page }) => {
        const input = await page.locator('#nodeValue');
        const button = await page.locator('#insertBtn');

        await input.fill('10');
        await button.click();

        // Simulate INPUT_VALID event
        await page.evaluate(() => {
            document.getElementById('nodeValue').dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Simulate VISUALIZATION_COMPLETE event
        await page.evaluate(() => {
            document.getElementById('treeArea').dispatchEvent(new Event('visualizationComplete', { bubbles: true }));
        });

        // Expecting to transition back to idle state
        await expect(page.locator('#treeArea')).toHaveText('');
    });

    test('should return to idle state on invalid input', async ({ page }) => {
        const input = await page.locator('#nodeValue');
        const button = await page.locator('#insertBtn');

        await input.fill('invalid');
        await button.click();

        // Simulate INPUT_INVALID event
        await page.evaluate(() => {
            document.getElementById('nodeValue').dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Expecting to return to idle state
        await expect(page.locator('#treeArea')).toHaveText('');
    });

    test('should clear input on exit from inserting state', async ({ page }) => {
        const input = await page.locator('#nodeValue');
        const button = await page.locator('#insertBtn');

        await input.fill('15');
        await button.click();

        // Simulate INPUT_VALID event
        await page.evaluate(() => {
            document.getElementById('nodeValue').dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Simulate VISUALIZATION_COMPLETE event
        await page.evaluate(() => {
            document.getElementById('treeArea').dispatchEvent(new Event('visualizationComplete', { bubbles: true }));
        });

        // Expecting input to be cleared
        await expect(input).toHaveValue('');
    });

    test.afterEach(async ({ page }) => {
        // Any cleanup can be done here if necessary
    });
});