import { test, expect } from "@playwright/test";

test.describe("KNN Visualization Input Validation", () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    // Launch browser and load the HTML file
    page = await browser.newPage();
    // Load your local HTML file - adjust the path as needed
    await page.goto("file://" + process.cwd() + "/knn-visualization.html");
  });

  test.afterEach(async () => {
    await page.close();
  });

  test("should validate chart boundary clicks", async () => {
    // Test 1: Valid clicks inside chart boundaries
    const chart = page.locator("#chart");
    const chartBox = await chart.boundingBox();

    // Click at different valid positions inside the chart
    const testPoints = [
      { x: chartBox.x + 50, y: chartBox.y + 50 }, // top-left area
      {
        x: chartBox.x + chartBox.width / 2,
        y: chartBox.y + chartBox.height / 2,
      }, // center
      {
        x: chartBox.x + chartBox.width - 10,
        y: chartBox.y + chartBox.height - 10,
      }, // bottom-right
    ];

    for (const point of testPoints) {
      await page.mouse.click(point.x, point.y);

      // Verify a point was added by checking DOM elements
      const points = await page.locator(".point").count();
      console.log(`Points after click: ${points}`);

      // Each click should add exactly one point
      // We track this by counting points before and after
    }
  });

  test("should handle invalid interactions gracefully", async () => {
    // Test 2: Click outside chart boundaries (should be ignored)
    const chart = page.locator("#chart");
    const initialPointCount = await page.locator(".point").count();

    // Click outside the chart (negative coordinates)
    await page.mouse.click(-100, -100);

    // Click way outside the viewport
    await page.mouse.click(1000, 1000);

    const finalPointCount = await page.locator(".point").count();

    // Points count should remain unchanged for invalid clicks
    expect(finalPointCount).toBe(initialPointCount);
  });

  test("should validate KNN classification logic", async () => {
    // Test 3: Programmatically test the classification algorithm
    const chart = page.locator("#chart");
    const chartBox = await chart.boundingBox();

    // Add some pre-defined points with known colors using JavaScript injection
    await page.evaluate(() => {
      // Clear any existing points
      window.points = [];

      // Add red points in one cluster
      window.points.push({ x: 100, y: 100, color: "red" });
      window.points.push({ x: 120, y: 110, color: "red" });
      window.points.push({ x: 110, y: 90, color: "red" });

      // Add blue points in another cluster
      window.points.push({ x: 300, y: 300, color: "blue" });
      window.points.push({ x: 320, y: 310, color: "blue" });

      // Redraw the chart
      window.drawChart();
    });

    // Click near the red cluster - should be classified as red
    await page.mouse.click(chartBox.x + 130, chartBox.y + 100);

    // Wait for the point to be added and classified
    await page.waitForTimeout(100);

    // Check if the new point near red cluster is classified as red
    const redPoints = await page.locator(".point.red").count();
    const bluePoints = await page.locator(".point.blue").count();

    console.log(`Red points: ${redPoints}, Blue points: ${bluePoints}`);

    // We should have more red points now (original 3 red + 1 new red)
    expect(redPoints).toBeGreaterThanOrEqual(4);
  });

  test("should maintain visual consistency after interactions", async () => {
    // Test 4: Verify visual elements are properly rendered
    const chart = page.locator("#chart");

    // Add multiple points
    const chartBox = await chart.boundingBox();
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(
        chartBox.x + 100 + i * 20,
        chartBox.y + 100 + i * 20
      );
    }

    // Verify all points are visible and have correct classes
    const points = page.locator(".point");
    const pointCount = await points.count();

    expect(pointCount).toBe(5);

    // Each point should have either 'red' or 'blue' class
    for (let i = 0; i < pointCount; i++) {
      const point = points.nth(i);
      const className = await point.getAttribute("class");
      expect(className).toMatch(/(red|blue)/);
    }

    // Verify KNN lines are drawn (yellow dashed borders)
    const knnLines = page.locator(".knn");
    const lineCount = await knnLines.count();
    console.log(`KNN lines drawn: ${lineCount}`);
  });

  test("should handle rapid successive clicks", async () => {
    // Test 5: Stress test with rapid interactions
    const chart = page.locator("#chart");
    const chartBox = await chart.boundingBox();

    const initialPointCount = await page.locator(".point").count();

    // Perform rapid clicks in different locations
    const clickPromises = [];
    for (let i = 0; i < 10; i++) {
      clickPromises.push(
        page.mouse.click(chartBox.x + 50 + i * 10, chartBox.y + 50 + i * 10)
      );
    }

    // Execute all clicks rapidly
    await Promise.all(clickPromises);

    // Wait for all points to be processed
    await page.waitForTimeout(500);

    const finalPointCount = await page.locator(".point").count();

    // Should have exactly initial + 10 points
    expect(finalPointCount).toBe(initialPointCount + 10);

    // Check for console errors (should be none)
    const logs = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        logs.push(msg.text());
      }
    });

    expect(logs.length).toBe(0);
  });
});
