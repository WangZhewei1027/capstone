import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c186c60-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Insertion Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should collect input when sort button is clicked', async ({ page }) => {
        await page.fill('#n', '3');
        await page.click('#sort-btn');

        // Simulate user input for the elements
        await page.evaluate(() => {
            window.prompt = (msg) => {
                if (msg.includes('Enter element 1')) return '5';
                if (msg.includes('Enter element 2')) return '3';
                if (msg.includes('Enter element 3')) return '8';
            };
        });

        // After input collection, we should be in Sorting state
        const output = await page.locator('#output').innerText();
        expect(output).toBe(''); // Output should still be empty
    });

    test('should sort the input array and display output', async ({ page }) => {
        await page.fill('#n', '3');
        await page.click('#sort-btn');

        // Simulate user input for the elements
        await page.evaluate(() => {
            window.prompt = (msg) => {
                if (msg.includes('Enter element 1')) return '5';
                if (msg.includes('Enter element 2')) return '3';
                if (msg.includes('Enter element 3')) return '8';
            };
        });

        // Wait for the output to be displayed
        await page.waitForTimeout(1000); // Wait for sorting to complete

        const output = await page.locator('#output').innerText();
        expect(output).toBe('Sorted array: 3 5 8'); // Check if the output is correct
    });

    test('should reset to Idle state after output is displayed', async ({ page }) => {
        await page.fill('#n', '3');
        await page.click('#sort-btn');

        // Simulate user input for the elements
        await page.evaluate(() => {
            window.prompt = (msg) => {
                if (msg.includes('Enter element 1')) return '5';
                if (msg.includes('Enter element 2')) return '3';
                if (msg.includes('Enter element 3')) return '8';
            };
        });

        // Wait for the output to be displayed
        await page.waitForTimeout(1000); // Wait for sorting to complete

        // Click the sort button again to reset
        await page.click('#sort-btn');

        const output = await page.locator('#output').innerText();
        expect(output).toBe(''); // Output should be empty again
    });

    test('should handle edge case with zero elements', async ({ page }) => {
        await page.fill('#n', '0');
        await page.click('#sort-btn');

        // No prompt should appear and output should remain empty
        const output = await page.locator('#output').innerText();
        expect(output).toBe(''); // Output should still be empty
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#n', '-1');
        await page.click('#sort-btn');

        // No prompt should appear and output should remain empty
        const output = await page.locator('#output').innerText();
        expect(output).toBe(''); // Output should still be empty
    });
});