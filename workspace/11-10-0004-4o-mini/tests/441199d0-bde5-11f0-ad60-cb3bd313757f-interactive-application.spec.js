import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0004-4o-mini/html/441199d0-bde5-11f0-ad60-cb3bd313757f.html';

test.describe('Interactive Queue Management Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        const notification = await page.locator('#notification').innerText();
        expect(notification).toBe('');
        const queueItems = await page.locator('.queue-item').count();
        expect(queueItems).toBe(0);
    });

    test('Enqueue an element', async () => {
        await page.fill('#inputNumber', '5');
        await page.click('#enqueueBtn');

        const notification = await page.locator('#notification').innerText();
        expect(notification).toBe('Element Enqueued!');

        const queueItems = await page.locator('.queue-item').count();
        expect(queueItems).toBe(1);
        expect(await page.locator('.queue-item').nth(0).innerText()).toBe('5');
    });

    test('Dequeue an element', async () => {
        await page.click('#dequeueBtn');

        const notification = await page.locator('#notification').innerText();
        expect(notification).toBe('Element Dequeued!');

        const queueItems = await page.locator('.queue-item').count();
        expect(queueItems).toBe(0);
    });

    test('Dequeue from an empty queue', async () => {
        await page.click('#dequeueBtn');

        const notification = await page.locator('#notification').innerText();
        expect(notification).toBe('Queue is empty!');
    });

    test('Enqueue multiple elements', async () => {
        await page.fill('#inputNumber', '10');
        await page.click('#enqueueBtn');
        await page.fill('#inputNumber', '20');
        await page.click('#enqueueBtn');

        const notification = await page.locator('#notification').innerText();
        expect(notification).toBe('Element Enqueued!');

        const queueItems = await page.locator('.queue-item').count();
        expect(queueItems).toBe(2);
        expect(await page.locator('.queue-item').nth(0).innerText()).toBe('10');
        expect(await page.locator('.queue-item').nth(1).innerText()).toBe('20');
    });

    test('Dequeue all elements', async () => {
        await page.click('#dequeueBtn'); // Dequeue 10
        await page.click('#dequeueBtn'); // Dequeue 20

        const notification = await page.locator('#notification').innerText();
        expect(notification).toBe('Element Dequeued!');

        const queueItems = await page.locator('.queue-item').count();
        expect(queueItems).toBe(0);
    });

    test('Enqueue with empty input', async () => {
        await page.fill('#inputNumber', '');
        await page.click('#enqueueBtn');

        const notification = await page.locator('#notification').innerText();
        expect(notification).toBe('');
        const queueItems = await page.locator('.queue-item').count();
        expect(queueItems).toBe(0);
    });
});