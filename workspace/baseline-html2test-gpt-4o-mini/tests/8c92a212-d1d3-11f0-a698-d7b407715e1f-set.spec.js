import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c92a212-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Set Example Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the initial state of the application
        const setDisplay = await page.locator('#setDisplay');
        await expect(setDisplay).toHaveText('Set is empty.');
    });

    test('should add a unique value to the set', async ({ page }) => {
        // Test adding a value to the set
        const input = await page.locator('#setInput');
        const addButton = await page.locator('button', { hasText: 'Add to Set' });

        await input.fill('Value1');
        await addButton.click();

        const setDisplay = await page.locator('#setDisplay');
        await expect(setDisplay).toHaveText('Value1');
    });

    test('should not add duplicate values to the set', async ({ page }) => {
        // Test adding a duplicate value
        const input = await page.locator('#setInput');
        const addButton = await page.locator('button', { hasText: 'Add to Set' });

        await input.fill('Value1');
        await addButton.click();
        await input.fill('Value1'); // Attempt to add duplicate
        await addButton.click();

        const setDisplay = await page.locator('#setDisplay');
        await expect(setDisplay).toHaveText('Value1'); // Should still only show 'Value1'
    });

    test('should remove a value from the set', async ({ page }) => {
        // Test removing a value from the set
        const input = await page.locator('#setInput');
        const addButton = await page.locator('button', { hasText: 'Add to Set' });
        const removeButton = await page.locator('button', { hasText: 'Remove from Set' });

        await input.fill('Value1');
        await addButton.click();
        await input.fill('Value1');
        await removeButton.click();

        const setDisplay = await page.locator('#setDisplay');
        await expect(setDisplay).toHaveText('Set is empty.');
    });

    test('should alert when trying to remove a non-existent value', async ({ page }) => {
        // Test alert when trying to remove a value not in the set
        const input = await page.locator('#setInput');
        const removeButton = await page.locator('button', { hasText: 'Remove from Set' });

        await input.fill('NonExistentValue');
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            removeButton.click(),
        ]);

        await expect(alert.message()).toBe('Value not found in set.');
        await alert.dismiss();
    });

    test('should clear the set', async ({ page }) => {
        // Test clearing the set
        const input = await page.locator('#setInput');
        const addButton = await page.locator('button', { hasText: 'Add to Set' });
        const clearButton = await page.locator('button', { hasText: 'Clear Set' });

        await input.fill('Value1');
        await addButton.click();
        await clearButton.click();

        const setDisplay = await page.locator('#setDisplay');
        await expect(setDisplay).toHaveText('Set is empty.');
    });

    test('should handle multiple values correctly', async ({ page }) => {
        // Test adding multiple unique values
        const input = await page.locator('#setInput');
        const addButton = await page.locator('button', { hasText: 'Add to Set' });

        await input.fill('Value1');
        await addButton.click();
        await input.fill('Value2');
        await addButton.click();
        await input.fill('Value3');
        await addButton.click();

        const setDisplay = await page.locator('#setDisplay');
        await expect(setDisplay).toHaveText('Value1, Value2, Value3');
    });
});