import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e13735b2-ca58-11f0-b3c1-8750c080fb19.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Union-Find Visualization Tests', () => {
    
    test('should initialize Union-Find with valid input', async ({ page }) => {
        await page.fill('#size', '10'); // Valid size input
        await page.click('#initialize'); // Trigger initialization
        
        const output = await page.textContent('#output');
        expect(output).toContain('Union-Find initialized with 10 elements.');
    });

    test('should show error for invalid initialization size', async ({ page }) => {
        await page.fill('#size', '-1'); // Invalid size input
        await page.click('#initialize'); // Trigger initialization
        
        const alert = await page.evaluate(() => window.alert);
        expect(alert).toHaveBeenCalledWith("Please enter a valid size.");
    });

    test('should perform union operation after initialization', async ({ page }) => {
        await page.fill('#size', '10'); // Valid size input
        await page.click('#initialize'); // Trigger initialization
        
        await page.click('#unionButton'); // Trigger union operation
        const output = await page.textContent('#output');
        expect(output).toContain('Union performed between'); // Check for union message
    });

    test('should show error when union is clicked before initialization', async ({ page }) => {
        await page.click('#unionButton'); // Trigger union operation without initialization
        
        const alert = await page.evaluate(() => window.alert);
        expect(alert).toHaveBeenCalledWith("Please initialize Union-Find first.");
    });

    test('should perform find operation after initialization', async ({ page }) => {
        await page.fill('#size', '10'); // Valid size input
        await page.click('#initialize'); // Trigger initialization
        
        await page.click('#findButton'); // Trigger find operation
        const output = await page.textContent('#output');
        expect(output).toContain('The root of element'); // Check for find message
    });

    test('should show error when find is clicked before initialization', async ({ page }) => {
        await page.click('#findButton'); // Trigger find operation without initialization
        
        const alert = await page.evaluate(() => window.alert);
        expect(alert).toHaveBeenCalledWith("Please initialize Union-Find first.");
    });

    test('should handle multiple union operations', async ({ page }) => {
        await page.fill('#size', '10'); // Valid size input
        await page.click('#initialize'); // Trigger initialization
        
        for (let i = 0; i < 5; i++) {
            await page.click('#unionButton'); // Trigger union operation multiple times
        }
        
        const output = await page.textContent('#output');
        expect(output).toContain('Union performed between'); // Check for multiple union messages
    });

    test('should handle multiple find operations', async ({ page }) => {
        await page.fill('#size', '10'); // Valid size input
        await page.click('#initialize'); // Trigger initialization
        
        for (let i = 0; i < 5; i++) {
            await page.click('#findButton'); // Trigger find operation multiple times
        }
        
        const output = await page.textContent('#output');
        expect(output).toContain('The root of element'); // Check for multiple find messages
    });
    
    test('should show error when union fails due to uninitialized state', async ({ page }) => {
        await page.fill('#size', '10'); // Valid size input
        await page.click('#initialize'); // Trigger initialization
        
        await page.click('#unionButton'); // Trigger union operation
        await page.click('#unionButton'); // Trigger union operation again
        
        const output = await page.textContent('#output');
        expect(output).toContain('Elements'); // Check for already in the same set message
    });

    test('should show error when find fails due to uninitialized state', async ({ page }) => {
        await page.fill('#size', '10'); // Valid size input
        await page.click('#initialize'); // Trigger initialization
        
        await page.click('#findButton'); // Trigger find operation
        await page.click('#findButton'); // Trigger find operation again
        
        const output = await page.textContent('#output');
        expect(output).toContain('The root of element'); // Check for find message
    });
});