import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0e40f420-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Radix Sort Interactive Module', () => {
    
    test('should start in idle state', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should transition to sorting state on sort button click', async ({ page }) => {
        await page.fill('#numbersInput', '170,45,75,90,802,24,2,66');
        await page.click('#sortButton');
        
        const output1 = await page.locator('#output1').innerText();
        expect(output).toBe('Sorting...');
    });

    test('should transition to done state after sorting is complete', async ({ page }) => {
        await page.fill('#numbersInput', '170,45,75,90,802,24,2,66');
        await page.click('#sortButton');
        
        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration
        
        const output2 = await page.locator('#output2').innerText();
        expect(output).toContain('Sorted:');
    });

    test('should allow stepping through the sort process', async ({ page }) => {
        await page.fill('#numbersInput', '170,45,75,90,802,24,2,66');
        await page.click('#sortButton');
        
        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration
        
        await page.click('#stepButton');
        
        const output3 = await page.locator('#output3').innerText();
        expect(output).toContain('Current Step:');
    });

    test('should remain in stepping state on multiple step button clicks', async ({ page }) => {
        await page.fill('#numbersInput', '170,45,75,90,802,24,2,66');
        await page.click('#sortButton');
        
        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration
        
        await page.click('#stepButton');
        await page.click('#stepButton');
        
        const output4 = await page.locator('#output4').innerText();
        expect(output).toContain('Current Step:');
    });

    test('should transition back to idle state on reset button click', async ({ page }) => {
        await page.fill('#numbersInput', '170,45,75,90,802,24,2,66');
        await page.click('#sortButton');
        
        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration
        
        await page.click('#resetButton');
        
        const output5 = await page.locator('#output5').innerText();
        expect(output).toBe('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.click('#sortButton');
        
        const output6 = await page.locator('#output6').innerText();
        expect(output).toContain('Please enter valid numbers.');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#numbersInput', 'abc,123,456');
        await page.click('#sortButton');
        
        const output7 = await page.locator('#output7').innerText();
        expect(output).toContain('Please enter valid numbers.');
    });
});