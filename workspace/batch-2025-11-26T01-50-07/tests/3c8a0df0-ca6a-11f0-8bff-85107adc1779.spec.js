import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8a0df0-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Topological Sort Demo', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state should be Idle', async () => {
    const output = await page.locator('#output').innerText();
    expect(output).toBe('');
  });

  test('User can input graph and transition to InputtingGraph state', async () => {
    await page.fill('#graphInput', '{"A": ["B"], "B": ["C"], "C": []}');
    await page.click('#runButton');
    
    const output = await page.locator('#output').innerText();
    expect(output).toContain('Topological Order');
  });

  test('Valid input should transition to ValidatingInput and then RunningSort', async () => {
    await page.fill('#graphInput', '{"A": ["B"], "B": ["C"], "C": []}');
    await page.click('#runButton');

    const output = await page.locator('#output').innerText();
    expect(output).toContain('Topological Order:\nA → B → C');
  });

  test('Invalid JSON input should show error', async () => {
    await page.fill('#graphInput', 'Invalid JSON');
    await page.click('#runButton');

    const output = await page.locator('#output').innerText();
    expect(output).toContain('Invalid JSON input');
  });

  test('Cycle detection in graph should show error', async () => {
    await page.fill('#graphInput', '{"A": ["B"], "B": ["C"], "C": ["A"]}');
    await page.click('#runButton');

    const output = await page.locator('#output').innerText();
    expect(output).toContain('Cycle detected in the graph – topological sort not possible.');
  });

  test('After error, user can input new graph and reset state', async () => {
    await page.fill('#graphInput', '{"A": ["B"], "B": ["C"], "C": []}');
    await page.click('#runButton');

    const output = await page.locator('#output').innerText();
    expect(output).toContain('Topological Order:\nA → B → C');
  });

  test('User can input a valid graph and see the result', async () => {
    await page.fill('#graphInput', '{"A": ["C"], "B": ["C", "D"], "C": ["E"], "D": ["F"], "E": ["H", "F"], "F": ["G"], "G": [], "H": []}');
    await page.click('#runButton');

    const output = await page.locator('#output').innerText();
    expect(output).toContain('Topological Order');
  });

  test('User can reset input field after displaying result', async () => {
    await page.fill('#graphInput', '{"A": ["C"], "B": ["C", "D"], "C": ["E"], "D": ["F"], "E": ["H", "F"], "F": ["G"], "G": [], "H": []}');
    await page.click('#runButton');

    const output = await page.locator('#output').innerText();
    expect(output).toContain('Topological Order');

    await page.fill('#graphInput', '');
    const emptyOutput = await page.locator('#output').innerText();
    expect(emptyOutput).toBe('');
  });
});