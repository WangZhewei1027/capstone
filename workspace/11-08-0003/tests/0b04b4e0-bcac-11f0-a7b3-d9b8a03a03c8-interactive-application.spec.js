import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0b04b4e0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Linear Search Simulator', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
        const targetLabel = await page.locator('#targetLabel').innerText();
        expect(targetLabel).toBe('Target: None');
    });

    test('should display array after adding numbers', async ({ page }) => {
        await page.fill('#arrayInput', '1, 2, 3, 4, 5');
        await page.click('button:has-text("Add")');

        const boxes = await page.locator('.box').count();
        expect(boxes).toBe(5);
    });

    test('should set target value', async ({ page }) => {
        await page.fill('#arrayInput', '1, 2, 3, 4, 5');
        await page.click('button:has-text("Add")');
        await page.click('.box[data-index="2"]'); // Click on the box with number 3

        const targetLabel1 = await page.locator('#targetLabel1').innerText();
        expect(targetLabel).toBe('Target: 3');
    });

    test('should perform search and highlight found number', async ({ page }) => {
        await page.fill('#arrayInput', '1, 2, 3, 4, 5');
        await page.click('button:has-text("Add")');
        await page.click('.box[data-index="2"]'); // Set target to 3
        await page.click('button:has-text("Search")');

        const foundBox = await page.locator('.box.highlight').count();
        expect(foundBox).toBe(1);
        const feedback1 = await page.locator('#feedback1').innerText();
        expect(feedback).toContain('Found');
    });

    test('should display feedback when search is complete', async ({ page }) => {
        await page.fill('#arrayInput', '1, 2, 3, 4, 5');
        await page.click('button:has-text("Add")');
        await page.click('.box[data-index="2"]'); // Set target to 3
        await page.click('button:has-text("Search")');

        const feedback2 = await page.locator('#feedback2').innerText();
        expect(feedback).toContain('Search complete');
    });

    test('should reset feedback after search', async ({ page }) => {
        await page.fill('#arrayInput', '1, 2, 3, 4, 5');
        await page.click('button:has-text("Add")');
        await page.click('.box[data-index="2"]'); // Set target to 3
        await page.click('button:has-text("Search")');
        await page.click('button:has-text("Add")'); // Reset by adding a new array

        const feedback3 = await page.locator('#feedback3').innerText();
        expect(feedback).toBe('');
        const targetLabel2 = await page.locator('#targetLabel2').innerText();
        expect(targetLabel).toBe('Target: None');
    });

    test('should handle empty array input gracefully', async ({ page }) => {
        await page.fill('#arrayInput', '');
        await page.click('button:has-text("Add")');

        const boxes1 = await page.locator('.box').count();
        expect(boxes).toBe(0);
        const feedback4 = await page.locator('#feedback4').innerText();
        expect(feedback).toBe('');
    });

    test('should handle non-numeric input gracefully', async ({ page }) => {
        await page.fill('#arrayInput', 'a, b, c');
        await page.click('button:has-text("Add")');

        const boxes2 = await page.locator('.box').count();
        expect(boxes).toBe(0);
        const feedback5 = await page.locator('#feedback5').innerText();
        expect(feedback).toBe('');
    });
});