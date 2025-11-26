import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba52ce0-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Heap (Min/Max) Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        const heapContent = await page.locator('#heap').innerHTML();
        expect(heapContent).toBe('');
    });

    test('Add Heap Element transitions from Idle to Has Elements', async ({ page }) => {
        await page.fill('#heap-size', '3'); // Set heap size
        await page.click('#add-heap-element'); // Add first element

        const heapContent = await page.locator('#heap').innerHTML();
        expect(heapContent).not.toBe('');
        expect(await page.locator('#heap').count()).toBe(1); // Check one element added
    });

    test('Add Heap Element multiple times stays in Has Elements', async ({ page }) => {
        await page.fill('#heap-size', '3');
        await page.click('#add-heap-element'); // Add first element
        await page.click('#add-heap-element'); // Add second element

        const heapContent = await page.locator('#heap').innerHTML();
        expect(await page.locator('#heap').count()).toBe(2); // Check two elements added
    });

    test('Add Heap Element when full transitions to Heap Full', async ({ page }) => {
        await page.fill('#heap-size', '2'); // Set heap size to 2
        await page.click('#add-heap-element'); // Add first element
        await page.click('#add-heap-element'); // Add second element
        await page.click('#add-heap-element'); // Attempt to add third element

        const alertMessage = await page.waitForEvent('dialog');
        expect(alertMessage.message()).toBe('Heap is full. Cannot add more elements.');
        await alertMessage.dismiss(); // Dismiss the alert

        const heapContent = await page.locator('#heap').innerHTML();
        expect(await page.locator('#heap').count()).toBe(2); // Check still two elements
    });

    test('Clear Heap transitions from Has Elements to Idle', async ({ page }) => {
        await page.fill('#heap-size', '3');
        await page.click('#add-heap-element'); // Add first element
        await page.click('#clear-heap'); // Clear heap

        const heapContent = await page.locator('#heap').innerHTML();
        expect(heapContent).toBe(''); // Check heap is cleared
    });

    test('Clear Heap from Heap Full state transitions to Idle', async ({ page }) => {
        await page.fill('#heap-size', '2'); // Set heap size to 2
        await page.click('#add-heap-element'); // Add first element
        await page.click('#add-heap-element'); // Add second element
        await page.click('#add-heap-element'); // Attempt to add third element

        const alertMessage = await page.waitForEvent('dialog');
        expect(alertMessage.message()).toBe('Heap is full. Cannot add more elements.');
        await alertMessage.dismiss(); // Dismiss the alert

        await page.click('#clear-heap'); // Clear heap

        const heapContent = await page.locator('#heap').innerHTML();
        expect(heapContent).toBe(''); // Check heap is cleared
    });
});