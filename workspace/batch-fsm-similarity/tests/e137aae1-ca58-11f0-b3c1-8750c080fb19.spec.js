import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e137aae1-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Heap Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        const status = await page.locator('#status').innerText();
        expect(status).toBe('');
    });

    test('Generate Random Array transitions to GeneratingArray', async ({ page }) => {
        await page.click('button:has-text("Generate Random Array")');
        const status = await page.locator('#status').innerText();
        expect(status).toBe('Array generated. Click "Sort with Heap Sort" to sort.');
    });

    test('Clicking Generate again does not change state', async ({ page }) => {
        await page.click('button:has-text("Generate Random Array")');
        await page.click('button:has-text("Generate Random Array")');
        const status = await page.locator('#status').innerText();
        expect(status).toBe('Array generated. Click "Sort with Heap Sort" to sort.');
    });

    test('Sort with Heap Sort transitions to Sorting', async ({ page }) => {
        await page.click('button:has-text("Generate Random Array")');
        await page.click('button:has-text("Sort with Heap Sort")');
        const status = await page.locator('#status').innerText();
        expect(status).toContain('Sorting array...');
    });

    test('Sorting updates status during swapping', async ({ page }) => {
        await page.click('button:has-text("Generate Random Array")');
        await page.click('button:has-text("Sort with Heap Sort")');
        await page.waitForTimeout(1000); // Wait for sorting to start
        const status = await page.locator('#status').innerText();
        expect(status).toContain('Swapping');
    });

    test('Sorting completes and updates status', async ({ page }) => {
        await page.click('button:has-text("Generate Random Array")');
        await page.click('button:has-text("Sort with Heap Sort")');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        const status = await page.locator('#status').innerText();
        expect(status).toBe('Array sorted!');
    });

    test('Cannot sort again until a new array is generated', async ({ page }) => {
        await page.click('button:has-text("Generate Random Array")');
        await page.click('button:has-text("Sort with Heap Sort")');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        await page.click('button:has-text("Sort with Heap Sort")');
        const status = await page.locator('#status').innerText();
        expect(status).toBe('Array sorted!'); // Should not change state
    });

    test('Check visual feedback for generated array', async ({ page }) => {
        await page.click('button:has-text("Generate Random Array")');
        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Ensure bars are displayed
    });

    test('Check array display after sorting', async ({ page }) => {
        await page.click('button:has-text("Generate Random Array")');
        await page.click('button:has-text("Sort with Heap Sort")');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Ensure bars are still displayed
    });
});