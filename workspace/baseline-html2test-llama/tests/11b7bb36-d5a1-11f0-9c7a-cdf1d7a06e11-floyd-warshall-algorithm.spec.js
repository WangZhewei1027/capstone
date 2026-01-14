import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb36-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page Object Model for the Floyd-Warshall demo page
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#cities');
    this.runButton = page.locator('#run');
    this.resetButton = page.locator('#reset');
    this.resultDiv = page.locator('#result');
    this.header = page.locator('h1');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set the cities input value (this changes the DOM value only)
  async setCities(value) {
    await this.input.fill(String(value));
  }

  // Click the Run button
  async clickRun() {
    await this.runButton.click();
  }

  // Click the Reset button
  async clickReset() {
    await this.resetButton.click();
  }

  // Read the current value of the cities input
  async getCitiesValue() {
    return await this.input.inputValue();
  }

  // Read the result div innerHTML
  async getResultHTML() {
    return await this.resultDiv.evaluate((el) => el.innerHTML);
  }

  // Read header text
  async getHeaderText() {
    return await this.header.innerText();
  }
}

test.describe('Floyd-Warshall Algorithm App (11b7bb36-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // Each test gets a fresh page and page object
  test.beforeEach(async ({ page }) => {
    // Nothing here; navigation happens in each test to allow targeted event waiting
  });

  // Test initial page load and default state
  test('Initial load: page elements visible and default values are correct', async ({ page }) => {
    const app = new FloydWarshallPage(page);
    await app.goto();

    // Verify the header and basic UI elements are present
    await expect(app.header).toBeVisible();
    expect(await app.getHeaderText()).toContain('Floyd-Warshall Algorithm');

    // Verify input default value (from the HTML)
    const initialCities = await app.getCitiesValue();
    expect(initialCities).toBe('5'); // HTML sets value="5"

    // Buttons should be visible and enabled
    await expect(app.runButton).toBeVisible();
    await expect(app.runButton).toBeEnabled();
    await expect(app.resetButton).toBeVisible();
    await expect(app.resetButton).toBeEnabled();

    // Result div should be empty at initial load
    const resultHTML = await app.getResultHTML();
    expect(resultHTML).toBe('');
  });

  // Test that clicking Run triggers the page runtime error (TypeError) as implemented
  test('Clicking Run triggers a runtime TypeError due to implementation bug', async ({ page }) => {
    const app1 = new FloydWarshallPage(page);
    await app.goto();

    // Wait for both a pageerror (uncaught exception) and a console.error message when Run is clicked.
    const pageErrorPromise = page.waitForEvent('pageerror');
    const consoleErrorPromise = page.waitForEvent('console', {
      predicate: (msg) => msg.type() === 'error'
    });

    // Trigger the faulty algorithm
    await app.clickRun();

    // Await the uncaught exception and console error
    const [pageError, consoleMsg] = await Promise.all([pageErrorPromise, consoleErrorPromise]);

    // Assert that a page error occurred and is a TypeError (expected from accessing undefined properties)
    expect(pageError).toBeTruthy();
    expect(pageError.message).toBeTruthy();
    // Message formats vary across browsers, so check for keywords indicating undefined property access
    expect(pageError.message.toLowerCase()).toMatch(/undefined|cannot read/i);

    // Assert there was a console.error emitted with some message text
    expect(consoleMsg).toBeTruthy();
    const consoleText = consoleMsg.text();
    expect(consoleText.length).toBeGreaterThan(0);
    // The console error should also reference a TypeError or undefined access in most runtimes
    expect(consoleText.toLowerCase()).toMatch(/typeerror|undefined|cannot read/i);

    // Because the runtime error occurred before the code updated resultDiv, result should remain empty
    const resultHTML1 = await app.getResultHTML();
    expect(resultHTML).toBe('');
  });

  // Test that clicking Reset clears the input and result area
  test('Reset button clears the cities input and the result area', async ({ page }) => {
    const app2 = new FloydWarshallPage(page);
    await app.goto();

    // Change the input value and simulate a "result" being present by directly setting innerHTML via JS
    await app.setCities('3');
    expect(await app.getCitiesValue()).toBe('3');

    // Insert some fake content into the result div to validate reset clears it
    await page.evaluate(() => {
      document.getElementById('result').innerHTML = '<td>42</td>';
    });
    expect(await app.getResultHTML()).toContain('42');

    // Click Reset and verify the DOM changes
    await app.clickReset();
    expect(await app.getCitiesValue()).toBe(''); // reset sets input.value = ''
    expect(await app.getResultHTML()).toBe(''); // result cleared
  });

  // Test that modifying the input after page load does not change the internal `cities` variable used by run()
  test('Altering input after load does not affect internal cities variable (stale closure behavior)', async ({ page }) => {
    const app3 = new FloydWarshallPage(page);
    await app.goto();

    // Change input to '0' (a meaningful edge value)
    await app.setCities('0');
    expect(await app.getCitiesValue()).toBe('0');

    // However, the page's run() uses the `cities` variable captured at load time (expected to still be "5")
    // So clicking Run should still produce the same runtime error as before (not a successful run for 0)
    const pageErrorPromise1 = page.waitForEvent('pageerror');
    const consoleErrorPromise1 = page.waitForEvent('console', {
      predicate: (msg) => msg.type() === 'error'
    });
    await app.clickRun();
    const [pageError, consoleMsg] = await Promise.all([pageErrorPromise, consoleErrorPromise]);

    expect(pageError).toBeTruthy();
    expect(pageError.message.toLowerCase()).toMatch(/undefined|cannot read/i);
    expect(consoleMsg.text().toLowerCase()).toMatch(/typeerror|undefined|cannot read/i);

    // Confirm that despite changing input to '0', the result area is still empty due to the early error
    const resultHTML2 = await app.getResultHTML();
    expect(resultHTML).toBe('');
  });

  // Test repeated clicks on Run produce repeated errors (multiple pageerror events)
  test('Multiple Run clicks emit multiple page errors', async ({ page }) => {
    const app4 = new FloydWarshallPage(page);
    await app.goto();

    // First click - wait for error
    const firstError = await Promise.all([
      page.waitForEvent('pageerror'),
      page.waitForEvent('console', { predicate: (m) => m.type() === 'error' }),
      app.clickRun()
    ]);

    expect(firstError[0]).toBeTruthy();
    expect(firstError[1].text().length).toBeGreaterThan(0);

    // Second click - should emit another pageerror
    const secondError = await Promise.all([
      page.waitForEvent('pageerror'),
      page.waitForEvent('console', { predicate: (m) => m.type() === 'error' }),
      app.clickRun()
    ]);

    expect(secondError[0]).toBeTruthy();
    expect(secondError[1].text().length).toBeGreaterThan(0);

    // There should be no successful output in the result div after these failing runs
    expect(await app.getResultHTML()).toBe('');
  });
});