import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0002-playwright-examples/html/2ac51d60-c459-11f0-85c2-7ddd15762b1b.html';

test.describe('Interactive Queue Exploration Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the interactive queue exploration tool
        await page.goto(BASE_URL);
    });

    test('Initial state should display empty queue', async ({ page }) => {
        // Verify that the initial state displays 'Empty' in the front item
        const frontItem = await page.locator('#front-item').innerText();
        expect(frontItem).toBe('Empty');

        // Verify that no items are displayed in the queue
        const items = await page.locator('#items').innerText();
        expect(items).toBe('');
    });

    test('Enqueue an item updates the queue correctly', async ({ page }) => {
        // Enqueue an item
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-button');

        // Verify that the front item is updated
        const frontItem = await page.locator('#front-item').innerText();
        expect(frontItem).toBe('Item 1');

        // Verify that the item is displayed in the queue
        const items = await page.locator('#items').innerText();
        expect(items).toContain('Item 1');
    });

    test('Multiple enqueues update the queue correctly', async ({ page }) => {
        // Enqueue multiple items
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-button');
        await page.fill('#item-input', 'Item 2');
        await page.click('#enqueue-button');

        // Verify that the front item is the first enqueued item
        const frontItem = await page.locator('#front-item').innerText();
        expect(frontItem).toBe('Item 1');

        // Verify that both items are displayed in the queue
        const items = await page.locator('#items').innerText();
        expect(items).toContain('Item 1');
        expect(items).toContain('Item 2');
    });

    test('Dequeue an item updates the queue correctly', async ({ page }) => {
        // Enqueue an item first
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-button');

        // Dequeue the item
        await page.click('#dequeue-button');

        // Verify that the queue is now empty
        const frontItem = await page.locator('#front-item').innerText();
        expect(frontItem).toBe('Empty');

        // Verify that no items are displayed in the queue
        const items = await page.locator('#items').innerText();
        expect(items).toBe('');
    });

    test('Dequeue on empty queue does not cause errors', async ({ page }) => {
        // Attempt to dequeue without any items
        await page.click('#dequeue-button');

        // Verify that the queue remains empty
        const frontItem = await page.locator('#front-item').innerText();
        expect(frontItem).toBe('Empty');

        // Verify that no items are displayed in the queue
        const items = await page.locator('#items').innerText();
        expect(items).toBe('');
    });

    test('Enqueue empty input does not change the queue', async ({ page }) => {
        // Attempt to enqueue an empty input
        await page.click('#enqueue-button');

        // Verify that the queue remains empty
        const frontItem = await page.locator('#front-item').innerText();
        expect(frontItem).toBe('Empty');

        // Verify that no items are displayed in the queue
        const items = await page.locator('#items').innerText();
        expect(items).toBe('');
    });

    test('Enqueue and then dequeue updates the queue correctly', async ({ page }) => {
        // Enqueue an item
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-button');

        // Dequeue the item
        await page.click('#dequeue-button');

        // Verify that the queue is now empty
        const frontItem = await page.locator('#front-item').innerText();
        expect(frontItem).toBe('Empty');

        // Verify that no items are displayed in the queue
        const items = await page.locator('#items').innerText();
        expect(items).toBe('');
    });
});