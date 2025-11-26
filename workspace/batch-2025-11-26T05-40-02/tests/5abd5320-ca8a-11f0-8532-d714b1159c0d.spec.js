import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abd5320-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Binary Tree Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Validate that the initial state is rendered correctly
        const outputElement = await page.locator('#output');
        const treeElement = await page.locator('#tree');
        
        await expect(treeElement).toBeVisible();
        await expect(outputElement).toHaveText('');
    });

    test('should add a value to the binary tree using the Add button', async ({ page }) => {
        // Test adding a value using the Add button
        await page.fill('#value', '10');
        await page.click('#add-btn');

        // Validate the output after adding the value
        const outputElement = await page.locator('#output');
        await expect(outputElement).toHaveText('10');
    });

    test('should add a value to the binary tree using the form submission', async ({ page }) => {
        // Test adding a value using form submission
        await page.fill('#value', '20');
        await page.press('#input-form', 'Enter');

        // Validate the output after adding the value
        const outputElement = await page.locator('#output');
        await expect(outputElement).toHaveText('20');
    });

    test('should maintain the binary tree structure after multiple additions', async ({ page }) => {
        // Add multiple values to the binary tree
        await page.fill('#value', '30');
        await page.click('#add-btn');
        await page.fill('#value', '15');
        await page.click('#add-btn');
        await page.fill('#value', '25');
        await page.click('#add-btn');

        // Validate the output after adding multiple values
        const outputElement = await page.locator('#output');
        await expect(outputElement).toHaveText(/30/); // Check root
        await expect(outputElement).toHaveText(/15/); // Check left child
        await expect(outputElement).toHaveText(/25/); // Check right child
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Test adding an invalid value (non-numeric)
        await page.fill('#value', 'abc');
        await page.click('#add-btn');

        // Validate that the output does not change
        const outputElement = await page.locator('#output');
        await expect(outputElement).toHaveText('');
    });

    test('should not add duplicate values to the binary tree', async ({ page }) => {
        // Test adding a duplicate value
        await page.fill('#value', '40');
        await page.click('#add-btn');
        await page.fill('#value', '40');
        await page.click('#add-btn');

        // Validate the output after adding duplicate values
        const outputElement = await page.locator('#output');
        const textContent = await outputElement.textContent();
        const occurrences = (textContent.match(/40/g) || []).length;
        await expect(occurrences).toBe(1); // Ensure it only appears once
    });

    test('should clear the input field after adding a value', async ({ page }) => {
        // Test that the input field is cleared after adding a value
        await page.fill('#value', '50');
        await page.click('#add-btn');

        // Validate that the input field is cleared
        const inputValue = await page.inputValue('#value');
        await expect(inputValue).toBe('');
    });
});