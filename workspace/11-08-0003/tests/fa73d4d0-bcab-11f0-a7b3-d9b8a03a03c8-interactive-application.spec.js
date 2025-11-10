import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/fa73d4d0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Hash Table Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can reset the state of the application if needed
    });

    test('should initialize in idle state', async ({ page }) => {
        const cells = await page.$$('.cell');
        expect(cells.length).toBe(10); // Check if there are 10 cells
        for (const cell of cells) {
            const text = await cell.innerText();
            expect(text).toBe(''); // Check if all cells are empty
        }
    });

    test('should add an entry and transition to idle state', async ({ page }) => {
        await page.fill('#addKey', 'key1');
        await page.fill('#addValue', 'value1');
        await page.click('#addButton');

        // Wait for the table to refresh
        await page.waitForTimeout(500); // Adjust timeout as needed

        const cells1 = await page.$$('.cell');
        const occupiedCell = await page.$('.cell.occupied');
        expect(occupiedCell).not.toBeNull(); // Check if at least one cell is occupied
        expect(await occupiedCell.innerText()).toBe('key1'); // Check if the correct key is added
    });

    test('should retrieve an entry and highlight the cell', async ({ page }) => {
        await page.fill('#addKey', 'key2');
        await page.fill('#addValue', 'value2');
        await page.click('#addButton');

        await page.fill('#getKey', 'key2');
        await page.click('#getButton');

        const highlightedCell = await page.$('.cell.highlight');
        expect(highlightedCell).not.toBeNull(); // Check if the cell is highlighted
    });

    test('should delete an entry and transition to idle state', async ({ page }) => {
        await page.fill('#addKey', 'key3');
        await page.fill('#addValue', 'value3');
        await page.click('#addButton');

        await page.fill('#deleteKey', 'key3');
        await page.click('#deleteButton');

        // Wait for the table to refresh
        await page.waitForTimeout(500); // Adjust timeout as needed

        const occupiedCell1 = await page.$('.cell.occupied');
        expect(occupiedCell).toBeNull(); // Check if no cells are occupied
    });

    test('should handle retrieving a non-existent entry', async ({ page }) => {
        await page.fill('#getKey', 'nonexistentKey');
        await page.click('#getButton');

        const noEntryMessage = await page.locator('.info').innerText();
        expect(noEntryMessage).toContain('No entry found'); // Assuming there's a message for no entry found
    });

    test('should handle deleting a non-existent entry', async ({ page }) => {
        await page.fill('#deleteKey', 'nonexistentKey');
        await page.click('#deleteButton');

        const noEntryMessage1 = await page.locator('.info').innerText();
        expect(noEntryMessage).toContain('No entry found'); // Assuming there's a message for no entry found
    });
});