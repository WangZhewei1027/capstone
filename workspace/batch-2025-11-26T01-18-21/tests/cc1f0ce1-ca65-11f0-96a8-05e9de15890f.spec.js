import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1f0ce1-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Sliding Window Visualizer Tests', () => {
    
    test('Initial State - Idle', async ({ page }) => {
        const modeSelect = await page.locator('#mode');
        await expect(modeSelect).toHaveValue('fixed');
    });

    test('Change Mode to Min Length', async ({ page }) => {
        await page.selectOption('#mode', 'minlen');
        await expect(page.locator('#target-card')).toBeVisible();
    });

    test('Change Mode to Unique', async ({ page }) => {
        await page.selectOption('#mode', 'unique');
        await expect(page.locator('#string-card')).toBeVisible();
    });

    test('Apply Valid Array', async ({ page }) => {
        await page.fill('#array-input', '2,1,5,1,3,2');
        await page.click('#apply-array');
        await expect(page.locator('#array-visual .cell')).toHaveCount(6);
    });

    test('Apply Invalid Array', async ({ page }) => {
        await page.fill('#array-input', '2,1,abc,1,3,2');
        await page.click('#apply-array');
        await page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Invalid array input: use comma separated numbers');
            await dialog.dismiss();
        });
    });

    test('Generate Random Array', async ({ page }) => {
        await page.click('#random-array');
        const arrayVisual = await page.locator('#array-visual .cell');
        await expect(arrayVisual).toHaveCount(6);
    });

    test('Apply Valid String', async ({ page }) => {
        await page.selectOption('#mode', 'unique');
        await page.fill('#string-input', 'abcabcbb');
        await page.click('#apply-string');
        await expect(page.locator('#array-visual .cell')).toHaveCount(8);
    });

    test('Generate Random String', async ({ page }) => {
        await page.click('#random-string');
        const stringInputValue = await page.inputValue('#string-input');
        await expect(stringInputValue).toHaveLength(5);
    });

    test('Change Window Size k', async ({ page }) => {
        await page.fill('#k', '4');
        await page.click('#apply-array');
        await expect(page.locator('#array-visual .cell')).toHaveCount(6);
    });

    test('Change Target Sum', async ({ page }) => {
        await page.selectOption('#mode', 'minlen');
        await page.fill('#target', '5');
        await page.click('#apply-array');
        await expect(page.locator('#array-visual .cell')).toHaveCount(6);
    });

    test('Play/Pause Functionality', async ({ page }) => {
        await page.click('#play');
        await expect(page.locator('#play')).toHaveText('Pause');
        await page.click('#play');
        await expect(page.locator('#play')).toHaveText('Play');
    });

    test('Step Forward', async ({ page }) => {
        await page.click('#step');
        const currentStep = await page.locator('#stats').innerText();
        expect(currentStep).toContain('Step: 1');
    });

    test('Step Backward', async ({ page }) => {
        await page.click('#step');
        await page.click('#back');
        const currentStep = await page.locator('#stats').innerText();
        expect(currentStep).toContain('Step: 0');
    });

    test('Reset Functionality', async ({ page }) => {
        await page.click('#reset');
        const currentStep = await page.locator('#stats').innerText();
        expect(currentStep).toContain('Step: 1');
    });

    test('Change Playback Speed', async ({ page }) => {
        await page.fill('#speed', '200');
        await expect(page.locator('#speed')).toHaveValue('200');
    });

    test('Error Alert on Invalid Array Input', async ({ page }) => {
        await page.fill('#array-input', '1,2,abc');
        await page.click('#apply-array');
        await page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Invalid array input: use comma separated numbers');
            await dialog.dismiss();
        });
    });

    test('Check if Steps Exhausted', async ({ page }) => {
        await page.selectOption('#mode', 'fixed');
        await page.fill('#array-input', '1,2,3');
        await page.click('#apply-array');
        await page.click('#play');
        await page.waitForTimeout(1000); // Wait for a few ticks
        const statsText = await page.locator('#stats').innerText();
        expect(statsText).toContain('Step: 3 / 3');
    });

    test('Dismiss Alert after Invalid Input', async ({ page }) => {
        await page.fill('#array-input', '1,2,abc');
        await page.click('#apply-array');
        await page.on('dialog', async dialog => {
            await dialog.dismiss();
            await expect(page.locator('#array-input')).toBeFocused();
        });
    });
});