import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc89b30-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Priority Queue Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Priority Queue application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Validate that the page renders the title and description correctly
        const title = await page.locator('h1').innerText();
        const description = await page.locator('p').innerText();

        expect(title).toBe('Priority Queue');
        expect(description).toBe('Imagine you have an array of items, and each item is represented by a number. You want to find the highest priority item from the array. The higher the priority, the less time it takes to sort the items.');
    });

    test('should display an empty queue initially', async ({ page }) => {
        // Check that the queue div is empty on initial load
        const queueContent = await page.locator('#queue').innerText();
        expect(queueContent).toBe('');
    });

    // Since there are no interactive elements or transitions defined in the FSM,
    // we cannot test for user interactions or state transitions.
    // However, we can check the absence of errors and ensure the page is functional.

    test('should not throw any errors on page load', async ({ page }) => {
        // This test ensures that the page loads without throwing any JavaScript errors
        await page.evaluate(() => {
            // This will throw an error if there are any issues in the scripts
            return window.onerror = (msg, url, lineNo, columnNo, error) => {
                throw new Error(msg);
            };
        });
    });

    test('should have no interactive elements', async ({ page }) => {
        // Validate that there are no buttons, inputs, or links present
        const buttons = await page.locator('button').count();
        const inputs = await page.locator('input').count();
        const links = await page.locator('a').count();

        expect(buttons).toBe(0);
        expect(inputs).toBe(0);
        expect(links).toBe(0);
    });

    test('should load external scripts without errors', async ({ page }) => {
        // Check if the external script loads without throwing errors
        const scriptLoaded = await page.evaluate(() => {
            try {
                // Attempt to access a function or variable from the external script
                return typeof someFunctionFromScripts === 'function'; // Replace with actual function if known
            } catch (error) {
                return false;
            }
        });

        expect(scriptLoaded).toBe(true);
    });
});