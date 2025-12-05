import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c933e52-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Union-Find (Disjoint Set) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Union-Find (Disjoint Set) Visualization');

        // Check that the union button is disabled by default
        const unionBtn = await page.locator('#unionBtn');
        expect(await unionBtn.isDisabled()).toBe(true);

        // Verify that the initial sets are displayed
        const sets = await page.locator('.set');
        expect(await sets.count()).toBe(5);
    });

    test('should allow selection of two sets', async ({ page }) => {
        const set0 = page.locator('.set[data-id="0"]');
        const set1 = page.locator('.set[data-id="1"]');
        const unionBtn = page.locator('#unionBtn');

        // Click on the first set
        await set0.click();
        expect(await set0.evaluate(el => el.classList.contains('selected'))).toBe(true);
        expect(await unionBtn.isDisabled()).toBe(false);

        // Click on the second set
        await set1.click();
        expect(await set1.evaluate(el => el.classList.contains('selected'))).toBe(true);
        expect(await unionBtn.isDisabled()).toBe(false);
    });

    test('should not allow selection of more than two sets', async ({ page }) => {
        const set0 = page.locator('.set[data-id="0"]');
        const set1 = page.locator('.set[data-id="1"]');
        const set2 = page.locator('.set[data-id="2"]');
        const unionBtn = page.locator('#unionBtn');

        // Select first set
        await set0.click();
        // Select second set
        await set1.click();
        // Try to select third set
        await set2.click();

        // Ensure only two sets are selected
        expect(await set0.evaluate(el => el.classList.contains('selected'))).toBe(true);
        expect(await set1.evaluate(el => el.classList.contains('selected'))).toBe(true);
        expect(await set2.evaluate(el => el.classList.contains('selected'))).toBe(false);
        expect(await unionBtn.isDisabled()).toBe(false);
    });

    test('should perform union operation and update the display', async ({ page }) => {
        const set0 = page.locator('.set[data-id="0"]');
        const set1 = page.locator('.set[data-id="1"]');
        const unionBtn = page.locator('#unionBtn');

        // Select two sets
        await set0.click();
        await set1.click();

        // Perform union
        await unionBtn.click();

        // Check that the union button is disabled after the operation
        expect(await unionBtn.isDisabled()).toBe(true);

        // Verify that the sets are updated
        const currentSets = await page.locator('#unionFind').innerHTML();
        expect(currentSets).toContain('Set: 0, 1');
    });

    test('should reset selection after union operation', async ({ page }) => {
        const set0 = page.locator('.set[data-id="0"]');
        const set1 = page.locator('.set[data-id="1"]');
        const unionBtn = page.locator('#unionBtn');

        // Select two sets
        await set0.click();
        await set1.click();
        await unionBtn.click();

        // Ensure both sets are no longer selected
        expect(await set0.evaluate(el => el.classList.contains('selected'))).toBe(false);
        expect(await set1.evaluate(el => el.classList.contains('selected'))).toBe(false);
    });

    test('should handle multiple unions correctly', async ({ page }) => {
        const set0 = page.locator('.set[data-id="0"]');
        const set1 = page.locator('.set[data-id="1"]');
        const set2 = page.locator('.set[data-id="2"]');
        const unionBtn = page.locator('#unionBtn');

        // First union
        await set0.click();
        await set1.click();
        await unionBtn.click();

        // Second union
        await set1.click();
        await set2.click();
        await unionBtn.click();

        // Verify that all sets are correctly updated
        const currentSets = await page.locator('#unionFind').innerHTML();
        expect(currentSets).toContain('Set: 0, 1, 2');
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        const unionBtn = page.locator('#unionBtn');

        // Click union button without selecting sets
        await unionBtn.click();
        // Check for any console errors
        const consoleErrors = await page.evaluate(() => {
            return window.console.error.calls;
        });
        expect(consoleErrors.length).toBe(0);
    });
});