import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/544326e0-bca8-11f0-9137-459e305a5daf.html';

test.describe('Queue Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const queueSize = await page.textContent('#queue-size');
        expect(queueSize).toBe('Queue Size: 0');
    });

    test('should enqueue an item and update the queue size', async ({ page }) => {
        await page.fill('#queue-input', '5');
        await page.click('button:has-text("Enqueue")');

        // Wait for the animation to complete
        await page.waitForTimeout(500); // Adjust based on animation duration

        const queueSize = await page.textContent('#queue-size');
        expect(queueSize).toBe('Queue Size: 1');

        const queueItems = await page.$$('.queue-item');
        expect(queueItems.length).toBe(1);
        expect(await queueItems[0].textContent()).toBe('5');
    });

    test('should dequeue an item and update the queue size', async ({ page }) => {
        await page.fill('#queue-input', '5');
        await page.click('button:has-text("Enqueue")');
        await page.waitForTimeout(500); // Wait for enqueue animation

        await page.click('button:has-text("Dequeue")');

        // Wait for the animation to complete
        await page.waitForTimeout(500); // Adjust based on animation duration

        const queueSize = await page.textContent('#queue-size');
        expect(queueSize).toBe('Queue Size: 0');

        const queueItems = await page.$$('.queue-item');
        expect(queueItems.length).toBe(0);
    });

    test('should handle multiple enqueue operations', async ({ page }) => {
        await page.fill('#queue-input', '1');
        await page.click('button:has-text("Enqueue")');
        await page.waitForTimeout(500);

        await page.fill('#queue-input', '2');
        await page.click('button:has-text("Enqueue")');
        await page.waitForTimeout(500);

        const queueSize = await page.textContent('#queue-size');
        expect(queueSize).toBe('Queue Size: 2');

        const queueItems = await page.$$('.queue-item');
        expect(queueItems.length).toBe(2);
        expect(await queueItems[0].textContent()).toBe('1');
        expect(await queueItems[1].textContent()).toBe('2');
    });

    test('should handle dequeue operation when queue is empty', async ({ page }) => {
        await page.click('button:has-text("Dequeue")');

        const queueSize = await page.textContent('#queue-size');
        expect(queueSize).toBe('Queue Size: 0');

        const queueItems = await page.$$('.queue-item');
        expect(queueItems.length).toBe(0);
    });

    test('should not enqueue if input is empty', async ({ page }) => {
        await page.click('button:has-text("Enqueue")');

        const queueSize = await page.textContent('#queue-size');
        expect(queueSize).toBe('Queue Size: 0');

        const queueItems = await page.$$('.queue-item');
        expect(queueItems.length).toBe(0);
    });

    test('should reset input field after enqueue', async ({ page }) => {
        await page.fill('#queue-input', '3');
        await page.click('button:has-text("Enqueue")');
        await page.waitForTimeout(500);

        const inputValue = await page.inputValue('#queue-input');
        expect(inputValue).toBe('');
    });

    test('should reset input field after dequeue', async ({ page }) => {
        await page.fill('#queue-input', '4');
        await page.click('button:has-text("Enqueue")');
        await page.waitForTimeout(500);

        await page.click('button:has-text("Dequeue")');
        await page.waitForTimeout(500);

        const inputValue = await page.inputValue('#queue-input');
        expect(inputValue).toBe('');
    });
});