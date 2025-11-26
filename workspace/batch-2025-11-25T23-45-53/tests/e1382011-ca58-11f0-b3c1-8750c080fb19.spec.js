import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1382011-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Bellman-Ford Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('User enters edges and transitions to InputEdges state', async ({ page }) => {
        await page.fill('#edges', 'A B 4\nA C 2\nB C -1');
        await page.click('button[onclick="runBellmanFord()"]');
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Distances:');
    });

    test('User enters source and transitions to RunningAlgorithm state', async ({ page }) => {
        await page.fill('#edges', 'A B 4\nA C 2\nB C -1');
        await page.fill('#source', 'A');
        await page.click('button[onclick="runBellmanFord()"]');
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Distances:');
    });

    test('Running the algorithm displays results', async ({ page }) => {
        await page.fill('#edges', 'A B 4\nA C 2\nB C -1');
        await page.fill('#source', 'A');
        await page.click('button[onclick="runBellmanFord()"]');
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Distances:');
        expect(output).toContain('A: 0');
        expect(output).toContain('B: 4');
        expect(output).toContain('C: 2');
    });

    test('Detecting negative weight cycle', async ({ page }) => {
        await page.fill('#edges', 'A B -1\nB A -1');
        await page.fill('#source', 'A');
        await page.click('button[onclick="runBellmanFord()"]');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Negative weight cycle detected!');
    });

    test('Resetting inputs after error state', async ({ page }) => {
        await page.fill('#edges', 'A B -1\nB A -1');
        await page.fill('#source', 'A');
        await page.click('button[onclick="runBellmanFord()"]');
        await page.locator('button[onclick="runBellmanFord()"]').click();
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('Validating edge cases with empty inputs', async ({ page }) => {
        await page.click('button[onclick="runBellmanFord()"]');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Negative weight cycle detected!');
    });

    test('Validating edge cases with invalid edges', async ({ page }) => {
        await page.fill('#edges', 'A B four');
        await page.fill('#source', 'A');
        await page.click('button[onclick="runBellmanFord()"]');
        const output = await page.locator('#output').innerText();
        expect(output).toBe('Negative weight cycle detected!');
    });
});