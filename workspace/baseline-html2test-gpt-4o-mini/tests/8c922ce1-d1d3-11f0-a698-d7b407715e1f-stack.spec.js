import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c922ce1-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Stack Implementation Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the stack implementation page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the initial state of the stack
        const stackDiv = await page.locator('#stack');
        const output = await page.locator('#output');
        
        await expect(stackDiv).toHaveText('Current Stack: ');
        await expect(output).toHaveText('');
    });

    test('should push a value onto the stack', async ({ page }) => {
        // Test pushing a value onto the stack
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Push")');
        
        const stackDiv = await page.locator('#stack');
        const output = await page.locator('#output');
        
        await expect(stackDiv).toHaveText('Current Stack: 10');
        await expect(output).toHaveText('');
    });

    test('should pop a value from the stack', async ({ page }) => {
        // Test popping a value from the stack
        await page.fill('#inputValue', '20');
        await page.click('button:has-text("Push")');
        await page.click('button:has-text("Pop")');
        
        const stackDiv = await page.locator('#stack');
        const output = await page.locator('#output');
        
        await expect(stackDiv).toHaveText('Current Stack: ');
        await expect(output).toHaveText('Popped Value: 20');
    });

    test('should peek the top value of the stack', async ({ page }) => {
        // Test peeking the top value of the stack
        await page.fill('#inputValue', '30');
        await page.click('button:has-text("Push")');
        await page.click('button:has-text("Peek")');
        
        const output = await page.locator('#output');
        
        await expect(output).toHaveText('Top Value: 30');
    });

    test('should handle popping from an empty stack', async ({ page }) => {
        // Test popping from an empty stack
        await page.click('button:has-text("Pop")');
        
        const output = await page.locator('#output');
        
        await expect(output).toHaveText('Popped Value: Stack is empty');
    });

    test('should handle peeking from an empty stack', async ({ page }) => {
        // Test peeking from an empty stack
        await page.click('button:has-text("Peek")');
        
        const output = await page.locator('#output');
        
        await expect(output).toHaveText('Top Value: Stack is empty');
    });

    test('should show an error message when pushing an empty value', async ({ page }) => {
        // Test pushing an empty value
        await page.click('button:has-text("Push")');
        
        const output = await page.locator('#output');
        
        await expect(output).toHaveText('Please enter a value to push.');
    });
});