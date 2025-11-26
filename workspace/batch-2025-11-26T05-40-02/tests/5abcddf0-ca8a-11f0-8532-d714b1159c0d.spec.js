import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abcddf0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Queue Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the queue application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with input and send button', async ({ page }) => {
        // Verify that the input field and send button are present in the initial state
        const input = await page.locator('#input');
        const sendButton = await page.locator('#send-btn');
        
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter message...');
        await expect(sendButton).toBeVisible();
        await expect(sendButton).toHaveText('Send');
    });

    test('should send a message and update the queue', async ({ page }) => {
        // Test sending a message and verify the queue updates correctly
        const input = await page.locator('#input');
        const sendButton = await page.locator('#send-btn');
        const queueList = await page.locator('#queue-list');

        await input.fill('Test message 1');
        await sendButton.click();

        // Verify that the queue list is updated with the new message
        await expect(queueList).toHaveText('1. Test message 1');
    });

    test('should clear the input after sending a message', async ({ page }) => {
        // Test that the input field is cleared after sending a message
        const input = await page.locator('#input');
        const sendButton = await page.locator('#send-btn');

        await input.fill('Test message 2');
        await sendButton.click();

        // Verify that the input field is empty after sending
        await expect(input).toHaveValue('');
    });

    test('should not send an empty message', async ({ page }) => {
        // Test that clicking the send button with an empty input does not update the queue
        const sendButton = await page.locator('#send-btn');
        const queueList = await page.locator('#queue-list');

        await sendButton.click();

        // Verify that the queue list remains empty
        await expect(queueList).toHaveText('');
    });

    test('should handle multiple messages correctly', async ({ page }) => {
        // Test sending multiple messages and verify the queue updates correctly
        const input = await page.locator('#input');
        const sendButton = await page.locator('#send-btn');
        const queueList = await page.locator('#queue-list');

        await input.fill('Test message 3');
        await sendButton.click();
        await input.fill('Test message 4');
        await sendButton.click();

        // Verify that the queue list contains all messages
        await expect(queueList).toHaveText('1. Test message 3');
        await expect(queueList).toHaveText('2. Test message 4');
    });

    test('should display messages in the correct order', async ({ page }) => {
        // Test that messages are displayed in the order they were sent
        const input = await page.locator('#input');
        const sendButton = await page.locator('#send-btn');
        const queueList = await page.locator('#queue-list');

        await input.fill('First message');
        await sendButton.click();
        await input.fill('Second message');
        await sendButton.click();
        await input.fill('Third message');
        await sendButton.click();

        // Verify the order of messages in the queue
        await expect(queueList).toHaveText('1. First message');
        await expect(queueList).toHaveText('2. Second message');
        await expect(queueList).toHaveText('3. Third message');
    });
});