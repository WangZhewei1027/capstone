import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b83532-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('K-Nearest Neighbors (KNN) Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the KNN visualization page before each test
        await page.goto(url);
    });

    test('should load the page and check initial state', async ({ page }) => {
        // Check if the title is correct
        const title = await page.title();
        expect(title).toBe('K-Nearest Neighbors (KNN) Visualization');

        // Check if the canvas and controls are visible
        const canvas = await page.locator('#canvas');
        await expect(canvas).toBeVisible();

        const addPointButton = await page.locator('#addPoint');
        await expect(addPointButton).toBeVisible();

        const classifyPointButton = await page.locator('#classifyPoint');
        await expect(classifyPointButton).toBeVisible();

        const kValueInput = await page.locator('#kValue');
        await expect(kValueInput).toBeVisible();
        await expect(kValueInput).toHaveValue('3'); // Default value
    });

    test('should add a point to the canvas when clicked', async ({ page }) => {
        // Click on the canvas to add a point
        const canvas = await page.locator('#canvas');
        await canvas.click({ position: { x: 100, y: 100 } });

        // Check if the point was drawn
        const context = await page.evaluate(() => {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(100, 100, 1, 1).data;
            return imageData[0] !== 0 || imageData[1] !== 0 || imageData[2] !== 0; // Check if point is not black (background)
        });

        expect(context).toBe(true);
    });

    test('should add a random point when the "Add Point" button is clicked', async ({ page }) => {
        // Click the "Add Point" button
        await page.locator('#addPoint').click();

        // Check if a point was drawn
        const context = await page.evaluate(() => {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1).data;
            return imageData[0] !== 0 || imageData[1] !== 0 || imageData[2] !== 0; // Check if point is not black (background)
        });

        expect(context).toBe(true);
    });

    test('should classify a new point and display the result', async ({ page }) => {
        // Add a point to classify
        await page.locator('#addPoint').click();
        await page.locator('#classifyPoint').click();

        // Check if an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/New point classified as:/);
            await dialog.dismiss();
        });
    });

    test('should update K value and classify a point', async ({ page }) => {
        // Change the K value
        await page.fill('#kValue', '5');

        // Add a point and classify it
        await page.locator('#addPoint').click();
        await page.locator('#classifyPoint').click();

        // Check if an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/New point classified as:/);
            await dialog.dismiss();
        });
    });

    test('should handle edge case when K is greater than number of points', async ({ page }) => {
        // Set K to a high value
        await page.fill('#kValue', '10');

        // Add a point and classify it
        await page.locator('#addPoint').click();
        await page.locator('#classifyPoint').click();

        // Check if an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/New point classified as:/);
            await dialog.dismiss();
        });
    });

    test('should handle invalid K value input', async ({ page }) => {
        // Set K to an invalid value
        await page.fill('#kValue', '0');

        // Add a point and classify it
        await page.locator('#addPoint').click();
        await page.locator('#classifyPoint').click();

        // Check if an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/New point classified as:/);
            await dialog.dismiss();
        });
    });
});