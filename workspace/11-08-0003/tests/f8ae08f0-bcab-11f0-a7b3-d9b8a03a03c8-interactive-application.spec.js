import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f8ae08f0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Deque Module Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the interactive deque application
        await page.goto(baseURL);
    });

    test('should initialize with an empty deque', async ({ page }) => {
        // Verify that the deque is empty on initialization
        const dequeContainer = await page.locator('#deque');
        const boxes = await dequeContainer.locator('.box');
        expect(await boxes.count()).toBe(0);
    });

    test('should add an element to the front of the deque', async ({ page }) => {
        // Add a number to the front and verify the visual update
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Add to Front")');

        const dequeContainer1 = await page.locator('#deque');
        const boxes1 = await dequeContainer.locator('.box');
        expect(await boxes.count()).toBe(1);
        expect(await boxes.first().textContent()).toBe('10');
    });

    test('should add an element to the back of the deque', async ({ page }) => {
        // Add a number to the back and verify the visual update
        await page.fill('#inputValue', '20');
        await page.click('button:has-text("Add to Back")');

        const dequeContainer2 = await page.locator('#deque');
        const boxes2 = await dequeContainer.locator('.box');
        expect(await boxes.count()).toBe(1);
        expect(await boxes.first().textContent()).toBe('20');
    });

    test('should remove an element from the front of the deque', async ({ page }) => {
        // Setup: Add an element to the front
        await page.fill('#inputValue', '30');
        await page.click('button:has-text("Add to Front")');

        // Remove the element from the front
        await page.click('button:has-text("Remove from Front")');

        const dequeContainer3 = await page.locator('#deque');
        const boxes3 = await dequeContainer.locator('.box');
        expect(await boxes.count()).toBe(0);
    });

    test('should remove an element from the back of the deque', async ({ page }) => {
        // Setup: Add an element to the back
        await page.fill('#inputValue', '40');
        await page.click('button:has-text("Add to Back")');

        // Remove the element from the back
        await page.click('button:has-text("Remove from Back")');

        const dequeContainer4 = await page.locator('#deque');
        const boxes4 = await dequeContainer.locator('.box');
        expect(await boxes.count()).toBe(0);
    });

    test('should handle multiple adds and removes correctly', async ({ page }) => {
        // Add elements to the front and back
        await page.fill('#inputValue', '50');
        await page.click('button:has-text("Add to Front")');
        await page.fill('#inputValue', '60');
        await page.click('button:has-text("Add to Back")');

        // Verify the deque contains both elements
        const dequeContainer5 = await page.locator('#deque');
        const boxes5 = await dequeContainer.locator('.box');
        expect(await boxes.count()).toBe(2);
        expect(await boxes.nth(0).textContent()).toBe('50');
        expect(await boxes.nth(1).textContent()).toBe('60');

        // Remove from front and verify
        await page.click('button:has-text("Remove from Front")');
        expect(await boxes.count()).toBe(1);
        expect(await boxes.first().textContent()).toBe('60');

        // Remove from back and verify
        await page.click('button:has-text("Remove from Back")');
        expect(await boxes.count()).toBe(0);
    });

    test('should not add empty values to the deque', async ({ page }) => {
        // Attempt to add an empty value to the front
        await page.click('button:has-text("Add to Front")');

        const dequeContainer6 = await page.locator('#deque');
        const boxes6 = await dequeContainer.locator('.box');
        expect(await boxes.count()).toBe(0);
    });

    test('should highlight the first item in the deque', async ({ page }) => {
        // Add elements to the deque
        await page.fill('#inputValue', '70');
        await page.click('button:has-text("Add to Front")');
        await page.fill('#inputValue', '80');
        await page.click('button:has-text("Add to Back")');

        const firstBox = await page.locator('#deque .box').first();
        const transformStyle = await firstBox.evaluate(box => box.style.transform);
        expect(transformStyle).toBe('scale(1.1)');
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can add cleanup code here if necessary
    });
});