import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c1733e0-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Deque Implementation Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize in Idle state', async ({ page }) => {
        const dequeDisplay = await page.locator('#deque').innerText();
        expect(dequeDisplay).toBe('');
    });

    test('should enqueue a value and transition to Enqueueing state', async ({ page }) => {
        await page.fill('#enqueue', '10');
        await page.click('#add-btn');

        const dequeDisplay = await page.locator('#deque').innerText();
        expect(dequeDisplay).toBe('10');
    });

    test('should dequeue a value and transition to Dequeueing state', async ({ page }) => {
        await page.fill('#enqueue', '20');
        await page.click('#add-btn');
        await page.fill('#dequeue', '1');
        await page.click('#remove-btn');

        const dequeDisplay = await page.locator('#deque').innerText();
        expect(dequeDisplay).toBe('');
    });

    test('should peek the front value and transition to Peeking state', async ({ page }) => {
        await page.fill('#enqueue', '30');
        await page.click('#add-btn');
        await page.fill('#peek', '1');
        await page.click('#peek-btn');

        const peekValue = await page.locator('#deque').innerText();
        expect(peekValue).toBe('30');
    });

    test('should clear the deque and transition to Clearing state', async ({ page }) => {
        await page.fill('#enqueue', '40');
        await page.click('#add-btn');
        await page.click('#clear-btn');

        const dequeDisplay = await page.locator('#deque').innerText();
        expect(dequeDisplay).toBe('');
    });

    test('should print the deque contents and transition to Printing state', async ({ page }) => {
        await page.fill('#enqueue', '50');
        await page.click('#add-btn');
        await page.fill('#enqueue', '60');
        await page.click('#add-btn');

        const consoleLogSpy = await page.evaluate(() => {
            return new Promise((resolve) => {
                const originalConsoleLog = console.log;
                console.log = (...args) => {
                    resolve(args.join(' '));
                    console.log = originalConsoleLog; // Restore original console.log
                };
            });
        });

        await page.click('#print-btn');
        expect(consoleLogSpy).toContain('50 -> 60');
    });

    test('should handle edge case for dequeue when empty', async ({ page }) => {
        await page.click('#remove-btn');

        const dequeDisplay = await page.locator('#deque').innerText();
        expect(dequeDisplay).toBe('');
    });

    test('should handle edge case for peek when empty', async ({ page }) => {
        await page.click('#peek-btn');

        const peekValue = await page.locator('#deque').innerText();
        expect(peekValue).toBe('');
    });

    test('should handle invalid input for enqueue', async ({ page }) => {
        await page.fill('#enqueue', 'abc');
        const addButton = page.locator('#add-btn');
        await expect(addButton).toBeDisabled();
    });

    test('should handle invalid input for dequeue', async ({ page }) => {
        await page.fill('#dequeue', 'abc');
        const removeButton = page.locator('#remove-btn');
        await expect(removeButton).toBeDisabled();
    });

    test('should handle invalid input for peek', async ({ page }) => {
        await page.fill('#peek', 'abc');
        const peekButton = page.locator('#peek-btn');
        await expect(peekButton).toBeDisabled();
    });
});