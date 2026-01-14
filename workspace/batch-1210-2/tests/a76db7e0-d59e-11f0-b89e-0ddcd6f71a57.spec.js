import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/a76db7e0-d59e-11f0-b89e-0ddcd6f71a57.html';

test.describe('Binary Search Tree Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should render the initial page with input and buttons', async ({ page }) => {
        // Verify that the initial elements are present
        await expect(page.locator('#search-input')).toBeVisible();
        await expect(page.locator('#search-button')).toBeVisible();
        await expect(page.locator('#add-button')).toBeVisible();
        await expect(page.locator('#delete-button')).toBeVisible();
        await expect(page.locator('#clear-button')).toBeVisible();
        await expect(page.locator('#tree')).toBeVisible();
    });

    test('should search for a value and show found message', async ({ page }) => {
        await page.fill('#search-input', '10');
        await page.click('#search-button');
        await expect(page.locator('#tree')).toHaveText('Not found');
    });

    test('should add a node and show new node message', async ({ page }) => {
        await page.fill('#search-input', '10');
        await page.click('#add-button');
        await expect(page.locator('#tree')).toHaveText('New Node: 10');
    });

    test('should search for an existing value and show found message', async ({ page }) => {
        await page.fill('#search-input', '10');
        await page.click('#add-button');
        await page.fill('#search-input', '10');
        await page.click('#search-button');
        await expect(page.locator('#tree')).toHaveText('Found: 10');
    });

    test('should delete a node and show deleted node message', async ({ page }) => {
        await page.fill('#search-input', '10');
        await page.click('#add-button');
        await page.fill('#search-input', '10');
        await page.click('#delete-button');
        await expect(page.locator('#tree')).toHaveText('Deleted Node: 10');
    });

    test('should search for a deleted value and show not found message', async ({ page }) => {
        await page.fill('#search-input', '10');
        await page.click('#add-button');
        await page.fill('#search-input', '10');
        await page.click('#delete-button');
        await page.fill('#search-input', '10');
        await page.click('#search-button');
        await expect(page.locator('#tree')).toHaveText('Not found');
    });

    test('should clear the tree and show empty message', async ({ page }) => {
        await page.fill('#search-input', '10');
        await page.click('#add-button');
        await page.click('#clear-button');
        await expect(page.locator('#tree')).toHaveText('');
    });

    test('should handle search for empty input', async ({ page }) => {
        await page.click('#search-button');
        await expect(page.locator('#tree')).toHaveText('Not found');
    });

    test('should handle adding a node with empty input', async ({ page }) => {
        await page.click('#add-button');
        await expect(page.locator('#tree')).toHaveText('New Node: ');
    });

    test('should handle deleting a node with empty input', async ({ page }) => {
        await page.click('#delete-button');
        await expect(page.locator('#tree')).toHaveText('Deleted Node: ');
    });

    test('should handle clearing an already empty tree', async ({ page }) => {
        await page.click('#clear-button');
        await expect(page.locator('#tree')).toHaveText('');
    });
});