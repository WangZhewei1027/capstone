import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0002/html/75a8a420-c466-11f0-be4b-41561101a3d0.html';

test.describe('K-Nearest Neighbors Interactive Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('Initial State', () => {
        test('should be in idle state initially', async () => {
            const canvas = await page.$('#canvas');
            const points = await page.evaluate(() => window.points);
            expect(points).toEqual([]);
            expect(await canvas.evaluate(canvas => canvas.getContext('2d'))).not.toBeNull();
        });
    });

    test.describe('Placing Points', () => {
        test('should transition to point_placed state on canvas click', async () => {
            const canvas = await page.$('#canvas');
            await canvas.click({ position: { x: 100, y: 100 } });
            const points = await page.evaluate(() => window.points);
            expect(points.length).toBe(1);
            expect(points[0]).toHaveProperty('x', 100);
            expect(points[0]).toHaveProperty('y', 100);
        });

        test('should allow multiple points to be placed', async () => {
            const canvas = await page.$('#canvas');
            await canvas.click({ position: { x: 200, y: 200 } });
            await canvas.click({ position: { x: 300, y: 300 } });
            const points = await page.evaluate(() => window.points);
            expect(points.length).toBe(3);
        });
    });

    test.describe('Clearing Points', () => {
        test('should clear all points and return to idle state', async () => {
            const clearBtn = await page.$('#clearBtn');
            await clearBtn.click();
            const points = await page.evaluate(() => window.points);
            expect(points.length).toBe(0);
        });
    });

    test.describe('Classifying Points', () => {
        test.beforeEach(async () => {
            const canvas = await page.$('#canvas');
            await canvas.click({ position: { x: 100, y: 100 } });
            await canvas.click({ position: { x: 200, y: 200 } });
        });

        test('should classify a new point and transition to classifying state', async () => {
            const predictBtn = await page.$('#predictBtn');
            await predictBtn.click();
            const alertPromise = page.waitForEvent('dialog');
            const alert = await alertPromise;
            const alertMessage = alert.message();
            await alert.dismiss();
            expect(alertMessage).toMatch(/Predicted class for new point: [AB]/);
        });

        test('should classify correctly based on K value', async () => {
            const kValueInput = await page.$('#kValue');
            await kValueInput.fill('1');
            const predictBtn = await page.$('#predictBtn');
            await predictBtn.click();
            const alertPromise = page.waitForEvent('dialog');
            const alert = await alertPromise;
            const alertMessage = alert.message();
            await alert.dismiss();
            expect(alertMessage).toMatch(/Predicted class for new point: [AB]/);
        });
    });

    test.describe('Edge Cases', () => {
        test('should handle classification with no points placed', async () => {
            const clearBtn = await page.$('#clearBtn');
            await clearBtn.click();
            const predictBtn = await page.$('#predictBtn');
            const alertPromise = page.waitForEvent('dialog');
            await predictBtn.click();
            const alert = await alertPromise;
            const alertMessage = alert.message();
            await alert.dismiss();
            expect(alertMessage).toBe('Predicted class for new point: undefined');
        });
    });
});