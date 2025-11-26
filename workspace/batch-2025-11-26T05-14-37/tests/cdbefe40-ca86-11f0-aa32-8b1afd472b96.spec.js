import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdbefe40-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Interactive Application - Array Manipulation', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should display the Add Element button', async ({ page }) => {
        // Validate that the application is in the Idle state
        const button = await page.locator("button[onclick='addElement()']");
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Add Element');
    });

    test('Clicking Add Element button should transition to Element Added state', async ({ page }) => {
        // Click the Add Element button
        await page.click("button[onclick='addElement()']");

        // Validate that the state has transitioned by checking the DOM
        const myArrayDiv = await page.locator('#myArray');
        await expect(myArrayDiv).toContainText('Element added!');
    });

    test('Clicking Add Element button multiple times should add multiple elements', async ({ page }) => {
        // Click the Add Element button three times
        await page.click("button[onclick='addElement()']");
        await page.click("button[onclick='addElement()']");
        await page.click("button[onclick='addElement()']");

        // Validate that the state reflects three additions
        const myArrayDiv = await page.locator('#myArray');
        await expect(myArrayDiv).toContainText('Element added!Element added!Element added!');
    });

    test('Ensure that the array display does not show unexpected text', async ({ page }) => {
        // Click the Add Element button
        await page.click("button[onclick='addElement()']");

        // Validate that no unexpected text is present
        const myArrayDiv = await page.locator('#myArray');
        await expect(myArrayDiv).not.toContainText('Unexpected text');
    });

    test('Verify that the button is still functional after multiple clicks', async ({ page }) => {
        // Click the Add Element button
        await page.click("button[onclick='addElement()']");
        await page.click("button[onclick='addElement()']");

        // Validate the number of elements added
        const myArrayDiv = await page.locator('#myArray');
        await expect(myArrayDiv).toContainText('Element added!Element added!');
    });

    test('Check for empty state before any button click', async ({ page }) => {
        // Validate that the array display is empty initially
        const myArrayDiv = await page.locator('#myArray');
        await expect(myArrayDiv).toHaveText('');
    });
});