import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba5f030-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Quick Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Quick Sort application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should render correctly', async ({ page }) => {
        // Verify that the initial state (Idle) is rendered correctly
        const input = await page.locator('#input');
        const sortButton = await page.locator('#sort-button');
        const output = await page.locator('#output');

        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter the number of elements');
        await expect(sortButton).toBeVisible();
        await expect(sortButton).toHaveText('Sort');
        await expect(output).toBeVisible();
        await expect(output).toHaveText('');
    });

    test('Sorting functionality with valid input', async ({ page }) => {
        // Test sorting with a valid input
        await page.fill('#input', '5'); // User inputs 5
        await page.click('#sort-button'); // User clicks the sort button

        // Verify the output after sorting
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
        await expect(output).toContainText('Sorted array: ');
    });

    test('Error message for non-positive input', async ({ page }) => {
        // Test error handling with invalid input (zero)
        await page.fill('#input', '0'); // User inputs 0
        await page.click('#sort-button'); // User clicks the sort button

        // Verify the error message
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
        await expect(output).toHaveText('Please enter a positive integer.');
    });

    test('Error message for negative input', async ({ page }) => {
        // Test error handling with invalid input (negative number)
        await page.fill('#input', '-3'); // User inputs -3
        await page.click('#sort-button'); // User clicks the sort button

        // Verify the error message
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
        await expect(output).toHaveText('Please enter a positive integer.');
    });

    test('Sorting with repeated numbers', async ({ page }) => {
        // Test sorting with repeated numbers
        await page.fill('#input', '3'); // User inputs 3
        await page.fill('#input', '5'); // User inputs 5
        await page.fill('#input', '5'); // User inputs 5
        await page.fill('#input', '2'); // User inputs 2
        await page.click('#sort-button'); // User clicks the sort button

        // Verify the output after sorting
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
        await expect(output).toContainText('Sorted array: 2 5 5 ');
    });

    test('Sorting with large input', async ({ page }) => {
        // Test sorting with a large number of elements
        await page.fill('#input', '100'); // User inputs 100
        await page.click('#sort-button'); // User clicks the sort button

        // Verify the output after sorting
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
        await expect(output).toContainText('Sorted array: ');
    });
});