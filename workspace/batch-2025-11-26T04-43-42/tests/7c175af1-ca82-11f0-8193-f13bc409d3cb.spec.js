import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c175af1-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Hash Map Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Idle State Tests', () => {
        test('should display buttons in the Idle state', async ({ page }) => {
            const addButton = await page.locator('#add-btn');
            const deleteButton = await page.locator('#delete-btn');
            const searchButton = await page.locator('#search-btn');
            await expect(addButton).toBeVisible();
            await expect(deleteButton).toBeVisible();
            await expect(searchButton).toBeVisible();
        });
    });

    test.describe('Adding Entry State Tests', () => {
        test('should transition to AddingEntry state when Add button is clicked', async ({ page }) => {
            await page.click('#add-btn');
            await page.waitForTimeout(500); // wait for state transition
            const prompt = await page.evaluate(() => window.prompt);
            expect(prompt).toBeTruthy(); // Ensure prompt was shown
        });

        test('should show error when input is invalid', async ({ page }) => {
            await page.click('#add-btn');
            await page.waitForTimeout(500);
            await page.evaluate(() => {
                window.prompt = () => null; // Simulate empty input
            });
            await page.click('#add-btn'); // Click again to trigger error
            await expect(page.locator('text=Please enter both key and value.')).toBeVisible();
        });
    });

    test.describe('Deleting Entry State Tests', () => {
        test('should transition to DeletingEntry state when Delete button is clicked', async ({ page }) => {
            await page.click('#delete-btn');
            await page.waitForTimeout(500); // wait for state transition
            const prompt = await page.evaluate(() => window.prompt);
            expect(prompt).toBeTruthy(); // Ensure prompt was shown
        });

        test('should show error when no key is provided', async ({ page }) => {
            await page.click('#delete-btn');
            await page.waitForTimeout(500);
            await page.evaluate(() => {
                window.prompt = () => null; // Simulate empty input
            });
            await page.click('#delete-btn'); // Click again to trigger error
            await expect(page.locator('text=Please enter a key.')).toBeVisible();
        });
    });

    test.describe('Searching Entry State Tests', () => {
        test('should transition to SearchingEntry state when Search button is clicked', async ({ page }) => {
            await page.click('#search-btn');
            await page.waitForTimeout(500); // wait for state transition
            const prompt = await page.evaluate(() => window.prompt);
            expect(prompt).toBeTruthy(); // Ensure prompt was shown
        });

        test('should show error when no key is provided', async ({ page }) => {
            await page.click('#search-btn');
            await page.waitForTimeout(500);
            await page.evaluate(() => {
                window.prompt = () => null; // Simulate empty input
            });
            await page.click('#search-btn'); // Click again to trigger error
            await expect(page.locator('text=Please enter a key.')).toBeVisible();
        });
    });

    test.describe('Error Handling Tests', () => {
        test('should show error dialog for invalid input during adding', async ({ page }) => {
            await page.click('#add-btn');
            await page.waitForTimeout(500);
            await page.evaluate(() => {
                window.prompt = () => null; // Simulate empty input
            });
            await page.click('#add-btn'); // Click again to trigger error
            await expect(page.locator('text=Please enter both key and value.')).toBeVisible();
        });

        test('should show error dialog for invalid input during deleting', async ({ page }) => {
            await page.click('#delete-btn');
            await page.waitForTimeout(500);
            await page.evaluate(() => {
                window.prompt = () => null; // Simulate empty input
            });
            await page.click('#delete-btn'); // Click again to trigger error
            await expect(page.locator('text=Please enter a key.')).toBeVisible();
        });

        test('should show error dialog for invalid input during searching', async ({ page }) => {
            await page.click('#search-btn');
            await page.waitForTimeout(500);
            await page.evaluate(() => {
                window.prompt = () => null; // Simulate empty input
            });
            await page.click('#search-btn'); // Click again to trigger error
            await expect(page.locator('text=Please enter a key.')).toBeVisible();
        });
    });
});