import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/ff67fd40-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Priority Queue Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const queueDiv = await page.locator('#queue');
        const elements = await queueDiv.locator('.element').count();
        expect(elements).toBe(0); // No elements should be present initially
    });

    test('should add an element to the queue', async ({ page }) => {
        await page.fill('#valueInput', '5');
        await page.fill('#priorityInput', '3');
        await page.click('#addButton');

        const queueDiv1 = await page.locator('#queue');
        const elements1 = await queueDiv.locator('.element').count();
        expect(elements).toBe(1); // One element should be added

        const addedElement = await queueDiv.locator('.element').nth(0);
        expect(await addedElement.textContent()).toContain('Value: 5');
        expect(await addedElement.textContent()).toContain('Priority: 3');
    });

    test('should add multiple elements to the queue', async ({ page }) => {
        await page.fill('#valueInput', '5');
        await page.fill('#priorityInput', '3');
        await page.click('#addButton');

        await page.fill('#valueInput', '10');
        await page.fill('#priorityInput', '5');
        await page.click('#addButton');

        const queueDiv2 = await page.locator('#queue');
        const elements2 = await queueDiv.locator('.element').count();
        expect(elements).toBe(2); // Two elements should be present

        const firstElement = await queueDiv.locator('.element').nth(0);
        const secondElement = await queueDiv.locator('.element').nth(1);
        expect(await firstElement.textContent()).toContain('Value: 10');
        expect(await secondElement.textContent()).toContain('Value: 5');
    });

    test('should remove the highest priority element', async ({ page }) => {
        await page.fill('#valueInput', '5');
        await page.fill('#priorityInput', '3');
        await page.click('#addButton');

        await page.fill('#valueInput', '10');
        await page.fill('#priorityInput', '5');
        await page.click('#addButton');

        await page.click('#removeButton');

        const queueDiv3 = await page.locator('#queue');
        const elements3 = await queueDiv.locator('.element').count();
        expect(elements).toBe(1); // One element should remain

        const remainingElement = await queueDiv.locator('.element').nth(0);
        expect(await remainingElement.textContent()).toContain('Value: 5');
    });

    test('should not remove an element when the queue is empty', async ({ page }) => {
        await page.click('#removeButton');

        const queueDiv4 = await page.locator('#queue');
        const elements4 = await queueDiv.locator('.element').count();
        expect(elements).toBe(0); // Still no elements should be present
    });

    test('should handle invalid inputs gracefully', async ({ page }) => {
        await page.fill('#valueInput', '');
        await page.fill('#priorityInput', '3');
        await page.click('#addButton');

        const queueDiv5 = await page.locator('#queue');
        const elements5 = await queueDiv.locator('.element').count();
        expect(elements).toBe(0); // No elements should be added

        await page.fill('#valueInput', '5');
        await page.fill('#priorityInput', '');
        await page.click('#addButton');

        expect(await queueDiv.locator('.element').count()).toBe(0); // Still no elements should be added
    });
});