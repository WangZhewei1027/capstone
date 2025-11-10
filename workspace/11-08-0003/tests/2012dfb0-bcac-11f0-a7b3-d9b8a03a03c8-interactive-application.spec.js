import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/2012dfb0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Two Pointers Exploration', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state visualization', async () => {
        // Validate that the initial state is set correctly
        const elements = await page.$$('.element');
        expect(elements.length).toBe(5); // Check if all elements are rendered

        const leftPointer = await page.$('.element.pointer:nth-child(1)');
        const rightPointer = await page.$('.element.pointer:nth-child(5)');
        expect(leftPointer).not.toBeNull(); // Validate left pointer is present
        expect(rightPointer).not.toBeNull(); // Validate right pointer is present
    });

    test('Transition to POINTERS_MOVING state', async () => {
        // Click the next step button to transition to POINTERS_MOVING
        await page.click('#nextStep');

        // Validate that the pointers are moving
        const leftPointer1 = await page.$('.element.pointer:nth-child(2)');
        const rightPointer1 = await page.$('.element.pointer:nth-child(5)');
        expect(leftPointer).not.toBeNull(); // Validate left pointer moved
        expect(rightPointer).not.toBeNull(); // Validate right pointer remains
    });

    test('Transition to POINTERS_MOVED state', async () => {
        // Click the next step button to transition to POINTERS_MOVED
        await page.click('#nextStep');

        // Validate the pointers are in POINTERS_MOVED state
        const leftPointer2 = await page.$('.element.pointer:nth-child(3)');
        const rightPointer2 = await page.$('.element.pointer:nth-child(5)');
        expect(leftPointer).not.toBeNull(); // Validate left pointer moved again
        expect(rightPointer).not.toBeNull(); // Validate right pointer remains
    });

    test('Transition to DONE state when pointers cross', async () => {
        // Simulate crossing the pointers
        await page.evaluate(() => {
            window.rightPointer = 0; // Move right pointer to cross
        });

        // Click the next step button to transition to DONE
        await page.click('#nextStep');

        // Validate that the DONE state is reached
        const nextStepButton = await page.$('#nextStep');
        expect(await nextStepButton.isDisabled()).toBe(true); // Validate button is disabled
    });

    test('Check if DONE state allows no further transitions', async () => {
        // Attempt to click the next step button in DONE state
        const nextStepButton1 = await page.$('#nextStep');
        await nextStepButton.click();

        // Validate that the state remains DONE and button is still disabled
        expect(await nextStepButton.isDisabled()).toBe(true);
    });

    test('State reset after page reload', async () => {
        // Reload the page to reset the state
        await page.reload();

        // Validate that the initial state is restored
        const elements1 = await page.$$('.element');
        expect(elements.length).toBe(5); // Check if all elements are rendered

        const leftPointer3 = await page.$('.element.pointer:nth-child(1)');
        const rightPointer3 = await page.$('.element.pointer:nth-child(5)');
        expect(leftPointer).not.toBeNull(); // Validate left pointer is present
        expect(rightPointer).not.toBeNull(); // Validate right pointer is present
    });
});