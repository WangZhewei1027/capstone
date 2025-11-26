import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1367260-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Queue Demonstration Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const queueDiv = await page.locator('#queue');
        const queueContent = await queueDiv.innerHTML();
        expect(queueContent).toBe('');
    });

    test('Enqueueing an item updates the queue', async ({ page }) => {
        const input = await page.locator('#queueInput');
        const enqueueBtn = await page.locator('#enqueueBtn');

        await input.fill('Item 1');
        await enqueueBtn.click();

        const queueDiv = await page.locator('#queue');
        const queueContent = await queueDiv.innerHTML();
        expect(queueContent).toContain('Item 1');
    });

    test('Enqueueing with empty input shows alert', async ({ page }) => {
        const enqueueBtn = await page.locator('#enqueueBtn');
        await enqueueBtn.click();

        const alert = await page.waitForEvent('dialog');
        expect(alert.message()).toBe('Please enter a valid item.');
        await alert.dismiss();
    });

    test('Dequeueing an item removes it from the queue', async ({ page }) => {
        const input = await page.locator('#queueInput');
        const enqueueBtn = await page.locator('#enqueueBtn');
        const dequeueBtn = await page.locator('#dequeueBtn');

        await input.fill('Item 1');
        await enqueueBtn.click();
        await input.fill('Item 2');
        await enqueueBtn.click();

        await dequeueBtn.click();

        const queueDiv = await page.locator('#queue');
        const queueContent = await queueDiv.innerHTML();
        expect(queueContent).not.toContain('Item 1');
        expect(queueContent).toContain('Item 2');
    });

    test('Dequeueing from an empty queue shows alert', async ({ page }) => {
        const dequeueBtn = await page.locator('#dequeueBtn');
        await dequeueBtn.click();

        const alert = await page.waitForEvent('dialog');
        expect(alert.message()).toBe('Queue is empty!');
        await alert.dismiss();
    });

    test('Multiple enqueue and dequeue operations', async ({ page }) => {
        const input = await page.locator('#queueInput');
        const enqueueBtn = await page.locator('#enqueueBtn');
        const dequeueBtn = await page.locator('#dequeueBtn');

        await input.fill('Item 1');
        await enqueueBtn.click();
        await input.fill('Item 2');
        await enqueueBtn.click();
        await input.fill('Item 3');
        await enqueueBtn.click();

        let queueDiv = await page.locator('#queue');
        let queueContent = await queueDiv.innerHTML();
        expect(queueContent).toContain('Item 1');
        expect(queueContent).toContain('Item 2');
        expect(queueContent).toContain('Item 3');

        await dequeueBtn.click();
        await dequeueBtn.click();

        queueDiv = await page.locator('#queue');
        queueContent = await queueDiv.innerHTML();
        expect(queueContent).toContain('Item 3');
        expect(queueContent).not.toContain('Item 1');
        expect(queueContent).not.toContain('Item 2');
    });

    test('Enqueue and then dequeue should maintain order', async ({ page }) => {
        const input = await page.locator('#queueInput');
        const enqueueBtn = await page.locator('#enqueueBtn');
        const dequeueBtn = await page.locator('#dequeueBtn');

        await input.fill('Item A');
        await enqueueBtn.click();
        await input.fill('Item B');
        await enqueueBtn.click();
        await input.fill('Item C');
        await enqueueBtn.click();

        await dequeueBtn.click(); // Dequeue Item A
        await dequeueBtn.click(); // Dequeue Item B

        const queueDiv = await page.locator('#queue');
        const queueContent = await queueDiv.innerHTML();
        expect(queueContent).toContain('Item C');
        expect(queueContent).not.toContain('Item A');
        expect(queueContent).not.toContain('Item B');
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
    });
});