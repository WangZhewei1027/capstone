import { test, expect } from '@playwright/test';

test.describe.serial('Radix Sort Visualization (LSD) - 20d2afb9-cd33-11f0-bdf9-b3d97e91273d', () => {
  // URL to the served HTML page
  const URL =
    'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2afb9-cd33-11f0-bdf9-b3d97e91273d.html';

  // Containers for console errors and uncaught page errors for each test
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset error trackers for each test
    pageErrors = [];
    consoleErrors = [];

    // Listen for uncaught exceptions on the page
    page.on('pageerror', (err) => {
      // capture the error message for assertion later
      pageErrors.push(err?.message || String(err));
    });

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the page under test
    await page.goto(URL);
  });

  test.afterEach(async () => {
    // After each test ensure there were no unexpected console errors or page errors
    // These assertions ensure we observed and recorded any runtime problems
    expect(pageErrors, 'There should be no uncaught page errors').toHaveLength(0);
    expect(consoleErrors, 'There should be no console.error messages').toHaveLength(0);
  });

  test('Initial page load - elements present and default states', async ({ page }) => {
    // Verify title and description are visible
    await expect(page.locator('h1')).toHaveText(/Radix Sort Visualization/i);

    // Check input presence and placeholder
    const input = page.locator('#numbersInput');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /e.g. 170, 45, 75/);

    // Check start button presence and enabled by default
    const startBtn = page.locator('#startBtn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Check speed control exists and has default value 700
    const speed = page.locator('#speedControl');
    await expect(speed).toBeVisible();
    await expect(speed).toHaveValue('700');

    // Visualization container should be present but empty initially
    const viz = page.locator('#visualization');
    await expect(viz).toBeVisible();
    // It may be empty (no child .array-row), ensure that initially there are no rows rendered
    await expect(viz.locator('.array-row')).toHaveCount(0);
  });

  test('Clicking Start with empty input shows alert and does not disable controls', async ({ page }) => {
    // Intercept dialog (alert) and verify message
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toMatch(/Please enter some numbers/);
      await dialog.accept();
    });

    // Ensure input is empty and click start
    const startBtn1 = page.locator('#startBtn1');
    await page.locator('#numbersInput').fill('');
    await startBtn.click();

    // After alert the controls should remain enabled
    await expect(startBtn).toBeEnabled();
    await expect(page.locator('#numbersInput')).toBeEnabled();
    await expect(page.locator('#speedControl')).toBeEnabled();
  });

  test('Clicking Start with invalid numbers shows validation alert', async ({ page }) => {
    // Prepare invalid input (non-integers or negative)
    await page.locator('#numbersInput').fill('abc, -1, 3.5');

    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toMatch(/Please enter valid non-negative integers/);
      await dialog.accept();
    });

    await page.locator('#startBtn').click();

    // Controls should stay enabled after validation failure
    await expect(page.locator('#startBtn')).toBeEnabled();
    await expect(page.locator('#numbersInput')).toBeEnabled();
  });

  test('Speed control can be changed and reflects new value', async ({ page }) => {
    const speed1 = page.locator('#speedControl');
    // Change value using evaluate so input event is dispatched (the app listens for "input")
    await page.evaluate(() => {
      const el = document.getElementById('speedControl');
      el.value = '100';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Confirm DOM reflects new value
    await expect(speed).toHaveValue('100');
  });

  test('Full sort operation: verifies state transitions, DOM updates, and final sorted array', async ({ page }) => {
    // Provide a known sequence and set speed to minimum to speed up the test
    const inputStr = '170, 45, 75, 90, 802, 24, 2, 66';
    await page.locator('#numbersInput').fill(inputStr);

    // Speed down to 100ms to accelerate visualization; dispatch input event so page picks it up
    await page.evaluate(() => {
      const el1 = document.getElementById('speedControl');
      el.value = '100';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const startBtn2 = page.locator('#startBtn2');

    // Click start and immediately verify controls become disabled during sort
    await startBtn.click();

    // startBtn should be disabled while sort runs
    await expect(startBtn).toBeDisabled();

    // The visualization should eventually contain the "Sorted array:" label when finished
    const sortedLabelRow = page.locator('.array-row', { hasText: 'Sorted array:' }).first();

    // Wait for the final sorted label to appear; give generous timeout because visualization is asynchronous
    await sortedLabelRow.waitFor({ state: 'visible', timeout: 30000 });

    // After finish, start button and inputs should be re-enabled
    await expect(startBtn).toBeEnabled();
    await expect(page.locator('#numbersInput')).toBeEnabled();
    await expect(page.locator('#speedControl')).toBeEnabled();

    // Extract the array-item elements from the row that has the Sorted array label.
    // The renderArray function appends the label div as the first child and then items,
    // so selecting .array-item inside this row will give us the final elements.
    const items = sortedLabelRow.locator('.array-item');
    const count = await items.count();
    // Expect 8 numbers in the sorted result for the provided input set
    expect(count).toBe(8);

    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await items.nth(i).innerText()).trim());
    }

    // Expected sorted order (ascending)
    const expected = ['2', '24', '45', '66', '75', '90', '170', '802'];
    expect(texts).toEqual(expected);
  });

  test('During placement steps elements are highlighted (visual feedback)', async ({ page }) => {
    // Use a small array so we can observe intermediate highlights quickly
    await page.locator('#numbersInput').fill('3, 1, 2');

    // Speed low to accelerate
    await page.evaluate(() => {
      const el2 = document.getElementById('speedControl');
      el.value = '100';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Start sort
    await page.locator('#startBtn').click();

    // Wait for at least one iteration label to appear showing "Iteration 1"
    const iterationRow = page.locator('.array-row', { hasText: 'Iteration 1' }).first();
    await iterationRow.waitFor({ state: 'visible', timeout: 10000 });

    // During placement the script renders a row where an element is highlighted with class 'highlight'
    // Look for any element with class 'highlight' within visualization area
    const highlighted = page.locator('#visualization .array-item.highlight');
    await expect(highlighted).toHaveCountGreaterThan(0);

    // Wait for completion to allow afterEach to assert no runtime errors
    const sortedRow = page.locator('.array-row', { hasText: 'Sorted array:' }).first();
    await sortedRow.waitFor({ state: 'visible', timeout: 30000 });
  });
});