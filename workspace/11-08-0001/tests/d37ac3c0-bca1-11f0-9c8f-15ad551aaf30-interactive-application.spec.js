import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/d37ac3c0-bca1-11f0-9c8f-15ad551aaf30.html';

test.describe('Interactive Deque Explorer Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        const statusText = await page.locator('#status').innerText();
        expect(statusText).toBe('');
        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(0);
    });

    test('Add to Front transitions to updating state', async ({ page }) => {
        await page.fill('#deque-input', '5');
        await page.click('#addFront');
        await page.waitForTimeout(500); // Wait for the update to complete
        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(1);
        const firstItem = await page.locator('.deque-item').nth(0).innerText();
        expect(firstItem).toBe('5');
    });

    test('Add to Back transitions to updating state', async ({ page }) => {
        await page.fill('#deque-input', '10');
        await page.click('#addBack');
        await page.waitForTimeout(500); // Wait for the update to complete
        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(1);
        const lastItem = await page.locator('.deque-item').nth(0).innerText();
        expect(lastItem).toBe('10');
    });

    test('Remove from Front transitions to updating state', async ({ page }) => {
        await page.fill('#deque-input', '15');
        await page.click('#addFront');
        await page.waitForTimeout(500);
        await page.click('#removeFront');
        await page.waitForTimeout(500); // Wait for the update to complete
        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(0);
    });

    test('Remove from Back transitions to updating state', async ({ page }) => {
        await page.fill('#deque-input', '20');
        await page.click('#addBack');
        await page.waitForTimeout(500);
        await page.click('#removeBack');
        await page.waitForTimeout(500); // Wait for the update to complete
        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(0);
    });

    test('Adding multiple items to the front', async ({ page }) => {
        await page.fill('#deque-input', '25');
        await page.click('#addFront');
        await page.waitForTimeout(500);
        await page.fill('#deque-input', '30');
        await page.click('#addFront');
        await page.waitForTimeout(500);
        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(2);
        const firstItem = await page.locator('.deque-item').nth(0).innerText();
        expect(firstItem).toBe('30');
    });

    test('Adding multiple items to the back', async ({ page }) => {
        await page.fill('#deque-input', '35');
        await page.click('#addBack');
        await page.waitForTimeout(500);
        await page.fill('#deque-input', '40');
        await page.click('#addBack');
        await page.waitForTimeout(500);
        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(2);
        const lastItem = await page.locator('.deque-item').nth(1).innerText();
        expect(lastItem).toBe('40');
    });

    test('Removing from an empty deque', async ({ page }) => {
        await page.click('#removeFront');
        await page.waitForTimeout(500); // Wait for the update to complete
        const statusText = await page.locator('#status').innerText();
        expect(statusText).toBe('');
        const dequeItems = await page.locator('.deque-item').count();
        expect(dequeItems).toBe(0);
    });

    test('Input validation for non-numeric input', async ({ page }) => {
        await page.fill('#deque-input', 'abc');
        await page.click('#addFront');
        const statusText = await page.locator('#status').innerText();
        expect(statusText).toContain('Invalid input');
    });

    test('Input validation for empty input', async ({ page }) => {
        await page.fill('#deque-input', '');
        await page.click('#addBack');
        const statusText = await page.locator('#status').innerText();
        expect(statusText).toContain('Input cannot be empty');
    });

    test.afterEach(async ({ page }) => {
        // Optionally reset the state or clear the deque if needed
        await page.evaluate(() => {
            const dequeVisual = document.getElementById('deque-visual');
            dequeVisual.innerHTML = '';
        });
    });
});