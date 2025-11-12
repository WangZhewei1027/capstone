import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/9e580470-bf51-11f0-8ac4-79272b6a78b2.html';

test.describe('Interactive Binary Search Tree Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
    });

    test.describe('Inserting nodes', () => {
        test('should transition to inserting state on insert button click', async ({ page }) => {
            await page.fill('#inputValue', '10');
            await page.click('#insertButton');

            const resultText = await page.locator('#result').innerText();
            expect(resultText).toBe('Inserted: 10');
        });

        test('should return to idle state after insertion', async ({ page }) => {
            await page.fill('#inputValue', '20');
            await page.click('#insertButton');
            await page.waitForTimeout(100); // Wait for insertion to complete

            const resultText = await page.locator('#result').innerText();
            expect(resultText).toBe('Inserted: 20');
        });

        test('should handle invalid input gracefully', async ({ page }) => {
            await page.fill('#inputValue', 'invalid');
            await page.click('#insertButton');

            const resultText = await page.locator('#result').innerText();
            expect(resultText).toBe('Invalid input');
        });
    });

    test.describe('Deleting nodes', () => {
        test('should transition to deleting state on delete button click', async ({ page }) => {
            await page.fill('#inputValue', '10');
            await page.click('#insertButton');
            await page.fill('#inputValue', '10');
            await page.click('#deleteButton');

            const resultText = await page.locator('#result').innerText();
            expect(resultText).toBe('Deleted: 10');
        });

        test('should return to idle state after deletion', async ({ page }) => {
            await page.fill('#inputValue', '20');
            await page.click('#insertButton');
            await page.fill('#inputValue', '20');
            await page.click('#deleteButton');
            await page.waitForTimeout(100); // Wait for deletion to complete

            const resultText = await page.locator('#result').innerText();
            expect(resultText).toBe('Deleted: 20');
        });

        test('should handle invalid deletion gracefully', async ({ page }) => {
            await page.fill('#inputValue', 'invalid');
            await page.click('#deleteButton');

            const resultText = await page.locator('#result').innerText();
            expect(resultText).toBe('Invalid input');
        });
    });

    test.describe('State transitions', () => {
        test('should transition from idle to inserting and back to idle', async ({ page }) => {
            await page.fill('#inputValue', '30');
            await page.click('#insertButton');
            await page.waitForTimeout(100); // Wait for insertion to complete

            const resultText = await page.locator('#result').innerText();
            expect(resultText).toBe('Inserted: 30');
        });

        test('should transition from idle to deleting and back to idle', async ({ page }) => {
            await page.fill('#inputValue', '30');
            await page.click('#insertButton');
            await page.fill('#inputValue', '30');
            await page.click('#deleteButton');
            await page.waitForTimeout(100); // Wait for deletion to complete

            const resultText = await page.locator('#result').innerText();
            expect(resultText).toBe('Deleted: 30');
        });
    });
});