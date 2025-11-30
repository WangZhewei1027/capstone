import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627abe4-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('Radix Sort Demonstration (Application ID: 2627abe4-cd2a-11f0-bee4-a3a342d77f94)', () => {
  // Arrays to collect console and page errors for assertions
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  // Before each test, reset collectors and set up listeners on the provided page fixture
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Collect all console messages for inspection; separate out errors
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push(text);
    });

    // Collect any unhandled page errors (e.g., ReferenceError/TypeError)
    page.on('pageerror', (err) => {
      // store the stringified error for assertions
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the application page
    await page.goto(APP_URL);
    // Ensure the array container is present before running assertions
    await page.waitForSelector('#array');
  });

  // Test initial page load and default state
  test('Initial load shows the unsorted array and the Start button is visible', async ({ page }) => {
    // Purpose: Verify initial DOM setup and content matches expected unsorted array
    
    // Ensure the array items are rendered
    const items = await page.$$('#array .array-item');
    expect(items.length).toBe(8); // The HTML defines 8 numbers

    // Extract the displayed texts and verify order matches the unsorted array
    const texts = await page.$$eval('#array .array-item', nodes => nodes.map(n => n.textContent.trim()));
    expect(texts).toEqual(['170', '45', '75', '90', '802', '24', '2', '66']);

    // Verify the Start Radix Sort button exists and is visible
    const startButton = await page.$('button');
    expect(startButton).not.toBeNull();
    expect(await startButton.isVisible()).toBeTruthy();

    // Verify accessibility: the button has the expected accessible name
    const buttonName = await page.getAttribute('button', 'aria-label');
    // If no explicit aria-label, ensure the inner text provides the label
    if (!buttonName) {
      const visibleText = await page.$eval('button', b => b.innerText.trim());
      expect(visibleText).toBe('Start Radix Sort');
    } else {
      expect(buttonName).toBeTruthy();
    }

    // Ensure no runtime page errors were emitted on load
    expect(pageErrors, 'No page errors should occur on initial load').toEqual([]);
    // Ensure no console.error logs on initial load
    expect(consoleErrors, 'No console.error logs should be emitted on initial load').toEqual([]);
  });

  // Test the interactive sorting demonstration
  test('Clicking Start Radix Sort runs the demonstration and results in a sorted array', async ({ page }) => {
    // Purpose: Simulate user clicking the start button and verify the array is sorted at the end
    
    // Click the Start button
    await page.click('button');

    // Wait for the final sorted state to appear in the DOM.
    // The algorithm uses a 1 second timeout before performing passes, and then performs 3 display updates.
    // We wait up to 5 seconds for the final sorted sequence to appear.
    const expectedFinal = ['2', '24', '45', '66', '75', '90', '170', '802'];
    await page.waitForFunction(
      (expected) => {
        const items = Array.from(document.querySelectorAll('#array .array-item')).map(n => n.textContent.trim());
        if (items.length !== expected.length) return false;
        return expected.every((v, i) => items[i] === v);
      },
      expectedFinal,
      { timeout: 5000 }
    );

    // After waiting, assert the DOM actually contains the final sorted array
    const finalTexts = await page.$$eval('#array .array-item', nodes => nodes.map(n => n.textContent.trim()));
    expect(finalTexts).toEqual(expectedFinal);

    // Ensure that during this interaction no page errors were emitted
    expect(pageErrors, 'No page errors should occur during sorting demonstration').toEqual([]);
    // Ensure no console.error logs occurred during the demonstration
    expect(consoleErrors, 'No console.error logs should be emitted during sorting').toEqual([]);
  });

  // Test pressing the Start button multiple times (edge case) and ensure stability
  test('Pressing Start Radix Sort multiple times does not crash and leads to consistent final state', async ({ page }) => {
    // Purpose: Verify robustness when user triggers the demonstration repeatedly

    // Click the button twice in quick succession
    await page.click('button');
    await page.click('button');

    // Wait for the final sorted array (same timeout considerations as previous test)
    const expectedFinal = ['2', '24', '45', '66', '75', '90', '170', '802'];
    await page.waitForFunction(
      (expected) => {
        const items = Array.from(document.querySelectorAll('#array .array-item')).map(n => n.textContent.trim());
        if (items.length !== expected.length) return false;
        return expected.every((v, i) => items[i] === v);
      },
      expectedFinal,
      { timeout: 6000 }
    );

    const finalTexts = await page.$$eval('#array .array-item', nodes => nodes.map(n => n.textContent.trim()));
    expect(finalTexts).toEqual(expectedFinal);

    // Ensure no page errors occurred even with multiple triggers
    expect(pageErrors, 'No page errors should occur when clicking multiple times').toEqual([]);
    expect(consoleErrors, 'No console.error logs when clicking multiple times').toEqual([]);
  });

  // Test visual and DOM attributes for array items
  test('Array items have expected class and are visible during and after demonstration', async ({ page }) => {
    // Purpose: Check visual feedback: class names and visibility of each element

    // On initial load, items should have class "array-item" and be visible
    const itemHandles = await page.$$('#array .array-item');
    expect(itemHandles.length).toBeGreaterThan(0);
    for (const handle of itemHandles) {
      const classAttr = await handle.getAttribute('class');
      expect(classAttr.split(/\s+/)).toContain('array-item');
      expect(await handle.isVisible()).toBeTruthy();
    }

    // Trigger the demonstration and then re-check visibility of final items
    await page.click('button');
    const expectedFinal = ['2', '24', '45', '66', '75', '90', '170', '802'];
    await page.waitForFunction(
      (expected) => {
        const nodes = document.querySelectorAll('#array .array-item');
        if (nodes.length !== expected.length) return false;
        return expected.every((v, i) => nodes[i].textContent.trim() === v);
      },
      expectedFinal,
      { timeout: 5000 }
    );

    const finalHandles = await page.$$('#array .array-item');
    for (const handle of finalHandles) {
      expect(await handle.isVisible()).toBeTruthy();
      const classAttr = await handle.getAttribute('class');
      expect(classAttr.includes('array-item')).toBeTruthy();
    }

    // No unexpected errors from these UI updates
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // Final test to assert that no unexpected console or page errors were collected across the tests' setup run
  test('No unhandled runtime errors or console.error messages were emitted during the test lifecycle', async ({ page }) => {
    // Purpose: Aggregate-check that no console.error or page errors occurred during page interactions.
    // This test also documents any console output for debugging while asserting there were no errors.

    // (No user interaction here — we just assert our collectors are empty arrays)
    expect(pageErrors, `Page errors captured: ${JSON.stringify(pageErrors, null, 2)}`).toEqual([]);
    expect(consoleErrors, `Console.error messages captured: ${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);

    // For traceability, ensure there was at least some console logging (the app may not log anything — that's acceptable).
    // We don't require console messages but log count is available for debugging if needed.
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  // After each test we do not perform teardown beyond Playwright's automatic cleanup.
  // Individual tests above assert there are no page errors or console.error messages.
});