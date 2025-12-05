import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b52090-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Deque Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Deque application page before each test
        await page.goto(baseUrl);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify that the page loads correctly and the initial state is as expected
        const title = await page.title();
        expect(title).toBe('Deque Example');

        const dequeContainer = await page.locator('#deque');
        const message = await page.locator('#message');

        // Check that the deque is empty initially
        expect(await dequeContainer.innerHTML()).toBe('');
        expect(await message.innerHTML()).toBe('');
    });

    test('should add an item to the front of the deque', async ({ page }) => {
        // Test adding an item to the front of the deque
        await page.fill('#inputValue', 'Front Item');
        await page.click('button:has-text("Add Front")');

        const dequeItems = await page.locator('.deque-item');
        expect(await dequeItems.count()).toBe(1);
        expect(await dequeItems.nth(0).innerText()).toBe('Front Item');
    });

    test('should add an item to the back of the deque', async ({ page }) => {
        // Test adding an item to the back of the deque
        await page.fill('#inputValue', 'Back Item');
        await page.click('button:has-text("Add Back")');

        const dequeItems = await page.locator('.deque-item');
        expect(await dequeItems.count()).toBe(1);
        expect(await dequeItems.nth(0).innerText()).toBe('Back Item');
    });

    test('should remove an item from the front of the deque', async ({ page }) => {
        // Test removing an item from the front of the deque
        await page.fill('#inputValue', 'First Item');
        await page.click('button:has-text("Add Front")');
        await page.click('button:has-text("Remove Front")');

        const message = await page.locator('#message');
        expect(await message.innerText()).toBe('Removed: First Item');

        const dequeItems = await page.locator('.deque-item');
        expect(await dequeItems.count()).toBe(0);
    });

    test('should remove an item from the back of the deque', async ({ page }) => {
        // Test removing an item from the back of the deque
        await page.fill('#inputValue', 'Second Item');
        await page.click('button:has-text("Add Back")');
        await page.click('button:has-text("Remove Back")');

        const message = await page.locator('#message');
        expect(await message.innerText()).toBe('Removed: Second Item');

        const dequeItems = await page.locator('.deque-item');
        expect(await dequeItems.count()).toBe(0);
    });

    test('should show message when removing from an empty deque', async ({ page }) => {
        // Test removing from an empty deque
        await page.click('button:has-text("Remove Front")');
        const message = await page.locator('#message');
        expect(await message.innerText()).toBe('Deque is empty');

        await page.click('button:has-text("Remove Back")');
        expect(await message.innerText()).toBe('Deque is empty');
    });

    test('should not add empty values to the deque', async ({ page }) => {
        // Test that empty values cannot be added
        await page.click('button:has-text("Add Front")');
        await page.click('button:has-text("Add Back")');

        const dequeItems = await page.locator('.deque-item');
        expect(await dequeItems.count()).toBe(0);
    });
});