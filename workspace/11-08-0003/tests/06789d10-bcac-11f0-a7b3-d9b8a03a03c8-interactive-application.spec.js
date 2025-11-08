import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/06789d10-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Selection Sort Application', () => {
    
    test('Initial state should be idle', async ({ page }) => {
        const infoText = await page.textContent('#info');
        expect(infoText).toBe('Click "Start Sorting" to see the Selection Sort in action!');
        
        const startButtonDisabled = await page.isDisabled('#startSort');
        expect(startButtonDisabled).toBe(false);
    });

    test('Start sorting transitions to sorting state', async ({ page }) => {
        await page.click('#startSort');
        
        const startButtonDisabled1 = await page.isDisabled('#startSort');
        expect(startButtonDisabled).toBe(true);
        
        const infoText1 = await page.textContent('#info');
        expect(infoText).not.toBe('Click "Start Sorting" to see the Selection Sort in action!');
    });

    test('Sorting completes and transitions to done state', async ({ page }) => {
        await page.click('#startSort');

        // Simulate sorting completion
        await page.evaluate(() => {
            document.dispatchEvent(new Event('SORT_COMPLETE'));
        });

        const infoText2 = await page.textContent('#info');
        expect(infoText).toBe('Sorting complete!');
        
        const startButtonDisabled2 = await page.isDisabled('#startSort');
        expect(startButtonDisabled).toBe(false);
    });

    test('Resetting transitions back to idle state', async ({ page }) => {
        await page.click('#startSort');

        // Simulate sorting completion
        await page.evaluate(() => {
            document.dispatchEvent(new Event('SORT_COMPLETE'));
        });

        await page.click('#reset');

        const infoText3 = await page.textContent('#info');
        expect(infoText).toBe('Click "Start Sorting" to see the Selection Sort in action!');
        
        const startButtonDisabled3 = await page.isDisabled('#startSort');
        expect(startButtonDisabled).toBe(false);
    });

    test('Resetting while in idle state generates a new array', async ({ page }) => {
        await page.click('#reset');

        const initialArray = await page.$$eval('.element', elements => elements.map(el => el.textContent));
        
        // Ensure the array is generated
        expect(initialArray.length).toBeGreaterThan(0);
        
        // Reset again and check if the array changes
        await page.click('#reset');
        const newArray = await page.$$eval('.element', elements => elements.map(el => el.textContent));
        
        expect(initialArray).not.toEqual(newArray);
    });

    test('Start button should be disabled during sorting', async ({ page }) => {
        await page.click('#startSort');

        // Simulate sorting in progress
        await page.evaluate(() => {
            setTimeout(() => {
                document.dispatchEvent(new Event('SORT_COMPLETE'));
            }, 1000);
        });

        const startButtonDisabled4 = await page.isDisabled('#startSort');
        expect(startButtonDisabled).toBe(true);
        
        // Wait for sorting to complete
        await page.waitForTimeout(1100);
        
        const startButtonEnabled = await page.isDisabled('#startSort');
        expect(startButtonEnabled).toBe(false);
    });
});