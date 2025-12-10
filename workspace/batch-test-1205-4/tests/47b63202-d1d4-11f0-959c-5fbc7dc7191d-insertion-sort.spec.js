import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b63202-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Insertion Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(url);
    });

    test('should load the page with default elements', async ({ page }) => {
        // Check if the title is correct
        await expect(page).toHaveTitle('Insertion Sort Visualization');
        
        // Verify the input field and button are visible
        const inputField = await page.locator('#inputArray');
        const sortButton = await page.locator('#btnSort');
        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();
    });

    test('should visualize the array when numbers are inputted', async ({ page }) => {
        // Input numbers into the field
        await page.fill('#inputArray', '3,1,2');
        
        // Click the sort button
        await page.click('#btnSort');
        
        // Verify the bars are created for each number
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(3);
        
        // Check the heights of the bars correspond to the input values
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        expect(heights).toEqual([15, 5, 10]); // 3*5, 1*5, 2*5
    });

    test('should sort the array correctly', async ({ page }) => {
        // Input numbers into the field
        await page.fill('#inputArray', '5,3,4,1,2');
        
        // Click the sort button
        await page.click('#btnSort');
        
        // Wait for the sorting to complete
        await page.waitForTimeout(2000); // Wait for visual feedback
        
        // Verify the bars are sorted
        const sortedBars = await page.locator('.bar');
        const sortedValues = await sortedBars.evaluateAll(bars => bars.map(bar => parseInt(bar.textContent)));
        expect(sortedValues).toEqual([1, 2, 3, 4, 5]);
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the sort button without entering any numbers
        await page.click('#btnSort');
        
        // Verify that no bars are created
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0);
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input invalid numbers
        await page.fill('#inputArray', 'a,b,c');
        
        // Click the sort button
        await page.click('#btnSort');
        
        // Verify that no bars are created
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0);
    });

    test('should highlight elements during sorting', async ({ page }) => {
        // Input numbers into the field
        await page.fill('#inputArray', '4,3,2,1');
        
        // Click the sort button
        await page.click('#btnSort');
        
        // Wait for the sorting to complete
        await page.waitForTimeout(2000); // Wait for visual feedback
        
        // Check if the elements were highlighted during sorting
        const bars = await page.locator('.bar');
        const highlightedBars = await bars.evaluateAll(bars => bars.filter(bar => bar.style.backgroundColor === 'tomato'));
        expect(highlightedBars.length).toBeGreaterThan(0); // Ensure at least one bar was highlighted
    });
});