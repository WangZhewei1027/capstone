import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/5699ec60-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Hash Map Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Idle State Tests', () => {
        test('should enable controls in Idle state', async ({ page }) => {
            const addButton = await page.locator('#addButton');
            const resetButton = await page.locator('#resetButton');
            await expect(addButton).toBeEnabled();
            await expect(resetButton).toBeEnabled();
        });

        test('should transition to AddingEntry state when Add button is clicked', async ({ page }) => {
            await page.click('#addButton');
            const inputField = await page.locator('#inputField');
            await expect(inputField).toHaveClass(/highlighted/);
        });
    });

    test.describe('Adding Entry State Tests', () => {
        test('should transition to ValidatingInput state after entering input', async ({ page }) => {
            await page.click('#addButton');
            await page.fill('#inputField', 'key:value');
            await page.click('#addButton'); // Assuming clicking again validates input
            await expect(page.locator('#validationFeedback')).toBeVisible();
        });

        test('should show error alert for empty input', async ({ page }) => {
            await page.click('#addButton');
            await page.fill('#inputField', '');
            await page.click('#addButton');
            await expect(page.locator('#errorDialog')).toBeVisible();
        });
    });

    test.describe('Error Handling Tests', () => {
        test('should return to Idle state after dismissing error alert', async ({ page }) => {
            await page.click('#addButton');
            await page.fill('#inputField', '');
            await page.click('#addButton');
            await page.click('#dismissErrorButton'); // Assuming there's a button to dismiss the error
            await expect(page.locator('#errorDialog')).not.toBeVisible();
            const addButton = await page.locator('#addButton');
            await expect(addButton).toBeEnabled();
        });
    });

    test.describe('Entry Insertion Tests', () => {
        test('should insert entry into the map and transition to EntryInserted state', async ({ page }) => {
            await page.click('#addButton');
            await page.fill('#inputField', 'key:value');
            await page.click('#addButton'); // Trigger validation and insertion
            await expect(page.locator('#mapDisplay')).toContainText('key:value');
        });
    });

    test.describe('Resetting Map Tests', () => {
        test('should transition to ResettingMap state when Reset button is clicked', async ({ page }) => {
            await page.click('#addButton');
            await page.fill('#inputField', 'key:value');
            await page.click('#addButton');
            await page.click('#resetButton');
            await expect(page.locator('#confirmationDialog')).toBeVisible();
        });

        test('should return to Idle state after map reset', async ({ page }) => {
            await page.click('#addButton');
            await page.fill('#inputField', 'key:value');
            await page.click('#addButton');
            await page.click('#resetButton');
            await page.click('#confirmResetButton'); // Assuming there's a button to confirm reset
            await expect(page.locator('#mapDisplay')).toHaveText('');
            const addButton = await page.locator('#addButton');
            await expect(addButton).toBeEnabled();
        });
    });
});