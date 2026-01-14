import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccd66b0-d5b5-11f0-899c-75bf12e026a9.html';

test.describe('KNN Demo FSM - 0ccd66b0-d5b5-11f0-899c-75bf12e026a9', () => {
  // Containers for console and page errors observed during each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset error capture arrays before each test
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture unhandled page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    // Ensure no unexpected runtime/page errors appeared during the test run.
    // Tests that expect alerts/dialogs assert those explicitly; runtime errors would appear here.
    expect(pageErrors, `Unexpected page errors: ${pageErrors.map(e => e.message).join(' | ')}`).toEqual([]);
    expect(consoleErrors.map(e => e.text), `Unexpected console.error messages`).toEqual([]);
  });

  test.describe('State S0_Idle (Initial State)', () => {
    test('Initial draw happened and info instructs user to add points', async ({ page }) => {
      // Verify info text in Idle state (entry action draw() called on load)
      const info = page.locator('#info');
      await expect(info).toBeVisible();
      await expect(info).toHaveText(/Add training points/);

      // Canvas should be present with the expected attributes
      const canvas = page.locator('#knnCanvas');
      await expect(canvas).toBeVisible();
      await expect(canvas).toHaveAttribute('width', '600');
      await expect(canvas).toHaveAttribute('height', '400');

      // Classify and Clear buttons should be present
      await expect(page.locator('#classifyBtn')).toBeVisible();
      await expect(page.locator('#clearBtn')).toBeVisible();
    });
  });

  test.describe('Transitions involving CanvasClick (S0 -> S1, S1 -> S1)', () => {
    test('Clicking canvas adds a Class A point and updates info (S0 -> S1)', async ({ page }) => {
      // Select Class A and click canvas
      await page.selectOption('#classSelect', 'A');
      await page.click('#knnCanvas', { position: { x: 100, y: 100 } });

      // After adding a point, info should reflect the added class
      const info = page.locator('#info');
      await expect(info).toHaveText(/Added point of class: A/);
    });

    test('Adding another point (unknown) updates info and remains in PointAdded state (S1 -> S1)', async ({ page }) => {
      // Add a first training point so we are in S1
      await page.selectOption('#classSelect', 'B');
      await page.click('#knnCanvas', { position: { x: 120, y: 120 } });
      await expect(page.locator('#info')).toHaveText(/Added point of class: B/);

      // Now add an unknown point
      await page.selectOption('#classSelect', 'unknown');
      await page.click('#knnCanvas', { position: { x: 200, y: 150 } });

      // Info should indicate an unknown point was added
      await expect(page.locator('#info')).toHaveText(/Added point of class: Unknown/);
    });
  });

  test.describe('Classification (S1 -> S2) and Classification Results', () => {
    test('Classify unknown point shows results summary and draw called (S1 -> S2)', async ({ page }) => {
      // Add two training points (A and B) and one unknown point
      await page.selectOption('#classSelect', 'A');
      await page.click('#knnCanvas', { position: { x: 80, y: 80 } });
      await expect(page.locator('#info')).toHaveText(/Added point of class: A/);

      await page.selectOption('#classSelect', 'B');
      await page.click('#knnCanvas', { position: { x: 140, y: 90 } });
      await expect(page.locator('#info')).toHaveText(/Added point of class: B/);

      // Add unknown point
      await page.selectOption('#classSelect', 'unknown');
      await page.click('#knnCanvas', { position: { x: 110, y: 110 } });
      await expect(page.locator('#info')).toHaveText(/Added point of class: Unknown/);

      // Ensure K is valid (set to 1 to avoid K > trainingPoints)
      await page.fill('#kInput', '1');

      // Click classify and verify the info contains the summary text
      await page.click('#classifyBtn');

      const infoText = await page.locator('#info').textContent();
      expect(infoText).toMatch(/Classification Results:/);
      expect(infoText).toMatch(/Unknown Point #1: Predicted class = /);
    });

    test('Clicking "Classify Unknown" with no training points triggers alert (edge case)', async ({ page }) => {
      // Ensure no training points exist: clear if necessary
      await page.click('#clearBtn');

      // Add only an unknown point
      await page.selectOption('#classSelect', 'unknown');
      await page.click('#knnCanvas', { position: { x: 50, y: 60 } });
      await expect(page.locator('#info')).toHaveText(/Added point of class: Unknown/);

      // Expect an alert complaining about missing training points
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toMatch(/Please add training points/);
        await dialog.accept();
      });

      await page.click('#classifyBtn');
    });

    test('Clicking "Classify Unknown" with no unknown points triggers alert (edge case)', async ({ page }) => {
      // Clear and add only training points
      await page.click('#clearBtn');

      await page.selectOption('#classSelect', 'A');
      await page.click('#knnCanvas', { position: { x: 60, y: 70 } });
      await expect(page.locator('#info')).toHaveText(/Added point of class: A/);

      // Expect an alert complaining about missing unknown points
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toMatch(/Please add at least one unknown point to classify/);
        await dialog.accept();
      });

      await page.click('#classifyBtn');
    });

    test('K less than 1 triggers an alert (edge case)', async ({ page }) => {
      // Clear and add training + unknown
      await page.click('#clearBtn');
      await page.selectOption('#classSelect', 'A');
      await page.click('#knnCanvas', { position: { x: 70, y: 80 } });
      await page.selectOption('#classSelect', 'unknown');
      await page.click('#knnCanvas', { position: { x: 150, y: 160 } });

      // Set K to 0 (invalid)
      await page.fill('#kInput', '0');

      // Expect alert about K being at least 1
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toMatch(/K must be at least 1/);
        await dialog.accept();
      });

      await page.click('#classifyBtn');
    });

    test('K larger than number of training points triggers an alert (edge case)', async ({ page }) => {
      // Clear and add only one training point and one unknown
      await page.click('#clearBtn');
      await page.selectOption('#classSelect', 'B');
      await page.click('#knnCanvas', { position: { x: 85, y: 95 } });
      await page.selectOption('#classSelect', 'unknown');
      await page.click('#knnCanvas', { position: { x: 200, y: 200 } });

      // Set K to a number greater than the number of training points (1)
      await page.fill('#kInput', '5');

      // Expect alert about K being too large
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toMatch(/K cannot be larger than the number of training points/);
        await dialog.accept();
      });

      await page.click('#classifyBtn');
    });
  });

  test.describe('Clearing (S1/S2 -> S3) and post-clear behavior (S3 -> S1)', () => {
    test('Clear All removes all points and updates info (S1 -> S3)', async ({ page }) => {
      // Add a couple of points
      await page.selectOption('#classSelect', 'A');
      await page.click('#knnCanvas', { position: { x: 60, y: 60 } });
      await page.selectOption('#classSelect', 'unknown');
      await page.click('#knnCanvas', { position: { x: 180, y: 120 } });

      // Now click Clear All
      await page.click('#clearBtn');

      // Info should reflect cleared state exactly as implementation sets it
      await expect(page.locator('#info')).toHaveText('Cleared all points. Add new points to start.');
    });

    test('After clearing, adding a point transitions back to PointAdded (S3 -> S1)', async ({ page }) => {
      // Ensure cleared
      await page.click('#clearBtn');
      await expect(page.locator('#info')).toHaveText('Cleared all points. Add new points to start.');

      // Add a point after clearing
      await page.selectOption('#classSelect', 'A');
      await page.click('#knnCanvas', { position: { x: 120, y: 140 } });

      // Info should indicate new point added
      await expect(page.locator('#info')).toHaveText(/Added point of class: A/);
    });
  });

  test.describe('Miscellaneous UI and accessibility checks', () => {
    test('Controls have expected titles and attributes', async ({ page }) => {
      // Validate attributes of controls per extracted components
      await expect(page.locator('#classSelect')).toHaveAttribute('title', 'Choose point type to add');
      await expect(page.locator('#kInput')).toHaveAttribute('title', 'Number of neighbors for classification');
      await expect(page.locator('#classifyBtn')).toHaveAttribute('title', 'Classify the unknown points');
      await expect(page.locator('#clearBtn')).toHaveAttribute('title', 'Clear all points from the canvas');

      // The legend color boxes should exist
      await expect(page.locator('.color-A')).toBeVisible();
      await expect(page.locator('.color-B')).toBeVisible();
      await expect(page.locator('.color-unknown')).toBeVisible();
    });
  });
});