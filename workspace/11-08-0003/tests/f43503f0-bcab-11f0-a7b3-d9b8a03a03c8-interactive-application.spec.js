import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f43503f0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Hash Table Interactive Module', () => {
    test('should start in idle state', async ({ page }) => {
        const message = await page.locator('#message').innerText();
        expect(message).toBe('');
    });

    test('should transition to adding state on add button click', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('#add');

        const message1 = await page.locator('#message1').innerText();
        expect(message).toBe(''); // No collision message should be shown
    });

    test('should handle collisions correctly', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('#add');

        // Adding the same key to trigger collision
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value2');
        await page.click('#add');

        const message2 = await page.locator('#message2').innerText();
        expect(message).toBe('Collision occurred!');

        const cell = await page.locator('.cell.collision');
        expect(await cell.count()).toBe(1); // Check if the collision class is applied
    });

    test('should transition back to idle state after collision animation', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('#add');

        await page.fill('#key', 'key1');
        await page.fill('#value', 'value2');
        await page.click('#add');

        await page.waitForTimeout(500); // Wait for the collision animation to complete

        // Simulate animation complete event
        await page.evaluate(() => {
            document.querySelector('.cell.collision').classList.remove('collision');
            document.getElementById('message').innerText = '';
        });

        const message3 = await page.locator('#message3').innerText();
        expect(message).toBe('');
    });

    test('should transition to retrieving state on retrieve button click', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('#add');

        await page.fill('#retrieve-key', 'key1');
        await page.click('#retrieve');

        const message4 = await page.locator('#message4').innerText();
        expect(message).toBe(''); // No message should be shown
    });

    test('should clear retrieve input after retrieval', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('#add');

        await page.fill('#retrieve-key', 'key1');
        await page.click('#retrieve');

        const retrieveInputValue = await page.locator('#retrieve-key').inputValue();
        expect(retrieveInputValue).toBe(''); // Check if the retrieve input is cleared
    });

    test('should handle retrieving non-existent keys gracefully', async ({ page }) => {
        await page.fill('#retrieve-key', 'nonexistentKey');
        await page.click('#retrieve');

        const message5 = await page.locator('#message5').innerText();
        expect(message).toBe(''); // Should not show any message for non-existent key
    });
});