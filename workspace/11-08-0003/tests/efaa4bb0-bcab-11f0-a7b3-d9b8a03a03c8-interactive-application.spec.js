import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/efaa4bb0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Hash Map Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.reload();
    });

    test('should be in idle state initially', async () => {
        const keyInput = await page.locator('#keyInput');
        const valueInput = await page.locator('#valueInput');
        const addButton = await page.locator('#addButton');

        // Check that input fields are empty
        await expect(keyInput).toHaveValue('');
        await expect(valueInput).toHaveValue('');
    });

    test('should transition to adding state on ADD_BUTTON_CLICK', async () => {
        await page.fill('#keyInput', 'key1');
        await page.fill('#valueInput', 'value1');
        await page.click('#addButton');

        // Check for alert message (inputs must be valid)
        await page.waitForTimeout(500); // Wait for potential alert
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBeUndefined(); // No alert should be shown
    });

    test('should handle empty inputs and return to idle state', async () => {
        await page.click('#addButton');

        // Check for alert message
        await page.waitForTimeout(500); // Wait for potential alert
        const alertText1 = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Both key and value must be provided.');
        
        // Check that we are still in idle state
        const keyInput1 = await page.locator('#keyInput1');
        const valueInput1 = await page.locator('#valueInput1');
        await expect(keyInput).toHaveValue('');
        await expect(valueInput).toHaveValue('');
    });

    test('should add key-value pair and transition to rendering state', async () => {
        await page.fill('#keyInput', 'key1');
        await page.fill('#valueInput', 'value1');
        await page.click('#addButton');

        // Check if the hash map is updated
        const cell = await page.locator('.hash-map .cell.filled');
        await expect(cell).toHaveText('key1: value1');
    });

    test('should transition back to idle after rendering complete', async () => {
        await page.fill('#keyInput', 'key2');
        await page.fill('#valueInput', 'value2');
        await page.click('#addButton');

        // Wait for rendering to complete
        await page.waitForTimeout(500); // Simulate rendering time

        // Check that inputs are cleared
        const keyInput2 = await page.locator('#keyInput2');
        const valueInput2 = await page.locator('#valueInput2');
        await expect(keyInput).toHaveValue('');
        await expect(valueInput).toHaveValue('');
    });

    test('should handle hash map full scenario', async () => {
        for (let i = 0; i < 5; i++) {
            await page.fill('#keyInput', `key${i}`);
            await page.fill('#valueInput', `value${i}`);
            await page.click('#addButton');
            await page.waitForTimeout(500); // Simulate rendering time
        }

        // Attempt to add another key-value pair
        await page.fill('#keyInput', 'key6');
        await page.fill('#valueInput', 'value6');
        await page.click('#addButton');

        // Check for alert message about hash map being full
        await page.waitForTimeout(500); // Wait for potential alert
        const alertText2 = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Hash map is full. Cannot add more key-value pairs.');
        
        // Check that we are still in idle state
        const keyInput3 = await page.locator('#keyInput3');
        const valueInput3 = await page.locator('#valueInput3');
        await expect(keyInput).toHaveValue('');
        await expect(valueInput).toHaveValue('');
    });
});