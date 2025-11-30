import { test, expect } from '@playwright/test';

// Test file for Application ID: 26275dc1-cd2a-11f0-bee4-a3a342d77f94
// URL: http://127.0.0.1:5500/workspace/html2test/html/26275dc1-cd2a-11f0-bee4-a3a342d77f94.html
//
// This test suite verifies the Color Picker Tool web application. It exercises UI controls,
// verifies DOM updates and visual changes, and observes console and page errors.
// It uses a small page-object pattern to organize interactions with the page.

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/26275dc1-cd2a-11f0-bee4-a3a342d77f94.html';

class ColorPickerPage {
  /**
   * Page object encapsulating interactions with the Color Picker Tool.
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#colorInput');
    this.display = page.locator('#colorDisplay');
    this.setButton = page.getByRole('button', { name: 'Set Color' });
    this.heading = page.locator('h1');
  }

  // Navigate to the application page and wait for load
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Set the color input's value via DOM (works reliably for <input type="color">)
  async setColorValue(hexOrString) {
    await this.page.evaluate(
      ({ selector, value }) => {
        const el = document.querySelector(selector);
        if (el) {
          el.value = value;
          // Dispatch an input event in case any reactive logic is present
          const evt = new Event('input', { bubbles: true });
          el.dispatchEvent(evt);
        }
      },
      { selector: '#colorInput', value: hexOrString }
    );
  }

  // Click the "Set Color" button which invokes the page's setColor() function
  async clickSetColor() {
    await this.setButton.click();
  }

  // Read the inline style.backgroundColor property (what the script sets)
  async getInlineBackgroundColor() {
    return this.page.evaluate(selector => {
      const el = document.querySelector(selector);
      return el ? el.style.backgroundColor : null;
    }, '#colorDisplay');
  }

  // Read the computed background color from the browser (final visual color)
  async getComputedBackgroundColor() {
    return this.page.evaluate(selector => {
      const el = document.querySelector(selector);
      if (!el) return null;
      return getComputedStyle(el).backgroundColor;
    }, '#colorDisplay');
  }

  // Get the input's current value attribute
  async getInputValue() {
    return this.input.inputValue();
  }
}

test.describe('Color Picker Tool - Integration Tests', () => {
  let consoleErrorMessages;
  let pageErrors;
  let cp; // page object

  // Set up page and listeners before each test
  test.beforeEach(async ({ page }) => {
    consoleErrorMessages = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrorMessages.push({
          text: msg.text(),
          location: msg.location ? msg.location() : null,
        });
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push({
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
    });

    cp = new ColorPickerPage(page);
    await cp.goto();
  });

  // After each test ensure there are no unexpected page errors or console errors.
  // We assert that the page loaded and ran without throwing runtime errors.
  test.afterEach(async () => {
    // If there are page errors, fail and include their details for debugging
    expect(pageErrors.length, `Unexpected page errors: ${JSON.stringify(pageErrors, null, 2)}`).toBe(0);
    // If there are console errors, fail and include their texts
    expect(consoleErrorMessages.length, `Unexpected console errors: ${JSON.stringify(consoleErrorMessages, null, 2)}`).toBe(0);
  });

  // Test initial page load and default state
  test('loads the page and displays default UI elements and values', async () => {
    // Verify heading is present and correct
    await expect(cp.heading).toHaveText('Color Picker Tool');

    // Verify the color input is visible and has the default value of #ffffff
    await expect(cp.input).toBeVisible();
    const inputVal = await cp.getInputValue();
    expect(inputVal.toLowerCase(), 'Default color input value should be #ffffff').toBe('#ffffff');

    // Verify the display element is present and visible
    await expect(cp.display).toBeVisible();

    // The initial computed background color should be transparent (no color applied).
    // Most browsers report this as 'rgba(0, 0, 0, 0)'.
    const computedBg = await cp.getComputedBackgroundColor();
    expect(computedBg, 'Initial computed background-color should be transparent or empty').toMatch(/^(rgba?\(0,\s*0,\s*0(,\s*0(\.0+)?)?\)|transparent|)$/);
  });

  // Test setting a new color with the input and clicking Set Color
  test('applies chosen color (#ff0000) to the display when clicking Set Color', async () => {
    // Choose a bright red and set it on the input
    await cp.setColorValue('#ff0000');

    // Ensure the input value was updated as expected
    const beforeVal = await cp.getInputValue();
    expect(beforeVal.toLowerCase()).toBe('#ff0000');

    // Click the Set Color button to apply the color to the display element
    await cp.clickSetColor();

    // Inline style.backgroundColor should have been set (may be 'rgb(...)' or 'rgba(...)' or 'red')
    const inlineBg = await cp.getInlineBackgroundColor();
    expect(inlineBg, 'Inline style.backgroundColor should be set after clicking').toBeTruthy();

    // The computed background color should reflect red (accept rgb(...) or rgba(...) forms)
    const computedBg = await cp.getComputedBackgroundColor();
    expect(computedBg).toMatch(/rgb(a)?\(\s*255,\s*0,\s*0/);
  });

  // Test clicking Set Color without changing the input applies the current (default white) color
  test('clicking Set Color without changing the input applies the current input value (white)', async () => {
    // Verify default input is white
    const initialInput = await cp.getInputValue();
    expect(initialInput.toLowerCase()).toBe('#ffffff');

    // Click the button
    await cp.clickSetColor();

    // Computed background color should be white (rgb(255, 255, 255) or rgba(...,1))
    const computedBg = await cp.getComputedBackgroundColor();
    expect(computedBg).toMatch(/rgb(a)?\(\s*255,\s*255,\s*255/);
  });

  // Test behavior when the input receives an invalid color string
  test('gracefully handles an invalid color string by not changing the display color', async () => {
    // First set a valid color to create an initial state (green)
    await cp.setColorValue('#00ff00');
    await cp.clickSetColor();

    // Verify the display became green
    const greenComputed = await cp.getComputedBackgroundColor();
    expect(greenComputed).toMatch(/rgb(a)?\(\s*0,\s*255,\s*0/);

    // Now set the input value to an invalid color string
    await cp.setColorValue('not-a-color');

    // Sanity-check: the input's value property may report the literal assigned string or browser-normalized value.
    const inputAfterInvalid = await cp.getInputValue();

    // Click Set Color - the page's setColor will do: colorDisplay.style.backgroundColor = colorInput.value;
    await cp.clickSetColor();

    // The computed background color should remain the previous valid green color, since 'not-a-color'
    // is not a valid CSS color and should not change the visual result.
    const computedAfterInvalid = await cp.getComputedBackgroundColor();
    expect(computedAfterInvalid).toMatch(/rgb(a)?\(\s*0,\s*255,\s*0/);
  });

  // Accessibility and control existence checks
  test('has accessible controls: color input and Set Color button are reachable', async () => {
    // The color input should be focusable and enabled
    await expect(cp.input).toBeEnabled();
    await cp.input.focus();
    // After focus, the document.activeElement should be the color input
    const activeId = await cp.page.evaluate(() => document.activeElement && document.activeElement.id);
    expect(activeId).toBe('colorInput');

    // The Set Color button should be visible and have the accessible name 'Set Color'
    await expect(cp.setButton).toBeVisible();
    await expect(cp.setButton).toHaveText('Set Color');
  });
});