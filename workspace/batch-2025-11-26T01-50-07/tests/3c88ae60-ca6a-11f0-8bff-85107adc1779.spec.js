import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c88ae60-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Adjacency List Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should display the default adjacency list on page load', async ({ page }) => {
    const adjList = await page.locator('#adj-list').innerText();
    expect(adjList).toContain('A : B, C');
    expect(adjList).toContain('B : A, D');
    expect(adjList).toContain('C : A, D');
    expect(adjList).toContain('D : B, C');
  });

  test('should parse and render adjacency list when parse button is clicked', async ({ page }) => {
    await page.fill('#graph-input', 'E: F, G\nF: E\nG: E');
    await page.click('#parse-btn');

    const adjList = await page.locator('#adj-list').innerText();
    expect(adjList).toContain('E : F, G');
    expect(adjList).toContain('F : E');
    expect(adjList).toContain('G : E');
  });

  test('should show error message for incorrect input format', async ({ page }) => {
    await page.fill('#graph-input', 'Invalid Input');
    await page.click('#parse-btn');

    const errorMessage = await page.locator('#error').innerText();
    expect(errorMessage).toContain('Line 1 is not in the format "Node: neighbor1, neighbor2, ..."');
  });

  test('should show error message for empty node label', async ({ page }) => {
    await page.fill('#graph-input', ' : A, B');
    await page.click('#parse-btn');

    const errorMessage = await page.locator('#error').innerText();
    expect(errorMessage).toContain('Line 1 has empty node label.');
  });

  test('should clear error message on new parse attempt', async ({ page }) => {
    await page.fill('#graph-input', 'Invalid Input');
    await page.click('#parse-btn');
    await page.fill('#graph-input', 'H: I, J');
    await page.click('#parse-btn');

    const errorMessage = await page.locator('#error').innerText();
    expect(errorMessage).toBe('');
  });

  test('should render empty graph message when no edges are provided', async ({ page }) => {
    await page.fill('#graph-input', '');
    await page.click('#parse-btn');

    const adjList = await page.locator('#adj-list').innerText();
    expect(adjList).toContain('Graph is empty.');
  });

  test('should handle multiple parse attempts correctly', async ({ page }) => {
    await page.fill('#graph-input', 'K: L, M');
    await page.click('#parse-btn');

    let adjList = await page.locator('#adj-list').innerText();
    expect(adjList).toContain('K : L, M');

    await page.fill('#graph-input', 'N: O');
    await page.click('#parse-btn');

    adjList = await page.locator('#adj-list').innerText();
    expect(adjList).toContain('N : O');
  });

  test('should show error message for non-existent neighbors', async ({ page }) => {
    await page.fill('#graph-input', 'P: Q, R');
    await page.click('#parse-btn');

    const adjList = await page.locator('#adj-list').innerText();
    expect(adjList).toContain('P : Q, R');
    expect(adjList).not.toContain('Q :');
    expect(adjList).not.toContain('R :');
  });
});