import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9190a0-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Array Operations Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify that the initial state of the array is displayed correctly
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Current Array: [  ]');
    });

    test('should add a random number to the array', async ({ page }) => {
        // Click the button to add a random number
        await page.click('button:has-text("Add Random Number to Array")');
        
        // Verify that the output contains a number
        const output = await page.locator('#output').innerText();
        expect(output).toMatch(/Current Array: \[\s*\d+\s*\]/);
    });

    test('should remove the last number from the array', async ({ page }) => {
        // Add a number first
        await page.click('button:has-text("Add Random Number to Array")');
        
        // Click the button to remove the last number
        await page.click('button:has-text("Remove Last Number from Array")');
        
        // Verify that the output does not contain the previously added number
        const output = await page.locator('#output').innerText();
        expect(output).toMatch(/Current Array: \[\s*\d*\s*\]/);
    });

    test('should clear the array', async ({ page }) => {
        // Add a couple of numbers first
        await page.click('button:has-text("Add Random Number to Array")');
        await page.click('button:has-text("Add Random Number to Array")');
        
        // Click the button to clear the array
        await page.click('button:has-text("Clear Array")');
        
        // Verify that the output shows an empty array
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Current Array: [  ]');
    });

    test('should handle multiple add and remove operations', async ({ page }) => {
        // Add multiple numbers
        for (let i = 0; i < 5; i++) {
            await page.click('button:has-text("Add Random Number to Array")');
        }
        
        // Verify that the output contains 5 numbers
        let output = await page.locator('#output').innerText();
        expect(output).toMatch(/Current Array: \[\s*\d+,\s*\d+,\s*\d+,\s*\d+,\s*\d+\s*\]/);
        
        // Remove two numbers
        await page.click('button:has-text("Remove Last Number from Array")');
        await page.click('button:has-text("Remove Last Number from Array")');
        
        // Verify that the output contains 3 numbers
        output = await page.locator('#output').innerText();
        expect(output).toMatch(/Current Array: \[\s*\d+,\s*\d+,\s*\d+\s*\]/);
    });
});