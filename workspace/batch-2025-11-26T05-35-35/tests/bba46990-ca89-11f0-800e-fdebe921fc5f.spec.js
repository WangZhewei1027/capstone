import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba46990-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Queue Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should add a person to the queue', async ({ page }) => {
        // Simulate adding a person to the queue
        await page.click('#add-to-queue-btn');
        await page.fill('input[type="text"]', 'Alice');
        await page.keyboard.press('Enter');

        // Verify that the alert is shown
        await expect(page.locator('text=Person added to queue!')).toBeVisible();

        // Check if the queue contains the added person
        const queueItems = await page.locator('#queue-list li').allTextContents();
        expect(queueItems).toContain('Alice');
    });

    test('should leave the queue', async ({ page }) => {
        // First, add a person to the queue
        await page.click('#add-to-queue-btn');
        await page.fill('input[type="text"]', 'Bob');
        await page.keyboard.press('Enter');

        // Now, leave the queue
        await page.click('#leave-queue-btn');
        await page.fill('input[type="text"]', 'Bob');
        await page.keyboard.press('Enter');

        // Verify that the alert is shown
        await expect(page.locator('text=Person left the queue!')).toBeVisible();

        // Check that the queue is empty
        const queueItems = await page.locator('#queue-list li').allTextContents();
        expect(queueItems).toHaveLength(0);
    });

    test('should view the current queue', async ({ page }) => {
        // Add multiple people to the queue
        await page.click('#add-to-queue-btn');
        await page.fill('input[type="text"]', 'Charlie');
        await page.keyboard.press('Enter');

        await page.click('#add-to-queue-btn');
        await page.fill('input[type="text"]', 'Diana');
        await page.keyboard.press('Enter');

        // View the queue
        await page.click('#view-queue-btn');

        // Check if the queue displays the correct people
        const queueItems = await page.locator('#queue-list li').allTextContents();
        expect(queueItems).toEqual(['1. Charlie', '2. Diana']);
    });

    test('should handle leaving the queue when not in it', async ({ page }) => {
        // Attempt to leave the queue without adding anyone
        await page.click('#leave-queue-btn');
        await page.fill('input[type="text"]', 'Eve');
        await page.keyboard.press('Enter');

        // Verify that the alert is shown
        await expect(page.locator('text=You are not in the queue!')).toBeVisible();
    });

    test('should handle adding a person with no name', async ({ page }) => {
        // Attempt to add a person without entering a name
        await page.click('#add-to-queue-btn');
        await page.keyboard.press('Enter');

        // Verify that the alert is shown
        await expect(page.locator('text=Please enter your name!')).toBeVisible();
    });

    test('should handle leaving a person with no name', async ({ page }) => {
        // Add a person to the queue first
        await page.click('#add-to-queue-btn');
        await page.fill('input[type="text"]', 'Frank');
        await page.keyboard.press('Enter');

        // Now, attempt to leave the queue without entering a name
        await page.click('#leave-queue-btn');
        await page.keyboard.press('Enter');

        // Verify that the alert is shown
        await expect(page.locator('text=Please enter your name to leave the queue!')).toBeVisible();
    });
});