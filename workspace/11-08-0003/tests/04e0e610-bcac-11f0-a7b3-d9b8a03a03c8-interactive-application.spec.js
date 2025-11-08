import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/04e0e610-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Priority Queue Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const message = await page.locator('#message').innerText();
        expect(message).toBe('');
        const queueElements = await page.locator('#queue .element').count();
        expect(queueElements).toBe(0);
    });

    test('should add an element to the queue', async ({ page }) => {
        await page.fill('#priority-input', '5');
        await page.click('#add');

        const queueElements1 = await page.locator('#queue .element').count();
        expect(queueElements).toBe(1);
        const firstElement = await page.locator('#queue .element').nth(0).innerText();
        expect(firstElement).toBe('5');
        const message1 = await page.locator('#message1').innerText();
        expect(message).toBe('');
    });

    test('should show error message for invalid input when adding', async ({ page }) => {
        await page.fill('#priority-input', 'invalid');
        await page.click('#add');

        const message2 = await page.locator('#message2').innerText();
        expect(message).toBe('Please enter a valid number.');
        const queueElements2 = await page.locator('#queue .element').count();
        expect(queueElements).toBe(0);
    });

    test('should remove the highest priority element', async ({ page }) => {
        await page.fill('#priority-input', '5');
        await page.click('#add');
        await page.fill('#priority-input', '10');
        await page.click('#add');
        await page.click('#remove');

        const queueElements3 = await page.locator('#queue .element').count();
        expect(queueElements).toBe(1);
        const firstElement1 = await page.locator('#queue .element').nth(0).innerText();
        expect(firstElement).toBe('5');
        const message3 = await page.locator('#message3').innerText();
        expect(message).toBe('');
    });

    test('should show error message when trying to remove from an empty queue', async ({ page }) => {
        await page.click('#remove');

        const message4 = await page.locator('#message4').innerText();
        expect(message).toBe('Queue is empty. Nothing to remove.');
        const queueElements4 = await page.locator('#queue .element').count();
        expect(queueElements).toBe(0);
    });

    test('should handle multiple adds and removes correctly', async ({ page }) => {
        await page.fill('#priority-input', '5');
        await page.click('#add');
        await page.fill('#priority-input', '10');
        await page.click('#add');
        await page.fill('#priority-input', '3');
        await page.click('#add');

        await page.click('#remove');
        let queueElements5 = await page.locator('#queue .element').count();
        expect(queueElements).toBe(2);
        const firstElementAfterRemove = await page.locator('#queue .element').nth(0).innerText();
        expect(firstElementAfterRemove).toBe('5');

        await page.click('#remove');
        queueElements = await page.locator('#queue .element').count();
        expect(queueElements).toBe(1);
        const secondElementAfterRemove = await page.locator('#queue .element').nth(0).innerText();
        expect(secondElementAfterRemove).toBe('3');
    });

    test('should clear message after valid input', async ({ page }) => {
        await page.fill('#priority-input', '5');
        await page.click('#add');
        const messageAfterAdd = await page.locator('#message').innerText();
        expect(messageAfterAdd).toBe('');

        await page.fill('#priority-input', 'invalid');
        await page.click('#add');
        const messageAfterInvalid = await page.locator('#message').innerText();
        expect(messageAfterInvalid).toBe('Please enter a valid number.');

        await page.fill('#priority-input', '7');
        await page.click('#add');
        const messageAfterValid = await page.locator('#message').innerText();
        expect(messageAfterValid).toBe('');
    });
});