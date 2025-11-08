import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/2acbee10-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Linear Regression Explorer FSM Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        const feedbackText = await page.locator('#feedback').textContent();
        expect(feedbackText).toBe('Regression Equation: y = mx + b');
    });

    test.describe('Adding Points', () => {
        test('Clicking on the graph adds a point', async () => {
            const graph = page.locator('#graph');
            await graph.click({ position: { x: 50, y: 200 } });
            const points = await page.locator('.point').count();
            expect(points).toBe(1);
        });

        test('Clicking on the graph multiple times adds multiple points', async () => {
            const graph1 = page.locator('#graph1');
            await graph.click({ position: { x: 100, y: 150 } });
            await graph.click({ position: { x: 150, y: 250 } });
            const points1 = await page.locator('.point').count();
            expect(points).toBe(3);
        });

        test('Feedback updates correctly after adding points', async () => {
            const feedbackText1 = await page.locator('#feedback').textContent();
            expect(feedbackText).not.toBe('Regression Equation: y = mx + b');
        });
    });

    test.describe('Moving Points', () => {
        test('Dragging a point updates the regression line', async () => {
            const point = page.locator('.point').nth(0);
            await point.dragAndDrop({ position: { x: 100, y: 100 } });
            const feedbackText2 = await page.locator('#feedback').textContent();
            expect(feedbackText).not.toBe('Regression Equation: y = mx + b');
        });
    });

    test.describe('Resetting the Graph', () => {
        test('Clicking reset button clears the graph', async () => {
            await page.click('#resetButton');
            const points2 = await page.locator('.point').count();
            expect(points).toBe(0);
        });

        test('Feedback resets after clearing the graph', async () => {
            const feedbackText3 = await page.locator('#feedback').textContent();
            expect(feedbackText).toBe('Regression Equation: y = mx + b');
        });
    });

    test.describe('Edge Cases', () => {
        test('Clicking reset button when no points are present does not throw an error', async () => {
            await page.click('#resetButton');
            const feedbackText4 = await page.locator('#feedback').textContent();
            expect(feedbackText).toBe('Regression Equation: y = mx + b');
        });
    });
});