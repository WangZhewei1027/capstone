import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/fa64b9a0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Hash Table Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const errorMessage = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('');
        const slots = await page.locator('.slot').count();
        expect(slots).toBe(5); // Ensure there are 5 slots
    });

    test('should insert a value and transition to inserting state', async ({ page }) => {
        await page.fill('#input-value', 'Cat');
        await page.click('#insert-button');

        // Validate that the value is inserted
        const filledSlots = await page.locator('.filled').count();
        expect(filledSlots).toBe(1); // Expect one slot to be filled
    });

    test('should complete insertion and return to idle state', async ({ page }) => {
        await page.fill('#input-value', 'Dog');
        await page.click('#insert-button');
        await page.waitForTimeout(100); // Simulate waiting for insertion to complete

        const filledSlots1 = await page.locator('.filled').count();
        expect(filledSlots).toBe(2); // Expect two slots to be filled
        const errorMessage1 = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('');
    });

    test('should search for a value and transition to searching state', async ({ page }) => {
        await page.fill('#input-value', 'Cat');
        await page.click('#search-button');

        // Validate that the search operation is performed
        const errorMessage2 = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe(''); // Expect no error for existing value
    });

    test('should complete search and return to idle state', async ({ page }) => {
        await page.fill('#input-value', 'Dog');
        await page.click('#search-button');
        await page.waitForTimeout(100); // Simulate waiting for search to complete

        const errorMessage3 = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe(''); // Expect no error for existing value
    });

    test('should handle searching for a non-existing value', async ({ page }) => {
        await page.fill('#input-value', 'Elephant');
        await page.click('#search-button');
        await page.waitForTimeout(100); // Simulate waiting for search to complete

        const errorMessage4 = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('Value not found'); // Expect error for non-existing value
    });

    test('should delete a value and transition to deleting state', async ({ page }) => {
        await page.fill('#input-value', 'Cat');
        await page.click('#insert-button');
        await page.fill('#input-value', 'Cat');
        await page.click('#delete-button');

        // Validate that the value is deleted
        const filledSlots2 = await page.locator('.filled').count();
        expect(filledSlots).toBe(0); // Expect no slots to be filled
    });

    test('should complete deletion and return to idle state', async ({ page }) => {
        await page.fill('#input-value', 'Dog');
        await page.click('#insert-button');
        await page.fill('#input-value', 'Dog');
        await page.click('#delete-button');
        await page.waitForTimeout(100); // Simulate waiting for deletion to complete

        const filledSlots3 = await page.locator('.filled').count();
        expect(filledSlots).toBe(0); // Expect no slots to be filled
    });

    test('should handle deleting a non-existing value', async ({ page }) => {
        await page.fill('#input-value', 'Elephant');
        await page.click('#delete-button');
        await page.waitForTimeout(100); // Simulate waiting for deletion to complete

        const errorMessage5 = await page.locator('#error-message').innerText();
        expect(errorMessage).toBe('Value not found'); // Expect error for non-existing value
    });
});