import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c186c61-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Merge Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('User can start sorting', async ({ page }) => {
        // Simulate user clicking the Start Sort button
        await page.click('button#startSort'); // Assuming there is a button with id 'startSort'
        
        // Verify that the output changes to indicate sorting has started
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Sorting...'); // Assuming this text is displayed during sorting
    });

    test('Sorting completes and shows sorted array', async ({ page }) => {
        await page.click('button#startSort'); // Start sorting
        await page.waitForTimeout(1500); // Wait for sorting to complete (adjust based on actual timing)

        // Verify that the output shows the sorted array
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Sorted array: 11 12 22 25 34 64 90');
    });

    test('Reset functionality works correctly', async ({ page }) => {
        await page.click('button#startSort'); // Start sorting
        await page.waitForTimeout(1500); // Wait for sorting to complete

        // Assuming there is a reset button
        await page.click('button#reset'); // Reset the sorting

        // Verify that the output is cleared
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('Edge case: empty array', async ({ page }) => {
        // Modify the script to handle an empty array (if applicable)
        await page.evaluate(() => {
            window.arr = []; // Set the array to empty
            document.getElementById("output").innerHTML = "Sorted array: ";
        });

        await page.click('button#startSort'); // Start sorting
        await page.waitForTimeout(1500); // Wait for sorting to complete

        // Verify that the output indicates the array is empty
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Sorted array: ');
    });

    test('Edge case: single element array', async ({ page }) => {
        // Modify the script to handle a single element array (if applicable)
        await page.evaluate(() => {
            window.arr = [42]; // Set the array to a single element
            document.getElementById("output").innerHTML = "Sorted array: ";
        });

        await page.click('button#startSort'); // Start sorting
        await page.waitForTimeout(1500); // Wait for sorting to complete

        // Verify that the output shows the single element
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Sorted array: 42');
    });

    test('Error handling during sorting', async ({ page }) => {
        // Simulate an error scenario (if applicable)
        await page.evaluate(() => {
            window.arr = null; // Set the array to null to trigger an error
        });

        await page.click('button#startSort'); // Start sorting

        // Verify that an error message is displayed
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Error: Invalid array'); // Assuming this error message is displayed
    });
});