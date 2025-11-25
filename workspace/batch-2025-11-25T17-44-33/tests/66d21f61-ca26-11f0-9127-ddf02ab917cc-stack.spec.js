import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-44-33/html/66d21f61-ca26-11f0-9127-ddf02ab917cc.html';

test.describe('Stack Demonstration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the stack demonstration application
        await page.goto(BASE_URL);
    });

    test('should display empty stack initially', async ({ page }) => {
        // Validate that the stack display is empty on initial load
        const stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).toBe('');
    });

    test('should push a value onto the stack', async ({ page }) => {
        // Input a value and push it onto the stack
        await page.fill('#inputValue', '10');
        await page.click("button[onclick='pushValue()']");

        // Validate that the stack displays the pushed value
        const stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).toContain('10');
    });

    test('should push multiple values onto the stack', async ({ page }) => {
        // Push multiple values onto the stack
        await page.fill('#inputValue', '20');
        await page.click("button[onclick='pushValue()']");
        await page.fill('#inputValue', '30');
        await page.click("button[onclick='pushValue()']");

        // Validate that the stack displays all pushed values
        const stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).toContain('20');
        expect(stackDisplay).toContain('30');
    });

    test('should pop a value from the stack', async ({ page }) => {
        // Push a value and then pop it
        await page.fill('#inputValue', '40');
        await page.click("button[onclick='pushValue()']");
        await page.click("button[onclick='popValue()']");

        // Validate that the stack no longer displays the popped value
        const stackDisplay = await page.locator('#stackDisplay').innerHTML();
        expect(stackDisplay).not.toContain('40');
    });

    test('should alert when popping from an empty stack', async ({ page }) => {
        // Attempt to pop from an empty stack
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.click("button[onclick='popValue()']")
        ]);

        // Validate the alert message
        expect(alert.message()).toBe('Underflow');
        await alert.dismiss();
    });

    test('should clear input field after pushing a value', async ({ page }) => {
        // Push a value and check if the input field is cleared
        await page.fill('#inputValue', '50');
        await page.click("button[onclick='pushValue()']");
        
        const inputValue = await page.locator('#inputValue').inputValue();
        expect(inputValue).toBe('');
    });

    test('should display alert with popped value', async ({ page }) => {
        // Push a value, then pop it and check the alert
        await page.fill('#inputValue', '60');
        await page.click("button[onclick='pushValue()']");
        
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.click("button[onclick='popValue()']")
        ]);

        // Validate the alert message with the popped value
        expect(alert.message()).toBe('Popped: 60');
        await alert.dismiss();
    });
});