import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1d8642-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Union-Find Visualizer', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is Idle', async () => {
    const status = await page.locator('#status').textContent();
    expect(status).toContain('Sets: 0 · Ops: 0');
  });

  test('Reset button initializes elements', async () => {
    await page.locator('#nRange').fill('12');
    await page.locator('#resetBtn').click();
    const parentArr = await page.locator('#parentArr').textContent();
    expect(parentArr).toBe('[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]');
  });

  test('Select one node and transition to OneNodeSelected', async () => {
    await page.click('#canvas', { position: { x: 350, y: 260 } }); // Click on a node
    const selectedText = await page.locator('#selText').textContent();
    expect(selectedText).toBe('0'); // Assuming the first node is selected
  });

  test('Select second node and transition to TwoNodesSelected', async () => {
    await page.click('#canvas', { position: { x: 400, y: 260 } }); // Click on another node
    const selectedText = await page.locator('#selText').textContent();
    expect(selectedText).toBe('0, 1'); // Assuming the second node is selected
  });

  test('Perform union operation', async () => {
    await page.click('#canvas', { position: { x: 400, y: 260 } }); // Click on the second node
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('union(0, 1)');
  });

  test('Perform find operation', async () => {
    await page.click('#canvas', { position: { x: 350, y: 260 } }); // Click on the first node
    await page.click('#findBtn');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('find(0)');
  });

  test('Clear selection', async () => {
    await page.click('#clearSelectionBtn');
    const selectedText = await page.locator('#selText').textContent();
    expect(selectedText).toBe('none');
  });

  test('Random union operation', async () => {
    await page.click('#randomUnionBtn');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('union(');
  });

  test('Auto union until one set', async () => {
    await page.click('#autoUnionBtn');
    await page.waitForTimeout(2000); // Wait for some unions to occur
    const setsCount = await page.locator('#setsCount').textContent();
    expect(parseInt(setsCount)).toBeLessThanOrEqual(1);
  });

  test('Shuffle positions', async () => {
    await page.click('#shuffleBtn');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Shuffle positions');
  });

  test('Randomize components', async () => {
    await page.click('#randomizeBtn');
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Randomized components');
  });

  test('Toggle union strategy', async () => {
    await page.locator('#useRank').click();
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Switched to union-by-size');
  });

  test('Toggle path compression', async () => {
    await page.locator('#compressDuringFind').click();
    const logContent = await page.locator('#log').textContent();
    expect(logContent).toContain('Path compression toggled');
  });

  test('Adjust animation speed', async () => {
    await page.locator('#speedRange').fill('500');
    const speedVal = await page.locator('#speedVal').textContent();
    expect(speedVal).toBe('500ms');
  });

  test('Change number of elements', async () => {
    await page.locator('#nRange').fill('20');
    await page.locator('#resetBtn').click();
    const parentArr = await page.locator('#parentArr').textContent();
    expect(parentArr).toBe('[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]');
  });

  test('Check animation completion', async () => {
    await page.click('#canvas', { position: { x: 350, y: 260 } });
    await page.click('#canvas', { position: { x: 400, y: 260 } });
    await page.click('#findBtn');
    await page.waitForTimeout(1000); // Wait for animation to complete
    const animationComplete = await page.locator('#log').textContent();
    expect(animationComplete).toContain('animationComplete');
  });
});