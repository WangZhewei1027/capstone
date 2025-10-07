import { test, expect } from "@playwright/test";

// const FILE_URL = new URL("./index.html", import.meta.url).toString();
const FILE_URL = "file://" + process.cwd() + "/html/knn-visualization.html";

test.beforeEach(async ({ page }) => {
  await page.goto(FILE_URL);
});

test("UI loads: heading, description, and chart visible; initial state empty", async ({
  page,
}) => {
  const heading = page.locator("h1");
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText("K-Nearest Neighbors (KNN) Visualization");

  const description = page.locator("p");
  await expect(description).toBeVisible();
  await expect(description).toContainText(
    "Click on the chart to add a new point"
  );

  const chart = page.locator("#chart");
  await expect(chart).toBeVisible();

  const size = await chart.evaluate((el) => ({
    w: el.offsetWidth,
    h: el.offsetHeight,
  }));
  expect(size.w).toBe(600);
  expect(size.h).toBe(400);

  await expect(page.locator("#chart .point")).toHaveCount(0);
  await expect(page.locator("#chart .knn")).toHaveCount(0);
});

test("First click adds a point classified as blue; no KNN lines for a single point", async ({
  page,
}) => {
  const chart = page.locator("#chart");

  await chart.click({ position: { x: 100, y: 100 } });

  const points = page.locator("#chart .point");
  await expect(points).toHaveCount(1);

  const firstPointClass = await points.first().getAttribute("class");
  expect(firstPointClass).toContain("blue"); // First point defaults to blue due to tie-break

  await expect(page.locator("#chart .knn")).toHaveCount(0);
});

test("Second click adds another point; KNN line drawn; point positioned correctly", async ({
  page,
}) => {
  const chart = page.locator("#chart");

  await chart.click({ position: { x: 100, y: 100 } });
  await chart.click({ position: { x: 200, y: 150 } });

  const points = page.locator("#chart .point");
  await expect(points).toHaveCount(2);

  const lastPoint = points.nth(1);
  const lastClass = await lastPoint.getAttribute("class");
  expect(lastClass).toContain("blue");

  // Verify KNN line to the previous point is drawn
  await expect(page.locator("#chart .knn")).toHaveCount(1);

  // Verify the last point is at the clicked coordinates
  const left = await lastPoint.evaluate((el) => getComputedStyle(el).left);
  const top = await lastPoint.evaluate((el) => getComputedStyle(el).top);
  expect(left).toBe("200px");
  expect(top).toBe("150px");
});

test("KNN classification with seeded points: majority red neighbors classifies new point as red; KNN draws 3 lines", async ({
  page,
}) => {
  // Seed two red points near the click location and one blue far away
  await page.evaluate(() => {
    // Access global points and drawChart defined on window scope
    window.points.push(
      { x: 100, y: 100, color: "red" },
      { x: 120, y: 100, color: "red" },
      { x: 500, y: 300, color: "blue" }
    );
    window.drawChart();
  });

  const chart = page.locator("#chart");
  // New point near the two red neighbors
  await chart.click({ position: { x: 110, y: 100 } });

  const points = page.locator("#chart .point");
  await expect(points).toHaveCount(4);

  const lastPoint = points.last();
  const lastClass = await lastPoint.getAttribute("class");
  expect(lastClass).toContain("red");

  // With 3 other points present, KNN should draw 3 lines to neighbors
  const knnLines = page.locator("#chart .knn");
  await expect(knnLines).toHaveCount(3);

  // Verify visual transform exists for KNN lines
  const transform = await knnLines
    .first()
    .evaluate((el) => getComputedStyle(el).transform);
  expect(transform).toMatch(/matrix|rotate/);
});

test("Robustness: clicking outside chart doesn't add points; no console errors during interactions", async ({
  page,
}) => {
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const chart = page.locator("#chart");
  const pointsLocator = page.locator("#chart .point");

  // Initial clicks inside chart
  await chart.click({ position: { x: 50, y: 50 } });
  await chart.click({ position: { x: 300, y: 200 } });
  await expect(pointsLocator).toHaveCount(2);

  // Click outside the chart (on heading)
  await page.locator("h1").click();
  // Ensure no new point was added
  await expect(pointsLocator).toHaveCount(2);

  // Additional interactions inside chart
  await chart.click({ position: { x: 400, y: 300 } });
  await expect(pointsLocator).toHaveCount(3);

  // Ensure no errors were logged
  expect(consoleErrors).toHaveLength(0);
});
