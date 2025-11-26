import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abd0500-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Deque Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        const inputValue = await page.locator('#deque').inputValue();
        expect(inputValue).toBe('');
    });

    test.describe('Push Operations', () => {
        test('Push Front updates input value', async ({ page }) => {
            await page.click('text=Push Front');
            await page.fill('text=Enter a value to push front:', '10');
            await page.keyboard.press('Enter');
            const inputValue = await page.locator('#deque').inputValue();
            expect(inputValue).toBe('10');
        });

        test('Push Back updates input value', async ({ page }) => {
            await page.click('text=Push Back');
            await page.fill('text=Enter a value to push back:', '20');
            await page.keyboard.press('Enter');
            const inputValue = await page.locator('#deque').inputValue();
            expect(inputValue).toBe('20');
        });
    });

    test.describe('Pop Operations', () => {
        test.beforeEach(async ({ page }) => {
            await page.click('text=Push Front');
            await page.fill('text=Enter a value to push front:', '30');
            await page.keyboard.press('Enter');
            await page.click('text=Push Back');
            await page.fill('text=Enter a value to push back:', '40');
            await page.keyboard.press('Enter');
        });

        test('Pop Front updates input value', async ({ page }) => {
            await page.click('text=Pop Front');
            const inputValue = await page.locator('#deque').inputValue();
            expect(inputValue).toBe('30');
        });

        test('Pop Back updates input value', async ({ page }) => {
            await page.click('text=Pop Back');
            const inputValue = await page.locator('#deque').inputValue();
            expect(inputValue).toBe('40');
        });
    });

    test.describe('Peek Operations', () => {
        test.beforeEach(async ({ page }) => {
            await page.click('text=Push Front');
            await page.fill('text=Enter a value to push front:', '50');
            await page.keyboard.press('Enter');
            await page.click('text=Push Back');
            await page.fill('text=Enter a value to push back:', '60');
            await page.keyboard.press('Enter');
        });

        test('Peek Front shows the front item', async ({ page }) => {
            await page.click('text=Peek Front');
            const inputValue = await page.locator('#deque').inputValue();
            expect(inputValue).toBe('50');
        });

        test('Peek Back shows the back item', async ({ page }) => {
            await page.click('text=Peek Back');
            const inputValue = await page.locator('#deque').inputValue();
            expect(inputValue).toBe('60');
        });
    });

    test('Empty operation clears the deque', async ({ page }) => {
        await page.click('text=Push Front');
        await page.fill('text=Enter a value to push front:', '70');
        await page.keyboard.press('Enter');
        await page.click('text=Empty');
        const inputValue = await page.locator('#deque').inputValue();
        expect(inputValue).toBe('');
    });

    test('Pop operations on empty deque return null', async ({ page }) => {
        await page.click('text=Pop Front');
        const inputValue = await page.locator('#deque').inputValue();
        expect(inputValue).toBe('');
        
        await page.click('text=Pop Back');
        const inputValueBack = await page.locator('#deque').inputValue();
        expect(inputValueBack).toBe('');
    });

    test('Peek operations on empty deque return null', async ({ page }) => {
        await page.click('text=Peek Front');
        const inputValue = await page.locator('#deque').inputValue();
        expect(inputValue).toBe('');
        
        await page.click('text=Peek Back');
        const inputValueBack = await page.locator('#deque').inputValue();
        expect(inputValueBack).toBe('');
    });
});