import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1370ea0-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Min/Max Heap Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state', async ({ page }) => {
        const heapOutput = await page.locator('#heapOutput').textContent();
        expect(heapOutput).toBe('[]'); // Heap should be empty
    });

    test('should insert a number and transition to Idle state', async ({ page }) => {
        await page.fill('#numberInput', '10');
        await page.click('button[onclick="insertNumber()"]');

        // Verify heap state after insertion
        const heapOutput = await page.locator('#heapOutput').textContent();
        expect(heapOutput).toBe('[10]'); // Heap should contain the inserted number
    });

    test('should insert multiple numbers and verify heap structure', async ({ page }) => {
        await page.fill('#numberInput', '20');
        await page.click('button[onclick="insertNumber()"]');
        await page.fill('#numberInput', '15');
        await page.click('button[onclick="insertNumber()"]');

        // Verify heap state after multiple insertions
        const heapOutput = await page.locator('#heapOutput').textContent();
        expect(heapOutput).toBe('[15, 20]'); // Min-Heap structure
    });

    test('should remove the minimum value and update heap', async ({ page }) => {
        await page.fill('#numberInput', '30');
        await page.click('button[onclick="insertNumber()"]');
        await page.fill('#numberInput', '10');
        await page.click('button[onclick="insertNumber()"]');
        await page.fill('#numberInput', '20');
        await page.click('button[onclick="insertNumber()"]');

        await page.click('button[onclick="removeMin()"]');

        // Verify heap state after removing min
        const heapOutput = await page.locator('#heapOutput').textContent();
        expect(heapOutput).toBe('[20, 30]'); // Min-Heap structure after removing min
    });

    test('should remove the maximum value and update heap', async ({ page }) => {
        await page.fill('#numberInput', '30');
        await page.click('button[onclick="insertNumber()"]');
        await page.fill('#numberInput', '10');
        await page.click('button[onclick="insertNumber()"]');
        await page.fill('#numberInput', '20');
        await page.click('button[onclick="insertNumber()"]');

        await page.click('button[onclick="removeMax()"]');

        // Verify heap state after removing max
        const heapOutput = await page.locator('#heapOutput').textContent();
        expect(heapOutput).toBe('[10, 20]'); // Min-Heap structure after removing max
    });

    test('should not remove min from an empty heap', async ({ page }) => {
        await page.click('button[onclick="removeMin()"]');

        // Verify heap state remains empty
        const heapOutput = await page.locator('#heapOutput').textContent();
        expect(heapOutput).toBe('[]'); // Heap should still be empty
    });

    test('should not remove max from an empty heap', async ({ page }) => {
        await page.click('button[onclick="removeMax()"]');

        // Verify heap state remains empty
        const heapOutput = await page.locator('#heapOutput').textContent();
        expect(heapOutput).toBe('[]'); // Heap should still be empty
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#numberInput', 'invalid');
        await page.click('button[onclick="insertNumber()"]');

        // Verify heap state remains unchanged
        const heapOutput = await page.locator('#heapOutput').textContent();
        expect(heapOutput).toBe('[]'); // Heap should still be empty
    });
});