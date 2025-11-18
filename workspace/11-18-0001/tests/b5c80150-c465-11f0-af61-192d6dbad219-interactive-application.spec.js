import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0001/html/b5c80150-c465-11f0-af61-192d6dbad219.html';

test.describe('Interactive Stack Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Initial State', () => {
        test('should be in idle state initially', async ({ page }) => {
            const stackContainer = await page.locator('#stack-container');
            const resultDiv = await page.locator('#result');
            const popButton = await page.locator('#pop-button');

            await expect(stackContainer).toHaveText('');
            await expect(resultDiv).toHaveText('');
            await expect(popButton).toBeDisabled();
        });
    });

    test.describe('Pushing Elements', () => {
        test('should push an element onto the stack', async ({ page }) => {
            const elementInput = await page.locator('#element-input');
            const pushButton = await page.locator('#push-button');
            const resultDiv1 = await page.locator('#result');

            await elementInput.fill('Element 1');
            await pushButton.click();

            const stackContainer1 = await page.locator('#stack-container');
            await expect(stackContainer).toHaveText('Element 1');
            await expect(resultDiv).toHaveText('"Element 1" has been pushed onto the stack.');
        });

        test('should update stack display when multiple elements are pushed', async ({ page }) => {
            const elementInput1 = await page.locator('#element-input');
            const pushButton1 = await page.locator('#push-button');

            await elementInput.fill('Element 1');
            await pushButton.click();
            await elementInput.fill('Element 2');
            await pushButton.click();

            const stackContainer2 = await page.locator('#stack-container');
            await expect(stackContainer).toHaveText('Element 1Element 2');
        });

        test('should not push empty element', async ({ page }) => {
            const elementInput2 = await page.locator('#element-input');
            const pushButton2 = await page.locator('#push-button');
            const resultDiv2 = await page.locator('#result');

            await elementInput.fill('');
            await pushButton.click();

            const stackContainer3 = await page.locator('#stack-container');
            await expect(stackContainer).toHaveText('');
            await expect(resultDiv).toHaveText('');
        });
    });

    test.describe('Popping Elements', () => {
        test.beforeEach(async ({ page }) => {
            const elementInput3 = await page.locator('#element-input');
            const pushButton3 = await page.locator('#push-button');

            await elementInput.fill('Element 1');
            await pushButton.click();
            await elementInput.fill('Element 2');
            await pushButton.click();
        });

        test('should pop an element from the stack', async ({ page }) => {
            const popButton1 = await page.locator('#pop-button');
            const resultDiv3 = await page.locator('#result');

            await popButton.click();

            const stackContainer4 = await page.locator('#stack-container');
            await expect(stackContainer).toHaveText('Element 1');
            await expect(resultDiv).toHaveText('"Element 2" has been popped from the stack.');
        });

        test('should disable pop button when stack is empty', async ({ page }) => {
            const popButton2 = await page.locator('#pop-button');

            await popButton.click(); // Pop Element 2
            await popButton.click(); // Pop Element 1

            const stackContainer5 = await page.locator('#stack-container');
            await expect(stackContainer).toHaveText('');
            await expect(popButton).toBeDisabled();
        });

        test('should not pop when stack is empty', async ({ page }) => {
            const popButton3 = await page.locator('#pop-button');
            const resultDiv4 = await page.locator('#result');

            await popButton.click(); // Pop Element 2
            await popButton.click(); // Pop Element 1
            await popButton.click(); // Attempt to pop again

            await expect(resultDiv).toHaveText('"undefined" has been popped from the stack.'); // Expecting undefined since stack is empty
        });
    });
});