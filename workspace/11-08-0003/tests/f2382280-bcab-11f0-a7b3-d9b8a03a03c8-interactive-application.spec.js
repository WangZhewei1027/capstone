import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f2382280-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Hash Map Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state and visualize hash map', async ({ page }) => {
        // Verify the initial state is idle and the hash map is visualized
        const feedback = await page.locator('#feedback').textContent();
        expect(feedback).toBe('');
        const hashMap = await page.locator('#hashMap').count();
        expect(hashMap).toBe(0); // Initially, no slots should be filled
    });

    test('should transition to adding state when adding a key-value pair', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button:has-text("Add to Hash Map")');

        // Verify the feedback message and hash map state
        const feedback1 = await page.locator('#feedback1').textContent();
        expect(feedback).toContain('Added'); // Assuming feedback contains 'Added' on success

        const hashMapSlots = await page.locator('.hash-map .slot').count();
        expect(hashMapSlots).toBeGreaterThan(0); // At least one slot should be filled
    });

    test('should transition back to idle state after adding', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button:has-text("Add to Hash Map")');

        // Wait for the feedback to ensure the state has transitioned back to idle
        await page.waitForTimeout(1000); // Adjust timeout as necessary
        const feedback2 = await page.locator('#feedback2').textContent();
        expect(feedback).toContain('Added');
    });

    test('should transition to retrieving state when retrieving a value', async ({ page }) => {
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button:has-text("Add to Hash Map")');

        await page.fill('#key', 'testKey');
        await page.click('button:has-text("Retrieve Value")');

        // Verify the feedback message and retrieved value
        const feedback3 = await page.locator('#feedback3').textContent();
        expect(feedback).toContain('Retrieved'); // Assuming feedback contains 'Retrieved' on success
    });

    test('should handle key not found scenario', async ({ page }) => {
        await page.fill('#key', 'nonExistentKey');
        await page.click('button:has-text("Retrieve Value")');

        // Verify the feedback message for key not found
        const feedback4 = await page.locator('#feedback4').textContent();
        expect(feedback).toContain('Key not found'); // Assuming feedback contains 'Key not found'
    });

    test('should maintain hash map integrity after multiple operations', async ({ page }) => {
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('button:has-text("Add to Hash Map")');

        await page.fill('#key', 'key2');
        await page.fill('#value', 'value2');
        await page.click('button:has-text("Add to Hash Map")');

        await page.fill('#key', 'key1');
        await page.click('button:has-text("Retrieve Value")');
        const feedback11 = await page.locator('#feedback').textContent();
        expect(feedback1).toContain('Retrieved');

        await page.fill('#key', 'key2');
        await page.click('button:has-text("Retrieve Value")');
        const feedback21 = await page.locator('#feedback').textContent();
        expect(feedback2).toContain('Retrieved');
    });

    test.afterEach(async ({ page }) => {
        // Reset the application state if necessary
        await page.reload();
    });
});