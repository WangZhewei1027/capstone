import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0005-4o-mini/html/6e08e900-bdea-11f0-b1d8-393f6114b3c3.html';

test.describe('Interactive Binary Search Tree Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should transition to addingNode state when Add Node is clicked', async ({ page }) => {
        await page.fill('#nodeValue', '10');
        await page.click('#addNode');

        // Check if the input is cleared
        const inputValue = await page.locator('#nodeValue').inputValue();
        expect(inputValue).toBe('');

        // Check if the node is added visually
        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(1);
    });

    test('should return to idle state after node is added', async ({ page }) => {
        await page.fill('#nodeValue', '20');
        await page.click('#addNode');

        // Check if the output reflects the addition
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Node 20 added'); // Assuming the output reflects node addition
    });

    test('should handle multiple node additions', async ({ page }) => {
        const valuesToAdd = [30, 15, 25];

        for (const value of valuesToAdd) {
            await page.fill('#nodeValue', value.toString());
            await page.click('#addNode');
            const output = await page.locator('#output').innerText();
            expect(output).toContain(`Node ${value} added`);
        }

        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(valuesToAdd.length);
    });

    test('should not add invalid nodes', async ({ page }) => {
        await page.fill('#nodeValue', 'invalid');
        await page.click('#addNode');

        // Check if the output reflects the error
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Invalid input'); // Assuming there's an error message for invalid input
    });

    test('should not add duplicate nodes', async ({ page }) => {
        await page.fill('#nodeValue', '40');
        await page.click('#addNode');

        await page.fill('#nodeValue', '40');
        await page.click('#addNode');

        const output = await page.locator('#output').innerText();
        expect(output).toContain('Node 40 added');
        expect(output).toContain('Duplicate node not added'); // Assuming there's a message for duplicates
    });

    test.afterEach(async ({ page }) => {
        // Any cleanup can be done here if necessary
    });
});