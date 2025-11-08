import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f3fe8aa0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Deque Exploration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can reset the state of the application if needed
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that the deque is empty and no message is displayed
        const dequeContainer = await page.locator('#dequeContainer');
        const messageElement = await page.locator('#message');
        
        await expect(dequeContainer).toHaveText('');
        await expect(messageElement).toHaveText('');
    });

    test('should add an element to the front of the deque', async ({ page }) => {
        const input = await page.locator('#elementInput');
        const addFrontButton = await page.locator('button', { hasText: 'Add to Front' });

        await input.fill('10');
        await addFrontButton.click();

        // Verify that the deque contains the new element
        const dequeContainer1 = await page.locator('#dequeContainer1');
        await expect(dequeContainer).toHaveText('10');
    });

    test('should add an element to the back of the deque', async ({ page }) => {
        const input1 = await page.locator('#elementInput');
        const addBackButton = await page.locator('button', { hasText: 'Add to Back' });

        await input.fill('20');
        await addBackButton.click();

        // Verify that the deque contains the new element
        const dequeContainer2 = await page.locator('#dequeContainer2');
        await expect(dequeContainer).toHaveText('20');
    });

    test('should remove an element from the front of the deque', async ({ page }) => {
        const input2 = await page.locator('#elementInput');
        const addFrontButton1 = await page.locator('button', { hasText: 'Add to Front' });
        const removeFrontButton = await page.locator('button', { hasText: 'Remove from Front' });

        await input.fill('30');
        await addFrontButton.click();
        await removeFrontButton.click();

        // Verify that the deque is empty
        const dequeContainer3 = await page.locator('#dequeContainer3');
        await expect(dequeContainer).toHaveText('');
    });

    test('should remove an element from the back of the deque', async ({ page }) => {
        const input3 = await page.locator('#elementInput');
        const addBackButton1 = await page.locator('button', { hasText: 'Add to Back' });
        const removeBackButton = await page.locator('button', { hasText: 'Remove from Back' });

        await input.fill('40');
        await addBackButton.click();
        await removeBackButton.click();

        // Verify that the deque is empty
        const dequeContainer4 = await page.locator('#dequeContainer4');
        await expect(dequeContainer).toHaveText('');
    });

    test('should handle multiple operations correctly', async ({ page }) => {
        const input4 = await page.locator('#elementInput');
        const addFrontButton2 = await page.locator('button', { hasText: 'Add to Front' });
        const addBackButton2 = await page.locator('button', { hasText: 'Add to Back' });
        const removeFrontButton1 = await page.locator('button', { hasText: 'Remove from Front' });
        const removeBackButton1 = await page.locator('button', { hasText: 'Remove from Back' });

        await input.fill('50');
        await addFrontButton.click();
        await input.fill('60');
        await addBackButton.click();
        await removeFrontButton.click();

        // Verify that the deque contains the remaining element
        const dequeContainer5 = await page.locator('#dequeContainer5');
        await expect(dequeContainer).toHaveText('60');
    });

    test('should show a message when deque is empty after removal', async ({ page }) => {
        const input5 = await page.locator('#elementInput');
        const removeFrontButton2 = await page.locator('button', { hasText: 'Remove from Front' });

        await removeFrontButton.click();

        // Verify that the message indicates the deque is empty
        const messageElement1 = await page.locator('#message');
        await expect(messageElement).toHaveText('Deque is empty');
    });
});