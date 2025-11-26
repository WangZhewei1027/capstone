import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abed9c2-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Kruskal\'s Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the application is in the idle state
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('Submit form with valid inputs', async ({ page }) => {
        // Fill the form with valid edge data
        await page.fill('#start', 'A');
        await page.fill('#end', 'B');
        await page.fill('#weight', '2');

        // Submit the form
        await page.click('#submit');

        // Verify that the result is displayed correctly
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toContain('Minimum Spanning Tree: A - B (2)');
    });

    test('Submit form with another valid edge', async ({ page }) => {
        // Fill the form with another valid edge data
        await page.fill('#start', 'B');
        await page.fill('#end', 'C');
        await page.fill('#weight', '1');

        // Submit the form
        await page.click('#submit');

        // Verify that the result is displayed correctly
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toContain('Minimum Spanning Tree: B - C (1)');
    });

    test('Submit form with missing start input', async ({ page }) => {
        // Leave the start input empty
        await page.fill('#end', 'B');
        await page.fill('#weight', '2');

        // Attempt to submit the form
        await page.click('#submit');

        // Verify that the result is still empty due to validation
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('Submit form with missing end input', async ({ page }) => {
        // Leave the end input empty
        await page.fill('#start', 'A');
        await page.fill('#weight', '2');

        // Attempt to submit the form
        await page.click('#submit');

        // Verify that the result is still empty due to validation
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('Submit form with missing weight input', async ({ page }) => {
        // Leave the weight input empty
        await page.fill('#start', 'A');
        await page.fill('#end', 'B');

        // Attempt to submit the form
        await page.click('#submit');

        // Verify that the result is still empty due to validation
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });

    test('Submit form with invalid inputs', async ({ page }) => {
        // Fill the form with invalid edge data
        await page.fill('#start', 'X');
        await page.fill('#end', 'Y');
        await page.fill('#weight', 'NaN');

        // Attempt to submit the form
        await page.click('#submit');

        // Verify that the result is still empty due to invalid inputs
        const resultText = await page.locator('#result').textContent();
        expect(resultText).toBe('');
    });
});