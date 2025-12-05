import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d585470-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for interacting with the Linear Regression demo page
class RegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];

    // Capture console messages and page errors for assertions
    this.page.on('console', (msg) => {
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    this.page.on('pageerror', (err) => {
      // store the error string
      this.pageErrors.push(String(err));
    });
  }

  // Navigate to the app and wait until Chart library and canvas are ready
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for Chart global and a chart instance to be available.
    await this.page.waitForFunction(() => {
      return typeof window.Chart !== 'undefined' &&
             document.getElementById('chart') !== null &&
             typeof Chart.getChart === 'function';
    }, { timeout: 5000 });
    // Also wait for the chart to be instantiated and have datasets populated
    await this.page.waitForFunction(() => {
      const ch = Chart.getChart(document.getElementById('chart'));
      return ch && Array.isArray(ch.data?.datasets) && ch.data.datasets.length >= 1;
    }, { timeout: 5000 });
  }

  // Return the regression dataset (by label 'Regression Line') as an array of {x,y}
  async getRegressionData() {
    return await this.page.evaluate(() => {
      const canvas = document.getElementById('chart');
      const chart = Chart.getChart(canvas);
      if (!chart) return null;
      const ds = chart.data.datasets.find(d => d.label === 'Regression Line') || chart.data.datasets[1];
      if (!ds) return null;
      // Return as plain serializable array
      return ds.data.map(p => ({ x: p.x, y: Number.isFinite(p.y) ? p.y : p.y }));
    });
  }

  // Return an array of boolean flags indicating Number.isNaN for each y in regression data
  async getRegressionNaNFlags() {
    return await this.page.evaluate(() => {
      const canvas1 = document.getElementById('chart');
      const chart1 = Chart.getChart(canvas);
      if (!chart) return null;
      const ds1 = chart.data.datasets.find(d => d.label === 'Regression Line') || chart.data.datasets[1];
      if (!ds) return null;
      return ds.data.map(p => Number.isNaN(p.y));
    });
  }

  async setSlope(value) {
    await this.page.fill('#slope', String(value));
  }

  async setIntercept(value) {
    await this.page.fill('#intercept', String(value));
  }

  // Set raw value via DOM (useful for non-numeric strings)
  async setRawInput(selector, rawValue) {
    await this.page.evaluate(({ selector, rawValue }) => {
      const el = document.querySelector(selector);
      if (el) el.value = rawValue;
    }, { selector, rawValue });
  }

  async clickUpdate() {
    await Promise.all([
      this.page.waitForTimeout(50), // small pause to allow DOM updates
      this.page.click('#update')
    ]);
    // Chart.update happens synchronously in the app's code, but give a short tick
    await this.page.waitForTimeout(100);
  }

  getConsoleMessages() {
    return this.consoleMessages;
  }

  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Linear Regression Demo - FSM validation (Application ID: 2d585470-d1d8-11f0-bbda-359f3f96b638)', () => {
  // Each test gets its own page and fresh page object
  test('S0_Idle: Initial state should plot regression line for slope=1, intercept=0 on load', async ({ page }) => {
    // This test validates the entry action calculateRegressionLine(1, 0) executed on load.
    const app = new RegressionPage(page);
    await app.goto();

    // Check DOM elements exist and have expected attributes/placeholders
    await expect(page.locator('#slope')).toBeVisible();
    await expect(page.locator('#intercept')).toBeVisible();
    await expect(page.locator('#update')).toHaveText('Update Line');
    // canvas exists
    const hasGetContext = await page.evaluate(() => !!document.getElementById('chart')?.getContext);
    expect(hasGetContext).toBeTruthy();

    // Get regression data and verify y == x for x from 0..7 (since slope=1 intercept=0)
    const data = await app.getRegressionData();
    expect(data).not.toBeNull();
    expect(data.length).toBe(8); // x=0..7 inclusive

    // Verify the regression line points match y = x
    for (let i = 0; i < data.length; i++) {
      expect(data[i].x).toBe(i);
      // Allow numeric comparison; chart stores numbers
      expect(data[i].y).toBeCloseTo(i, 6);
    }

    // Ensure no uncaught runtime page errors occurred during load
    const errors = app.getPageErrors();
    expect(errors).toEqual([]); // expecting no page errors on clean load

    // Collect console messages for debugging if needed (assert no console errors)
    const consoles = app.getConsoleMessages();
    const errorMsgs = consoles.filter(m => m.type === 'error' || /Uncaught/i.test(m.text));
    expect(errorMsgs.length).toBe(0);
  });

  test('Transition UpdateLine: entering slope & intercept and clicking Update updates regression line (S1_Updated)', async ({ page }) => {
    // This test validates the UpdateLine event and transition from S0_Idle -> S1_Updated.
    const app1 = new RegressionPage(page);
    await app.goto();

    // Provide new slope and intercept
    const slope = 2.5;
    const intercept = -1.2;
    await app.setSlope(slope);
    await app.setIntercept(intercept);

    // Capture regression before update to ensure it changes after clicking update
    const before = await app.getRegressionData();
    expect(before).not.toBeNull();

    // Click update (this triggers parseFloat on the inputs and calculateRegressionLine)
    await app.clickUpdate();

    // After update, verify regression dataset reflects new slope/intercept
    const after = await app.getRegressionData();
    expect(after).not.toBeNull();
    expect(after.length).toBe(8);

    for (let i = 0; i < after.length; i++) {
      expect(after[i].x).toBe(i);
      const expectedY = slope * i + intercept;
      expect(after[i].y).toBeCloseTo(expectedY, 6);
    }

    // Confirm the regression data actually changed (not identical to before)
    const identical = before.every((p, idx) => p.x === after[idx].x && Object.is(p.y, after[idx].y));
    expect(identical).toBe(false);

    // No unexpected page errors on a normal update
    const errors1 = app.getPageErrors();
    expect(errors).toEqual([]);

    // No console errors
    const consoles1 = app.getConsoleMessages();
    const errorMsgs1 = consoles.filter(m => m.type === 'error' || /Uncaught/i.test(m.text));
    expect(errorMsgs.length).toBe(0);
  });

  test('Edge case: clicking Update with empty inputs leads to NaN y values in regression dataset', async ({ page }) => {
    // This test validates behavior when parseFloat receives empty string (NaN) and ensures the FSM transition still occurs.
    const app2 = new RegressionPage(page);
    await app.goto();

    // Clear inputs
    await app.setSlope('');
    await app.setIntercept('');

    // Click update
    await app.clickUpdate();

    // The code in the page does: const slope = parseFloat(...); parseFloat('') => NaN, so regressionLine data will contain NaN y values
    const nanFlags = await app.getRegressionNaNFlags();
    expect(nanFlags).not.toBeNull();
    // Expect all y's to be NaN (since slope and intercept both NaN => y = NaN)
    expect(nanFlags.every(f => f === true)).toBe(true);

    // Even though data contains NaN, the app should not necessarily throw a runtime error; assert no page errors
    const errors2 = app.getPageErrors();
    expect(errors).toEqual([]);

    // But log presence is allowed; ensure there were no console.error messages related to the update
    const consoles2 = app.getConsoleMessages();
    const errorMsgs2 = consoles.filter(m => m.type === 'error' || /Uncaught/i.test(m.text));
    expect(errorMsgs.length).toBe(0);
  });

  test('Edge case: non-numeric string values set programmatically (e.g., "abc") result in NaN y values', async ({ page }) => {
    // This test writes raw non-numeric values into numeric inputs via DOM and triggers Update.
    const app3 = new RegressionPage(page);
    await app.goto();

    // Force the input values (bypassing HTML input type restrictions)
    await app.setRawInput('#slope', 'abc');
    await app.setRawInput('#intercept', 'def');

    // Click update
    await app.clickUpdate();

    // Expect NaN flags in regression data
    const nanFlags1 = await app.getRegressionNaNFlags();
    expect(nanFlags).not.toBeNull();
    expect(nanFlags.every(f => f === true)).toBe(true);

    // Assert no page errors thrown by Chart or update
    const errors3 = app.getPageErrors();
    expect(errors).toEqual([]);

    // Confirm console didn't record serious errors
    const consoles3 = app.getConsoleMessages();
    const errorMsgs3 = consoles.filter(m => m.type === 'error' || /Uncaught/i.test(m.text));
    expect(errorMsgs.length).toBe(0);
  });

  test('DOM and visual elements presence and attributes check', async ({ page }) => {
    // Validate components described in FSM are present and have expected attributes/placeholders.
    const app4 = new RegressionPage(page);
    await app.goto();

    // Verify slope input attributes
    const slope1 = page.locator('#slope1');
    await expect(slope).toHaveAttribute('placeholder', 'Slope (m)');
    await expect(slope).toHaveAttribute('step', '0.1');

    // Verify intercept input attributes
    const intercept1 = page.locator('#intercept1');
    await expect(intercept).toHaveAttribute('placeholder', 'Intercept (b)');
    await expect(intercept).toHaveAttribute('step', '0.1');

    // Verify update button
    const update = page.locator('#update');
    await expect(update).toBeVisible();
    await expect(update).toHaveText('Update Line');

    // Verify canvas exists and is a canvas element
    const isCanvas = await page.$eval('#chart', el => el instanceof HTMLCanvasElement);
    expect(isCanvas).toBe(true);

    // Ensure Chart global is available
    const chartGlobal = await page.evaluate(() => typeof window.Chart !== 'undefined');
    expect(chartGlobal).toBe(true);

    // No page errors expected from simple DOM queries
    const errors4 = app.getPageErrors();
    expect(errors).toEqual([]);
  });
});