import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/d2fd5660-bca1-11f0-9c8f-15ad551aaf30.html';

test.describe('Interactive Stack Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display welcome message on idle state', async ({ page }) => {
        const message = await page.locator('#message').textContent();
        expect(message).toBe('Welcome! Start by pushing elements onto the stack.');
    });

    test('should push an element onto the stack', async ({ page }) => {
        await page.click('#pushButton'); // User clicks push button
        await page.fill('input[type="text"]', '10'); // Simulate entering a value
        await page.keyboard.press('Enter'); // Simulate pressing Enter

        const stackBars = await page.locator('.stack-bar').count();
        expect(stackBars).toBe(1); // Expect one element in the stack
        const topElement = await page.locator('.stack-bar').first().textContent();
        expect(topElement).toBe('10'); // Expect the top element to be '10'
    });

    test('should disable pop button when stack is empty', async ({ page }) => {
        const popButton = page.locator('#popButton');
        await expect(popButton).toBeDisabled(); // Initially disabled
    });

    test('should enable pop button after pushing an element', async ({ page }) => {
        await page.click('#pushButton'); // User clicks push button
        await page.fill('input[type="text"]', '20'); // Simulate entering a value
        await page.keyboard.press('Enter'); // Simulate pressing Enter

        const popButton = page.locator('#popButton');
        await expect(popButton).toBeEnabled(); // Should be enabled after pushing
    });

    test('should pop an element from the stack', async ({ page }) => {
        await page.click('#pushButton'); // Push first element
        await page.fill('input[type="text"]', '30');
        await page.keyboard.press('Enter');

        await page.click('#popButton'); // User clicks pop button

        const stackBars = await page.locator('.stack-bar').count();
        expect(stackBars).toBe(0); // Expect stack to be empty after pop
        const message = await page.locator('#message').textContent();
        expect(message).toBe('Welcome! Start by pushing elements onto the stack.'); // Check message
    });

    test('should handle multiple pushes and pops correctly', async ({ page }) => {
        // Push multiple elements
        await page.click('#pushButton');
        await page.fill('input[type="text"]', '40');
        await page.keyboard.press('Enter');

        await page.click('#pushButton');
        await page.fill('input[type="text"]', '50');
        await page.keyboard.press('Enter');

        let stackBars = await page.locator('.stack-bar').count();
        expect(stackBars).toBe(2); // Expect two elements in the stack

        // Pop one element
        await page.click('#popButton');

        stackBars = await page.locator('.stack-bar').count();
        expect(stackBars).toBe(1); // Expect one element after pop

        const topElement = await page.locator('.stack-bar').first().textContent();
        expect(topElement).toBe('40'); // Expect the top element to be '40'
    });

    test('should not allow popping when stack is empty', async ({ page }) => {
        await page.click('#popButton'); // Attempt to pop when stack is empty

        const message = await page.locator('#message').textContent();
        expect(message).toBe('Welcome! Start by pushing elements onto the stack.'); // Check message remains unchanged
    });
});