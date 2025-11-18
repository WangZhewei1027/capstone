import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0002-playwright-examples/html/31c8c4e0-c459-11f0-85c2-7ddd15762b1b.html';

test.describe('Interactive Heap Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('');
        const heapContainer = await page.locator('#heap-container').innerHTML();
        expect(heapContainer).toBe('');
    });

    test('should insert a value and transition to inserting state', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('#insertBtn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Current Heap: 10');
        const heapNodeCount = await page.locator('.heap-node').count();
        expect(heapNodeCount).toBe(1);
    });

    test('should insert multiple values and maintain heap property', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('#insertBtn');
        await page.fill('#inputValue', '5');
        await page.click('#insertBtn');
        await page.fill('#inputValue', '20');
        await page.click('#insertBtn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Current Heap: 5, 10, 20');
        const heapNodeCount = await page.locator('.heap-node').count();
        expect(heapNodeCount).toBe(3);
    });

    test('should delete root and transition to deleting state', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('#insertBtn');
        await page.fill('#inputValue', '5');
        await page.click('#insertBtn');
        await page.fill('#inputValue', '20');
        await page.click('#insertBtn');

        await page.click('#deleteBtn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Deleted Root: 5');
        const heapNodeCount = await page.locator('.heap-node').count();
        expect(heapNodeCount).toBe(2);
        expect(await page.locator('#output').innerText()).toContain('Current Heap: 10, 20');
    });

    test('should handle delete on empty heap gracefully', async ({ page }) => {
        await page.click('#deleteBtn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).not.toContain('Deleted Root:');
        expect(await page.locator('#heap-container').innerHTML()).toBe('');
    });

    test('should not insert invalid values', async ({ page }) => {
        await page.fill('#inputValue', 'abc');
        await page.click('#insertBtn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe(''); // No change in output
        const heapNodeCount = await page.locator('.heap-node').count();
        expect(heapNodeCount).toBe(0);
    });

    test('should insert and delete in sequence', async ({ page }) => {
        await page.fill('#inputValue', '15');
        await page.click('#insertBtn');
        await page.fill('#inputValue', '10');
        await page.click('#insertBtn');
        await page.fill('#inputValue', '30');
        await page.click('#insertBtn');

        await page.click('#deleteBtn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Deleted Root: 10');
        expect(await page.locator('#output').innerText()).toContain('Current Heap: 15, 30');
    });
    
    test('should insert and delete multiple times', async ({ page }) => {
        await page.fill('#inputValue', '5');
        await page.click('#insertBtn');
        await page.fill('#inputValue', '3');
        await page.click('#insertBtn');
        await page.fill('#inputValue', '8');
        await page.click('#insertBtn');

        await page.click('#deleteBtn');
        await page.click('#deleteBtn');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('Current Heap: 8');
        expect(outputText).toContain('Deleted Root: 3');
    });
});