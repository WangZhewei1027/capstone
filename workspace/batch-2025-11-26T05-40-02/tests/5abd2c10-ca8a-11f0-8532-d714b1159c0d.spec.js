import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abd2c10-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Hash Map Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the application is in the Idle state
        const hashMapDisplay = await page.locator('#hash-map').innerHTML();
        expect(hashMapDisplay).toBe('');
    });

    test('Add Item - Valid Input', async ({ page }) => {
        // Test adding an item with valid input
        await page.fill('input[type="text"]', 'Alice');
        await page.fill('input[type="number"]', '30');
        await page.click('button[type="submit"]');

        // Verify that the item was added to the hash map
        const hashMapDisplay = await page.locator('#hash-map').innerHTML();
        expect(hashMapDisplay).toContain('Alice: 30');
    });

    test('Add Item - Missing Name', async ({ page }) => {
        // Test adding an item with missing name
        await page.fill('input[type="number"]', '25');
        await page.click('button[type="submit"]');

        // Verify that the hash map remains unchanged
        const hashMapDisplay = await page.locator('#hash-map').innerHTML();
        expect(hashMapDisplay).toBe('');
        // Check for alert message
        await expect(page.locator('text=Please fill in both name and age.')).toBeVisible();
    });

    test('Add Item - Missing Age', async ({ page }) => {
        // Test adding an item with missing age
        await page.fill('input[type="text"]', 'Bob');
        await page.click('button[type="submit"]');

        // Verify that the hash map remains unchanged
        const hashMapDisplay = await page.locator('#hash-map').innerHTML();
        expect(hashMapDisplay).toBe('');
        // Check for alert message
        await expect(page.locator('text=Please fill in both name and age.')).toBeVisible();
    });

    test('Add Item - Invalid Age', async ({ page }) => {
        // Test adding an item with invalid age
        await page.fill('input[type="text"]', 'Charlie');
        await page.fill('input[type="number"]', '-5'); // Invalid age
        await page.click('button[type="submit"]');

        // Verify that the hash map remains unchanged
        const hashMapDisplay = await page.locator('#hash-map').innerHTML();
        expect(hashMapDisplay).toBe('');
        // Check for alert message
        await expect(page.locator('text=Please fill in both name and age.')).toBeVisible();
    });

    test('Add Item - Duplicate Name', async ({ page }) => {
        // Test adding an item with a duplicate name
        await page.fill('input[type="text"]', 'Alice');
        await page.fill('input[type="number"]', '35');
        await page.click('button[type="submit"]');

        // Verify that the item was added and updated in the hash map
        const hashMapDisplay = await page.locator('#hash-map').innerHTML();
        expect(hashMapDisplay).toContain('Alice: 30, 35');
    });

    test('Add Item - Multiple Entries', async ({ page }) => {
        // Test adding multiple items
        await page.fill('input[type="text"]', 'David');
        await page.fill('input[type="number"]', '40');
        await page.click('button[type="submit"]');

        await page.fill('input[type="text"]', 'Eve');
        await page.fill('input[type="number"]', '22');
        await page.click('button[type="submit"]');

        // Verify that both items are displayed in the hash map
        const hashMapDisplay = await page.locator('#hash-map').innerHTML();
        expect(hashMapDisplay).toContain('David: 40');
        expect(hashMapDisplay).toContain('Eve: 22');
    });
});