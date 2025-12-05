import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24930e80-d1d2-11f0-a359-f3a4ddd3c298.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Deque Demonstration Tests', () => {
    
    test('should display initial state', async ({ page }) => {
        // Validate that the output is empty on initial load
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should add an element to the front of the deque', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('button[onclick="addFront()"]');

        const output1 = await page.locator('#output1').innerText();
        expect(output).toBe('Deque: 10');
    });

    test('should add an element to the rear of the deque', async ({ page }) => {
        await page.fill('#inputValue', '20');
        await page.click('button[onclick="addRear()"]');

        const output2 = await page.locator('#output2').innerText();
        expect(output).toBe('Deque: 20');
    });

    test('should remove an element from the front of the deque', async ({ page }) => {
        await page.fill('#inputValue', '30');
        await page.click('button[onclick="addFront()"]');
        await page.click('button[onclick="removeFront()"]');

        const output3 = await page.locator('#output3').innerText();
        expect(output).toContain('Removed: 30');
        expect(output).toContain('Deque: ');
    });

    test('should remove an element from the rear of the deque', async ({ page }) => {
        await page.fill('#inputValue', '40');
        await page.click('button[onclick="addRear()"]');
        await page.click('button[onclick="removeRear()"]');

        const output4 = await page.locator('#output4').innerText();
        expect(output).toContain('Removed: 40');
        expect(output).toContain('Deque: ');
    });

    test('should handle removing from an empty deque from front', async ({ page }) => {
        await page.click('button[onclick="removeFront()"]');

        const output5 = await page.locator('#output5').innerText();
        expect(output).toContain('Removed: Deque is empty. Nothing to remove.');
    });

    test('should handle removing from an empty deque from rear', async ({ page }) => {
        await page.click('button[onclick="removeRear()"]');

        const output6 = await page.locator('#output6').innerText();
        expect(output).toContain('Removed: Deque is empty. Nothing to remove.');
    });

    test('should clear input after adding an element', async ({ page }) => {
        await page.fill('#inputValue', '50');
        await page.click('button[onclick="addFront()"]');

        const inputValue = await page.locator('#inputValue').inputValue();
        expect(inputValue).toBe('');
    });

    test('should not add empty value to deque', async ({ page }) => {
        await page.click('button[onclick="addFront()"]');

        const output7 = await page.locator('#output7').innerText();
        expect(output).toBe('');
    });

    test('should not add empty value to rear of deque', async ({ page }) => {
        await page.click('button[onclick="addRear()"]');

        const output8 = await page.locator('#output8').innerText();
        expect(output).toBe('');
    });
});