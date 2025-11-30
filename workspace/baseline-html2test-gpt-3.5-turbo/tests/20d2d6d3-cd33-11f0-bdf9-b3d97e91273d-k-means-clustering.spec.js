import { test, expect } from '@playwright/test';

test.describe('K-Means Clustering Interactive Demo (20d2d6d3-cd33-11f0-bdf9-b3d97e91273d)', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6d3-cd33-11f0-bdf9-b3d97e91273d.html';

  // Page object to encapsulate common interactions
  class KMeansPage {
    constructor(page) {
      this.page = page;
      this.canvas = page.locator('#canvas');
      this.kInput = page.locator('#kInput');
      this.runBtn = page.locator('#runBtn');
      this.resetBtn = page.locator('#resetBtn');
      this.resetPointsBtn = page.locator('#resetPoints');
      this.title = page.locator('h1');
      this.instructions = page.locator('#info');
    }

    // Click on canvas at coordinates relative to element
    async clickCanvasAt(x, y) {
      await this.canvas.click({ position: { x, y } });
    }

    // Get base64 data URL of the canvas to compare visual changes
    async getCanvasDataUrl() {
      return await this.page.evaluate(() => {
        const c = document.getElementById('canvas');
        return c.toDataURL();
      });
    }

    async setK(value) {
      await this.kInput.fill(String(value));
      // blur to ensure any change events propagate
      await this.kInput.press('Tab');
    }

    async clickRun() {
      await this.runBtn.click();
    }

    async clickResetClusters() {
      await this.resetBtn.click();
    }

    async clickClearPoints() {
      await this.resetPointsBtn.click();
    }
  }

  // Collect console messages and page errors for each test to assert no unexpected runtime errors
  test.beforeEach(async ({ page }) => {
    // Navigate to app for each test
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.describe('Initial load and UI elements', () => {
    test('should load the page and display controls with default state', async ({ page }) => {
      const kpage = new KMeansPage(page);

      // Verify page title and instructions are visible
      await expect(kpage.title).toHaveText('K-Means Clustering Interactive Demo');
      await expect(kpage.instructions).toContainText('Click on the canvas area to add points (data).');

      // Verify controls exist and default k value is 3
      await expect(kpage.kInput).toBeVisible();
      await expect(kpage.kInput).toHaveValue('3');

      await expect(kpage.runBtn).toBeVisible();
      await expect(kpage.resetBtn).toBeVisible();
      await expect(kpage.resetPointsBtn).toBeVisible();

      // Verify canvas is present and has the expected aria-label
      const canvas = page.locator('#canvas');
      await expect(canvas).toBeVisible();
      await expect(canvas).toHaveAttribute('aria-label', 'K-means clustering canvas');

      // Capture any console errors or page errors that occur during initial load
      const consoleErrors = [];
      const pageErrors = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err.message));

      // Small pause to allow any runtime errors to surface
      await page.waitForTimeout(200);

      // Assert no unexpected runtime errors happened during initial load
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Point creation and canvas drawing', () => {
    test('clicking on canvas should add visible content (canvas changes)', async ({ page }) => {
      const kpage1 = new KMeansPage(page);

      // Collect console/page errors
      const consoleErrors1 = [];
      const pageErrors1 = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err.message));

      // Capture initial canvas data URL
      const initialData = await kpage.getCanvasDataUrl();

      // Click three distinct points on the canvas
      const box = await kpage.canvas.boundingBox();
      expect(box).not.toBeNull();
      const { width, height } = box;
      // Click near 3 different quadrants
      await kpage.clickCanvasAt(width * 0.25, height * 0.25);
      await page.waitForTimeout(50); // allow drawing
      const afterFirst = await kpage.getCanvasDataUrl();
      expect(afterFirst).not.toBe(initialData);

      await kpage.clickCanvasAt(width * 0.75, height * 0.25);
      await page.waitForTimeout(50);
      const afterSecond = await kpage.getCanvasDataUrl();
      expect(afterSecond).not.toBe(afterFirst);

      await kpage.clickCanvasAt(width * 0.5, height * 0.75);
      await page.waitForTimeout(50);
      const afterThird = await kpage.getCanvasDataUrl();
      expect(afterThird).not.toBe(afterSecond);

      // No unexpected runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Clear Points button should remove points and reset canvas', async ({ page }) => {
      const kpage2 = new KMeansPage(page);

      const consoleErrors2 = [];
      const pageErrors2 = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err.message));

      // Ensure we have some points drawn
      const box1 = await kpage.canvas.boundingBox();
      expect(box).not.toBeNull();
      const { width, height } = box;
      await kpage.clickCanvasAt(width * 0.3, height * 0.3);
      await page.waitForTimeout(50);
      const afterAdding = await kpage.getCanvasDataUrl();
      expect(afterAdding).not.toBe(await kpage.getCanvasDataUrl()); // trivial sanity check (same call)

      // Now clear points
      await kpage.clickClearPoints();
      await page.waitForTimeout(50);
      const afterClear = await kpage.getCanvasDataUrl();

      // The canvas after clear should be different from the one with points
      expect(afterClear).not.toBe(afterAdding);

      // No unexpected runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Error handling and edge cases (alerts)', () => {
    test('running K-Means with no points should show alert instructing to add points', async ({ page }) => {
      const kpage3 = new KMeansPage(page);

      // Ensure points are cleared
      await kpage.clickClearPoints();

      // Wait for potential redraw
      await page.waitForTimeout(50);

      // Expect a dialog to appear when clicking Run
      const dialogPromise = page.waitForEvent('dialog');
      await kpage.clickRun();
      const dialog = await dialogPromise;
      expect(dialog.message()).toContain('Please add some points');
      await dialog.dismiss();
    });

    test('resetting clusters with no points should show alert asking to add points first', async ({ page }) => {
      const kpage4 = new KMeansPage(page);

      // Ensure points are cleared
      await kpage.clickClearPoints();
      await page.waitForTimeout(50);

      const dialogPromise1 = page.waitForEvent('dialog');
      await kpage.clickResetClusters();
      const dialog1 = await dialogPromise;
      expect(dialog.message()).toContain('Please add some points');
      await dialog.dismiss();
    });

    test('running with k greater than number of points should alert the user', async ({ page }) => {
      const kpage5 = new KMeansPage(page);

      // Clear then add a single point
      await kpage.clickClearPoints();
      await page.waitForTimeout(50);

      const box2 = await kpage.canvas.boundingBox();
      expect(box).not.toBeNull();
      const { width, height } = box;
      await kpage.clickCanvasAt(width * 0.5, height * 0.5);
      await page.waitForTimeout(50);

      // Set k to a larger number than points
      await kpage.setK(5);

      const dialogPromise2 = page.waitForEvent('dialog');
      await kpage.clickRun();
      const dialog2 = await dialogPromise;
      expect(dialog.message()).toContain("Number of clusters can't exceed number of points");
      await dialog.dismiss();
    });
  });

  test.describe('K-Means algorithm flow and visual updates', () => {
    test('running K-Means with valid points and k should change canvas from black points to colored clusters', async ({ page }) => {
      const kpage6 = new KMeansPage(page);

      // Collect console/page errors
      const consoleErrors3 = [];
      const pageErrors3 = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => pageErrors.push(err.message));

      // Clear any existing points
      await kpage.clickClearPoints();
      await page.waitForTimeout(50);

      const box3 = await kpage.canvas.boundingBox();
      expect(box).not.toBeNull();
      const { width, height } = box;

      // Add three points at different positions
      await kpage.clickCanvasAt(width * 0.2, height * 0.2);
      await page.waitForTimeout(50);
      await kpage.clickCanvasAt(width * 0.8, height * 0.2);
      await page.waitForTimeout(50);
      await kpage.clickCanvasAt(width * 0.5, height * 0.8);
      await page.waitForTimeout(50);

      // Capture pre-run canvas (should have black dots)
      const preRunData = await kpage.getCanvasDataUrl();

      // Set k to 3 and run
      await kpage.setK(3);

      // Trigger run and wait for algorithm iterations to complete (animation uses 300ms intervals)
      await kpage.clickRun();

      // Wait a bit longer than a couple of iterations to allow centroids to settle (safe margin)
      await page.waitForTimeout(1600);

      // Capture post-run canvas; after clustering, points should be colored and centroids drawn (image will differ)
      const postRunData = await kpage.getCanvasDataUrl();
      expect(postRunData).not.toBe(preRunData);

      // Clicking Reset Clusters should reinitialize centroids and change the canvas appearance (likely still colored but potentially different)
      const beforeResetClusters = postRunData;
      await kpage.clickResetClusters();
      // Allow the redraw after reset
      await page.waitForTimeout(200);
      const afterResetClusters = await kpage.getCanvasDataUrl();
      // Canvas may or may not change depending on random centroid picks; assert that it remains a valid image and did not produce errors
      expect(afterResetClusters).toBeTruthy();

      // No unexpected runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Reset Points after clustering should clear canvas back to empty state', async ({ page }) => {
      const kpage7 = new KMeansPage(page);

      // Clear and add points
      await kpage.clickClearPoints();
      await page.waitForTimeout(50);

      const box4 = await kpage.canvas.boundingBox();
      expect(box).not.toBeNull();
      const { width, height } = box;

      await kpage.clickCanvasAt(width * 0.25, height * 0.25);
      await page.waitForTimeout(30);
      await kpage.clickCanvasAt(width * 0.75, height * 0.25);
      await page.waitForTimeout(30);
      await kpage.clickCanvasAt(width * 0.5, height * 0.75);
      await page.waitForTimeout(30);

      const withPoints = await kpage.getCanvasDataUrl();

      // Run with k = 3
      await kpage.setK(3);
      await kpage.clickRun();
      await page.waitForTimeout(1200);

      const afterRun = await kpage.getCanvasDataUrl();
      expect(afterRun).not.toBe(withPoints);

      // Now clear points
      await kpage.clickClearPoints();
      await page.waitForTimeout(100);
      const afterClear1 = await kpage.getCanvasDataUrl();

      // After clearing, canvas should be different from the clustered state and also different from the 'withPoints' image
      expect(afterClear).not.toBe(afterRun);
      expect(afterClear).not.toBe(withPoints);
    });
  });
});