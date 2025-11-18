import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0001/html/94f8ce00-c465-11f0-af61-192d6dbad219.html';

test.describe('Interactive Queue Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Initial State', () => {
        test('should display the initial queue as empty', async ({ page }) => {
            const queueContent = await page.locator('#queue').innerHTML();
            expect(queueContent).toContain('Queue');
            expect(queueContent).not.toContain('queue-item');
        });

        test('should not allow dequeue when the queue is empty', async ({ page }) => {
            await page.click('button:has-text("Dequeue")');
            const alertText = await page.evaluate(() => window.alert);
            expect(alertText).toBe('Queue is empty. Nothing to dequeue.');
        });
    });

    test.describe('Enqueue Functionality', () => {
        test('should enqueue an item and update the queue display', async ({ page }) => {
            await page.fill('#inputValue', 'Item 1');
            await page.click('button:has-text("Enqueue")');
            const outputText = await page.locator('#output').innerText();
            expect(outputText).toBe('Enqueued: Item 1');

            const queueItems = await page.locator('.queue-item').count();
            expect(queueItems).toBe(1);
            expect(await page.locator('.queue-item').nth(0).innerText()).toBe('Item 1');
        });

        test('should show an alert when trying to enqueue an empty value', async ({ page }) => {
            await page.click('button:has-text("Enqueue")');
            const alertText1 = await page.evaluate(() => window.alert);
            expect(alertText).toBe('Please enter a value to enqueue.');
        });
    });

    test.describe('Dequeue Functionality', () => {
        test.beforeEach(async ({ page }) => {
            await page.fill('#inputValue', 'Item 1');
            await page.click('button:has-text("Enqueue")');
        });

        test('should dequeue an item and update the queue display', async ({ page }) => {
            await page.click('button:has-text("Dequeue")');
            const outputText1 = await page.locator('#output').innerText();
            expect(outputText).toBe('Dequeued: Item 1');

            const queueItems1 = await page.locator('.queue-item').count();
            expect(queueItems).toBe(0);
        });

        test('should show an alert when trying to dequeue from an empty queue', async ({ page }) => {
            await page.click('button:has-text("Dequeue")'); // Dequeue first item
            await page.click('button:has-text("Dequeue")'); // Try to dequeue again
            const alertText2 = await page.evaluate(() => window.alert);
            expect(alertText).toBe('Queue is empty. Nothing to dequeue.');
        });
    });

    test.describe('State Transition Validation', () => {
        test('should transition to updating state on enqueue', async ({ page }) => {
            await page.fill('#inputValue', 'Item 1');
            await page.click('button:has-text("Enqueue")');
            // Verify that the queue is updated
            const queueItems2 = await page.locator('.queue-item').count();
            expect(queueItems).toBe(1);
        });

        test('should transition to updating state on dequeue', async ({ page }) => {
            await page.fill('#inputValue', 'Item 1');
            await page.click('button:has-text("Enqueue")');
            await page.click('button:has-text("Dequeue")');
            // Verify that the queue is updated
            const queueItems3 = await page.locator('.queue-item').count();
            expect(queueItems).toBe(0);
        });
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
    });
});