import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1f0ce3-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Linear Regression Interactive Demo', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should initialize with zero points', async () => {
    const pointCount = await page.locator('#pointCount').innerText();
    expect(pointCount).toBe('0');
  });

  test('should add a point on canvas click', async () => {
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 100, y: 100 } });
    const pointCount = await page.locator('#pointCount').innerText();
    expect(pointCount).toBe('1');
  });

  test('should drag a point', async () => {
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 100, y: 100 } }); // Add point
    await canvas.click({ position: { x: 100, y: 100 } }); // Start dragging
    await page.mouse.move(150, 150); // Drag point
    await page.mouse.up(); // Release drag
    const pointCount = await page.locator('#pointCount').innerText();
    expect(pointCount).toBe('1'); // Still one point
  });

  test('should remove a point on shift+click', async () => {
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 100, y: 100 } }); // Add point
    await canvas.click({ position: { x: 100, y: 100 }, modifiers: ['Shift'] }); // Remove point
    const pointCount = await page.locator('#pointCount').innerText();
    expect(pointCount).toBe('0'); // Point should be removed
  });

  test('should generate dataset', async () => {
    await page.fill('#nPoints', '20');
    await page.selectOption('#pattern', 'linear');
    await page.click('#genBtn');
    await page.waitForTimeout(2000); // Wait for generation
    const pointCount = await page.locator('#pointCount').innerText();
    expect(pointCount).toBe('20'); // Should have generated 20 points
  });

  test('should clear points', async () => {
    await page.click('#clearBtn');
    const pointCount = await page.locator('#pointCount').innerText();
    expect(pointCount).toBe('0'); // Points should be cleared
  });

  test('should toggle method to Gradient Descent', async () => {
    await page.click('input[name="method"][value="gd"]');
    const methodName = await page.locator('#methodName').innerText();
    expect(methodName).toBe('GD'); // Method should be GD
  });

  test('should run Gradient Descent', async () => {
    await page.fill('#nPoints', '20');
    await page.selectOption('#pattern', 'linear');
    await page.click('#genBtn');
    await page.waitForTimeout(2000); // Wait for generation
    await page.click('input[name="method"][value="gd"]'); // Switch to GD
    await page.fill('#lr', '0.01');
    await page.fill('#iters', '200');
    await page.click('#runGD');
    await page.waitForTimeout(2000); // Wait for GD to run
    const slope = await page.locator('#slope').innerText();
    expect(slope).not.toBe('—'); // Slope should be updated
  });

  test('should animate Gradient Descent', async () => {
    await page.click('#animateGD');
    const buttonText = await page.locator('#animateGD').innerText();
    expect(buttonText).toBe('Stop'); // Button should show 'Stop'
    await page.click('#animateGD'); // Stop animation
    const stoppedText = await page.locator('#animateGD').innerText();
    expect(stoppedText).toBe('Animate'); // Button should show 'Animate'
  });

  test('should reset GD parameters', async () => {
    await page.click('#resetParams');
    const lrValue = await page.locator('#lr').inputValue();
    const itersValue = await page.locator('#iters').inputValue();
    expect(lrValue).toBe('0.01'); // Learning rate should reset
    expect(itersValue).toBe('200'); // Iterations should reset
  });

  test('should export points to CSV', async () => {
    await page.fill('#nPoints', '20');
    await page.selectOption('#pattern', 'linear');
    await page.click('#genBtn');
    await page.waitForTimeout(2000); // Wait for generation
    await page.click('#export');
    // Check for download initiation (this may require additional setup)
  });

  test('should handle no points export', async () => {
    await page.click('#export');
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toBe('No points to export');
    await alertText.dismiss();
  });

  test('should change noise value', async () => {
    await page.fill('#noise', '1');
    const noiseVal = await page.locator('#noiseVal').innerText();
    expect(noiseVal).toBe('1.00'); // Noise value should update
  });

  test('should change random seed', async () => {
    await page.fill('#seed', '100');
    const seedValue = await page.locator('#seed').inputValue();
    expect(seedValue).toBe('100'); // Seed value should update
  });

  test('should change number of points', async () => {
    await page.fill('#nPoints', '50');
    const nPointsValue = await page.locator('#nPoints').inputValue();
    expect(nPointsValue).toBe('50'); // Number of points should update
  });

  test('should select dataset pattern', async () => {
    await page.selectOption('#pattern', 'cluster');
    const selectedPattern = await page.locator('#pattern').inputValue();
    expect(selectedPattern).toBe('cluster'); // Pattern should update
  });

  test('should change learning rate', async () => {
    await page.fill('#lr', '0.1');
    const lrValue = await page.locator('#lr').inputValue();
    expect(lrValue).toBe('0.1'); // Learning rate should update
  });

  test('should change iterations number', async () => {
    await page.fill('#iters', '500');
    const itersValue = await page.locator('#iters').inputValue();
    expect(itersValue).toBe('500'); // Iterations should update
  });

  test('should trigger keyboard shortcuts', async () => {
    await page.keyboard.press('g'); // Trigger generate
    await page.waitForTimeout(2000); // Wait for generation
    const pointCount = await page.locator('#pointCount').innerText();
    expect(pointCount).toBe('20'); // Should have generated 20 points

    await page.keyboard.press('c'); // Trigger clear
    const clearedCount = await page.locator('#pointCount').innerText();
    expect(clearedCount).toBe('0'); // Points should be cleared
  });
});