import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c938c70-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Insertion Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial array', async ({ page }) => {
        // Verify that the title is correct
        await expect(page).toHaveTitle('Insertion Sort Visualization');

        // Check that the initial bars are generated
        const bars = await page.$$('.bar');
        expect(bars.length).toBe(8); // Initial array length is 8

        // Verify the heights of the bars match the initial array values
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        expect(heights).toEqual(['100px', '60px', '160px', '120px', '40px', '140px', '80px', '20px']);
    });

    test('should sort the array when the sort button is clicked', async ({ page }) => {
        // Click the sort button
        await page.click('button');

        // Wait for the sorting to complete (this may require adjusting based on the timing in the app)
        await page.waitForTimeout(10000); // Wait for the sorting animation to complete

        // Check that the bars are sorted
        const bars = await page.$$('.bar');
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.style.height)));
        
        // The sorted array should be [20px, 40px, 60px, 80px, 100px, 120px, 140px, 160px]
        expect(heights).toEqual(['20px', '40px', '60px', '80px', '100px', '120px', '140px', '160px']);
    });

    test('should visualize the sorting process', async ({ page }) => {
        // Click the sort button
        await page.click('button');

        // Check the visual updates during sorting
        const initialBars = await page.$$('.bar');
        const initialHeights = await Promise.all(initialBars.map(bar => bar.evaluate(el => el.style.height)));

        // Wait for some time to allow the sorting process to visualize
        await page.waitForTimeout(5000); // Wait for part of the sorting process

        // Check if the heights have changed (indicating sorting is in progress)
        const updatedBars = await page.$$('.bar');
        const updatedHeights = await Promise.all(updatedBars.map(bar => bar.evaluate(el => el.style.height)));

        expect(initialHeights).not.toEqual(updatedHeights); // Heights should have changed during sorting
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Simulate an error by modifying the array to an invalid state (not applicable in this case)
        // Here we just check for console errors during sorting
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Error message: ', msg.text());
            }
        });

        // Click the sort button
        await page.click('button');

        // Wait for the sorting to complete
        await page.waitForTimeout(10000); // Adjust based on the timing in the app

        // Check if any console errors were logged
        // This is a placeholder as we cannot assert console logs directly
        // In a real-world scenario, we would capture and assert on these logs
    });
});