import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b60af1-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Union-Find (Disjoint Set) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the title is correct
        await expect(page).toHaveTitle('Union-Find (Disjoint Set) Visualization');
        
        // Check that the output area is empty initially
        const output = await page.locator('#output');
        await expect(output).toHaveText('');
    });

    test.describe('Union operations', () => {
        test('should perform union operation and update output', async ({ page }) => {
            // Input values for union operation
            await page.fill('#element1', '1');
            await page.fill('#element2', '2');
            
            // Click the union button
            await page.click('button:has-text("Union")');
            
            // Verify that the output reflects the union operation
            const output = await page.locator('#output');
            await expect(output).toHaveText(/Current sets: \[\[1,2\]\]/);
        });

        test('should handle invalid union input', async ({ page }) => {
            // Input invalid values
            await page.fill('#element1', '10');
            await page.fill('#element2', '2');
            
            // Click the union button
            await page.click('button:has-text("Union")');
            
            // Verify that an alert is shown for invalid input
            await page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('Please enter valid elements (0-9).');
                await dialog.dismiss();
            });
        });
    });

    test.describe('Find operations', () => {
        test('should perform find operation and display correct set root', async ({ page }) => {
            // First, perform a union to set up the state
            await page.fill('#element1', '1');
            await page.fill('#element2', '2');
            await page.click('button:has-text("Union")');
            
            // Now, perform a find operation
            await page.fill('#element1', '1');
            await page.click('button:has-text("Find")');
            
            // Verify that the output reflects the correct root
            const output = await page.locator('#output');
            await expect(output).toHaveText(/Element 1 belongs to set with root 1/);
        });

        test('should handle invalid find input', async ({ page }) => {
            // Input invalid value for find
            await page.fill('#element1', '10');
            
            // Click the find button
            await page.click('button:has-text("Find")');
            
            // Verify that an alert is shown for invalid input
            await page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('Please enter a valid element (0-9) to find.');
                await dialog.dismiss();
            });
        });
    });

    test.describe('Multiple union operations', () => {
        test('should correctly update sets after multiple unions', async ({ page }) => {
            // Perform multiple union operations
            await page.fill('#element1', '0');
            await page.fill('#element2', '1');
            await page.click('button:has-text("Union")');
            
            await page.fill('#element1', '1');
            await page.fill('#element2', '2');
            await page.click('button:has-text("Union")');
            
            await page.fill('#element1', '3');
            await page.fill('#element2', '4');
            await page.click('button:has-text("Union")');
            
            // Check the output for the current sets
            const output = await page.locator('#output');
            await expect(output).toHaveText(/Current sets: \[\[0,1,2\],\[3,4\]\]/);
        });
    });
});