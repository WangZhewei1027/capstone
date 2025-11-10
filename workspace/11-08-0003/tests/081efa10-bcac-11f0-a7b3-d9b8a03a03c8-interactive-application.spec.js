import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/081efa10-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Radix Sort Visualization Application', () => {
    test('should start in idle state and clear message on load', async ({ page }) => {
        const message = await page.locator('#message').textContent();
        expect(message).toBe('');
    });

    test('should transition to validatingInput state on RUN_BUTTON_CLICK with valid input', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,4,1,5');
        await page.click('#runButton');

        // Check if the message is cleared and input is validated
        const message1 = await page.locator('#message1').textContent();
        expect(message).toBe('');
    });

    test('should transition to idle state on RUN_BUTTON_CLICK with invalid input', async ({ page }) => {
        await page.fill('#arrayInput', 'invalid,input');
        await page.click('#runButton');

        // Check if the message is cleared and input is validated
        const message2 = await page.locator('#message2').textContent();
        expect(message).toBe('');
    });

    test('should transition to sorting state after VALID_INPUT', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,4,1,5');
        await page.click('#runButton');

        // Simulate VALID_INPUT event
        await page.evaluate(() => {
            document.getElementById('message').textContent = 'Valid input';
        });

        // Check if sorting has started
        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0);
    });

    test('should complete sorting and transition to done state', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,4,1,5');
        await page.click('#runButton');

        // Wait for sorting to complete
        await page.waitForTimeout(6000); // Adjust timeout based on sorting duration

        // Check if completion message is displayed
        const message3 = await page.locator('#message3').textContent();
        expect(message).toContain('Sorting complete');
    });

    test('should reset input and transition back to idle state on RUN_BUTTON_CLICK after done', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,4,1,5');
        await page.click('#runButton');

        // Wait for sorting to complete
        await page.waitForTimeout(6000); // Adjust timeout based on sorting duration

        // Click the run button again to reset
        await page.click('#runButton');

        // Check if the input field is cleared
        const inputValue = await page.locator('#arrayInput').inputValue();
        expect(inputValue).toBe('');
    });

    test('should handle edge case with empty input', async ({ page }) => {
        await page.fill('#arrayInput', '');
        await page.click('#runButton');

        // Check if the message indicates invalid input
        const message4 = await page.locator('#message4').textContent();
        expect(message).toContain('Invalid input');
    });

    test('should handle edge case with single number input', async ({ page }) => {
        await page.fill('#arrayInput', '5');
        await page.click('#runButton');

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Shorter wait for single number

        // Check if the completion message is displayed
        const message5 = await page.locator('#message5').textContent();
        expect(message).toContain('Sorting complete');
    });
});