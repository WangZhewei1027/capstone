import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c93b381-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Heap Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify that the title is correct
        await expect(page).toHaveTitle('Heap Sort Visualization');
        
        // Check if the controls are visible
        await expect(page.locator('#controls')).toBeVisible();
        await expect(page.locator('button:has-text("Start Heap Sort")')).toBeVisible();
        await expect(page.locator('button:has-text("Generate Random Array")')).toBeVisible();
        
        // Verify that the array container is initially empty
        const bars = page.locator('#arrayContainer .bar');
        await expect(bars).toHaveCount(0);
    });

    test('should generate a random array and display it', async ({ page }) => {
        // Click the "Generate Random Array" button
        await page.click('button:has-text("Generate Random Array")');
        
        // Verify that bars are generated
        const bars = page.locator('#arrayContainer .bar');
        await expect(bars).toHaveCount(20); // Expecting 20 bars to be generated
    });

    test('should start heap sort and visualize sorting process', async ({ page }) => {
        // Generate a random array first
        await page.click('button:has-text("Generate Random Array")');
        
        // Start the heap sort
        await page.click('button:has-text("Start Heap Sort")');
        
        // Wait for a short duration to allow sorting to occur
        await page.waitForTimeout(1000); // Adjust time as needed for sorting visualization
        
        // Check if the array is sorted
        const bars = await page.locator('#arrayContainer .bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        
        // Verify that the array is sorted in ascending order
        const isSorted = heights.every((value, index, array) => index === 0 || value >= array[index - 1]);
        expect(isSorted).toBe(true);
    });

    test('should alert when starting heap sort with an empty array', async ({ page }) => {
        // Start the heap sort without generating an array
        await page.click('button:has-text("Start Heap Sort")');
        
        // Check for alert message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please generate an array first!');
            await dialog.dismiss();
        });
    });

    test('should handle multiple random array generations', async ({ page }) => {
        // Generate a random array
        await page.click('button:has-text("Generate Random Array")');
        
        // Store the initial heights
        const initialBars = await page.locator('#arrayContainer .bar');
        const initialHeights = await initialBars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        
        // Generate another random array
        await page.click('button:has-text("Generate Random Array")');
        
        // Verify that the new array is different from the initial one
        const newBars = await page.locator('#arrayContainer .bar');
        const newHeights = await newBars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        
        expect(initialHeights).not.toEqual(newHeights);
    });
});