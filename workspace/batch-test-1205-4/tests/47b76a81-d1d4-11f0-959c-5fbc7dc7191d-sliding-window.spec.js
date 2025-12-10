import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b76a81-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Sliding Window Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Sliding Window Demo');

        // Check that the output div is empty initially
        const outputDiv = await page.locator('#output');
        expect(await outputDiv.innerHTML()).toBe('');
    });

    test('should compute sliding window sum for valid input', async ({ page }) => {
        // Input valid array and window size
        await page.fill('#inputArray', '1,2,3,4,5');
        await page.fill('#windowSize', '3');

        // Click the compute button
        await page.click('#computeButton');

        // Verify the output
        const outputDiv = await page.locator('#output');
        expect(await outputDiv.innerHTML()).toContain('Sliding window sums: 6, 9, 12');
    });

    test('should show error for invalid window size', async ({ page }) => {
        // Input valid array and invalid window size
        await page.fill('#inputArray', '1,2,3,4,5');
        await page.fill('#windowSize', '10');

        // Click the compute button
        await page.click('#computeButton');

        // Verify the output
        const outputDiv = await page.locator('#output');
        expect(await outputDiv.innerHTML()).toBe('Window size must be less than or equal to the array length.');
    });

    test('should show error for empty array input', async ({ page }) => {
        // Input empty array and valid window size
        await page.fill('#inputArray', '');
        await page.fill('#windowSize', '3');

        // Click the compute button
        await page.click('#computeButton');

        // Verify the output
        const outputDiv = await page.locator('#output');
        expect(await outputDiv.innerHTML()).toBe('Please enter valid input values.');
    });

    test('should show error for invalid window size input', async ({ page }) => {
        // Input valid array and invalid window size
        await page.fill('#inputArray', '1,2,3,4,5');
        await page.fill('#windowSize', '0');

        // Click the compute button
        await page.click('#computeButton');

        // Verify the output
        const outputDiv = await page.locator('#output');
        expect(await outputDiv.innerHTML()).toBe('Please enter valid input values.');
    });

    test('should show error for non-numeric window size', async ({ page }) => {
        // Input valid array and non-numeric window size
        await page.fill('#inputArray', '1,2,3,4,5');
        await page.fill('#windowSize', 'abc');

        // Click the compute button
        await page.click('#computeButton');

        // Verify the output
        const outputDiv = await page.locator('#output');
        expect(await outputDiv.innerHTML()).toBe('Please enter valid input values.');
    });
});