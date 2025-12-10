import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c93da90-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Radix Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page with default elements', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Radix Sort Visualization');
        
        // Check if the input field and button are visible
        const inputField = await page.locator('#inputArray');
        const sortButton = await page.locator('button');

        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();
    });

    test('should visualize the array after sorting', async ({ page }) => {
        // Input a set of numbers and perform sorting
        await page.fill('#inputArray', '5,3,8,6,2');
        await page.click('button');

        // Verify that the array visualization updates
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(5); // Ensure 5 bars are created

        // Check the heights of the bars to ensure they represent sorted values
        const heights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        const expectedHeights = ['40px', '60px', '80px', '100px', '20px']; // Heights based on input values
        await expect(heights).toEqual(expectedHeights);
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the sort button without any input
        await page.click('button');

        // Check if the array visualization is empty
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0); // No bars should be created
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input invalid data and perform sorting
        await page.fill('#inputArray', 'abc,123,456');
        await page.click('button');

        // Check if the array visualization is empty
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0); // No bars should be created
    });

    test('should sort a large array correctly', async ({ page }) => {
        // Input a larger set of numbers
        await page.fill('#inputArray', '10,9,8,7,6,5,4,3,2,1');
        await page.click('button');

        // Verify that the array visualization updates
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Ensure 10 bars are created

        // Check the heights of the bars to ensure they represent sorted values
        const heights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        const expectedHeights = ['100px', '80px', '60px', '40px', '20px', '0px', '0px', '0px', '0px', '0px']; // Heights based on sorted values
        await expect(heights).toEqual(expectedHeights);
    });

    test('should log errors for invalid input', async ({ page }) => {
        // Listen for console messages
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Error message:', msg.text());
            }
        });

        // Input invalid data and perform sorting
        await page.fill('#inputArray', '1,2,abc,4');
        await page.click('button');

        // Expect an error to be logged in the console
        const consoleMessages = await page.evaluate(() => {
            return window.console.messages;
        });

        expect(consoleMessages).toContain(expect.stringContaining('Invalid input'));
    });
});