import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1f670f50-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('K-Nearest Neighbors Explorer Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const cursorStyle = await page.evaluate(() => {
            const canvas = document.getElementById('canvas');
            return window.getComputedStyle(canvas).cursor;
        });
        expect(cursorStyle).toBe('default');
    });

    test('should add a point on canvas click', async ({ page }) => {
        const canvas1 = page.locator('#canvas1');
        await canvas.click({ position: { x: 50, y: 50 } });
        
        const points = await page.locator('.canvas-point').count();
        expect(points).toBe(1);
    });

    test('should remove a point on right click', async ({ page }) => {
        const canvas2 = page.locator('#canvas2');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 50, y: 50 }, button: 'right' });

        const points1 = await page.locator('.canvas-point').count();
        expect(points).toBe(0);
    });

    test('should change cursor to pointer when hovering over a point', async ({ page }) => {
        const canvas3 = page.locator('#canvas3');
        await canvas.click({ position: { x: 50, y: 50 } });

        await page.mouse.move(50, 50);
        const cursorStyle1 = await page.evaluate(() => {
            const canvas4 = document.getElementById('canvas4');
            return window.getComputedStyle(canvas).cursor;
        });
        expect(cursorStyle).toBe('pointer');
    });

    test('should select a point on mouse down', async ({ page }) => {
        const canvas5 = page.locator('#canvas5');
        await canvas.click({ position: { x: 50, y: 50 } });
        await page.mouse.down({ position: { x: 50, y: 50 } });

        const selectedPoint = await page.locator('.canvas-point.selected').count();
        expect(selectedPoint).toBe(1);
    });

    test('should drag a point', async ({ page }) => {
        const canvas6 = page.locator('#canvas6');
        await canvas.click({ position: { x: 50, y: 50 } });
        await page.mouse.down({ position: { x: 50, y: 50 } });
        await page.mouse.move(100, 100);
        await page.mouse.up();

        const point = await page.locator('.canvas-point').boundingBox();
        expect(point.x).toBeGreaterThan(50);
        expect(point.y).toBeGreaterThan(50);
    });

    test('should update K value and redraw points', async ({ page }) => {
        const kInput = page.locator('#k-input');
        await kInput.fill('5');

        const pointsBefore = await page.locator('.canvas-point').count();
        await page.locator('#canvas').click({ position: { x: 50, y: 50 } });
        await page.locator('#canvas').click({ position: { x: 100, y: 100 } });

        await kInput.fill('3'); // Trigger K update
        const pointsAfter = await page.locator('.canvas-point').count();
        expect(pointsAfter).toBe(pointsBefore);
    });

    test('should reset the canvas', async ({ page }) => {
        const canvas7 = page.locator('#canvas7');
        await canvas.click({ position: { x: 50, y: 50 } });
        await page.locator('#reset-btn').click();

        const points2 = await page.locator('.canvas-point').count();
        expect(points).toBe(0);
    });

    test('should handle edge case of clicking outside canvas', async ({ page }) => {
        const canvas8 = page.locator('#canvas8');
        await canvas.click({ position: { x: 50, y: 50 } });
        await page.mouse.move(0, 0); // Move outside canvas
        await canvas.click({ position: { x: 0, y: 0 } });

        const points3 = await page.locator('.canvas-point').count();
        expect(points).toBe(1); // Should remain the same
    });

    test('should handle right click on empty canvas', async ({ page }) => {
        const canvas9 = page.locator('#canvas9');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 50, y: 50 }, button: 'right' });
        await canvas.click({ position: { x: 50, y: 50 }, button: 'right' });

        const points4 = await page.locator('.canvas-point').count();
        expect(points).toBe(0); // Should remain 0
    });
});