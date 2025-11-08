import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f394cc50-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Array Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display initial state with empty array', async ({ page }) => {
        const arrayDisplay = await page.locator('#arrayDisplay');
        const message = await page.locator('#message');
        
        await expect(arrayDisplay).toHaveText('Array: []');
        await expect(message).toHaveText('');
    });

    test('should add an element to the array', async ({ page }) => {
        const input = await page.locator('#elementInput');
        const addButton = await page.locator('button:has-text("Add Element")');
        const arrayDisplay1 = await page.locator('#arrayDisplay1');

        await input.fill('Test Element');
        await addButton.click();

        await expect(arrayDisplay).toHaveText('Array: [Test Element]');
    });

    test('should show error message when adding an empty element', async ({ page }) => {
        const input1 = await page.locator('#elementInput');
        const addButton1 = await page.locator('button:has-text("Add Element")');
        const message1 = await page.locator('#message1');

        await input.fill('');
        await addButton.click();

        await expect(message).toHaveText('Please enter a value to add!');
    });

    test('should remove the last element from the array', async ({ page }) => {
        const input2 = await page.locator('#elementInput');
        const addButton2 = await page.locator('button:has-text("Add Element")');
        const removeButton = await page.locator('button:has-text("Remove Last Element")');
        const arrayDisplay2 = await page.locator('#arrayDisplay2');

        await input.fill('First Element');
        await addButton.click();
        await input.fill('Second Element');
        await addButton.click();
        await removeButton.click();

        await expect(arrayDisplay).toHaveText('Array: [First Element]');
    });

    test('should show error message when removing from an empty array', async ({ page }) => {
        const removeButton1 = await page.locator('button:has-text("Remove Last Element")');
        const message2 = await page.locator('#message2');

        await removeButton.click();

        await expect(message).toHaveText('Cannot remove from an empty array!');
    });

    test('should reset the array to empty', async ({ page }) => {
        const input3 = await page.locator('#elementInput');
        const addButton3 = await page.locator('button:has-text("Add Element")');
        const resetButton = await page.locator('button:has-text("Reset Array")');
        const arrayDisplay3 = await page.locator('#arrayDisplay3');

        await input.fill('Element to Reset');
        await addButton.click();
        await resetButton.click();

        await expect(arrayDisplay).toHaveText('Array: []');
    });

    test('should handle multiple add and remove operations correctly', async ({ page }) => {
        const input4 = await page.locator('#elementInput');
        const addButton4 = await page.locator('button:has-text("Add Element")');
        const removeButton2 = await page.locator('button:has-text("Remove Last Element")');
        const arrayDisplay4 = await page.locator('#arrayDisplay4');

        await input.fill('Element 1');
        await addButton.click();
        await input.fill('Element 2');
        await addButton.click();
        await removeButton.click();
        await input.fill('Element 3');
        await addButton.click();

        await expect(arrayDisplay).toHaveText('Array: [Element 1, Element 3]');
    });

    test('should update display color based on array state', async ({ page }) => {
        const input5 = await page.locator('#elementInput');
        const addButton5 = await page.locator('button:has-text("Add Element")');
        const arrayDisplay5 = await page.locator('#arrayDisplay5');

        await input.fill('Color Test');
        await addButton.click();

        await expect(arrayDisplay).toHaveCSS('background-color', 'rgb(212, 237, 218)'); // Color when array is not empty

        await input.fill('');
        await addButton.click(); // Trigger error
        await expect(arrayDisplay).toHaveCSS('background-color', 'rgb(233, 237, 239)'); // Color when array is empty
    });
});