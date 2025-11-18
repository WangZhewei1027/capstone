import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0001/html/cda85ef0-c465-11f0-af61-192d6dbad219.html';

test.describe('Interactive Heap Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Validate the initial state of the application
        const heapOutput = await page.locator('#heapOutput').innerText();
        expect(heapOutput).toBe('');
    });

    test('should insert a value into the heap', async ({ page }) => {
        // Test inserting a value into the heap
        await page.fill('#value', '10');
        await page.click('#insert');

        const heapOutput1 = await page.locator('#heapOutput1').innerText();
        expect(heapOutput).toBe('');
        
        const heapVisual = await page.locator('#heapVisual').locator('.node');
        expect(await heapVisual.count()).toBe(1);
        expect(await heapVisual.nth(0).innerText()).toBe('10');
    });

    test('should remove the root from the heap', async ({ page }) => {
        // Insert a value and then remove it
        await page.fill('#value', '20');
        await page.click('#insert');
        
        await page.fill('#value', '10');
        await page.click('#insert');

        await page.click('#remove');

        const heapOutput2 = await page.locator('#heapOutput2').innerText();
        expect(heapOutput).toBe('Removed: 10');

        const heapVisual1 = await page.locator('#heapVisual1').locator('.node');
        expect(await heapVisual.count()).toBe(1);
        expect(await heapVisual.nth(0).innerText()).toBe('20');
    });

    test('should handle removing from an empty heap', async ({ page }) => {
        // Test removing from an empty heap
        await page.click('#remove');

        const heapOutput3 = await page.locator('#heapOutput3').innerText();
        expect(heapOutput).toBe('Heap is empty.');
    });

    test('should insert multiple values and maintain heap structure', async ({ page }) => {
        // Insert multiple values and check the heap structure
        await page.fill('#value', '30');
        await page.click('#insert');

        await page.fill('#value', '20');
        await page.click('#insert');

        await page.fill('#value', '10');
        await page.click('#insert');

        const heapVisual2 = await page.locator('#heapVisual2').locator('.node');
        expect(await heapVisual.count()).toBe(3);
        expect(await heapVisual.nth(0).innerText()).toBe('10'); // Root should be the smallest value
        expect(await heapVisual.nth(1).innerText()).toBe('30');
        expect(await heapVisual.nth(2).innerText()).toBe('20');
    });

    test('should clear input value after insertion', async ({ page }) => {
        // Validate that the input field is cleared after insertion
        await page.fill('#value', '15');
        await page.click('#insert');

        const inputValue = await page.locator('#value').inputValue();
        expect(inputValue).toBe('');
    });

    test('should maintain visual feedback on state transitions', async ({ page }) => {
        // Insert a value and check visual feedback
        await page.fill('#value', '25');
        await page.click('#insert');

        const heapVisual3 = await page.locator('#heapVisual3').locator('.node');
        expect(await heapVisual.count()).toBe(1);
        expect(await heapVisual.nth(0).innerText()).toBe('25');

        await page.click('#remove');
        const heapOutput4 = await page.locator('#heapOutput4').innerText();
        expect(heapOutput).toBe('Removed: 25');

        expect(await heapVisual.count()).toBe(0); // Heap should be empty
    });
});