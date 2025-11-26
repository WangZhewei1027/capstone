import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1f33f0-ca65-11f0-96a8-05e9de15890f.html';

test.describe('K-Nearest Neighbors (KNN) Interactive Demo', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is idle', async () => {
    const lastPredText = await page.textContent('#lastPred');
    expect(lastPredText).toBe('No predictions yet.');
  });

  test('Add point to canvas', async () => {
    await page.mouse.click(300, 300); // Click to add a point
    const pointsCount = await page.evaluate(() => window.points.length);
    expect(pointsCount).toBe(1); // Verify one point is added
  });

  test('Drag point on canvas', async () => {
    await page.mouse.move(300, 300); // Move to the point
    await page.mouse.down(); // Start dragging
    await page.mouse.move(350, 350); // Drag to a new location
    await page.mouse.up(); // Release mouse
    const points = await page.evaluate(() => window.points);
    expect(points[0].x).toBeCloseTo(0.65, 2); // Verify new x position
    expect(points[0].y).toBeCloseTo(0.35, 2); // Verify new y position
  });

  test('Predict mode toggles correctly', async () => {
    await page.click('#btnPredictMode'); // Activate predict mode
    const buttonText = await page.textContent('#btnPredictMode');
    expect(buttonText).toBe('Predict mode: ON'); // Verify button text
    await page.click('#btnPredictMode'); // Deactivate predict mode
    expect(await page.textContent('#btnPredictMode')).toBe('Predict on click'); // Verify button text
  });

  test('Generate random dataset', async () => {
    await page.click('#btnGenerate'); // Generate dataset
    const pointsCount = await page.evaluate(() => window.points.length);
    expect(pointsCount).toBeGreaterThan(0); // Verify points are generated
  });

  test('Clear points', async () => {
    await page.click('#btnClear'); // Clear points
    const pointsCount = await page.evaluate(() => window.points.length);
    expect(pointsCount).toBe(0); // Verify points are cleared
  });

  test('Toggle decision boundary', async () => {
    await page.click('#btnToggleBoundary'); // Show boundary
    let boundaryVisible = await page.evaluate(() => window.showBoundary);
    expect(boundaryVisible).toBe(true); // Verify boundary is shown
    await page.click('#btnToggleBoundary'); // Hide boundary
    boundaryVisible = await page.evaluate(() => window.showBoundary);
    expect(boundaryVisible).toBe(false); // Verify boundary is hidden
  });

  test('Change K value', async () => {
    await page.fill('#k', '10'); // Change K to 10
    const kValText = await page.textContent('#kVal');
    expect(kValText).toBe('10'); // Verify K value is updated
  });

  test('Change distance metric', async () => {
    await page.selectOption('#dist', 'manhattan'); // Change distance metric
    const selectedMetric = await page.evaluate(() => document.getElementById('dist').value);
    expect(selectedMetric).toBe('manhattan'); // Verify distance metric is updated
  });

  test('Add noise to points', async () => {
    await page.click('#btnGenerate'); // Generate dataset
    await page.click('#btnAddNoise'); // Add noise
    const points = await page.evaluate(() => window.points);
    expect(points.length).toBeGreaterThan(0); // Verify points exist
  });

  test('Normalize points', async () => {
    await page.click('#btnNormalize'); // Normalize points
    const points = await page.evaluate(() => window.points);
    expect(points.length).toBeGreaterThan(0); // Verify points exist
  });

  test('Shuffle labels', async () => {
    await page.click('#btnShuffle'); // Shuffle labels
    const points = await page.evaluate(() => window.points);
    expect(points.length).toBeGreaterThan(0); // Verify points exist
  });

  test('Evaluate K-fold cross-validation', async () => {
    await page.click('#btnGenerate'); // Generate dataset
    await page.click('#btnCV'); // Evaluate cross-validation
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('K-fold'); // Verify alert contains K-fold message
    await alertText.dismiss(); // Dismiss alert
  });

  test('Show confusion matrix', async () => {
    await page.click('#btnGenerate'); // Generate dataset
    await page.click('#btnConf'); // Show confusion matrix
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('Confusion matrix'); // Verify alert contains confusion matrix message
    await alertText.dismiss(); // Dismiss alert
  });

  test('Export dataset', async () => {
    await page.click('#btnGenerate'); // Generate dataset
    await page.click('#btnExport'); // Export dataset
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('new window opened'); // Verify alert contains export message
    await alertText.dismiss(); // Dismiss alert
  });

  test('Handle insufficient points for evaluation', async () => {
    await page.click('#btnClear'); // Clear points
    await page.click('#btnCV'); // Attempt K-fold evaluation
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('Too few points to evaluate.'); // Verify alert message
    await alertText.dismiss(); // Dismiss alert
  });

  test('Handle confusion matrix with insufficient points', async () => {
    await page.click('#btnClear'); // Clear points
    await page.click('#btnConf'); // Attempt to show confusion matrix
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('Too few points to evaluate.'); // Verify alert message
    await alertText.dismiss(); // Dismiss alert
  });
});