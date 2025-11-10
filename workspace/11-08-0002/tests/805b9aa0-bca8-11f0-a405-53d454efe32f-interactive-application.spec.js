import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0002/html/805b9aa0-bca8-11f0-a405-53d454efe32f.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Deque Module', () => {
    test('should start in idle state', async ({ page }) => {
        const feedbackMessage = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessage).toBe('');
    });

    test('should add item to front and render correctly', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('#addFront');

        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(1);
        expect(await page.locator('.deque-item').nth(0).innerText()).toBe('10');

        const feedbackMessage = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessage).toBe('');
    });

    test('should add item to back and render correctly', async ({ page }) => {
        await page.fill('#inputValue', '20');
        await page.click('#addBack');

        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(1);
        expect(await page.locator('.deque-item').nth(0).innerText()).toBe('20');

        const feedbackMessage = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessage).toBe('');
    });

    test('should remove item from front when deque is not empty', async ({ page }) => {
        await page.fill('#inputValue', '30');
        await page.click('#addFront');
        await page.fill('#inputValue', '40');
        await page.click('#addFront');
        await page.click('#removeFront');

        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(1);
        expect(await page.locator('.deque-item').nth(0).innerText()).toBe('30');

        const feedbackMessage = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessage).toBe('');
    });

    test('should remove item from back when deque is not empty', async ({ page }) => {
        await page.fill('#inputValue', '50');
        await page.click('#addBack');
        await page.fill('#inputValue', '60');
        await page.click('#addBack');
        await page.click('#removeBack');

        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(1);
        expect(await page.locator('.deque-item').nth(0).innerText()).toBe('50');

        const feedbackMessage = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessage).toBe('');
    });

    test('should show feedback message when trying to remove from empty deque', async ({ page }) => {
        await page.click('#removeFront');
        const feedbackMessage = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessage).toBe('Deque is empty!');

        await page.click('#removeBack');
        const feedbackMessageBack = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessageBack).toBe('Deque is empty!');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#inputValue', '');
        await page.click('#addFront');
        const feedbackMessage = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessage).toBe('Invalid input!');

        await page.fill('#inputValue', 'abc');
        await page.click('#addBack');
        const feedbackMessageBack = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessageBack).toBe('Invalid input!');
    });

    test('should clear feedback message after valid operation', async ({ page }) => {
        await page.fill('#inputValue', '70');
        await page.click('#addFront');
        const feedbackMessage = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessage).toBe('');

        await page.fill('#inputValue', '80');
        await page.click('#removeBack');
        const feedbackMessageAfterRemove = await page.locator('#feedbackMessage').innerText();
        expect(feedbackMessageAfterRemove).toBe('');
    });
});