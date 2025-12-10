import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b56eb0-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Set Demonstration Application Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(url);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify the initial state of the application
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('[]'); // Initial set should be empty
    });

    test('should add a valid number to the set', async ({ page }) => {
        // Test adding a valid number to the set
        await page.fill('#numberInput', '5');
        await page.click('#addButton');
        
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('[5]'); // Set should contain the number 5
    });

    test('should not add duplicate numbers to the set', async ({ page }) => {
        // Test adding duplicate numbers
        await page.fill('#numberInput', '5');
        await page.click('#addButton');
        
        await page.fill('#numberInput', '5'); // Try to add the same number again
        await page.click('#addButton');
        
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('[5]'); // Set should still contain only one instance of 5
    });

    test('should show alert for invalid input', async ({ page }) => {
        // Test alert for invalid input
        await page.fill('#numberInput', 'invalid');
        await page.click('#addButton');
        
        // Check if the alert is shown
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.click('#addButton')
        ]);
        expect(alert.message()).toBe('Please enter a valid number');
        await alert.dismiss(); // Dismiss the alert
    });

    test('should clear the set when clear button is clicked', async ({ page }) => {
        // Test clearing the set
        await page.fill('#numberInput', '5');
        await page.click('#addButton');
        
        await page.click('#clearButton');
        
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('[]'); // Set should be empty after clearing
    });

    test('should handle multiple valid inputs', async ({ page }) => {
        // Test adding multiple valid numbers
        await page.fill('#numberInput', '1');
        await page.click('#addButton');
        
        await page.fill('#numberInput', '2');
        await page.click('#addButton');
        
        await page.fill('#numberInput', '3');
        await page.click('#addButton');
        
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('[1,2,3]'); // Set should contain 1, 2, and 3
    });

    test('should handle clearing an already empty set', async ({ page }) => {
        // Test clearing the set when it is already empty
        await page.click('#clearButton');
        
        const setContents = await page.locator('#setContents').innerText();
        expect(setContents).toBe('[]'); // Set should still be empty
    });
});