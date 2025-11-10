import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f122bae0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Deque Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle with empty deque', async ({ page }) => {
        const dequeDisplay = await page.locator('#dequeDisplay');
        await expect(dequeDisplay).toHaveText('');
    });

    test('Add to front updates the deque', async ({ page }) => {
        await page.fill('#inputValue', 'First');
        await page.click('text=Add to Front');
        
        const dequeDisplay1 = await page.locator('#dequeDisplay1');
        await expect(dequeDisplay).toHaveText('First');
    });

    test('Add to back updates the deque', async ({ page }) => {
        await page.fill('#inputValue', 'Second');
        await page.click('text=Add to Back');
        
        const dequeDisplay2 = await page.locator('#dequeDisplay2');
        await expect(dequeDisplay).toHaveText('Second');
    });

    test('Add multiple items to front and back', async ({ page }) => {
        await page.fill('#inputValue', 'First');
        await page.click('text=Add to Front');
        await page.fill('#inputValue', 'Second');
        await page.click('text=Add to Back');
        
        const dequeDisplay3 = await page.locator('#dequeDisplay3');
        await expect(dequeDisplay).toHaveText('FirstSecond');
    });

    test('Remove from front updates the deque', async ({ page }) => {
        await page.fill('#inputValue', 'First');
        await page.click('text=Add to Front');
        await page.fill('#inputValue', 'Second');
        await page.click('text=Add to Back');
        
        await page.click('text=Remove from Front');
        const dequeDisplay4 = await page.locator('#dequeDisplay4');
        await expect(dequeDisplay).toHaveText('Second');
    });

    test('Remove from back updates the deque', async ({ page }) => {
        await page.fill('#inputValue', 'First');
        await page.click('text=Add to Front');
        await page.fill('#inputValue', 'Second');
        await page.click('text=Add to Back');
        
        await page.click('text=Remove from Back');
        const dequeDisplay5 = await page.locator('#dequeDisplay5');
        await expect(dequeDisplay).toHaveText('First');
    });

    test('Removing from an empty deque does not throw an error', async ({ page }) => {
        await page.click('text=Remove from Front');
        await page.click('text=Remove from Back');
        
        const dequeDisplay6 = await page.locator('#dequeDisplay6');
        await expect(dequeDisplay).toHaveText('');
    });

    test('Input field is cleared after adding an item', async ({ page }) => {
        await page.fill('#inputValue', 'Test');
        await page.click('text=Add to Front');
        
        const inputField = await page.locator('#inputValue');
        await expect(inputField).toHaveValue('');
    });

    test('Adding empty input does not update the deque', async ({ page }) => {
        await page.click('text=Add to Front');
        
        const dequeDisplay7 = await page.locator('#dequeDisplay7');
        await expect(dequeDisplay).toHaveText('');
    });
});