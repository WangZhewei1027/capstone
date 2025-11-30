import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abed136-cd32-11f0-a96f-2d591ffb35fe.html';

test.describe('Interactive Linear Regression Demo (7abed136-cd32-11f0-a96f-2d591ffb35fe)', () => {
  // Capture console errors and page errors to assert the page runs without uncaught exceptions.
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
  });

  // Helper to read numeric text from span elements that contain either "-" or numeric values
  async function readNumericText(locator) {
    const txt = (await locator.textContent()).trim();
    if (txt === '-' || txt === '') return null;
    const num = Number(txt);
    return Number.isFinite(num) ? num : null;
  }

  test('Initial load: controls present, defaults set, and estimates are displayed', async ({ page }) => {
    // Ensure main elements exist
    const canvas = page.locator('#plot');
    const pointCount = page.getByLabel('Number of points');
    const noiseLevel = page.getByLabel('Noise level (std dev)');
    const slopeInput = page.getByLabel('True slope (m)');
    const interceptInput = page.getByLabel('True intercept (b)');
    const generateBtn = page.locator('#generateBtn');

    await expect(canvas).toBeVisible();
    await expect(pointCount).toBeVisible();
    await expect(noiseLevel).toBeVisible();
    await expect(slopeInput).toBeVisible();
    await expect(interceptInput).toBeVisible();
    await expect(generateBtn).toBeVisible();

    // Verify default input values match HTML defaults
    await expect(pointCount).toHaveValue('50');
    await expect(noiseLevel).toHaveValue('10');
    await expect(slopeInput).toHaveValue('2');
    await expect(interceptInput).toHaveValue('5');

    // Estimated values should be updated after initial draw.
    const estSlope = page.locator('#estimatedSlope');
    const estIntercept = page.locator('#estimatedIntercept');
    const rSquared = page.locator('#rSquared');

    // Wait until estimated slope is not the placeholder "-" (initial rendering populates it)
    await expect(estSlope).not.toHaveText('-', { timeout: 3000 });
    await expect(estIntercept).not.toHaveText('-', { timeout: 3000 });
    await expect(rSquared).not.toHaveText('-', { timeout: 3000 });

    // Parse numeric values and assert they are finite numbers
    const mVal = await readNumericText(estSlope);
    const bVal = await readNumericText(estIntercept);
    const r2Val = await readNumericText(rSquared);

    expect(mVal).not.toBeNull();
    expect(bVal).not.toBeNull();
    expect(r2Val).not.toBeNull();
    // R^2 should be in a reasonable range [-1, 1]
    expect(r2Val).toBeGreaterThanOrEqual(-1.1);
    expect(r2Val).toBeLessThanOrEqual(1.1);

    // Ensure there were no console errors or uncaught page errors during load
    expect(consoleErrors, 'No console.error messages on page load').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors on page load').toHaveLength(0);
  });

  test('Generate Data button produces consistent estimates with zero noise (slope/intercept close to true values)', async ({ page }) => {
    // Lower noise to zero and set a known slope/intercept with many points
    const pointCount1 = page.getByLabel('Number of points');
    const noiseLevel1 = page.getByLabel('Noise level (std dev)');
    const slopeInput1 = page.getByLabel('True slope (m)');
    const interceptInput1 = page.getByLabel('True intercept (b)');
    const generateBtn1 = page.locator('#generateBtn1');

    // Set deterministic parameters for stronger expectation: more points, no noise
    await pointCount.fill('150');
    await noiseLevel.fill('0');
    await slopeInput.fill('3.0');
    await interceptInput.fill('10.0');

    // Click generate and wait for estimates to update
    await generateBtn.click();

    const estSlope1 = page.locator('#estimatedSlope');
    const estIntercept1 = page.locator('#estimatedIntercept');
    const rSquared1 = page.locator('#rSquared1');

    // Wait for numeric values to appear
    await expect(estSlope).not.toHaveText('-', { timeout: 3000 });
    await expect(estIntercept).not.toHaveText('-', { timeout: 3000 });
    await expect(rSquared).not.toHaveText('-', { timeout: 3000 });

    const mVal1 = await readNumericText(estSlope);
    const bVal1 = await readNumericText(estIntercept);
    const r2Val1 = await readNumericText(rSquared);

    // With zero noise and many random x across range, the regression should be very close to true values.
    expect(mVal).toBeGreaterThanOrEqual(2.95);
    expect(mVal).toBeLessThanOrEqual(3.05);

    expect(bVal).toBeGreaterThanOrEqual(9.8);
    expect(bVal).toBeLessThanOrEqual(10.2);

    // R^2 should be very close to 1
    expect(r2Val).toBeGreaterThanOrEqual(0.995);

    // No console or page errors during this interaction
    expect(consoleErrors, 'No console.error messages after generate click').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors after generate click').toHaveLength(0);
  });

  test('Pressing Enter in an input triggers update (keyboard interaction)', async ({ page }) => {
    const slopeInput2 = page.getByLabel('True slope (m)');
    const interceptInput2 = page.getByLabel('True intercept (b)');
    const noiseLevel2 = page.getByLabel('Noise level (std dev)');
    const pointCount2 = page.getByLabel('Number of points');

    // Set parameters to a new known pair with low noise to observe quick update
    await pointCount.fill('80');
    await noiseLevel.fill('1');
    await slopeInput.fill('1.5');
    await interceptInput.fill('2.5');

    // Press Enter in slope input to trigger update
    await slopeInput.press('Enter');

    const estSlope2 = page.locator('#estimatedSlope');
    const estIntercept2 = page.locator('#estimatedIntercept');

    await expect(estSlope).not.toHaveText('-', { timeout: 3000 });
    await expect(estIntercept).not.toHaveText('-', { timeout: 3000 });

    const mVal2 = await readNumericText(estSlope);
    const bVal2 = await readNumericText(estIntercept);

    // With low noise, estimates should be reasonably close to true values
    expect(mVal).toBeGreaterThanOrEqual(1.0);
    expect(mVal).toBeLessThanOrEqual(2.0);

    expect(bVal).toBeGreaterThanOrEqual(-1.0);
    expect(bVal).toBeLessThanOrEqual(6.0);

    // No console or page errors from keyboard-triggered update
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Controls enforce bounds and application clamps values appropriately', async ({ page }) => {
    const pointCount3 = page.getByLabel('Number of points');
    const noiseLevel3 = page.getByLabel('Noise level (std dev)');
    const slopeInput3 = page.getByLabel('True slope (m)');
    const interceptInput3 = page.getByLabel('True intercept (b)');
    const generateBtn2 = page.locator('#generateBtn2');

    // Try to set out-of-range values and ensure update clamps them.
    // pointCount input in the app is clamped in update() between 5 and 200.
    await pointCount.fill('9999'); // out of max bound
    await noiseLevel.fill('-50'); // negative noise should be clamped to 0 in update()
    await slopeInput.fill('0.0');
    await interceptInput.fill('0.0');

    await generateBtn.click();

    // After click, the code clamps values internally; however the input elements themselves may retain typed values.
    // We assert that the estimated values are still present (i.e., update executed without exception).
    const estSlope3 = page.locator('#estimatedSlope');
    const estIntercept3 = page.locator('#estimatedIntercept');

    await expect(estSlope).not.toHaveText('-', { timeout: 3000 });
    await expect(estIntercept).not.toHaveText('-', { timeout: 3000 });

    // Parse and ensure they are finite numbers
    const mVal3 = await readNumericText(estSlope);
    const bVal3 = await readNumericText(estIntercept);
    expect(mVal).not.toBeNull();
    expect(bVal).not.toBeNull();

    // No console errors or page errors should be present
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Accessibility and UI attributes: button title and labels exist', async ({ page }) => {
    // Verify the Generate Data button exposes its title attribute and is reachable
    const generateBtn3 = page.locator('#generateBtn3');
    await expect(generateBtn).toHaveAttribute('title', 'Generate new dataset');

    // Verify labels exist for inputs (associative accessibility)
    await expect(page.getByLabel('Number of points')).toBeVisible();
    await expect(page.getByLabel('Noise level (std dev)')).toBeVisible();
    await expect(page.getByLabel('True slope (m)')).toBeVisible();
    await expect(page.getByLabel('True intercept (b)')).toBeVisible();

    // No console or page errors from these checks
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});