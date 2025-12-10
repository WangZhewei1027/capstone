import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c931740-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Heap Visualization (Min/Max) Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Heap Visualization (Min/Max)');

        // Check if Min Heap and Max Heap sections are visible
        await expect(page.locator('h2:has-text("Min Heap")')).toBeVisible();
        await expect(page.locator('h2:has-text("Max Heap")')).toBeVisible();
    });

    test('should insert a value into the Min Heap and update the display', async ({ page }) => {
        // Input a value and click the insert button
        await page.fill('#minInput', '5');
        await page.click('button:has-text("Insert into Min Heap")');

        // Verify that the value is displayed in the Min Heap
        const minHeapNode = page.locator('#minHeap .heap-node');
        await expect(minHeapNode).toHaveText('5');
    });

    test('should insert multiple values into the Min Heap and maintain the heap property', async ({ page }) => {
        // Insert values into the Min Heap
        await page.fill('#minInput', '10');
        await page.click('button:has-text("Insert into Min Heap")');
        await page.fill('#minInput', '3');
        await page.click('button:has-text("Insert into Min Heap")');
        await page.fill('#minInput', '8');
        await page.click('button:has-text("Insert into Min Heap")');

        // Verify the Min Heap maintains the correct order
        const minHeapNodes = await page.locator('#minHeap .heap-node').allTextContents();
        expect(minHeapNodes).toEqual(['3', '10', '8']);
    });

    test('should insert a value into the Max Heap and update the display', async ({ page }) => {
        // Input a value and click the insert button
        await page.fill('#maxInput', '15');
        await page.click('button:has-text("Insert into Max Heap")');

        // Verify that the value is displayed in the Max Heap
        const maxHeapNode = page.locator('#maxHeap .heap-node');
        await expect(maxHeapNode).toHaveText('15');
    });

    test('should insert multiple values into the Max Heap and maintain the heap property', async ({ page }) => {
        // Insert values into the Max Heap
        await page.fill('#maxInput', '20');
        await page.click('button:has-text("Insert into Max Heap")');
        await page.fill('#maxInput', '25');
        await page.click('button:has-text("Insert into Max Heap")');
        await page.fill('#maxInput', '10');
        await page.click('button:has-text("Insert into Max Heap")');

        // Verify the Max Heap maintains the correct order
        const maxHeapNodes = await page.locator('#maxHeap .heap-node').allTextContents();
        expect(maxHeapNodes).toEqual(['25', '20', '10']);
    });

    test('should alert when inserting a non-numeric value into the Min Heap', async ({ page }) => {
        // Input a non-numeric value and click the insert button
        await page.fill('#minInput', 'abc');
        await page.click('button:has-text("Insert into Min Heap")');

        // Verify that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid number.');
            await dialog.dismiss();
        });
    });

    test('should alert when inserting a non-numeric value into the Max Heap', async ({ page }) => {
        // Input a non-numeric value and click the insert button
        await page.fill('#maxInput', 'xyz');
        await page.click('button:has-text("Insert into Max Heap")');

        // Verify that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid number.');
            await dialog.dismiss();
        });
    });
});