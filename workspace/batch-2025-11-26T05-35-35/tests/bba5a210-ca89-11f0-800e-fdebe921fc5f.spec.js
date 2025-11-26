import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba5a210-ca89-11f0-800e-fdebe921fc5f.html';

test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
});

test.describe('Priority Queue Application Tests', () => {
    
    test('should display the initial state with empty queue', async ({ page }) => {
        // Validate that the queue is initially empty
        const queueContent = await page.locator('#queue').innerHTML();
        expect(queueContent).toBe('');
    });

    test('should add an item with valid priority', async ({ page }) => {
        // Input a valid priority and submit the form
        await page.fill('#priority', '5');
        await page.click('button[type="submit"]');

        // Validate that the item is added to the queue
        const queueContent = await page.locator('#queue').innerHTML();
        expect(queueContent).toContain('5 (Priority: 5)');
    });

    test('should show multiple items in the correct order', async ({ page }) => {
        // Add multiple items with different priorities
        await page.fill('#priority', '3');
        await page.click('button[type="submit"]');
        await page.fill('#priority', '1');
        await page.click('button[type="submit"]');
        await page.fill('#priority', '2');
        await page.click('button[type="submit"]');

        // Validate that the items are displayed in the correct order
        const queueContent = await page.locator('#queue').innerHTML();
        expect(queueContent).toContain('1 (Priority: 1)');
        expect(queueContent).toContain('2 (Priority: 2)');
        expect(queueContent).toContain('3 (Priority: 3)');
    });

    test('should alert when priority is out of range', async ({ page }) => {
        // Input an invalid priority and submit the form
        await page.fill('#priority', '11');
        await page.click('button[type="submit"]');

        // Validate that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Priority must be between 1 and 10');
            await dialog.dismiss();
        });
    });

    test('should alert when priority is below range', async ({ page }) => {
        // Input an invalid priority and submit the form
        await page.fill('#priority', '0');
        await page.click('button[type="submit"]');

        // Validate that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Priority must be between 1 and 10');
            await dialog.dismiss();
        });
    });

    test('should not add item when priority is invalid', async ({ page }) => {
        // Input an invalid priority and submit the form
        await page.fill('#priority', '0');
        await page.click('button[type="submit"]');

        // Validate that the queue remains empty
        const queueContent = await page.locator('#queue').innerHTML();
        expect(queueContent).toBe('');
    });

    test('should clear the input field after submission', async ({ page }) => {
        // Input a valid priority and submit the form
        await page.fill('#priority', '5');
        await page.click('button[type="submit"]');

        // Validate that the input field is cleared
        const inputValue = await page.locator('#priority').inputValue();
        expect(inputValue).toBe('');
    });
});