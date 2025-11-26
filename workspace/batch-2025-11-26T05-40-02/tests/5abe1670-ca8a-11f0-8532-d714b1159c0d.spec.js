import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe1670-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Priority Queue Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('should display initial state with empty queue', async ({ page }) => {
        const queueContent = await page.locator('#queue').innerHTML();
        expect(queueContent).toBe('');
    });

    test.describe('Adding elements', () => {
        test('should add an element to the queue', async ({ page }) => {
            await page.fill('#input', '5');
            await page.click('#add-btn');

            const queueContent = await page.locator('#queue').innerHTML();
            expect(queueContent).toContain('5');
        });

        test('should add multiple elements to the queue', async ({ page }) => {
            await page.fill('#input', '3');
            await page.click('#add-btn');
            await page.fill('#input', '1');
            await page.click('#add-btn');
            await page.fill('#input', '4');
            await page.click('#add-btn');

            const queueContent = await page.locator('#queue').innerHTML();
            expect(queueContent).toContain('1');
            expect(queueContent).toContain('3');
            expect(queueContent).toContain('4');
        });
    });

    test.describe('Removing elements', () => {
        test.beforeEach(async ({ page }) => {
            await page.fill('#input', '5');
            await page.click('#add-btn');
            await page.fill('#input', '3');
            await page.click('#add-btn');
        });

        test('should remove an element from the queue', async ({ page }) => {
            await page.click('#remove-btn');

            const queueContent = await page.locator('#queue').innerHTML();
            expect(queueContent).not.toContain('5');
        });

        test('should alert when trying to remove from an empty queue', async ({ page }) => {
            await page.click('#remove-btn'); // Remove first element
            await page.click('#remove-btn'); // Remove second element

            const [alert] = await Promise.all([
                page.waitForEvent('dialog'),
                page.click('#remove-btn') // Attempt to remove from empty queue
            ]);
            expect(alert.message()).toBe('Queue is empty');
            await alert.dismiss();
        });
    });

    test.describe('Printing the queue', () => {
        test.beforeEach(async ({ page }) => {
            await page.fill('#input', '2');
            await page.click('#add-btn');
            await page.fill('#input', '1');
            await page.click('#add-btn');
        });

        test('should print the current elements in the queue', async ({ page }) => {
            await page.click('#print-btn');

            const consoleLog = await page.evaluate(() => {
                return console.log.toString();
            });
            expect(consoleLog).toContain('1');
            expect(consoleLog).toContain('2');
        });
    });

    test('should maintain the correct order of elements in the queue', async ({ page }) => {
        await page.fill('#input', '10');
        await page.click('#add-btn');
        await page.fill('#input', '5');
        await page.click('#add-btn');
        await page.fill('#input', '20');
        await page.click('#add-btn');

        await page.click('#remove-btn'); // Remove the first element (5)
        const queueContent = await page.locator('#queue').innerHTML();
        expect(queueContent).toContain('10');
        expect(queueContent).toContain('20');
        expect(queueContent).not.toContain('5');
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
    });
});