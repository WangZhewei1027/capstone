import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca9d71-d5af-11f0-852d-73feb043b9f3.html';

test.describe('Huffman Coding page - static content and runtime observations', () => {
  // Smoke test: page loads and basic static content is present
  test('Initial load shows title, heading and descriptive paragraph', async ({ page }) => {
    // Navigate to the page
    await page.goto(APP_URL);

    // Verify document title contains expected text
    await expect(page).toHaveTitle(/Huffman Coding/i);

    // Verify the main heading is present and visible with correct accessible name
    const heading = page.getByRole('heading', { name: 'Huffman Coding' });
    await expect(heading).toBeVisible();

    // Verify the descriptive paragraph is present and contains expected text
    const paragraph = page.locator('p');
    await expect(paragraph).toHaveCount(1);
    await expect(paragraph).toHaveText(/This is a simple example of Huffman coding\./i);

    // Verify the HTML includes the script tag that references scripts.js
    const scriptTag = page.locator('script[src="scripts.js"]');
    await expect(scriptTag).toHaveCount(1);
  });

  // There are no interactive elements in the HTML (no inputs, buttons, forms)
  test('No interactive controls (inputs, buttons, selects, forms) are present by default', async ({ page }) => {
    await page.goto(APP_URL);

    // Assert there are no common interactive controls
    await expect(page.locator('input')).toHaveCount(0);
    await expect(page.locator('button')).toHaveCount(0);
    await expect(page.locator('select')).toHaveCount(0);
    await expect(page.locator('textarea')).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
  });

  // Observe console messages, page errors, and network responses for the external script.
  // We deliberately do NOT modify the page; we only observe and assert that any runtime
  // or loading errors occur naturally (as required).
  test('Observe console errors, page errors, and network response for scripts.js during page load', async ({ page }) => {
    // Arrays to collect observed issues
    const consoleErrors = [];
    const pageErrors = [];
    const scriptResponses = [];

    // Listen for console messages (capture errors)
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // swallow unexpected errors in handler - we are only collecting diagnostics
      }
    });

    // Listen for unhandled exceptions (pageerror)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture responses to check the script network status
    page.on('response', (resp) => {
      if (resp.url().endsWith('/scripts.js') || resp.url().endsWith('scripts.js')) {
        scriptResponses.push(resp);
      }
    });

    // Navigate to the page (handlers attached before navigation to capture load-time issues)
    await page.goto(APP_URL);

    // Small wait to allow any synchronous/asynchronous scripts to run and console messages to appear
    await page.waitForTimeout(250);

    // Compute counts
    const consoleErrorCount = consoleErrors.length;
    const pageErrorCount = pageErrors.length;
    const scriptResponseCount = scriptResponses.length;
    const scriptErrorResponses = scriptResponses.filter(r => {
      const status = r.status();
      return status >= 400 || status === 0;
    }).length;

    // Debug: attach information into test failure messages if assertion fails
    // We assert that at least one of: console error, page error, or script network error occurred.
    // This follows the requirement to observe and assert runtime/loading errors as they happen naturally.
    const totalIssues = consoleErrorCount + pageErrorCount + scriptErrorResponses;

    // Provide rich failure message context if no issues observed
    if (totalIssues === 0) {
      let details = [
        `consoleErrorCount=${consoleErrorCount}`,
        `pageErrorCount=${pageErrorCount}`,
        `scriptResponseCount=${scriptResponseCount}`,
        `scriptResponsesStatuses=${scriptResponses.map(r => r.status()).join(',') || 'none'}`
      ].join('; ');
      // Fail the test with detailed diagnostics (per requirement tests should assert errors occur)
      expect(totalIssues, `Expected at least one console/page/network error but found none. Details: ${details}`).toBeGreaterThan(0);
    } else {
      // If there are issues, assert at least one occurred and provide what kind
      expect(totalIssues).toBeGreaterThan(0);
      // Make additional assertions about the types we observed (helpful for debugging)
      if (consoleErrorCount > 0) {
        // Ensure collected console error messages are non-empty strings
        for (const c of consoleErrors) {
          expect(typeof c.text).toBe('string');
        }
      }
      if (pageErrorCount > 0) {
        // Ensure page errors are Error objects or strings
        for (const e of pageErrors) {
          expect(e).toBeTruthy();
        }
      }
      if (scriptErrorResponses > 0) {
        // At least one response for scripts.js had an error status
        for (const r of scriptResponses) {
          if (r.status() >= 400 || r.status() === 0) {
            expect(r.status()).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  // Edge-case checks and accessibility hinting: ensure heading is reachable by role and page has no forms to submit
  test('Accessibility and edge-case checks: heading accessible, no forms to submit', async ({ page }) => {
    await page.goto(APP_URL);

    // Heading accessible by role
    const heading = page.getByRole('heading', { name: 'Huffman Coding' });
    await expect(heading).toBeVisible();

    // Confirm there are no forms to submit; attempting to find a form returns null/count 0
    await expect(page.locator('form')).toHaveCount(0);

    // Verify that attempting to query for interactive elements returns empty - ensures no hidden controls
    const interactiveSelector = 'input, button, select, textarea, [role="button"], [role="textbox"], form';
    await expect(page.locator(interactiveSelector)).toHaveCount(0);
  });
});