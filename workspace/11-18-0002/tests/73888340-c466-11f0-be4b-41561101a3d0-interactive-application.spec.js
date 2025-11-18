import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0002/html/73888340-c466-11f0-be4b-41561101a3d0.html';

test.describe('Interactive Queue Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Initial State', () => {
        test('should display empty queue on load', async ({ page }) => {
            const queueStatus = await page.locator('#queueStatus');
            const boxes = await page.locator('.queue-box');

            await expect(queueStatus).toHaveText('Queue Status: [  ]');
            for (let i = 0; i < 5; i++) {
                await expect(boxes.nth(i)).toHaveText('');
            }
        });

        test('dequeue button should be disabled initially', async ({ page }) => {
            const dequeueBtn = await page.locator('#dequeueBtn');
            await expect(dequeueBtn).toBeDisabled();
        });
    });

    test.describe('Enqueue Functionality', () => {
        test('should enqueue an item and update the display', async ({ page }) => {
            const inputValue = await page.locator('#inputValue');
            const enqueueBtn = await page.locator('#enqueueBtn');
            const queueStatus = await page.locator('#queueStatus');
            const boxes = await page.locator('.queue-box');

            await inputValue.fill('Item 1');
            await enqueueBtn.click();

            await expect(queueStatus).toHaveText('Queue Status: [ Item 1 ]');
            await expect(boxes.nth(0)).toHaveText('Item 1');
            await expect(boxes.nth(1)).toHaveText('');
            await expect(boxes.nth(2)).toHaveText('');
            await expect(boxes.nth(3)).toHaveText('');
            await expect(boxes.nth(4)).toHaveText('');
        });

        test('should enqueue multiple items and update the display accordingly', async ({ page }) => {
            const inputValue = await page.locator('#inputValue');
            const enqueueBtn = await page.locator('#enqueueBtn');
            const queueStatus = await page.locator('#queueStatus');
            const boxes = await page.locator('.queue-box');

            await inputValue.fill('Item 1');
            await enqueueBtn.click();
            await inputValue.fill('Item 2');
            await enqueueBtn.click();
            await inputValue.fill('Item 3');
            await enqueueBtn.click();

            await expect(queueStatus).toHaveText('Queue Status: [ Item 1, Item 2, Item 3 ]');
            await expect(boxes.nth(0)).toHaveText('Item 1');
            await expect(boxes.nth(1)).toHaveText('Item 2');
            await expect(boxes.nth(2)).toHaveText('Item 3');
            await expect(boxes.nth(3)).toHaveText('');
            await expect(boxes.nth(4)).toHaveText('');
        });

        test('should not enqueue more items than available boxes', async ({ page }) => {
            const inputValue = await page.locator('#inputValue');
            const enqueueBtn = await page.locator('#enqueueBtn');
            const queueStatus = await page.locator('#queueStatus');
            const boxes = await page.locator('.queue-box');

            for (let i = 1; i <= 5; i++) {
                await inputValue.fill(`Item ${i}`);
                await enqueueBtn.click();
            }

            await expect(queueStatus).toHaveText('Queue Status: [ Item 1, Item 2, Item 3, Item 4, Item 5 ]');
            await expect(boxes.nth(0)).toHaveText('Item 1');
            await expect(boxes.nth(1)).toHaveText('Item 2');
            await expect(boxes.nth(2)).toHaveText('Item 3');
            await expect(boxes.nth(3)).toHaveText('Item 4');
            await expect(boxes.nth(4)).toHaveText('Item 5');

            await inputValue.fill('Item 6');
            await enqueueBtn.click();
            await expect(queueStatus).toHaveText('Queue Status: [ Item 1, Item 2, Item 3, Item 4, Item 5 ]');
        });
    });

    test.describe('Dequeue Functionality', () => {
        test('should dequeue an item and update the display', async ({ page }) => {
            const inputValue = await page.locator('#inputValue');
            const enqueueBtn = await page.locator('#enqueueBtn');
            const dequeueBtn = await page.locator('#dequeueBtn');
            const queueStatus = await page.locator('#queueStatus');
            const boxes = await page.locator('.queue-box');

            await inputValue.fill('Item 1');
            await enqueueBtn.click();
            await inputValue.fill('Item 2');
            await enqueueBtn.click();
            await inputValue.fill('Item 3');
            await enqueueBtn.click();

            await expect(queueStatus).toHaveText('Queue Status: [ Item 1, Item 2, Item 3 ]');

            await dequeueBtn.click();
            await expect(queueStatus).toHaveText('Queue Status: [ Item 2, Item 3 ]');
            await expect(boxes.nth(0)).toHaveText('Item 2');
            await expect(boxes.nth(1)).toHaveText('Item 3');
            await expect(boxes.nth(2)).toHaveText('');
            await expect(boxes.nth(3)).toHaveText('');
            await expect(boxes.nth(4)).toHaveText('');
        });

        test('should disable dequeue button when queue is empty', async ({ page }) => {
            const dequeueBtn = await page.locator('#dequeueBtn');
            const inputValue = await page.locator('#inputValue');
            const enqueueBtn = await page.locator('#enqueueBtn');

            await inputValue.fill('Item 1');
            await enqueueBtn.click();
            await dequeueBtn.click();

            await expect(dequeueBtn).toBeDisabled();
        });

        test('should not allow dequeue if queue is empty', async ({ page }) => {
            const dequeueBtn = await page.locator('#dequeueBtn');
            const queueStatus = await page.locator('#queueStatus');
            const boxes = await page.locator('.queue-box');

            await expect(queueStatus).toHaveText('Queue Status: [  ]');
            await dequeueBtn.click(); // Attempt to dequeue when empty
            await expect(queueStatus).toHaveText('Queue Status: [  ]'); // Status should remain unchanged
            for (let i = 0; i < 5; i++) {
                await expect(boxes.nth(i)).toHaveText(''); // All boxes should still be empty
            }
        });
    });
});