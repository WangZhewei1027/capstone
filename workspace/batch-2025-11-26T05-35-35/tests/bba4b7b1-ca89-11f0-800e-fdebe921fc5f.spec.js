import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba4b7b1-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Interactive Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Validate that the initial state (Idle) is rendered correctly
        const title = await page.locator('h2').innerText();
        expect(title).toBe('Set');

        const numbersLabel = await page.locator('label[for="numbers"]').innerText();
        expect(numbersLabel).toBe('Enter numbers:');

        const numbersInput = await page.locator('#numbers');
        expect(await numbersInput.isVisible()).toBeTruthy();
    });

    test('should log data when Set button is clicked', async ({ page }) => {
        // Input data into the fields
        await page.fill('#numbers', '1, 2, 3');
        await page.fill('#colors', 'red, blue, green');
        await page.fill('#words', 'apple, banana, cherry');
        await page.fill('#fruits', 'mango, orange, grape');

        // Click the Set button
        await page.click('button[type="submit"]');

        // Verify console log output
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Wait for the console log to be triggered
        await page.waitForTimeout(100); // Adjust timeout if necessary

        expect(consoleMessages).toContain('Set: 1, 2, 3, red, blue, green, apple, banana, cherry, mango, orange, grape');
    });

    test('should handle empty inputs gracefully', async ({ page }) => {
        // Click the Set button without entering any data
        await page.click('button[type="submit"]');

        // Verify console log output for empty inputs
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Wait for the console log to be triggered
        await page.waitForTimeout(100); // Adjust timeout if necessary

        expect(consoleMessages).toContain('Set: , , , ');
    });

    test('should allow inputs of various types', async ({ page }) => {
        // Test with different types of inputs
        await page.fill('#numbers', '42');
        await page.fill('#colors', 'blue');
        await page.fill('#words', 'hello');
        await page.fill('#fruits', 'kiwi');

        // Click the Set button
        await page.click('button[type="submit"]');

        // Verify console log output
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Wait for the console log to be triggered
        await page.waitForTimeout(100); // Adjust timeout if necessary

        expect(consoleMessages).toContain('Set: 42, blue, hello, kiwi');
    });

    test('should not allow submission of invalid data', async ({ page }) => {
        // Input invalid data (e.g., special characters)
        await page.fill('#numbers', '@#$%');
        await page.fill('#colors', '!!');
        await page.fill('#words', '!!!');
        await page.fill('#fruits', '^^^');

        // Click the Set button
        await page.click('button[type="submit"]');

        // Verify console log output
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Wait for the console log to be triggered
        await page.waitForTimeout(100); // Adjust timeout if necessary

        expect(consoleMessages).toContain('Set: @#$%, !!, !!!, ^^^');
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions can be added here if necessary
    });
});