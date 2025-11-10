import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/544bd970-bca8-11f0-9137-459e305a5daf.html';

test.describe('Interactive Deque Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const dequeDisplay = await page.locator('#deque').innerHTML();
        expect(dequeDisplay).toBe('');
    });

    test('should add an element to the front', async ({ page }) => {
        await page.fill('#elementInput', 'Front Element');
        await page.click('button:has-text("Add to Front")');

        const dequeDisplay = await page.locator('#deque').innerHTML();
        expect(dequeDisplay).toContain('Front Element');
    });

    test('should add an element to the back', async ({ page }) => {
        await page.fill('#elementInput', 'Back Element');
        await page.click('button:has-text("Add to Back")');

        const dequeDisplay = await page.locator('#deque').innerHTML();
        expect(dequeDisplay).toContain('Back Element');
    });

    test('should remove an element from the front', async ({ page }) => {
        await page.fill('#elementInput', 'Element 1');
        await page.click('button:has-text("Add to Front")');
        await page.fill('#elementInput', 'Element 2');
        await page.click('button:has-text("Add to Front")');
        
        await page.click('button:has-text("Remove from Front")');

        const dequeDisplay = await page.locator('#deque').innerHTML();
        expect(dequeDisplay).not.toContain('Element 2');
        expect(dequeDisplay).toContain('Element 1');
    });

    test('should remove an element from the back', async ({ page }) => {
        await page.fill('#elementInput', 'Element 1');
        await page.click('button:has-text("Add to Back")');
        await page.fill('#elementInput', 'Element 2');
        await page.click('button:has-text("Add to Back")');
        
        await page.click('button:has-text("Remove from Back")');

        const dequeDisplay = await page.locator('#deque').innerHTML();
        expect(dequeDisplay).not.toContain('Element 2');
        expect(dequeDisplay).toContain('Element 1');
    });

    test('should not add empty elements to the deque', async ({ page }) => {
        await page.click('button:has-text("Add to Front")');
        await page.click('button:has-text("Add to Back")');

        const dequeDisplay = await page.locator('#deque').innerHTML();
        expect(dequeDisplay).toBe('');
    });

    test('should handle multiple additions and removals', async ({ page }) => {
        await page.fill('#elementInput', 'A');
        await page.click('button:has-text("Add to Front")');
        await page.fill('#elementInput', 'B');
        await page.click('button:has-text("Add to Back")');
        await page.fill('#elementInput', 'C');
        await page.click('button:has-text("Add to Front")');

        await page.click('button:has-text("Remove from Front")');
        await page.click('button:has-text("Remove from Back")');

        const dequeDisplay = await page.locator('#deque').innerHTML();
        expect(dequeDisplay).toContain('B');
        expect(dequeDisplay).not.toContain('A');
        expect(dequeDisplay).not.toContain('C');
    });

    test('should clear input field after adding an element', async ({ page }) => {
        await page.fill('#elementInput', 'Test Element');
        await page.click('button:has-text("Add to Front")');

        const inputValue = await page.inputValue('#elementInput');
        expect(inputValue).toBe('');
    });
});