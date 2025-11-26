import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba4b7b0-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Hash Map Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should add a cell to the hash map', async ({ page }) => {
        // Test adding a cell to the hash map
        await page.evaluate(() => addCell(1, 'A', 'Value1'));
        const cells = await page.locator('#hash-map .cell').count();
        expect(cells).toBe(1);
    });

    test('should show alert when adding a duplicate cell', async ({ page }) => {
        // Test adding a duplicate cell
        await page.evaluate(() => addCell(1, 'A', 'Value1'));
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.evaluate(() => addCell(1, 'A', 'Value2')) // Attempt to add duplicate
        ]);
        expect(alert.message()).toBe('Cell already exists');
        await alert.dismiss();
    });

    test('should remove a cell from the hash map', async ({ page }) => {
        // Test removing a cell from the hash map
        await page.evaluate(() => addCell(1, 'A', 'Value1'));
        await page.evaluate(() => removeCell(1, 'A'));
        const cells = await page.locator('#hash-map .cell').count();
        expect(cells).toBe(0);
    });

    test('should show alert when removing a non-existent cell', async ({ page }) => {
        // Test removing a non-existent cell
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.evaluate(() => removeCell(1, 'A')) // Attempt to remove non-existent cell
        ]);
        expect(alert.message()).toBe('Cell does not exist');
        await alert.dismiss();
    });

    test('should update a cell in the hash map', async ({ page }) => {
        // Test updating a cell in the hash map
        await page.evaluate(() => addCell(1, 'A', 'Value1'));
        await page.evaluate(() => updateCell(1, 'A', 'UpdatedValue'));
        const cellText = await page.locator('#hash-map .cell').textContent();
        expect(cellText).toBe('UpdatedValue');
    });

    test('should show alert when updating a non-existent cell', async ({ page }) => {
        // Test updating a non-existent cell
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'),
            page.evaluate(() => updateCell(1, 'A', 'UpdatedValue')) // Attempt to update non-existent cell
        ]);
        expect(alert.message()).toBe('Cell does not exist');
        await alert.dismiss();
    });

    test('should print the current state of the hash map to the console', async ({ page }) => {
        // Test printing the hash map
        await page.evaluate(() => addCell(1, 'A', 'Value1'));
        const consoleLogSpy = await page.evaluate(() => {
            const originalLog = console.log;
            let logs = [];
            console.log = (...args) => {
                logs.push(args);
                originalLog.apply(console, args);
            };
            return logs;
        });
        await page.evaluate(() => printHashMap());
        expect(consoleLogSpy.length).toBeGreaterThan(0);
        expect(consoleLogSpy[0][0]).toContain('Hash Map:');
    });

    test('should update cells periodically', async ({ page }) => {
        // Test periodic updates of cells
        await page.evaluate(() => addCell(1, 'A', 'Value1'));
        await page.waitForTimeout(1500); // Wait for at least one update cycle
        const cellText = await page.locator('#hash-map .cell').textContent();
        expect(cellText).toBe('2'); // Expect the cell value to be updated
    });
});