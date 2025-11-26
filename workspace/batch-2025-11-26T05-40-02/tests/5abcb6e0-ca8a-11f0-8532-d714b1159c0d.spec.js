import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abcb6e0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Stack Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the stack application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Verify that the stack is initially empty
        const stack = await page.locator('#stack');
        const stackItems = await stack.locator('.stack-item').count();
        expect(stackItems).toBe(0);
    });

    test('Add an element to the stack', async ({ page }) => {
        // Add an element to the stack and verify the transition to Stack Modified
        await page.fill('input#input', 'Element 1'); // Assuming there's an input field
        await page.click('#add-btn');

        const stack = await page.locator('#stack');
        const stackItems = await stack.locator('.stack-item').count();
        expect(stackItems).toBe(1); // One item should be added
        expect(await stack.locator('.stack-item').nth(0).textContent()).toBe('Element 1');
    });

    test('Add multiple elements to the stack', async ({ page }) => {
        // Add multiple elements to the stack and verify
        await page.fill('input#input', 'Element 1');
        await page.click('#add-btn');

        await page.fill('input#input', 'Element 2');
        await page.click('#add-btn');

        const stack = await page.locator('#stack');
        const stackItems = await stack.locator('.stack-item').count();
        expect(stackItems).toBe(2); // Two items should be added
        expect(await stack.locator('.stack-item').nth(0).textContent()).toBe('Element 1');
        expect(await stack.locator('.stack-item').nth(1).textContent()).toBe('Element 2');
    });

    test('Remove all elements from the stack', async ({ page }) => {
        // Remove all elements and verify the transition back to Idle
        await page.fill('input#input', 'Element 1');
        await page.click('#add-btn');
        await page.fill('input#input', 'Element 2');
        await page.click('#add-btn');

        await page.click('#remove-btn');

        const stack = await page.locator('#stack');
        const stackItems = await stack.locator('.stack-item').count();
        expect(stackItems).toBe(0); // Stack should be empty
    });

    test('Edge case: Add empty element to the stack', async ({ page }) => {
        // Attempt to add an empty element and verify nothing changes
        await page.fill('input#input', ''); // Empty input
        await page.click('#add-btn');

        const stack = await page.locator('#stack');
        const stackItems = await stack.locator('.stack-item').count();
        expect(stackItems).toBe(0); // Stack should still be empty
    });

    test('Edge case: Remove from empty stack', async ({ page }) => {
        // Attempt to remove from an empty stack and verify no errors occur
        await page.click('#remove-btn');

        const stack = await page.locator('#stack');
        const stackItems = await stack.locator('.stack-item').count();
        expect(stackItems).toBe(0); // Stack should still be empty
    });
});