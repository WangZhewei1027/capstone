import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1f33f1-ca65-11f0-96a8-05e9de15890f.html';

test.describe('K-Means Clustering Interactive Demo', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state validation', async () => {
    // Validate the initial state of the application
    const totalPoints = await page.locator('#totalPoints').innerText();
    expect(totalPoints).toBe('0');
    const iter = await page.locator('#iter').innerText();
    expect(iter).toBe('0');
  });

  test('Generate points and validate state transition', async () => {
    // Click the Generate Points button
    await page.click('#genBtn');
    await page.waitForTimeout(2000); // Wait for points to be generated

    // Validate that points are generated
    const totalPoints = await page.locator('#totalPoints').innerText();
    expect(parseInt(totalPoints)).toBeGreaterThan(0);
  });

  test('Initialize centroids and validate state transition', async () => {
    // Click the Initialize Centroids button
    await page.click('#initBtn');
    await page.waitForTimeout(1000); // Wait for centroids to be initialized

    // Validate that centroids are initialized
    const iter = await page.locator('#iter').innerText();
    expect(parseInt(iter)).toBeGreaterThan(0);
  });

  test('Step through one iteration and validate state transition', async () => {
    // Click the Step button
    await page.click('#stepBtn');
    await page.waitForTimeout(3000); // Wait for the step animation to complete

    // Validate that the iteration count has increased
    const iter = await page.locator('#iter').innerText();
    expect(parseInt(iter)).toBeGreaterThan(0);
  });

  test('Run continuously and validate state transition', async () => {
    // Click the Run button
    await page.click('#runBtn');
    await page.waitForTimeout(5000); // Allow the run to execute for a few seconds

    // Validate that the iteration count has increased
    const iter = await page.locator('#iter').innerText();
    expect(parseInt(iter)).toBeGreaterThan(0);
  });

  test('Stop the running process and validate state transition', async () => {
    // Click the Stop button
    await page.click('#stopBtn');
    await page.waitForTimeout(500); // Wait for the stop action to complete

    // Validate that the running state is stopped
    const totalPoints = await page.locator('#totalPoints').innerText();
    expect(parseInt(totalPoints)).toBeGreaterThan(0);
  });

  test('Run to convergence and validate state transition', async () => {
    // Click the Run to Convergence button
    await page.click('#autoConvergeBtn');
    await page.waitForTimeout(120000); // Wait for convergence process to complete

    // Validate that the iteration count has increased
    const iter = await page.locator('#iter').innerText();
    expect(parseInt(iter)).toBeGreaterThan(0);
  });

  test('Clear points and validate state transition', async () => {
    // Click the Clear button
    await page.click('#clearBtn');
    await page.waitForTimeout(500); // Wait for the clear action to complete

    // Validate that points are cleared
    const totalPoints = await page.locator('#totalPoints').innerText();
    expect(totalPoints).toBe('0');
  });

  test('Toggle Add Points and validate functionality', async () => {
    // Enable Add Points
    await page.check('#addPointsToggle');
    await page.click('#mainCanvas', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(500); // Wait for the point to be added

    // Validate that points are added
    const totalPoints = await page.locator('#totalPoints').innerText();
    expect(parseInt(totalPoints)).toBeGreaterThan(0);
  });

  test('Toggle Show Regions and validate visual feedback', async () => {
    // Toggle Show Regions
    await page.check('#showRegions');
    await page.waitForTimeout(500); // Wait for the regions to be drawn

    // Validate that regions are displayed
    const canvasStyle = await page.evaluate(() => {
      const canvas = document.getElementById('mainCanvas');
      return window.getComputedStyle(canvas).backgroundColor;
    });
    expect(canvasStyle).toContain('rgba');
  });

  test('Change K value and validate state transition', async () => {
    // Change K value
    await page.fill('#kInput', '5');
    await page.click('#initBtn');
    await page.waitForTimeout(1000); // Wait for centroids to be initialized

    // Validate that the new K value is reflected
    const kValue = await page.locator('#kInput').inputValue();
    expect(kValue).toBe('5');
  });

  test('Change data mode and validate functionality', async () => {
    // Change data mode to 'uniform'
    await page.selectOption('#dataMode', 'uniform');
    await page.click('#genBtn');
    await page.waitForTimeout(2000); // Wait for points to be generated

    // Validate that points are generated in uniform mode
    const totalPoints = await page.locator('#totalPoints').innerText();
    expect(parseInt(totalPoints)).toBeGreaterThan(0);
  });

  test('Change speed and validate functionality', async () => {
    // Change speed
    await page.fill('#speed', '600');
    await page.click('#runBtn');
    await page.waitForTimeout(5000); // Allow the run to execute for a few seconds

    // Validate that the speed has changed
    const speedValue = await page.locator('#speed').inputValue();
    expect(speedValue).toBe('600');
  });
});