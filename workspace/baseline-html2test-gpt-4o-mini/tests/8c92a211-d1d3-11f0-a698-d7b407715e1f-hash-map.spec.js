import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c92a211-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Hash Map Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify the initial state of the application
        const mapDisplay = await page.locator('#mapDisplay');
        await expect(mapDisplay).toHaveText('Hash Map Entries:');
    });

    test('should add an entry to the hash map', async ({ page }) => {
        // Test adding an entry to the hash map
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button:has-text("Add Entry")');

        // Verify the alert message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Entry added!');
            await dialog.dismiss();
        });

        // Display the entries to verify the addition
        await page.click('button:has-text("Display Entries")');
        const mapDisplay = await page.locator('#mapDisplay');
        await expect(mapDisplay).toHaveText(/"testKey": "testValue"/);
    });

    test('should remove an entry from the hash map', async ({ page }) => {
        // First, add an entry to remove it later
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button:has-text("Add Entry")');

        // Now remove the entry
        await page.fill('#key', 'testKey');
        await page.click('button:has-text("Remove Entry")');

        // Verify the alert message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Entry removed!');
            await dialog.dismiss();
        });

        // Display the entries to verify the removal
        await page.click('button:has-text("Display Entries")');
        const mapDisplay = await page.locator('#mapDisplay');
        await expect(mapDisplay).not.toHaveText(/"testKey": "testValue"/);
    });

    test('should show an alert when adding an entry without key or value', async ({ page }) => {
        // Attempt to add an entry without key and value
        await page.click('button:has-text("Add Entry")');

        // Verify the alert message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter both key and value.');
            await dialog.dismiss();
        });
    });

    test('should show an alert when removing an entry without key', async ({ page }) => {
        // Attempt to remove an entry without key
        await page.click('button:has-text("Remove Entry")');

        // Verify the alert message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a key to remove.');
            await dialog.dismiss();
        });
    });

    test('should display the current entries in the hash map', async ({ page }) => {
        // Add multiple entries
        await page.fill('#key', 'firstKey');
        await page.fill('#value', 'firstValue');
        await page.click('button:has-text("Add Entry")');

        await page.fill('#key', 'secondKey');
        await page.fill('#value', 'secondValue');
        await page.click('button:has-text("Add Entry")');

        // Display the entries
        await page.click('button:has-text("Display Entries")');
        const mapDisplay = await page.locator('#mapDisplay');
        await expect(mapDisplay).toHaveText(/"firstKey": "firstValue"/);
        await expect(mapDisplay).toHaveText(/"secondKey": "secondValue"/);
    });
});