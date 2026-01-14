import { test, expect } from '@playwright/test';

// Test file: 3cca7662-d5af-11f0-852d-73feb043b9f3-topological-sort.spec.js
// Application URL (served by the test harness)
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca7662-d5af-11f0-852d-73feb043b9f3.html';

// Page Object Model for the Topological Sort page
class TopologicalPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.description = page.locator('p.topologicalSort');
    this.allParagraphs = page.locator('p');
    this.listItems = page.locator('ul > li');
    this.exampleHeading = page.locator('h2', { hasText: 'Example' });
    this.conclusionHeading = page.locator('h2', { hasText: 'Conclusion' });
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  async getTitle() {
    return this.page.title();
  }

  async getHeadingText() {
    return this.heading.textContent();
  }

  async getDescriptionText() {
    return this.description.textContent();
  }

  async getListItemCount() {
    return this.listItems.count();
  }

  async getAllParagraphsCount() {
    return this.allParagraphs.count();
  }
}

test.describe('Topological Sort Page - Static content and structure', () => {
  // Test that the static content is present and correct
  test('page loads and displays correct headings and descriptive text', async ({ page }) => {
    // Capture console errors and page errors during navigation
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const topo = new TopologicalPage(page);
    await topo.goto();

    // Basic page metadata
    await expect(page).toHaveTitle(/Topological Sort/);

    // H1 should be visible and contain expected title
    await expect(topo.heading).toBeVisible();
    await expect(topo.heading).toHaveText('Topological Sort');

    // The descriptive paragraph with class 'topologicalSort' should exist and include the expected phrase
    await expect(topo.description).toBeVisible();
    const descText = (await topo.getDescriptionText()) || '';
    expect(descText.toLowerCase()).toContain('the topological sort is a data structure');

    // There should be explanatory list items describing the algorithm steps
    const liCount = await topo.getListItemCount();
    expect(liCount).toBeGreaterThanOrEqual(1);
    const listTexts = await topo.listItems.allTextContents();
    // At least check that first list item mentions "index" and another mentions "previous element" as per the HTML content
    const concatenated = listTexts.join(' ').toLowerCase();
    expect(concatenated).toContain('index');
    expect(concatenated).toContain('previous element');

    // Example section should reference the sample numbers
    await expect(topo.exampleHeading).toBeVisible();
    const exampleParagraph = page.locator('h2:has-text("Example") + p');
    await expect(exampleParagraph).toContainText('4, 3, 2, 1, 5');

    // Conclusion heading should be visible
    await expect(topo.conclusionHeading).toBeVisible();

    // Assert no runtime page errors or console.error messages were emitted during load
    // (We assert zero here; the page contains no JS so we expect no errors)
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test clicking and interactions on the static content (should not change anything)
  test('interacting with static paragraphs does not change the DOM unexpectedly', async ({ page }) => {
    const topo = new TopologicalPage(page);
    await topo.goto();

    // Record original texts
    const originalHeading = (await topo.getHeadingText()) || '';
    const originalDesc = (await topo.getDescriptionText()) || '';
    const originalParagraphCount = await topo.getAllParagraphsCount();

    // Click on various non-interactive areas and ensure content is unchanged
    await page.click('h1');
    await page.click('p.topologicalSort');
    await page.click('body', { position: { x: 10, y: 10 } });

    // Verify nothing changed
    await expect(topo.heading).toHaveText(originalHeading);
    await expect(topo.description).toHaveText(originalDesc);
    expect(await topo.getAllParagraphsCount()).toBe(originalParagraphCount);
  });
});

test.describe('Topological Sort Page - Interactive controls and edge cases', () => {
  // Verify that there are no interactive controls (buttons, inputs, forms, selects, textareas)
  test('page exposes no interactive form controls by default', async ({ page }) => {
    const topo = new TopologicalPage(page);
    await topo.goto();

    // Count various interactive controls that a sort UI would normally have
    const buttonCount = await page.locator('button').count();
    const inputCount = await page.locator('input').count();
    const formCount = await page.locator('form').count();
    const selectCount = await page.locator('select').count();
    const textareaCount = await page.locator('textarea').count();

    // The provided HTML has no interactive controls; assert these counts are zero
    expect(buttonCount).toBe(0);
    expect(inputCount).toBe(0);
    expect(formCount).toBe(0);
    expect(selectCount).toBe(0);
    expect(textareaCount).toBe(0);

    // Trying to get a non-existent control should not throw; it should simply not be visible
    const sortButton = page.locator('#sort-button');
    await expect(sortButton).toHaveCount(0);
  });

  // Accessibility sanity checks
  test('accessibility checks: ensure main heading is exposed to assistive tech', async ({ page }) => {
    const topo = new TopologicalPage(page);
    await topo.goto();

    // Use Playwright's getByRole to locate the heading by accessible role and name
    const headingByRole = page.getByRole('heading', { name: 'Topological Sort' });
    await expect(headingByRole).toBeVisible();

    // Ensure that list items are present and have text (useful for screen readers)
    const liLocator = page.locator('ul > li');
    const count = await liLocator.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      const text = (await liLocator.nth(i).textContent()) || '';
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  // Edge case: request a non-existing route element and confirm behavior
  test('querying non-existent interactive elements should be handled gracefully', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Query several IDs that might exist in other implementations and assert they are absent
    const ids = ['#input-array', '#submit', '#sort-btn', '#graph-canvas', '#error-output'];
    for (const id of ids) {
      const locator = page.locator(id);
      await expect(locator).toHaveCount(0);
    }
  });
});

test.describe('Console and runtime error monitoring across navigation', () => {
  // This test ensures any console.error or page errors during a fresh navigation are captured.
  // It fails if any runtime errors appear (the page is static so runtime errors are not expected).
  test('should not emit console.error or unhandled page errors during full load', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Allow any asynchronous script errors to surface for a short time (though page is static)
    await page.waitForTimeout(200); // small wait to let any late errors appear

    // Assertions: expect zero console and page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);

    await context.close();
  });
});