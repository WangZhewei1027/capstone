import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b5bcd1-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Heap Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the heap visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Heap Visualization');
        
        // Check that the input field and buttons are visible
        await expect(page.locator('#inputValue')).toBeVisible();
        await expect(page.locator('button:has-text("Insert in Min-Heap")')).toBeVisible();
        await expect(page.locator('button:has-text("Insert in Max-Heap")')).toBeVisible();
        
        // Ensure both heap displays are empty initially
        await expect(page.locator('#minHeap')).toHaveText('');
        await expect(page.locator('#maxHeap')).toHaveText('');
    });

    test('should insert values into the Min-Heap and display them', async ({ page }) => {
        // Input a value and click the insert button for Min-Heap
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Insert in Min-Heap")');
        
        // Verify that the Min-Heap displays the inserted value
        await expect(page.locator('#minHeap')).toHaveText('10');

        // Insert another value
        await page.fill('#inputValue', '5');
        await page.click('button:has-text("Insert in Min-Heap")');
        
        // Verify that the Min-Heap displays the values in correct order
        await expect(page.locator('#minHeap')).toHaveText('5\n10');
    });

    test('should insert values into the Max-Heap and display them', async ({ page }) => {
        // Input a value and click the insert button for Max-Heap
        await page.fill('#inputValue', '20');
        await page.click('button:has-text("Insert in Max-Heap")');
        
        // Verify that the Max-Heap displays the inserted value
        await expect(page.locator('#maxHeap')).toHaveText('20');

        // Insert another value
        await page.fill('#inputValue', '25');
        await page.click('button:has-text("Insert in Max-Heap")');
        
        // Verify that the Max-Heap displays the values in correct order
        await expect(page.locator('#maxHeap')).toHaveText('25\n20');
    });

    test('should handle non-numeric input gracefully', async ({ page }) => {
        // Input a non-numeric value and try to insert into Min-Heap
        await page.fill('#inputValue', 'abc');
        await page.click('button:has-text("Insert in Min-Heap")');
        
        // Verify that the Min-Heap remains unchanged
        await expect(page.locator('#minHeap')).toHaveText('');

        // Input a non-numeric value and try to insert into Max-Heap
        await page.fill('#inputValue', 'xyz');
        await page.click('button:has-text("Insert in Max-Heap")');
        
        // Verify that the Max-Heap remains unchanged
        await expect(page.locator('#maxHeap')).toHaveText('');
    });

    test('should clear input field after insertion', async ({ page }) => {
        // Input a value and click the insert button for Min-Heap
        await page.fill('#inputValue', '15');
        await page.click('button:has-text("Insert in Min-Heap")');
        
        // Verify that the input field is cleared
        await expect(page.locator('#inputValue')).toHaveValue('');
    });

    test('should update heaps correctly with multiple inserts', async ({ page }) => {
        // Insert values into Min-Heap
        await page.fill('#inputValue', '30');
        await page.click('button:has-text("Insert in Min-Heap")');
        await page.fill('#inputValue', '20');
        await page.click('button:has-text("Insert in Min-Heap")');
        await page.fill('#inputValue', '25');
        await page.click('button:has-text("Insert in Min-Heap")');

        // Verify Min-Heap order
        await expect(page.locator('#minHeap')).toHaveText('20\n30\n25');

        // Insert values into Max-Heap
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Insert in Max-Heap")');
        await page.fill('#inputValue', '5');
        await page.click('button:has-text("Insert in Max-Heap")');
        await page.fill('#inputValue', '15');
        await page.click('button:has-text("Insert in Max-Heap")');

        // Verify Max-Heap order
        await expect(page.locator('#maxHeap')).toHaveText('15\n10\n5');
    });
});