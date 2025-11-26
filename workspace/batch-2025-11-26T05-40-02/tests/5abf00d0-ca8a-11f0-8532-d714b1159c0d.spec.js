import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf00d0-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Prim\'s Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the initial state is Idle by checking the presence of the generate button
        const generateButton = await page.locator('#generate-button');
        await expect(generateButton).toBeVisible();
        await expect(generateButton).toHaveText('Generate Graph');
    });

    test('Generate Graph button click transitions to Graph Generated state', async ({ page }) => {
        // Click the Generate Graph button
        await page.click('#generate-button');

        // Validate that the graph is displayed after clicking the button
        const graphElement = await page.locator('#graph');
        await expect(graphElement).toBeVisible();
        await expect(graphElement).not.toBeEmpty();
    });

    test('Graph is displayed correctly after generation', async ({ page }) => {
        // Click the Generate Graph button
        await page.click('#generate-button');

        // Validate that the graph contains edges after generation
        const graphElement = await page.locator('#graph');
        const graphContent = await graphElement.innerHTML();
        await expect(graphContent).toContain('-'); // Expecting some edges to be displayed
    });

    test('Graph is reset before generation', async ({ page }) => {
        // Ensure the graph is empty before generating
        const graphElement = await page.locator('#graph');
        await expect(graphElement).toBeEmpty();

        // Click the Generate Graph button
        await page.click('#generate-button');

        // Validate that the graph is populated after generation
        await expect(graphElement).not.toBeEmpty();
    });

    test('Clicking Generate Graph multiple times updates the graph', async ({ page }) => {
        // Click the Generate Graph button multiple times
        await page.click('#generate-button');
        const firstGraphContent = await page.locator('#graph').innerHTML();

        await page.click('#generate-button');
        const secondGraphContent = await page.locator('#graph').innerHTML();

        // Validate that the graph content changes on subsequent clicks
        await expect(firstGraphContent).not.toEqual(secondGraphContent);
    });

    test('Graph display updates correctly on multiple generations', async ({ page }) => {
        // Click the Generate Graph button
        await page.click('#generate-button');
        const firstGraphContent = await page.locator('#graph').innerHTML();

        // Click again to generate a new graph
        await page.click('#generate-button');
        const secondGraphContent = await page.locator('#graph').innerHTML();

        // Validate that the graph content changes on subsequent clicks
        await expect(firstGraphContent).not.toEqual(secondGraphContent);
    });

    test('Graph is displayed with valid edges', async ({ page }) => {
        // Click the Generate Graph button
        await page.click('#generate-button');

        // Validate that the graph contains valid edges
        const graphElement = await page.locator('#graph');
        const edges = await graphElement.locator('div').count();
        await expect(edges).toBeGreaterThan(0); // Expect at least one edge to be displayed
    });
});