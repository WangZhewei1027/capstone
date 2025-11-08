import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f9f296e0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Queue Interactive Module', () => {
    test('should display initial state correctly', async ({ page }) => {
        const feedback = await page.locator('#feedback').innerText();
        const queueElements = await page.locator('.queue-element').count();
        
        expect(feedback).toBe('');
        expect(queueElements).toBe(0);
    });

    test('should enqueue an element and update the queue', async ({ page }) => {
        await page.fill('#enqueueInput', '5');
        await page.click('#enqueueButton');

        const feedback1 = await page.locator('#feedback1').innerText();
        const queueElements1 = await page.locator('.queue-element').count();
        const firstElement = await page.locator('.queue-element').nth(0).innerText();

        expect(feedback).toBe('Added: 5');
        expect(queueElements).toBe(1);
        expect(firstElement).toBe('5');
    });

    test('should show error message for invalid enqueue input', async ({ page }) => {
        await page.fill('#enqueueInput', '');
        await page.click('#enqueueButton');

        const feedback2 = await page.locator('#feedback2').innerText();
        
        expect(feedback).toBe('Please enter a number.');
    });

    test('should dequeue an element and update the queue', async ({ page }) => {
        await page.fill('#enqueueInput', '10');
        await page.click('#enqueueButton');
        await page.fill('#enqueueInput', '20');
        await page.click('#enqueueButton');
        
        await page.click('#dequeueButton');

        const feedback3 = await page.locator('#feedback3').innerText();
        const queueElements2 = await page.locator('.queue-element').count();
        const firstElement1 = await page.locator('.queue-element').nth(0).innerText();

        expect(feedback).toBe('Removed: 10');
        expect(queueElements).toBe(1);
        expect(firstElement).toBe('20');
    });

    test('should handle dequeue when queue is empty', async ({ page }) => {
        await page.click('#dequeueButton');

        const feedback4 = await page.locator('#feedback4').innerText();
        
        expect(feedback).toBe('Queue is empty.');
    });

    test('should handle multiple enqueue and dequeue operations', async ({ page }) => {
        await page.fill('#enqueueInput', '1');
        await page.click('#enqueueButton');
        await page.fill('#enqueueInput', '2');
        await page.click('#enqueueButton');
        await page.fill('#enqueueInput', '3');
        await page.click('#enqueueButton');

        await page.click('#dequeueButton'); // Removes 1
        await page.click('#dequeueButton'); // Removes 2

        const feedback5 = await page.locator('#feedback5').innerText();
        const queueElements3 = await page.locator('.queue-element').count();
        const firstElement2 = await page.locator('.queue-element').nth(0).innerText();

        expect(feedback).toBe('Removed: 2');
        expect(queueElements).toBe(1);
        expect(firstElement).toBe('3');
    });
});