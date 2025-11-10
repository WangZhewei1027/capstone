import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/021d5940-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Quick Sort Application', () => {
    
    test('Initial state - idle', async ({ page }) => {
        // Verify that the array is generated on load
        const arrayBars = await page.locator('#array .bar');
        expect(await arrayBars.count()).toBeGreaterThan(0);
    });

    test('Generate Array button - transitions to array_generated', async ({ page }) => {
        // Click the Generate Array button
        await page.click('#generateArray');
        
        // Verify that the array is drawn
        const arrayBars1 = await page.locator('#array .bar');
        expect(await arrayBars.count()).toBeGreaterThan(0);
    });

    test('Sort Array button - transitions to sorting', async ({ page }) => {
        // First generate an array
        await page.click('#generateArray');
        
        // Click the Sort Array button
        await page.click('#sortArray');
        
        // Verify that sorting is in progress
        const sortingIndicator = await page.locator('.pivot');
        expect(await sortingIndicator.count()).toBeGreaterThan(0);
    });

    test('Sorting completes - transitions to done', async ({ page }) => {
        // Generate an array and sort it
        await page.click('#generateArray');
        await page.click('#sortArray');
        
        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration
        
        // Verify that sorting is complete
        const sortedBars = await page.locator('#array .sorted');
        expect(await sortedBars.count()).toBeGreaterThan(0);
        
        // Verify that we can generate a new array after sorting
        await page.click('#generateArray');
        const newArrayBars = await page.locator('#array .bar');
        expect(await newArrayBars.count()).toBeGreaterThan(0);
    });

    test('Edge case - Generate Array with minimum size', async ({ page }) => {
        // Set the array size to minimum
        await page.fill('#arraySize', '3');
        
        // Generate the array
        await page.click('#generateArray');
        
        // Verify that the array is generated with 3 elements
        const arrayBars2 = await page.locator('#array .bar');
        expect(await arrayBars.count()).toBe(3);
    });

    test('Edge case - Generate Array with maximum size', async ({ page }) => {
        // Set the array size to maximum
        await page.fill('#arraySize', '20');
        
        // Generate the array
        await page.click('#generateArray');
        
        // Verify that the array is generated with 20 elements
        const arrayBars3 = await page.locator('#array .bar');
        expect(await arrayBars.count()).toBe(20);
    });

    test('Error scenario - Invalid array size', async ({ page }) => {
        // Set an invalid array size
        await page.fill('#arraySize', '25'); // Out of bounds
        
        // Attempt to generate the array
        await page.click('#generateArray');
        
        // Verify that no array is generated
        const arrayBars4 = await page.locator('#array .bar');
        expect(await arrayBars.count()).toBe(0);
    });
});