import { test, expect } from '@playwright/test';

// Test suite for the Sliding Window Demonstration application.
// The HTML is served at:
// http://127.0.0.1:5500/workspace/html2test/html/1da11bac-cd2f-11f0-a440-159d7b77af86.html
//
// Tests cover:
// - Initial page load and default state
// - All interactive controls (Slide Left / Slide Right)
// - State transitions and visual updates (inline transform style)
// - Edge cases (not sliding past bounds)
// - Basic accessibility checks for buttons
// - Observing console logs and page errors (asserting none occurred)

test.describe('Sliding Window - 1da11bac-cd2f-11f0-a440-159d7b77af86', () => {
  // Page Object for the Sliding Window page
  class SlidingWindowPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
      this.page = page;
      this.url = 'http://127.0.0.1:5500/workspace/html2test/html/1da11bac-cd2f-11f0-a440-159d7b77af86.html';
      this.container = page.locator('#container');
      this.window = page.locator('#window');
      this.items = page.locator('.item');
      this.leftButton = page.getByRole('button', { name: 'Slide Left' });
      this.rightButton = page.getByRole('button', { name: 'Slide Right' });
    }

    async goto() {
      await this.page.goto(this.url);
    }

    async clickLeft() {
      await this.leftButton.click();
    }

    async clickRight() {
      await this.rightButton.click();
    }

    // Returns the inline style.transform value (as set by updateWindowPosition)
    async getInlineTransform() {
      return this.page.$eval('#window', el => el.style.transform);
    }

    // Returns the computed transform string (may be 'none' or matrix(...))
    async getComputedTransform() {
      return this.page.$eval('#window', el => getComputedStyle(el).transform);
    }

    // Returns the number of item elements
    async itemCount() {
      return this.items.count();
    }

    // Returns the inline translateX number value in pixels (e.g. -200) or 0 if none
    async inlineTranslateXPx() {
      const t = await this.getInlineTransform(); // like 'translateX(-100px)' or ''
      if (!t) return 0;
      const m = t.match(/translateX\((-?\d+)px\)/);
      if (m) return parseInt(m[1], 10);
      return 0;
    }

    // Returns the transition style on the window element
    async getTransitionStyle() {
      return this.page.$eval('#window', el => el.style.transition || getComputedStyle(el).transition);
    }
  }

  // Placeholders to collect console messages and page errors per test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // reset collectors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  // Test initial page load and default state
  test('Initial load: elements present, default styles, and no runtime errors', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Verify critical elements exist
    await expect(app.container).toBeVisible();
    await expect(app.window).toBeVisible();
    await expect(app.leftButton).toBeVisible();
    await expect(app.rightButton).toBeVisible();

    // There should be 7 items as per the HTML
    expect(await app.itemCount()).toBe(7);

    // By default, inline transform should be empty (no translate applied yet)
    const inlineTransform = await app.getInlineTransform();
    expect(inlineTransform).toBe('', 'Expected no inline transform on initial load');

    // Computed transform should be 'none' or identity matrix; ensure it's not a non-zero translation
    const computed = await app.getComputedTransform();
    // Accept 'none' or a matrix with zero translation (matrix(1, 0, 0, 1, 0, 0))
    expect(
      computed === 'none' || computed.includes('matrix') && computed.endsWith(', 0, 0)') || computed.endsWith(', 0)')
    ).toBeTruthy();

    // Check the CSS transition exists on the #window element
    const transition = await app.getTransitionStyle();
    expect(transition).toContain('transform 0.3s', 'Expected transition for transform to be present');

    // Assert that no console errors or page errors occurred during load
    // (we collect and assert after navigation)
    expect(consoleMessages.filter(m => m.type === 'error').length, 'No console.error messages expected').toBe(0);
    expect(pageErrors.length, 'No page errors expected during load').toBe(0);
  });

  // Test sliding right behavior and upper bound
  test('Slide Right increments translateX by 100px up to the maximum allowed offset', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Click Slide Right once -> expect translateX(-100px)
    await app.clickRight();
    // Wait for the CSS transition to complete (0.3s defined in CSS)
    await page.waitForTimeout(350);
    expect(await app.getInlineTransform()).toBe('translateX(-100px)', 'After one right click, inline transform should be -100px');

    // Click Slide Right second time -> expect translateX(-200px)
    await app.clickRight();
    await page.waitForTimeout(350);
    expect(await app.getInlineTransform()).toBe('translateX(-200px)', 'After two right clicks, inline transform should be -200px');

    // Click Slide Right third time -> should NOT exceed the maximum offset (200px), so should remain -200px
    await app.clickRight();
    await page.waitForTimeout(350);
    expect(await app.getInlineTransform()).toBe('translateX(-200px)', 'Third right click should not change beyond max offset');

    // Ensure inline translateX numeric parsing is consistent
    const px = await app.inlineTranslateXPx();
    expect(px).toBe(-200);

    // Assert no console errors or page errors during interactions
    expect(consoleMessages.filter(m => m.type === 'error').length, 'No console.error messages expected during interactions').toBe(0);
    expect(pageErrors.length, 'No page errors expected during interactions').toBe(0);
  });

  // Test sliding left behavior and lower bound
  test('Slide Left decrements translateX by 100px down to zero and does not go negative', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Move to the maximum first
    await app.clickRight();
    await page.waitForTimeout(350);
    await app.clickRight();
    await page.waitForTimeout(350);
    expect(await app.getInlineTransform()).toBe('translateX(-200px)', 'Sanity: ensure we reached -200px before sliding left');

    // Click Slide Left once -> expect translateX(-100px)
    await app.clickLeft();
    await page.waitForTimeout(350);
    expect(await app.getInlineTransform()).toBe('translateX(-100px)', 'After one left click, inline transform should be -100px');

    // Click Slide Left second time -> expect translateX(0px) (inline style empty or translateX(0px) depending on implementation)
    await app.clickLeft();
    await page.waitForTimeout(350);
    // The implementation sets translateX to 'translateX(' + (-currentOffset) + 'px)'. For 0 offset this becomes 'translateX(0px)' or ''.
    // The code as written sets style.transform = 'translateX(' + (-currentOffset) + 'px)'; so for 0 it will be 'translateX(0px)'
    const inlineAfter = await app.getInlineTransform();
    expect(inlineAfter === 'translateX(0px)' || inlineAfter === '', 'After sliding back to 0, inline transform should be 0px or empty').toBeTruthy();

    // Extra left click should not decrement below 0
    await app.clickLeft();
    await page.waitForTimeout(350);
    const inlineFinal = await app.getInlineTransform();
    expect(inlineFinal === 'translateX(0px)' || inlineFinal === '', 'Further left clicks should not go below 0').toBeTruthy();

    // Assert no console errors or page errors
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test accessibility and control states
  test('Controls are accessible and enabled', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Ensure both buttons are enabled and have proper accessible names
    await expect(app.leftButton).toBeEnabled();
    await expect(app.rightButton).toBeEnabled();

    // Accessible names check (using the visible text)
    expect(await app.leftButton.textContent()).toBe('Slide Left');
    expect(await app.rightButton.textContent()).toBe('Slide Right');

    // Clicking disabled behavior isn't present in implementation, so buttons remain enabled
    // Assert no console/page errors were emitted while interacting with controls
    await app.clickRight();
    await page.waitForTimeout(350);
    await app.clickLeft();
    await page.waitForTimeout(350);

    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test DOM and visual change expectations for sequence of interactions
  test('Sequence of interactions produces expected DOM updates and transform states', async ({ page }) => {
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Sequence: Right, Right, Left, Right -> expected transforms: -100, -200, -100, -200
    await app.clickRight();
    await page.waitForTimeout(350);
    expect(await app.getInlineTransform()).toBe('translateX(-100px)');

    await app.clickRight();
    await page.waitForTimeout(350);
    expect(await app.getInlineTransform()).toBe('translateX(-200px)');

    await app.clickLeft();
    await page.waitForTimeout(350);
    expect(await app.getInlineTransform()).toBe('translateX(-100px)');

    await app.clickRight();
    await page.waitForTimeout(350);
    expect(await app.getInlineTransform()).toBe('translateX(-200px)');

    // Confirm items are still present and unchanged in content
    const count = await app.itemCount();
    expect(count).toBe(7);
    for (let i = 0; i < count; i++) {
      const text = await page.locator('.item').nth(i).textContent();
      // items were labeled '1'..'7' in the HTML; verify they still contain those digits
      expect(text.trim()).toBe(String(i + 1));
    }

    // Final check for console and page errors
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});