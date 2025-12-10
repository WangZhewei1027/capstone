import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b59d21-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Stack Implementation Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the stack implementation page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify the initial state of the stack
        const stackList = await page.locator('#stack').innerHTML();
        expect(stackList).toBe('');
        const message = await page.locator('#message').innerText();
        expect(message).toBe('');
    });

    test('should push a value onto the stack', async ({ page }) => {
        // Test pushing a value onto the stack
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Push")');
        
        const stackList = await page.locator('#stack').innerHTML();
        expect(stackList).toContain('10');
        
        const message = await page.locator('#message').innerText();
        expect(message).toBe("'10' pushed to the stack.");
    });

    test('should pop a value from the stack', async ({ page }) => {
        // Push a value and then pop it
        await page.fill('#inputValue', '20');
        await page.click('button:has-text("Push")');
        await page.click('button:has-text("Pop")');
        
        const stackList = await page.locator('#stack').innerHTML();
        expect(stackList).not.toContain('20');
        
        const message = await page.locator('#message').innerText();
        expect(message).toBe("'20' popped from the stack.");
    });

    test('should show message when popping from an empty stack', async ({ page }) => {
        // Test popping from an empty stack
        await page.click('button:has-text("Pop")');
        
        const message = await page.locator('#message').innerText();
        expect(message).toBe('Stack is empty!');
    });

    test('should peek at the top value of the stack', async ({ page }) => {
        // Push a value and then peek
        await page.fill('#inputValue', '30');
        await page.click('button:has-text("Push")');
        await page.click('button:has-text("Peek")');
        
        const message = await page.locator('#message').innerText();
        expect(message).toBe("Top value is '30'.");
    });

    test('should show message when peeking at an empty stack', async ({ page }) => {
        // Test peeking at an empty stack
        await page.click('button:has-text("Peek")');
        
        const message = await page.locator('#message').innerText();
        expect(message).toBe('Stack is empty!');
    });

    test('should handle multiple pushes and pops correctly', async ({ page }) => {
        // Test multiple pushes and pops
        await page.fill('#inputValue', '40');
        await page.click('button:has-text("Push")');
        await page.fill('#inputValue', '50');
        await page.click('button:has-text("Push")');
        await page.fill('#inputValue', '60');
        await page.click('button:has-text("Push")');
        
        let stackList = await page.locator('#stack').innerHTML();
        expect(stackList).toContain('40');
        expect(stackList).toContain('50');
        expect(stackList).toContain('60');

        await page.click('button:has-text("Pop")');
        stackList = await page.locator('#stack').innerHTML();
        expect(stackList).not.toContain('60');

        await page.click('button:has-text("Pop")');
        stackList = await page.locator('#stack').innerHTML();
        expect(stackList).not.toContain('50');

        await page.click('button:has-text("Pop")');
        stackList = await page.locator('#stack').innerHTML();
        expect(stackList).not.toContain('40');
    });
});