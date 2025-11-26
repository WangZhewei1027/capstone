import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba505d1-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Red-Black Tree Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with the title', async ({ page }) => {
        // Validate that the application is in the Idle state
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Red-Black Tree');
    });

    test('should add a red node to the tree', async ({ page }) => {
        // Test adding a red node and verify the transition to Node Added state
        await page.fill('#value', '10');
        await page.selectOption('#color', 'red');
        await page.click('#add-btn');

        // Check console output for the added node
        const consoleOutput = await page.evaluate(() => {
            return console.log = jest.fn();
        });
        expect(consoleOutput).toHaveBeenCalledWith('10 (red)');
    });

    test('should add a black node to the tree', async ({ page }) => {
        // Test adding a black node and verify the transition to Node Added state
        await page.fill('#value', '20');
        await page.selectOption('#color', 'black');
        await page.click('#add-btn');

        // Check console output for the added node
        const consoleOutput = await page.evaluate(() => {
            return console.log = jest.fn();
        });
        expect(consoleOutput).toHaveBeenCalledWith('20 (black)');
    });

    test('should handle adding a node with no value', async ({ page }) => {
        // Test adding a node with no value and expect no addition
        await page.fill('#value', '');
        await page.selectOption('#color', 'red');
        await page.click('#add-btn');

        // Validate that no node is added (console log should not be called)
        const consoleOutput = await page.evaluate(() => {
            return console.log = jest.fn();
        });
        expect(consoleOutput).not.toHaveBeenCalled();
    });

    test('should handle adding a node with invalid value', async ({ page }) => {
        // Test adding a node with an invalid value and expect no addition
        await page.fill('#value', 'invalid');
        await page.selectOption('#color', 'black');
        await page.click('#add-btn');

        // Validate that no node is added (console log should not be called)
        const consoleOutput = await page.evaluate(() => {
            return console.log = jest.fn();
        });
        expect(consoleOutput).not.toHaveBeenCalled();
    });

    test('should verify the tree structure after adding nodes', async ({ page }) => {
        // Add multiple nodes and verify the tree structure
        await page.fill('#value', '30');
        await page.selectOption('#color', 'red');
        await page.click('#add-btn');

        await page.fill('#value', '40');
        await page.selectOption('#color', 'black');
        await page.click('#add-btn');

        // Check console output for the added nodes
        const consoleOutput = await page.evaluate(() => {
            return console.log = jest.fn();
        });
        expect(consoleOutput).toHaveBeenCalledWith('30 (red)');
        expect(consoleOutput).toHaveBeenCalledWith('40 (black)');
    });

    test.afterEach(async ({ page }) => {
        // Clean up actions after each test if necessary
    });
});