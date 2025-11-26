import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c175af0-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Hash Table Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const form = await page.locator('#hash-table-form');
        await expect(form).toBeVisible();
    });

    test('should transition to Inserting state on form submission', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('.submit-btn');

        // Verify that the form is disabled
        await expect(page.locator('#hash-table-form')).toBeDisabled();
    });

    test('should insert a new key-value pair and transition to Updating state', async ({ page }) => {
        await page.fill('#key', 'newKey');
        await page.fill('#value', 'newValue');
        await page.click('.submit-btn');

        // Verify that the key-value pair is displayed
        const hashTableDisplay = await page.locator('#hash-table');
        await expect(hashTableDisplay).toContainText('Key: newKey, Value: newValue');
    });

    test('should show error feedback when inserting an existing key', async ({ page }) => {
        // First insert a key-value pair
        await page.fill('#key', 'existingKey');
        await page.fill('#value', 'firstValue');
        await page.click('.submit-btn');

        // Attempt to insert the same key with a different value
        await page.fill('#key', 'existingKey');
        await page.fill('#value', 'secondValue');
        await page.click('.submit-btn');

        // Verify that an error message is displayed
        const hashTableDisplay = await page.locator('#hash-table');
        await expect(hashTableDisplay).toContainText('Key already exists');
    });

    test('should update the value of an existing key', async ({ page }) => {
        // First insert a key-value pair
        await page.fill('#key', 'updateKey');
        await page.fill('#value', 'initialValue');
        await page.click('.submit-btn');

        // Update the value for the same key
        await page.fill('#key', 'updateKey');
        await page.fill('#value', 'updatedValue');
        await page.click('.submit-btn');

        // Verify that the updated key-value pair is displayed
        const hashTableDisplay = await page.locator('#hash-table');
        await expect(hashTableDisplay).toContainText('Key: updateKey, Value: updatedValue');
    });

    test('should clear input fields after insertion', async ({ page }) => {
        await page.fill('#key', 'clearKey');
        await page.fill('#value', 'clearValue');
        await page.click('.submit-btn');

        // Verify that the input fields are cleared
        await expect(page.locator('#key')).toHaveValue('');
        await expect(page.locator('#value')).toHaveValue('');
    });

    test.afterEach(async ({ page }) => {
        // Optionally, reset the state or clean up after tests
        await page.evaluate(() => {
            document.getElementById('hash-table').innerHTML = '';
        });
    });
});