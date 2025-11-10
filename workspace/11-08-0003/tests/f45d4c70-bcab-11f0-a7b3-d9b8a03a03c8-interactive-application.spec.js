import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f45d4c70-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Min/Max Heap Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
    });

    test('should validate input when add button is clicked', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('#addButton');

        // Simulate VALID_INPUT event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('VALID_INPUT'));
        });

        const feedback1 = await page.locator('#feedback1').innerText();
        expect(feedback).toBe('');
    });

    test('should show feedback for invalid input', async ({ page }) => {
        await page.fill('#inputValue', 'invalid');
        await page.click('#addButton');

        // Simulate INVALID_INPUT event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('INVALID_INPUT'));
        });

        const feedback2 = await page.locator('#feedback2').innerText();
        expect(feedback).toContain('Invalid input');
    });

    test('should add valid input to the heap', async ({ page }) => {
        await page.fill('#inputValue', '15');
        await page.click('#addButton');

        // Simulate VALID_INPUT event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('VALID_INPUT'));
        });

        // Simulate HEAP_UPDATED event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('HEAP_UPDATED'));
        });

        const heapNodes = await page.locator('.node').count();
        expect(heapNodes).toBe(1);
    });

    test('should handle multiple valid inputs', async ({ page }) => {
        const valuesToAdd = [5, 10, 15];

        for (const value of valuesToAdd) {
            await page.fill('#inputValue', value.toString());
            await page.click('#addButton');

            // Simulate VALID_INPUT event
            await page.evaluate(() => {
                window.dispatchEvent(new Event('VALID_INPUT'));
            });

            // Simulate HEAP_UPDATED event
            await page.evaluate(() => {
                window.dispatchEvent(new Event('HEAP_UPDATED'));
            });
        }

        const heapNodes1 = await page.locator('.node').count();
        expect(heapNodes).toBe(valuesToAdd.length);
    });

    test('should show feedback for invalid input and return to idle state', async ({ page }) => {
        await page.fill('#inputValue', 'invalid');
        await page.click('#addButton');

        // Simulate INVALID_INPUT event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('INVALID_INPUT'));
        });

        const feedback3 = await page.locator('#feedback3').innerText();
        expect(feedback).toContain('Invalid input');

        await page.fill('#inputValue', '20');
        await page.click('#addButton');

        // Simulate VALID_INPUT event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('VALID_INPUT'));
        });

        // Simulate HEAP_UPDATED event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('HEAP_UPDATED'));
        });

        const heapNodes2 = await page.locator('.node').count();
        expect(heapNodes).toBe(1);
    });

    test('should clear feedback when adding new input after invalid input', async ({ page }) => {
        await page.fill('#inputValue', 'invalid');
        await page.click('#addButton');

        // Simulate INVALID_INPUT event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('INVALID_INPUT'));
        });

        const feedback4 = await page.locator('#feedback4').innerText();
        expect(feedback).toContain('Invalid input');

        await page.fill('#inputValue', '25');
        await page.click('#addButton');

        // Simulate VALID_INPUT event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('VALID_INPUT'));
        });

        // Simulate HEAP_UPDATED event
        await page.evaluate(() => {
            window.dispatchEvent(new Event('HEAP_UPDATED'));
        });

        const newFeedback = await page.locator('#feedback').innerText();
        expect(newFeedback).toBe('');
    });
});