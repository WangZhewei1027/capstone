import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c170cd1-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Queue Management Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const messagesDiv = await page.locator('#messages');
        const inputElement = await page.locator('#input');
        const addButton = await page.locator('#add-btn');
        const clearButton = await page.locator('#clear-btn');

        // Verify that the input is enabled and messages area is empty
        await expect(inputElement).toBeEnabled();
        await expect(messagesDiv).toHaveText('');
        await expect(addButton).toBeVisible();
        await expect(clearButton).toBeVisible();
    });

    test('should add a message to the queue', async ({ page }) => {
        const inputElement = await page.locator('#input');
        const addButton = await page.locator('#add-btn');

        // Input a message and click Add
        await inputElement.fill('Test Message');
        await addButton.click();

        // Verify that the message is displayed
        const messagesDiv = await page.locator('#messages');
        await expect(messagesDiv).toHaveText('1. Test Message');
    });

    test('should not add an empty message', async ({ page }) => {
        const addButton = await page.locator('#add-btn');

        // Click Add without input
        await addButton.click();

        // Verify that no message is displayed
        const messagesDiv = await page.locator('#messages');
        await expect(messagesDiv).toHaveText('');
    });

    test('should clear the queue', async ({ page }) => {
        const inputElement = await page.locator('#input');
        const addButton = await page.locator('#add-btn');
        const clearButton = await page.locator('#clear-btn');

        // Add a message first
        await inputElement.fill('Test Message');
        await addButton.click();

        // Now clear the queue
        await clearButton.click();

        // Verify that the messages area is empty
        const messagesDiv = await page.locator('#messages');
        await expect(messagesDiv).toHaveText('');
    });

    test('should handle multiple messages', async ({ page }) => {
        const inputElement = await page.locator('#input');
        const addButton = await page.locator('#add-btn');

        // Add multiple messages
        await inputElement.fill('First Message');
        await addButton.click();

        await inputElement.fill('Second Message');
        await addButton.click();

        // Verify that both messages are displayed
        const messagesDiv = await page.locator('#messages');
        await expect(messagesDiv).toHaveText('1. First Message\n2. Second Message');
    });

    test('should clear the queue and show no messages', async ({ page }) => {
        const inputElement = await page.locator('#input');
        const addButton = await page.locator('#add-btn');
        const clearButton = await page.locator('#clear-btn');

        // Add a message
        await inputElement.fill('Message to Clear');
        await addButton.click();

        // Clear the queue
        await clearButton.click();

        // Verify that the messages area is empty
        const messagesDiv = await page.locator('#messages');
        await expect(messagesDiv).toHaveText('');
    });

    test('should not allow adding empty messages', async ({ page }) => {
        const addButton = await page.locator('#add-btn');

        // Attempt to add an empty message
        await addButton.click();

        // Verify that no messages are displayed
        const messagesDiv = await page.locator('#messages');
        await expect(messagesDiv).toHaveText('');
    });
});