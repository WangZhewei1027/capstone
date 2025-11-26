import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba61740-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Radix Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Radix Sort application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state correctly', async ({ page }) => {
        // Validate the initial state of the application (Idle state)
        const title = await page.locator('h1').innerText();
        const description = await page.locator('p').innerText();
        
        expect(title).toBe('Radix Sort');
        expect(description).toBe('Radix sort is a non-comparative integer sorting algorithm that sorts data with integer keys by grouping keys by the base of the number.');
    });

    test('should sort the array and display the sorted result', async ({ page }) => {
        // Validate the transition from Idle to Sorted state
        const resultDiv = page.locator('#result');

        // Wait for the sorting to complete and check the result
        await page.waitForTimeout(100); // Wait for the sorting to be processed
        const resultText = await resultDiv.innerText();
        
        expect(resultText).toBe('Sorted array: [2,24,45,66,75,90,170,802]');
    });

    test('should log the original and sorted array in the console', async ({ page }) => {
        // Validate console logs for original and sorted arrays
        const consoleMessages = [];

        // Listen to console events to capture logs
        page.on('console', msg => {
            consoleMessages.push(msg.text());
        });

        // Trigger the sorting process
        await page.waitForTimeout(100); // Allow time for sorting to complete

        expect(consoleMessages).toContain('Original array: 170,45,75,90,802,24,2,66');
        expect(consoleMessages).toContain('Sorted array: [2,24,45,66,75,90,170,802]');
    });

    test('should handle edge cases with empty array', async ({ page }) => {
        // Test the behavior of the sorting algorithm with an empty array
        await page.evaluate(() => {
            const arr = [];
            const sortedArr = radixSort(arr);
            document.getElementById("result").innerHTML = "Sorted array: " + JSON.stringify(sortedArr);
        });

        const resultDiv = page.locator('#result');
        const resultText = await resultDiv.innerText();
        
        expect(resultText).toBe('Sorted array: []');
    });

    test('should handle edge cases with single element array', async ({ page }) => {
        // Test the behavior of the sorting algorithm with a single element array
        await page.evaluate(() => {
            const arr = [42];
            const sortedArr = radixSort(arr);
            document.getElementById("result").innerHTML = "Sorted array: " + JSON.stringify(sortedArr);
        });

        const resultDiv = page.locator('#result');
        const resultText = await resultDiv.innerText();
        
        expect(resultText).toBe('Sorted array: [42]');
    });
});