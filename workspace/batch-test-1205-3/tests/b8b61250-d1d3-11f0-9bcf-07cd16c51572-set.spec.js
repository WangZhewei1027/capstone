import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b61250-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('JavaScript Set Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Check if the page loads with the correct title
        await expect(page).toHaveTitle('JavaScript Set Demo');
        // Verify that the initial state of the set contents is displayed correctly
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('Set is empty');
    });

    test('should add a value to the set and display it', async ({ page }) => {
        // Input a value and click the add button
        await page.fill('#inputValue', 'TestValue');
        await page.click('#addButton');

        // Verify the alert message
        await page.waitForTimeout(500); // Wait for the alert to appear
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe(`Added "TestValue" to the Set.`);

        // Click the view button to see the contents of the set
        await page.click('#viewButton');
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('TestValue');
    });

    test('should not add an empty value to the set', async ({ page }) => {
        // Click the add button without entering a value
        await page.click('#addButton');

        // Verify the alert message
        await page.waitForTimeout(500); // Wait for the alert to appear
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter a value.');

        // Verify that the set contents remain unchanged
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('Set is empty');
    });

    test('should handle multiple values added to the set', async ({ page }) => {
        // Add multiple values to the set
        await page.fill('#inputValue', 'Value1');
        await page.click('#addButton');
        await page.fill('#inputValue', 'Value2');
        await page.click('#addButton');
        await page.fill('#inputValue', 'Value3');
        await page.click('#addButton');

        // View the contents of the set
        await page.click('#viewButton');
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('Value1, Value2, Value3');
    });

    test('should display "Set is empty" when no values are present', async ({ page }) => {
        // Click the view button without adding any values
        await page.click('#viewButton');
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('Set is empty');
    });
});