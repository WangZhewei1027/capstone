import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1367261-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Deque Example Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('Initial state should be Idle with empty deque', async ({ page }) => {
        const dequeText = await page.textContent('#deque');
        expect(dequeText).toBe('[]');
    });

    test('Add to Front updates deque correctly', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Add to Front")');
        const dequeText = await page.textContent('#deque');
        expect(dequeText).toBe('["10"]');
    });

    test('Add to Back updates deque correctly', async ({ page }) => {
        await page.fill('#inputValue', '20');
        await page.click('button:has-text("Add to Back")');
        const dequeText = await page.textContent('#deque');
        expect(dequeText).toBe('["20"]');
    });

    test('Remove from Front updates deque correctly', async ({ page }) => {
        await page.fill('#inputValue', '30');
        await page.click('button:has-text("Add to Front")');
        await page.click('button:has-text("Remove from Front")');
        const dequeText = await page.textContent('#deque');
        expect(dequeText).toBe('[]');
    });

    test('Remove from Back updates deque correctly', async ({ page }) => {
        await page.fill('#inputValue', '40');
        await page.click('button:has-text("Add to Back")');
        await page.click('button:has-text("Remove from Back")');
        const dequeText = await page.textContent('#deque');
        expect(dequeText).toBe('[]');
    });

    test('Removing from Front when deque is empty shows alert', async ({ page }) => {
        await page.click('button:has-text("Remove from Front")');
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe("Deque is empty!");
    });

    test('Removing from Back when deque is empty shows alert', async ({ page }) => {
        await page.click('button:has-text("Remove from Back")');
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe("Deque is empty!");
    });

    test('Adding multiple items to the front and back updates deque correctly', async ({ page }) => {
        await page.fill('#inputValue', '50');
        await page.click('button:has-text("Add to Front")');
        await page.fill('#inputValue', '60');
        await page.click('button:has-text("Add to Back")');
        const dequeText = await page.textContent('#deque');
        expect(dequeText).toBe('["50","60"]');
    });

    test('Check state transitions for adding to front', async ({ page }) => {
        await page.fill('#inputValue', '70');
        await page.click('button:has-text("Add to Front")');
        const dequeText = await page.textContent('#deque');
        expect(dequeText).toBe('["70"]');
    });

    test('Check state transitions for adding to back', async ({ page }) => {
        await page.fill('#inputValue', '80');
        await page.click('button:has-text("Add to Back")');
        const dequeText = await page.textContent('#deque');
        expect(dequeText).toBe('["80"]');
    });

    test('Ensure controls are disabled after adding', async ({ page }) => {
        await page.fill('#inputValue', '90');
        await page.click('button:has-text("Add to Front")');
        const inputValueDisabled = await page.isDisabled('#inputValue');
        expect(inputValueDisabled).toBe(true);
    });
});