import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b7c000-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Fibonacci Sequence Generator', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Fibonacci Sequence Generator page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default elements', async ({ page }) => {
        // Verify that the page loads with the correct title and input elements
        await expect(page).toHaveTitle('Fibonacci Sequence Generator');
        await expect(page.locator('h1')).toHaveText('Fibonacci Sequence Generator');
        await expect(page.locator('input#terms')).toBeVisible();
        await expect(page.locator('button')).toHaveText('Generate');
        await expect(page.locator('#result')).toBeVisible();
    });

    test('should generate Fibonacci sequence for valid input', async ({ page }) => {
        // Test generating Fibonacci sequence for a valid input
        await page.fill('input#terms', '5');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('Fibonacci Sequence: 0, 1, 1, 2, 3');
    });

    test('should generate Fibonacci sequence for input of 1', async ({ page }) => {
        // Test generating Fibonacci sequence for input of 1
        await page.fill('input#terms', '1');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('Fibonacci Sequence: 0');
    });

    test('should generate Fibonacci sequence for input of 2', async ({ page }) => {
        // Test generating Fibonacci sequence for input of 2
        await page.fill('input#terms', '2');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('Fibonacci Sequence: 0, 1');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Test generating Fibonacci sequence for invalid input (e.g., negative number)
        await page.fill('input#terms', '-1');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText(''); // Expect no output for invalid input
    });

    test('should handle non-numeric input', async ({ page }) => {
        // Test generating Fibonacci sequence for non-numeric input
        await page.fill('input#terms', 'abc');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText(''); // Expect no output for non-numeric input
    });

    test('should not generate sequence when input is empty', async ({ page }) => {
        // Test generating Fibonacci sequence with empty input
        await page.fill('input#terms', '');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText(''); // Expect no output for empty input
    });

    test('should display result correctly after multiple submissions', async ({ page }) => {
        // Test generating Fibonacci sequence multiple times
        await page.fill('input#terms', '3');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('Fibonacci Sequence: 0, 1, 1');

        await page.fill('input#terms', '4');
        await page.click('button');
        await expect(page.locator('#result')).toHaveText('Fibonacci Sequence: 0, 1, 1, 2');
    });
});