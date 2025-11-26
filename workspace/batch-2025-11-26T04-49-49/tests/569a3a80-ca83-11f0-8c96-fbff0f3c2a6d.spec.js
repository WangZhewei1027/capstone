import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569a3a80-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Interactive Application State Machine Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const idleState = await page.locator('body').evaluate(() => document.body.className);
        expect(idleState).toBe('Idle');
    });

    test('Set button should be enabled in Idle state', async ({ page }) => {
        const setButton = page.locator('#setButton');
        await expect(setButton).toBeEnabled();
    });

    test('Transition to SettingValue state on Set button click', async ({ page }) => {
        await page.fill('#valueInput', '10');
        await page.click('#setButton');

        const settingValueState = await page.locator('body').evaluate(() => document.body.className);
        expect(settingValueState).toBe('SettingValue');
    });

    test('Highlight input field when setting value', async ({ page }) => {
        await page.fill('#valueInput', '10');
        await page.click('#setButton');
        
        const inputHighlight = await page.locator('#valueInput').evaluate((el) => getComputedStyle(el).borderColor);
        expect(inputHighlight).toBe('rgb(255, 255, 0)'); // Assuming highlight color is yellow
    });

    test('Transition to ValidatingInput state after entering value', async ({ page }) => {
        await page.fill('#valueInput', '10');
        await page.click('#setButton');
        await page.fill('#valueInput', '20');

        const validatingInputState = await page.locator('body').evaluate(() => document.body.className);
        expect(validatingInputState).toBe('ValidatingInput');
    });

    test('Show error alert when input validation fails', async ({ page }) => {
        await page.click('#setButton'); // Click without input
        const errorDialogVisible = await page.locator('.error-dialog').isVisible();
        expect(errorDialogVisible).toBe(true);
    });

    test('Dismiss error alert and return to Idle state', async ({ page }) => {
        await page.click('#setButton'); // Click without input
        await page.click('.error-dialog .dismiss-button'); // Assuming there's a dismiss button

        const idleState = await page.locator('body').evaluate(() => document.body.className);
        expect(idleState).toBe('Idle');
    });

    test('Transition to ValueSet state after successful validation', async ({ page }) => {
        await page.fill('#valueInput', '10');
        await page.click('#setButton');
        await page.fill('#valueInput', '20'); // Valid input
        await page.click('#setButton'); // Trigger validation

        const valueSetState = await page.locator('body').evaluate(() => document.body.className);
        expect(valueSetState).toBe('ValueSet');
    });

    test('Check array display updates after value is set', async ({ page }) => {
        await page.fill('#valueInput', '10');
        await page.click('#setButton');
        await page.fill('#valueInput', '20'); // Valid input
        await page.click('#setButton'); // Trigger validation

        const arrayDisplay = await page.locator('.arrayDisplay').innerText();
        expect(arrayDisplay).toContain('20'); // Assuming the display shows the value set
    });

    test('Reset button should clear the array and input field', async ({ page }) => {
        await page.fill('#valueInput', '10');
        await page.click('#setButton');
        await page.fill('#valueInput', '20'); // Valid input
        await page.click('#setButton'); // Trigger validation

        await page.click('#resetButton'); // Click reset

        const arrayDisplay = await page.locator('.arrayDisplay').innerText();
        expect(arrayDisplay).toBe(''); // Assuming it clears the display
        const inputValue = await page.locator('#valueInput').inputValue();
        expect(inputValue).toBe(''); // Input should also be cleared
    });

    test('Transition to Resetting state on Reset button click', async ({ page }) => {
        await page.fill('#valueInput', '10');
        await page.click('#setButton');
        await page.fill('#valueInput', '20'); // Valid input
        await page.click('#setButton'); // Trigger validation

        await page.click('#resetButton'); // Click reset

        const resettingState = await page.locator('body').evaluate(() => document.body.className);
        expect(resettingState).toBe('Resetting');
    });

    test('Ensure all states and transitions are validated', async ({ page }) => {
        // This test can be a comprehensive check for all transitions
        await page.fill('#valueInput', '10');
        await page.click('#setButton');
        await page.fill('#valueInput', '20'); // Valid input
        await page.click('#setButton'); // Trigger validation

        const valueSetState = await page.locator('body').evaluate(() => document.body.className);
        expect(valueSetState).toBe('ValueSet');

        await page.click('#resetButton'); // Click reset

        const idleState = await page.locator('body').evaluate(() => document.body.className);
        expect(idleState).toBe('Idle');
    });
});