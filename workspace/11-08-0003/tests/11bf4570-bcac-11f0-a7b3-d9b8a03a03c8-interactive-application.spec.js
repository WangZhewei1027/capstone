import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/11bf4570-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Fibonacci Sequence Explorer Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Fibonacci Sequence Explorer application
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        // Verify that the application is in the idle state initially
        const numberInput = await page.locator('#numberInput');
        const generateButton = await page.locator('#generateButton');
        await expect(numberInput).toBeVisible();
        await expect(generateButton).toBeVisible();
    });

    test('Generate Fibonacci sequence', async ({ page }) => {
        // Test generating Fibonacci numbers
        await page.fill('#numberInput', '5');
        await page.click('#generateButton');

        // Verify that the application transitions to the generating state
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(5); // Expect 5 bars for Fibonacci(5)
    });

    test('Visualizing Fibonacci sequence', async ({ page }) => {
        // Test visualization of the Fibonacci sequence
        await page.fill('#numberInput', '7');
        await page.click('#generateButton');

        // Verify that the bars are displayed correctly
        const bars1 = await page.locator('.bar');
        await expect(bars).toHaveCount(7); // Expect 7 bars for Fibonacci(7)

        // Verify heights of the bars correspond to Fibonacci numbers
        const heights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        expect(heights).toEqual(['0px', '5px', '10px', '15px', '25px', '40px', '65px']); // Fibonacci(0) to Fibonacci(6)
    });

    test('Tooltip visibility on mouse over', async ({ page }) => {
        // Test tooltip visibility when hovering over a bar
        await page.fill('#numberInput', '5');
        await page.click('#generateButton');

        const firstBar = await page.locator('.bar').nth(0);
        await firstBar.hover();

        // Verify that the tooltip is visible
        const tooltip = await firstBar.locator('.tooltip');
        await expect(tooltip).toBeVisible();
    });

    test('Tooltip hides on mouse out', async ({ page }) => {
        // Test tooltip hiding when mouse leaves the bar
        await page.fill('#numberInput', '5');
        await page.click('#generateButton');

        const firstBar1 = await page.locator('.bar').nth(0);
        await firstBar.hover();
        await expect(firstBar.locator('.tooltip')).toBeVisible();

        await firstBar.dispatchEvent('mouseleave'); // Simulate mouse out
        await expect(firstBar.locator('.tooltip')).toBeHidden();
    });

    test('Handle invalid input gracefully', async ({ page }) => {
        // Test behavior with invalid input
        await page.fill('#numberInput', '25'); // Input exceeds the limit
        await page.click('#generateButton');

        // Verify that no bars are displayed
        const bars2 = await page.locator('.bar');
        await expect(bars).toHaveCount(0); // Expect no bars for invalid input
    });

    test('Check input limits', async ({ page }) => {
        // Test the input limits
        await page.fill('#numberInput', '0'); // Invalid input
        await page.click('#generateButton');

        const bars3 = await page.locator('.bar');
        await expect(bars).toHaveCount(0); // Expect no bars for invalid input

        await page.fill('#numberInput', '21'); // Input exceeds the limit
        await page.click('#generateButton');

        await expect(bars).toHaveCount(0); // Expect no bars for invalid input
    });
});