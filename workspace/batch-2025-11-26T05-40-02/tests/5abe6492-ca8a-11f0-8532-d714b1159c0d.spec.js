import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe6492-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Counting Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the initial state is Idle
        const output = await page.locator('#output').textContent();
        expect(output).toBe('');
    });

    test('Sort button click with valid input transitions to Sorting state', async ({ page }) => {
        // Input a valid number and click the sort button
        await page.fill('#input', '10');
        await page.click('#sort-btn');

        // Verify that the output displays the sorted array
        const output = await page.locator('#output').textContent();
        expect(output).toContain('Sorted array:\n0\n1\n2\n3\n4\n5\n6\n7\n8\n9');
    });

    test('Sort button click with invalid input shows error alert', async ({ page }) => {
        // Input an invalid number and click the sort button
        await page.fill('#input', '1500');
        await page.click('#sort-btn');

        // Verify that the alert is displayed
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Input must be between 0 and 1000');
            await dialog.dismiss();
        });
    });

    test('Sort button click with negative input shows error alert', async ({ page }) => {
        // Input a negative number and click the sort button
        await page.fill('#input', '-5');
        await page.click('#sort-btn');

        // Verify that the alert is displayed
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Input must be between 0 and 1000');
            await dialog.dismiss();
        });
    });

    test('Sort button click with zero input displays empty sorted array', async ({ page }) => {
        // Input zero and click the sort button
        await page.fill('#input', '0');
        await page.click('#sort-btn');

        // Verify that the output displays the sorted array
        const output = await page.locator('#output').textContent();
        expect(output).toContain('Sorted array:\n');
    });

    test('Sort button click with one input displays single element sorted array', async ({ page }) => {
        // Input one and click the sort button
        await page.fill('#input', '1');
        await page.click('#sort-btn');

        // Verify that the output displays the sorted array
        const output = await page.locator('#output').textContent();
        expect(output).toContain('Sorted array:\n0');
    });
});