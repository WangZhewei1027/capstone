import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c87c400-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Hash Map Demonstration Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.reload();
  });

  test('Initial state is Idle', async () => {
    const output = await page.locator('#output').textContent();
    expect(output).toBe('');
    const tableContent = await page.locator('#hashMapTableContainer').innerHTML();
    expect(tableContent).toContain('The map is empty.');
  });

  test('Add entry with valid key and value', async () => {
    await page.fill('#keyInput', 'name');
    await page.fill('#valueInput', 'Alice');
    await page.click('#addBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Added/Updated entry');
    const tableContent = await page.locator('#hashMapTableContainer').innerHTML();
    expect(tableContent).toContain('Key (type): name');
    expect(tableContent).toContain('Value: Alice');
  });

  test('Get value by key', async () => {
    await page.fill('#keyInput', 'name');
    await page.click('#getBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Value for key (string) name: Alice');
  });

  test('Check if key exists', async () => {
    await page.fill('#keyInput', 'name');
    await page.click('#hasBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Map contains key (string): name');
  });

  test('Delete entry by key', async () => {
    await page.fill('#keyInput', 'name');
    await page.click('#deleteBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Deleted entry with key (string): name');
    const tableContent = await page.locator('#hashMapTableContainer').innerHTML();
    expect(tableContent).toContain('The map is empty.');
  });

  test('Clear map', async () => {
    await page.fill('#keyInput', 'name');
    await page.fill('#valueInput', 'Alice');
    await page.click('#addBtn');
    await page.click('#clearBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Hash Map cleared.');
    const tableContent = await page.locator('#hashMapTableContainer').innerHTML();
    expect(tableContent).toContain('The map is empty.');
  });

  test('Error on adding entry with empty value', async () => {
    await page.fill('#keyInput', 'name');
    await page.fill('#valueInput', '');
    await page.click('#addBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Please enter a value for the map.');
  });

  test('Error on getting value for non-existing key', async () => {
    await page.fill('#keyInput', 'nonexistent');
    await page.click('#getBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Key (string) nonexistent not found in map.');
  });

  test('Error on checking non-existing key', async () => {
    await page.fill('#keyInput', 'nonexistent');
    await page.click('#hasBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Map does NOT contain key (string): nonexistent');
  });

  test('Error on deleting non-existing key', async () => {
    await page.fill('#keyInput', 'nonexistent');
    await page.click('#deleteBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('No entry found with key (string): nonexistent');
  });

  test('Error on invalid JSON key', async () => {
    await page.fill('#keyInput', '{invalidJson}');
    await page.click('#addBtn');

    const output = await page.locator('#output').textContent();
    expect(output).toContain('Error: Invalid JSON for key.');
  });
});