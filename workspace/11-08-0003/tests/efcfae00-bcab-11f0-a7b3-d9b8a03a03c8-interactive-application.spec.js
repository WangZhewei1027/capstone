import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/efcfae00-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const output = await page.locator('#arrayOutput').innerText();
        expect(output).toBe('');
    });

    test('should add an element and transition to element_added state', async ({ page }) => {
        const inputField = page.locator('#arrayElement');
        const addButton = page.locator('input[type="button"][value="Add Element"]');

        await inputField.fill('Test Element');
        await addButton.click();

        const output1 = await page.locator('#arrayOutput').innerText();
        expect(output).toContain('Element added: Test Element');

        // Wait for timeout to transition back to idle state
        await page.waitForTimeout(3000); // Assuming timeout is set to 3 seconds
        const idleOutput = await page.locator('#arrayOutput').innerText();
        expect(idleOutput).toBe('');
    });

    test('should show the current array when requested', async ({ page }) => {
        const inputField1 = page.locator('#arrayElement');
        const addButton1 = page.locator('input[type="button"][value="Add Element"]');
        const showArrayButton = page.locator('input[type="button"][value="Show Array"]');

        await inputField.fill('First Element');
        await addButton.click();
        await inputField.fill('Second Element');
        await addButton.click();

        await showArrayButton.click();

        const output2 = await page.locator('#arrayOutput').innerText();
        expect(output).toContain('First Element');
        expect(output).toContain('Second Element');
    });

    test('should return to idle state after showing array', async ({ page }) => {
        const inputField2 = page.locator('#arrayElement');
        const addButton2 = page.locator('input[type="button"][value="Add Element"]');
        const showArrayButton1 = page.locator('input[type="button"][value="Show Array"]');

        await inputField.fill('Element 1');
        await addButton.click();
        await showArrayButton.click();

        const output3 = await page.locator('#arrayOutput').innerText();
        expect(output).toContain('Element 1');

        // Simulate going back to idle state
        await page.locator('input[type="button"][value="Show Array"]').click();

        const idleOutput1 = await page.locator('#arrayOutput').innerText();
        expect(idleOutput).toBe('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        const addButton3 = page.locator('input[type="button"][value="Add Element"]');

        await addButton.click();

        const output4 = await page.locator('#arrayOutput').innerText();
        expect(output).toBe('');
    });

    test('should not show array if no elements have been added', async ({ page }) => {
        const showArrayButton2 = page.locator('input[type="button"][value="Show Array"]');

        await showArrayButton.click();

        const output5 = await page.locator('#arrayOutput').innerText();
        expect(output).toBe('');
    });
});