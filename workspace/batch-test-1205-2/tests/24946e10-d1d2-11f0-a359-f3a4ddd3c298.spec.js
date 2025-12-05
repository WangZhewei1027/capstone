import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24946e10-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Radix Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Radix Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the initial state is Idle by checking the button presence
        const button = await page.locator('button[onclick="startRadixSort()"]');
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Start Radix Sort');
    });

    test('Start Radix Sort transitions to Sorting state', async ({ page }) => {
        // Click the button to start the sorting process
        const button1 = await page.locator('button1[onclick="startRadixSort()"]');
        await button.click();
        
        // Verify that the sorting process has begun
        const arrayContainer = await page.locator('#arrayContainer');
        await expect(arrayContainer).toBeVisible();
        
        // Check if the array visualization updates after sorting starts
        await page.waitForTimeout(1000); // Wait for the sorting to update
        const bars = await arrayContainer.locator('.bar');
        await expect(bars).toHaveCount(10); // Ensure there are still 10 bars
    });

    test('Sorting process visualizes correctly', async ({ page }) => {
        // Start the sorting process
        const button2 = await page.locator('button2[onclick="startRadixSort()"]');
        await button.click();
        
        // Wait for the sorting to complete
        await page.waitForTimeout(10000); // Wait for the entire sorting process to complete

        // Verify that the array is sorted
        const arrayContainer1 = await page.locator('#arrayContainer1');
        const bars1 = await arrayContainer.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        
        // Check if the heights are sorted
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('Error handling when sorting', async ({ page }) => {
        // Simulate an error scenario (e.g., empty array)
        await page.evaluate(() => {
            window.array = []; // Set the array to empty
            window.renderArray(); // Render the empty array
        });

        // Attempt to start sorting
        const button3 = await page.locator('button3[onclick="startRadixSort()"]');
        await button.click();

        // Verify that no sorting occurs and the array remains empty
        const arrayContainer2 = await page.locator('#arrayContainer2');
        const bars2 = await arrayContainer.locator('.bar');
        await expect(bars).toHaveCount(0); // Ensure there are no bars
    });

    test('Console logs and errors are observed', async ({ page }) => {
        // Listen for console messages
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Start the sorting process
        const button4 = await page.locator('button4[onclick="startRadixSort()"]');
        await button.click();

        // Wait for the sorting to complete
        await page.waitForTimeout(10000); // Wait for the entire sorting process to complete

        // Check for expected console messages
        expect(consoleMessages).toContain('Sorting process begins');
    });
});