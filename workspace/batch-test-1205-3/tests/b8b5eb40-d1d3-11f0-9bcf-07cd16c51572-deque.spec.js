import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b5eb40-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Deque Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the deque application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the page loads correctly and the deque is empty
        const dequeDiv = await page.locator('#deque');
        const inputField = await page.locator('#valueInput');

        await expect(dequeDiv).toBeVisible();
        await expect(inputField).toBeVisible();
        await expect(dequeDiv.locator('.element')).toHaveCount(0);
    });

    test('should add an element to the front of the deque', async ({ page }) => {
        // Test adding an element to the front of the deque
        const inputField = await page.locator('#valueInput');
        const addFrontButton = await page.locator('button', { hasText: 'Add to Front' });

        await inputField.fill('Front Element');
        await addFrontButton.click();

        const dequeDiv = await page.locator('#deque');
        await expect(dequeDiv.locator('.element')).toHaveCount(1);
        await expect(dequeDiv.locator('.element')).toHaveText('Front Element');
    });

    test('should add an element to the back of the deque', async ({ page }) => {
        // Test adding an element to the back of the deque
        const inputField = await page.locator('#valueInput');
        const addBackButton = await page.locator('button', { hasText: 'Add to Back' });

        await inputField.fill('Back Element');
        await addBackButton.click();

        const dequeDiv = await page.locator('#deque');
        await expect(dequeDiv.locator('.element')).toHaveCount(1);
        await expect(dequeDiv.locator('.element')).toHaveText('Back Element');
    });

    test('should remove an element from the front of the deque', async ({ page }) => {
        // Test removing an element from the front of the deque
        const inputField = await page.locator('#valueInput');
        const addFrontButton = await page.locator('button', { hasText: 'Add to Front' });
        const removeFrontButton = await page.locator('button', { hasText: 'Remove from Front' });

        await inputField.fill('Element 1');
        await addFrontButton.click();
        await inputField.fill('Element 2');
        await addFrontButton.click();
        await removeFrontButton.click();

        const dequeDiv = await page.locator('#deque');
        await expect(dequeDiv.locator('.element')).toHaveCount(1);
        await expect(dequeDiv.locator('.element')).toHaveText('Element 2');
    });

    test('should remove an element from the back of the deque', async ({ page }) => {
        // Test removing an element from the back of the deque
        const inputField = await page.locator('#valueInput');
        const addBackButton = await page.locator('button', { hasText: 'Add to Back' });
        const removeBackButton = await page.locator('button', { hasText: 'Remove from Back' });

        await inputField.fill('Element 1');
        await addBackButton.click();
        await inputField.fill('Element 2');
        await addBackButton.click();
        await removeBackButton.click();

        const dequeDiv = await page.locator('#deque');
        await expect(dequeDiv.locator('.element')).toHaveCount(1);
        await expect(dequeDiv.locator('.element')).toHaveText('Element 1');
    });

    test('should alert when trying to remove from an empty deque', async ({ page }) => {
        // Test alert when trying to remove from an empty deque
        const removeFrontButton = await page.locator('button', { hasText: 'Remove from Front' });
        const removeBackButton = await page.locator('button', { hasText: 'Remove from Back' });

        await expect(removeFrontButton).toBeEnabled();
        await expect(removeBackButton).toBeEnabled();

        const [frontAlert] = await Promise.all([
            page.waitForEvent('dialog'),
            removeFrontButton.click()
        ]);
        await expect(frontAlert.message()).toBe('Deque is empty.');
        await frontAlert.dismiss();

        const [backAlert] = await Promise.all([
            page.waitForEvent('dialog'),
            removeBackButton.click()
        ]);
        await expect(backAlert.message()).toBe('Deque is empty.');
        await backAlert.dismiss();
    });

    test('should alert when trying to add an empty value', async ({ page }) => {
        // Test alert when trying to add an empty value
        const addFrontButton = await page.locator('button', { hasText: 'Add to Front' });
        const addBackButton = await page.locator('button', { hasText: 'Add to Back' });

        const [frontAlert] = await Promise.all([
            page.waitForEvent('dialog'),
            addFrontButton.click()
        ]);
        await expect(frontAlert.message()).toBe('Please enter a value.');
        await frontAlert.dismiss();

        const [backAlert] = await Promise.all([
            page.waitForEvent('dialog'),
            addBackButton.click()
        ]);
        await expect(backAlert.message()).toBe('Please enter a value.');
        await backAlert.dismiss();
    });
});