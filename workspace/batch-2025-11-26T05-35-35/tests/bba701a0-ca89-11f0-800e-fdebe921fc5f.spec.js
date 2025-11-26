import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba701a0-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Divide and Conquer Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Validate that the initial state is rendered correctly
        const div = await page.locator('#div');
        await expect(div).toBeVisible();
        await expect(div).toHaveCSS('border', '1px solid black');
        await expect(div).toHaveCSS('width', '200px');
        await expect(div).toHaveCSS('height', '200px');
    });

    test('should have the correct initial content in the div', async ({ page }) => {
        // Validate that the div is empty as per the FSM definition
        const div = await page.locator('#div');
        const content = await div.textContent();
        expect(content).toBe('');
    });

    test('should execute divide function correctly', async ({ page }) => {
        // Since there are no interactive elements, we cannot trigger events.
        // However, we can check if the divide function is executed by observing console logs.
        await page.evaluate(() => {
            console.log = jest.fn(); // Mock console.log
            divide(10);
        });

        // Verify that the console.log was called with expected values
        const logs = await page.evaluate(() => console.log.mock.calls);
        expect(logs).toContainEqual([5]);
        expect(logs).toContainEqual([2]);
        expect(logs).toContainEqual([1]);
    });

    test('should execute conquer function correctly', async ({ page }) => {
        // Similar to the divide function, we check the console logs for the conquer function.
        await page.evaluate(() => {
            console.log = jest.fn(); // Mock console.log
            conquer(10);
        });

        // Verify that the console.log was called with expected values
        const logs = await page.evaluate(() => console.log.mock.calls);
        expect(logs).toContainEqual([10]);
        expect(logs).toContainEqual([5]);
        expect(logs).toContainEqual([3]);
        expect(logs).toContainEqual([1]);
    });

    test('should handle edge case for divide with odd number', async ({ page }) => {
        // Test the divide function with an odd number
        await page.evaluate(() => {
            console.log = jest.fn(); // Mock console.log
            divide(11);
        });

        // Verify that the console.log was called with expected values
        const logs = await page.evaluate(() => console.log.mock.calls);
        expect(logs).toContainEqual([6]);
        expect(logs).toContainEqual([3]);
        expect(logs).toContainEqual([2]);
        expect(logs).toContainEqual([1]);
    });

    test('should handle edge case for conquer with small number', async ({ page }) => {
        // Test the conquer function with a small number
        await page.evaluate(() => {
            console.log = jest.fn(); // Mock console.log
            conquer(1);
        });

        // Verify that the console.log was called with expected values
        const logs = await page.evaluate(() => console.log.mock.calls);
        expect(logs).toContainEqual([1]);
    });
});