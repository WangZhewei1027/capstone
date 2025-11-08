import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f23feab0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Heap Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Idle State', () => {
        test('should remain in idle state initially', async ({ page }) => {
            const heapDiv = await page.locator('#heap');
            await expect(heapDiv).toHaveText('');
        });

        test('should transition to inserting state on insert button click', async ({ page }) => {
            await page.fill('#valueInput', '10');
            await page.click('#insertButton');
            const heapDiv1 = await page.locator('#heap');
            await expect(heapDiv).toContainText('10');
        });

        test('should transition to toggling state on heap toggle change', async ({ page }) => {
            await page.check('#heapToggle');
            const notification = await page.locator('#notification');
            await expect(notification).toBeVisible();
        });
    });

    test.describe('Inserting State', () => {
        test('should update heap visualization on insert', async ({ page }) => {
            await page.fill('#valueInput', '5');
            await page.click('#insertButton');
            await expect(page.locator('#heap')).toContainText('5');
        });

        test('should clear input field after insert complete', async ({ page }) => {
            await page.fill('#valueInput', '15');
            await page.click('#insertButton');
            await expect(page.locator('#valueInput')).toHaveValue('');
        });
    });

    test.describe('Toggling State', () => {
        test('should reset heap on toggle change', async ({ page }) => {
            await page.fill('#valueInput', '20');
            await page.click('#insertButton');
            await page.check('#heapToggle');
            await expect(page.locator('#heap')).toHaveText('');
        });

        test('should show notification on toggle complete', async ({ page }) => {
            await page.check('#heapToggle');
            const notification1 = await page.locator('#notification1');
            await expect(notification).toContainText('Heap type changed');
        });
    });

    test.describe('Edge Cases', () => {
        test('should not insert non-numeric values', async ({ page }) => {
            await page.fill('#valueInput', 'abc');
            await page.click('#insertButton');
            const heapDiv2 = await page.locator('#heap');
            await expect(heapDiv).toHaveText('');
        });

        test('should not insert negative values if not allowed', async ({ page }) => {
            await page.fill('#valueInput', '-5');
            await page.click('#insertButton');
            const heapDiv3 = await page.locator('#heap');
            await expect(heapDiv).toHaveText('');
        });
    });
});