import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1b14cc30-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Two Pointers Technique Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
    });

    test('should add number and transition to updating_visual state', async ({ page }) => {
        await page.fill('#numberInput', '5');
        await page.click('#addNumber');
        
        const bars = await page.locator('.bar').count();
        expect(bars).toBe(1); // Expect one bar to be added
    });

    test('should allow multiple numbers to be added', async ({ page }) => {
        await page.fill('#numberInput', '5');
        await page.click('#addNumber');
        await page.fill('#numberInput', '10');
        await page.click('#addNumber');

        const bars1 = await page.locator('.bar').count();
        expect(bars).toBe(2); // Expect two bars to be added
    });

    test('should show feedback when starting with less than two numbers', async ({ page }) => {
        await page.click('#start');

        const feedback1 = await page.locator('#feedback1').innerText();
        expect(feedback).toBe('Please add at least two numbers!');
    });

    test('should start animation when two or more numbers are added', async ({ page }) => {
        await page.fill('#numberInput', '5');
        await page.click('#addNumber');
        await page.fill('#numberInput', '10');
        await page.click('#addNumber');

        await page.click('#start');

        const feedback2 = await page.locator('#feedback2').innerText();
        expect(feedback).toBe(''); // Feedback should be cleared
        // Additional checks can be added here to verify animation
    });

    test('should reset to idle state when reset button is clicked', async ({ page }) => {
        await page.fill('#numberInput', '5');
        await page.click('#addNumber');
        await page.click('#reset');

        const bars2 = await page.locator('.bar').count();
        expect(bars).toBe(0); // Expect no bars after reset
        const feedback3 = await page.locator('#feedback3').innerText();
        expect(feedback).toBe(''); // Feedback should also be cleared
    });

    test('should handle multiple resets correctly', async ({ page }) => {
        await page.fill('#numberInput', '5');
        await page.click('#addNumber');
        await page.fill('#numberInput', '10');
        await page.click('#addNumber');
        await page.click('#reset');
        await page.click('#reset'); // Reset again

        const bars3 = await page.locator('.bar').count();
        expect(bars).toBe(0); // Expect no bars after multiple resets
    });

    test('should complete animation and transition to done state', async ({ page }) => {
        await page.fill('#numberInput', '5');
        await page.click('#addNumber');
        await page.fill('#numberInput', '10');
        await page.click('#addNumber');

        await page.click('#start');

        // Wait for the animation to complete
        await page.waitForTimeout(2000); // Adjust timeout as necessary for animation duration

        const feedback4 = await page.locator('#feedback4').innerText();
        expect(feedback).toBe(''); // Feedback should still be cleared after animation
    });
});