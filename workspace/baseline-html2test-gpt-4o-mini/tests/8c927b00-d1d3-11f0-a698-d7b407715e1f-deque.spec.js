import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c927b00-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Deque Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(url);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the initial state of the deque display
        const dequeDisplay = await page.locator('#dequeDisplay');
        await expect(dequeDisplay).toHaveText('');
    });

    test('should add an element to the front of the deque', async ({ page }) => {
        // Input a value and add it to the front
        await page.fill('#valueInput', '10');
        await page.click('button:has-text("Add Front")');
        
        // Verify the deque display updates correctly
        const dequeDisplay = await page.locator('#dequeDisplay');
        await expect(dequeDisplay).toHaveText('10');
    });

    test('should add an element to the rear of the deque', async ({ page }) => {
        // Input a value and add it to the rear
        await page.fill('#valueInput', '20');
        await page.click('button:has-text("Add Rear")');
        
        // Verify the deque display updates correctly
        const dequeDisplay = await page.locator('#dequeDisplay');
        await expect(dequeDisplay).toHaveText('20');
    });

    test('should remove an element from the front of the deque', async ({ page }) => {
        // Add elements to the deque
        await page.fill('#valueInput', '30');
        await page.click('button:has-text("Add Front")');
        await page.fill('#valueInput', '40');
        await page.click('button:has-text("Add Front")');
        
        // Remove from the front
        await page.click('button:has-text("Remove Front")');
        
        // Verify the deque display updates correctly
        const dequeDisplay = await page.locator('#dequeDisplay');
        await expect(dequeDisplay).toHaveText('30');
    });

    test('should remove an element from the rear of the deque', async ({ page }) => {
        // Add elements to the deque
        await page.fill('#valueInput', '50');
        await page.click('button:has-text("Add Rear")');
        await page.fill('#valueInput', '60');
        await page.click('button:has-text("Add Rear")');
        
        // Remove from the rear
        await page.click('button:has-text("Remove Rear")');
        
        // Verify the deque display updates correctly
        const dequeDisplay = await page.locator('#dequeDisplay');
        await expect(dequeDisplay).toHaveText('50');
    });

    test('should not add empty values to the deque', async ({ page }) => {
        // Attempt to add an empty value to the front
        await page.click('button:has-text("Add Front")');
        
        // Verify the deque display remains empty
        const dequeDisplay = await page.locator('#dequeDisplay');
        await expect(dequeDisplay).toHaveText('');
    });

    test('should handle multiple operations correctly', async ({ page }) => {
        // Perform a series of operations
        await page.fill('#valueInput', '70');
        await page.click('button:has-text("Add Front")');
        await page.fill('#valueInput', '80');
        await page.click('button:has-text("Add Rear")');
        await page.click('button:has-text("Remove Front")');
        await page.click('button:has-text("Remove Rear")');
        
        // Verify the deque display updates correctly
        const dequeDisplay = await page.locator('#dequeDisplay');
        await expect(dequeDisplay).toHaveText('');
    });
});