import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1a650430-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Sliding Window Technique Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const result = await page.locator('#result').innerText();
        expect(result).toBe('');
        const visualizationChildren = await page.locator('#visualization').count();
        expect(visualizationChildren).toBe(0);
    });

    test('should transition to calculating state on button click', async ({ page }) => {
        await page.fill('#numbers', '1,2,3,4,5');
        await page.fill('#windowSize', '3');
        await page.click('#calculateBtn');

        // Check if visualization is initialized
        const visualizationChildren1 = await page.locator('#visualization .bar').count();
        expect(visualizationChildren).toBe(5); // 5 bars for 5 numbers
    });

    test('should transition to done state after animation completes', async ({ page }) => {
        await page.fill('#numbers', '1,2,3,4,5');
        await page.fill('#windowSize', '3');
        await page.click('#calculateBtn');

        // Simulate animation complete event
        await page.waitForTimeout(1000); // Wait for animation to complete (adjust as necessary)
        
        // Check if result is displayed
        const result1 = await page.locator('#result1').innerText();
        expect(result).toContain('Max Sum:'); // Assuming the result contains 'Max Sum:'
    });

    test('should clear input fields and visualization on transition to done state', async ({ page }) => {
        await page.fill('#numbers', '1,2,3,4,5');
        await page.fill('#windowSize', '3');
        await page.click('#calculateBtn');
        
        // Simulate animation complete event
        await page.waitForTimeout(1000); // Wait for animation to complete (adjust as necessary)

        // Transition back to idle state
        await page.click('#calculateBtn');

        // Check if input fields are cleared
        const numbersInputValue = await page.locator('#numbers').inputValue();
        const windowSizeValue = await page.locator('#windowSize').inputValue();
        expect(numbersInputValue).toBe('');
        expect(windowSizeValue).toBe('3'); // window size should remain unchanged
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.fill('#numbers', '');
        await page.fill('#windowSize', '3');
        await page.click('#calculateBtn');

        // Check if no bars are created
        const visualizationChildren2 = await page.locator('#visualization .bar').count();
        expect(visualizationChildren).toBe(0);
        const result2 = await page.locator('#result2').innerText();
        expect(result).toBe(''); // No result should be displayed
    });

    test('should handle invalid number input gracefully', async ({ page }) => {
        await page.fill('#numbers', 'a,b,c');
        await page.fill('#windowSize', '3');
        await page.click('#calculateBtn');

        // Check if no bars are created
        const visualizationChildren3 = await page.locator('#visualization .bar').count();
        expect(visualizationChildren).toBe(0);
        const result3 = await page.locator('#result3').innerText();
        expect(result).toBe(''); // No result should be displayed
    });
});