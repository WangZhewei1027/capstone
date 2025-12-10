import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b80e21-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Sliding Window Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the sliding window application
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Sliding Window Concept');
        
        // Check if the initial window is rendered correctly
        const items = await page.locator('.item');
        expect(await items.count()).toBe(3); // Default window size is 3
        
        // Verify the output for the initial window
        const output = await page.locator('#output');
        await expect(output).toHaveText('Current Window: [1, 2, 3]');
    });

    test('should slide the window when the button is clicked', async ({ page }) => {
        // Click the slide button
        await page.click('#slideButton');
        
        // Verify the new window items after sliding
        const items = await page.locator('.item');
        expect(await items.count()).toBe(3); // Still should be 3 items
        
        // Verify the output for the new window
        const output = await page.locator('#output');
        await expect(output).toHaveText('Current Window: [2, 3, 4]');
    });

    test('should slide the window multiple times', async ({ page }) => {
        // Slide the window multiple times
        for (let i = 0; i < 7; i++) {
            await page.click('#slideButton');
        }
        
        // Verify the last window items
        const items = await page.locator('.item');
        expect(await items.count()).toBe(3); // Still should be 3 items
        
        // Verify the output for the last window
        const output = await page.locator('#output');
        await expect(output).toHaveText('Current Window: [8, 9, 10]');
    });

    test('should display no more windows available when at the end', async ({ page }) => {
        // Slide the window until the end
        for (let i = 0; i < 8; i++) {
            await page.click('#slideButton');
        }
        
        // Verify the output when no more windows are available
        const output = await page.locator('#output');
        await expect(output).toHaveText('No more windows available.');
    });

    test('should allow changing the window size', async ({ page }) => {
        // Change the window size to 2
        await page.fill('#windowSize', '2');
        
        // Slide the window
        await page.click('#slideButton');
        
        // Verify the new window items after changing size
        const items = await page.locator('.item');
        expect(await items.count()).toBe(2); // Now should be 2 items
        
        // Verify the output for the new window
        const output = await page.locator('#output');
        await expect(output).toHaveText('Current Window: [1, 2]');
    });

    test('should not allow window size less than 1', async ({ page }) => {
        // Attempt to set window size to 0
        await page.fill('#windowSize', '0');
        
        // Click the slide button
        await page.click('#slideButton');
        
        // Verify the output should not change
        const output = await page.locator('#output');
        await expect(output).toHaveText('Current Window: [1, 2, 3]'); // Should remain the same
    });

    test('should not allow window size greater than 10', async ({ page }) => {
        // Attempt to set window size to 11
        await page.fill('#windowSize', '11');
        
        // Click the slide button
        await page.click('#slideButton');
        
        // Verify the output should not change
        const output = await page.locator('#output');
        await expect(output).toHaveText('Current Window: [1, 2, 3]'); // Should remain the same
    });
});