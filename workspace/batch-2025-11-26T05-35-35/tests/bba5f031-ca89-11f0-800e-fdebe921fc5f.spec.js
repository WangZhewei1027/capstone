import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba5f031-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Heap Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Heap Sort application before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Validate that the page is rendered correctly in the Idle state
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Heap Sort');

        const description = await page.locator('p').nth(0).innerText();
        expect(description).toBe('Heap sort is a comparison-based sorting algorithm that uses a binary heap data structure.');

        const container = await page.locator('.container');
        expect(await container.count()).toBe(1);
    });

    test('should display sorted array in console', async ({ page }) => {
        // Check if the console logs the sorted array correctly
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.evaluate(() => {
            // Trigger the heap sort implementation
            let arr = [64, 34, 25, 12, 22, 11, 90];
            heapSort(arr);
        });

        // Wait for the console message
        await page.waitForTimeout(100); // Adjust timeout if necessary

        expect(consoleMessages).toContain('Sorted array:');
        expect(consoleMessages).toContain('1, 11, 12, 22, 25, 34, 64, 90');
    });

    test('should not have any interactive elements', async ({ page }) => {
        // Validate that there are no buttons or inputs for interaction
        const buttons = await page.locator('.button');
        expect(await buttons.count()).toBe(0;

        const inputs = await page.locator('input');
        expect(await inputs.count()).toBe(0);
    });

    test('should handle edge cases in heap sort', async ({ page }) => {
        // Test edge case with an empty array
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.evaluate(() => {
            let arr = [];
            heapSort(arr);
        });

        await page.waitForTimeout(100); // Adjust timeout if necessary

        expect(consoleMessages).toContain('Sorted array:');
        expect(consoleMessages).toContain('');
    });

    test('should handle edge case with a single element', async ({ page }) => {
        // Test edge case with a single element array
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        await page.evaluate(() => {
            let arr = [42];
            heapSort(arr);
        });

        await page.waitForTimeout(100); // Adjust timeout if necessary

        expect(consoleMessages).toContain('Sorted array:');
        expect(consoleMessages).toContain('42');
    });
});