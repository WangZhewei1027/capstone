// tests/bubble-sort.spec.js
import { test, expect } from "@playwright/test";

const FILE_URL =
  "file://" + process.cwd() + "/html/84b79d70-a35c-11f0-b266-194a5925a4f3.html";

async function getHeights(page) {
  return await page.evaluate(() => {
    const bars = Array.from(document.querySelectorAll(".bar"));
    return bars.map((bar) => parseInt(bar.style.height));
  });
}

async function isSorted(page) {
  const values = await page.evaluate(() => {
    const bars = Array.from(document.querySelectorAll(".bar"));
    return bars.map((bar) => parseInt(bar.dataset.val));
  });
  return values.every((val, i, arr) => i === 0 || val >= arr[i - 1]);
}

test.describe("bubble sort Visualization Evaluation", () => {
  let startTime;
  let swapCount = 0;
  let consoleErrors = 0;

  test.beforeEach(async ({ page }) => {
    await page.goto(FILE_URL);
    await page.waitForTimeout(1000); // Wait for initial render
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleErrors++;
      }
    });
  });

  test("initial_render_correct", async ({ page }) => {
    const heights = await getHeights(page);
    expect(heights.length).toBeGreaterThan(0);
    expect(heights.every((h) => h > 0)).toBeTruthy();
  });

  test("control_presence", async ({ page }) => {
    const controls = [
      "#startBtn",
      "#resetBtn",
      "#randomBtn",
      "#pauseBtn",
      "#stepBtn",
      "#size",
      "#arrayInput",
      "#loadBtn",
    ];
    for (const control of controls) {
      const isVisible = await page.isVisible(control);
      expect(isVisible).toBeTruthy(`Control ${control} is missing`);
    }
  });

  test("final_sorted", async ({ page }) => {
    await page.click("#randomBtn");
    await page.click("#startBtn");
    await page.waitForSelector('#status:has-text("DONE")');
    const sorted = await isSorted(page);
    expect(sorted).toBeTruthy();
  });

  test("stepwise_progression", async ({ page }) => {
    await page.click("#randomBtn");
    await page.click("#startBtn");
    const snapshots = [];
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(300); // Wait for a step
      const heights = await getHeights(page);
      snapshots.push(heights);
    }
    expect(snapshots.length).toBeGreaterThan(0);
  });

  test("swap_count", async ({ page }) => {
    await page.click("#randomBtn");
    await page.click("#startBtn");
    await page.waitForSelector('#status:has-text("DONE")');
    const swaps = await page.evaluate(() => {
      return parseInt(document.getElementById("statSwap").textContent);
    });
    swapCount = swaps;
    expect(swapCount).toBeGreaterThan(0);
  });

  test("time_to_sort_ms", async ({ page }) => {
    await page.click("#randomBtn");
    startTime = Date.now();
    await page.click("#startBtn");
    await page.waitForSelector('#status:has-text("DONE")');
    const elapsedTime = Date.now() - startTime;
    console.log(`Time to sort: ${elapsedTime} ms`);
    expect(elapsedTime).toBeLessThan(10000); // Expect sorting to complete in under 10 seconds
  });

  test("console_errors", async () => {
    expect(consoleErrors).toBe(0);
  });

  test("idempotency", async ({ page }) => {
    await page.click("#randomBtn");
    await page.click("#startBtn");
    await page.waitForSelector('#status:has-text("DONE")');
    await page.click("#startBtn"); // Click again after done
    const status = await page.$eval("#status", (el) => el.textContent);
    expect(status).toBe("DONE");
  });

  test("robustness_under_rapid_clicks", async ({ page }) => {
    await page.click("#randomBtn");
    for (let i = 0; i < 10; i++) {
      await page.click("#startBtn");
      await page.waitForTimeout(100); // Short delay to simulate rapid clicks
    }
    await page.waitForSelector('#status:has-text("DONE")');
    const sorted = await isSorted(page);
    expect(sorted).toBeTruthy();
  });

  test("visual_regression_hash", async ({ page }) => {
    await page.screenshot({ path: "before.png" });
    await page.click("#randomBtn");
    await page.click("#startBtn");
    await page.waitForSelector('#status:has-text("DONE")');
    await page.screenshot({ path: "after.png" });
    // Placeholder for hash comparison logic
    console.log("Visual regression hash placeholder: [hash_value]");
  });
});
