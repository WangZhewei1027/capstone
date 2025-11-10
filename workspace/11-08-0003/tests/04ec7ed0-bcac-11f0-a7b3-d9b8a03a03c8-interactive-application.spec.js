import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/04ec7ed0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Radix Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        const nextButton = await page.locator('#nextButton');
        const resetButton = await page.locator('#resetButton');

        // Verify that the Next and Reset buttons are disabled
        await expect(nextButton).toBeDisabled();
        await expect(resetButton).toBeDisabled();
    });

    test('Visualize button click transitions to visualizing state', async ({ page }) => {
        const inputField = await page.locator('#numberInput');
        const visualizeButton = await page.locator('#visualizeButton');

        // Enter numbers and click visualize
        await inputField.fill('170,45,75');
        await visualizeButton.click();

        // Verify that the Next and Reset buttons are enabled
        const nextButton1 = await page.locator('#nextButton1');
        const resetButton1 = await page.locator('#resetButton1');
        await expect(nextButton).toBeEnabled();
        await expect(resetButton).toBeEnabled();

        // Verify that bars are created in the visualization area
        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(3);
    });

    test('Next button click transitions to stepping state', async ({ page }) => {
        const inputField1 = await page.locator('#numberInput');
        const visualizeButton1 = await page.locator('#visualizeButton1');
        const nextButton2 = await page.locator('#nextButton2');

        // Enter numbers and click visualize
        await inputField.fill('170,45,75');
        await visualizeButton.click();

        // Click next button to transition to stepping state
        await nextButton.click();

        // Verify that the Next button remains enabled
        await expect(nextButton).toBeEnabled();

        // Verify that the visualization updates (check for height change)
        const bars1 = await page.locator('.bar');
        const firstBarHeight = await bars.nth(0).evaluate(bar => bar.style.height);
        await expect(firstBarHeight).not.toBe('0px');
    });

    test('Reset button click returns to idle state', async ({ page }) => {
        const inputField2 = await page.locator('#numberInput');
        const visualizeButton2 = await page.locator('#visualizeButton2');
        const resetButton2 = await page.locator('#resetButton2');

        // Enter numbers and click visualize
        await inputField.fill('170,45,75');
        await visualizeButton.click();

        // Click reset button
        await resetButton.click();

        // Verify that the Next and Reset buttons are disabled
        const nextButton3 = await page.locator('#nextButton3');
        await expect(nextButton).toBeDisabled();
        await expect(resetButton).toBeDisabled();

        // Verify that the visualization area is empty
        const bars2 = await page.locator('.bar');
        await expect(bars).toHaveCount(0);
    });

    test('Multiple next button clicks remain in stepping state', async ({ page }) => {
        const inputField3 = await page.locator('#numberInput');
        const visualizeButton3 = await page.locator('#visualizeButton3');
        const nextButton4 = await page.locator('#nextButton4');

        // Enter numbers and click visualize
        await inputField.fill('170,45,75');
        await visualizeButton.click();

        // Click next button multiple times
        await nextButton.click();
        await nextButton.click();

        // Verify that the Next button remains enabled
        await expect(nextButton).toBeEnabled();

        // Verify that the visualization updates (check for height change)
        const bars3 = await page.locator('.bar');
        const firstBarHeightAfterTwoClicks = await bars.nth(0).evaluate(bar => bar.style.height);
        await expect(firstBarHeightAfterTwoClicks).not.toBe('0px');
    });

    test('Edge case: empty input does not visualize', async ({ page }) => {
        const inputField4 = await page.locator('#numberInput');
        const visualizeButton4 = await page.locator('#visualizeButton4');

        // Click visualize without entering numbers
        await visualizeButton.click();

        // Verify that the Next and Reset buttons are still disabled
        const nextButton5 = await page.locator('#nextButton5');
        const resetButton3 = await page.locator('#resetButton3');
        await expect(nextButton).toBeDisabled();
        await expect(resetButton).toBeDisabled();

        // Verify that the visualization area is empty
        const bars4 = await page.locator('.bar');
        await expect(bars).toHaveCount(0);
    });
});