import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba3a640-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Array Example Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Verify that the input field and buttons are present
        const inputField = await page.locator('#arrayInput');
        const addButton = await page.locator('#add-btn');
        const removeButton = await page.locator('#remove-btn');
        const displayButton = await page.locator('#display-btn');
        const clearButton = await page.locator('#clear-btn');
        const arrayDisplay = await page.locator('#arrayDisplay');

        await expect(inputField).toBeVisible();
        await expect(addButton).toBeVisible();
        await expect(removeButton).toBeVisible();
        await expect(displayButton).toBeVisible();
        await expect(clearButton).toBeVisible();
        await expect(arrayDisplay).toHaveText('Array: ');
    });

    test('should add elements to the array', async ({ page }) => {
        // Test adding elements to the array
        await page.fill('#arrayInput', '1, 2, 3');
        await page.click('#add-btn');

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: 1, 2, 3');
    });

    test('should remove elements from the array', async ({ page }) => {
        // Test removing elements from the array
        await page.fill('#arrayInput', '1, -2, 3');
        await page.click('#remove-btn');

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: 1, 3');
    });

    test('should display the current array', async ({ page }) => {
        // Test displaying the current array
        await page.fill('#arrayInput', '4, 5, 6');
        await page.click('#display-btn');

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: 4, 5, 6');
    });

    test('should clear the input and displayed array', async ({ page }) => {
        // Test clearing the input and displayed array
        await page.fill('#arrayInput', '7, 8, 9');
        await page.click('#clear-btn');

        const arrayDisplay = await page.locator('#arrayDisplay');
        const inputField = await page.locator('#arrayInput');
        await expect(inputField).toHaveValue('');
        await expect(arrayDisplay).toHaveText('Array: ');
    });

    test('should handle empty input gracefully when adding', async ({ page }) => {
        // Test adding with empty input
        await page.fill('#arrayInput', '');
        await page.click('#add-btn');

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: ');
    });

    test('should handle empty input gracefully when removing', async ({ page }) => {
        // Test removing with empty input
        await page.fill('#arrayInput', '');
        await page.click('#remove-btn');

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: ');
    });

    test('should handle empty input gracefully when displaying', async ({ page }) => {
        // Test displaying with empty input
        await page.fill('#arrayInput', '');
        await page.click('#display-btn');

        const arrayDisplay = await page.locator('#arrayDisplay');
        await expect(arrayDisplay).toHaveText('Array: ');
    });

    test('should handle clearing when already empty', async ({ page }) => {
        // Test clearing when the input and display are already empty
        await page.click('#clear-btn');

        const arrayDisplay = await page.locator('#arrayDisplay');
        const inputField = await page.locator('#arrayInput');
        await expect(inputField).toHaveValue('');
        await expect(arrayDisplay).toHaveText('Array: ');
    });
});