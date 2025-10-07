// tests/bubble-sort.spec.js
import { test, expect } from "@playwright/test";

// ======= CONFIG =======

const FILE_URL = "file://" + process.cwd() + "/html/bubble-sort.html";
// const FILE_URL =
//   "file://" + process.cwd() + "/html/84b79d70-a35c-11f0-b266-194a5925a4f3.html";

// ======= HELPER FUNCTIONS =======
async function getHeights(page) {
  return await page.$$eval("#array .bar", (bars) =>
    bars.map((b) => parseInt(b.style.height))
  );
}

async function isSorted(arr) {
  return arr.every((v, i, a) => i === 0 || a[i] >= a[i - 1]);
}

// ======= TEST SUITE =======
test.describe("Bubble Sort Visualization Evaluation", () => {
  test.beforeEach(async ({ page, context }) => {
    // Speed up: disable the 500ms timeout in bubbleSort
    await context.addInitScript(() => {
      const origSetTimeout = window.setTimeout;
      window.setTimeout = (fn, ms) => origSetTimeout(fn, 0);
    });
    await page.goto(FILE_URL);
  });

  // 1️⃣ INITIAL RENDER CHECK
  test("initial render correctness", async ({ page }) => {
    const bars = await page.$$("#array .bar");
    expect(bars.length).toBeGreaterThan(0);

    const heights = await getHeights(page);
    expect(heights).toEqual([100, 60, 160, 80, 40]); // [5,3,8,4,2]*20
  });

  // 2️⃣ CONTROL PRESENCE
  test("sort button exists and is enabled", async ({ page }) => {
    const btn = await page.locator("#sortButton");
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  // 3️⃣ FUNCTIONAL CORRECTNESS
  test("array becomes sorted after clicking sort", async ({ page }) => {
    await page.click("#sortButton");

    await page.waitForFunction(() => {
      const heights = [...document.querySelectorAll("#array .bar")].map((b) =>
        parseInt(b.style.height)
      );
      return heights.every((v, i, a) => i === 0 || a[i] >= a[i - 1]);
    });

    const finalHeights = await getHeights(page);
    expect(await isSorted(finalHeights)).toBe(true);
  });

  // 4️⃣ STEPWISE PROGRESSION (swaps observed)
  test("bars update step by step (detects swaps)", async ({ page }) => {
    await page.click("#sortButton");

    const states = await page.evaluate(() => {
      return new Promise((resolve) => {
        const snapshots = [];
        const interval = setInterval(() => {
          const arr = [...document.querySelectorAll("#array .bar")].map((b) =>
            parseInt(b.style.height)
          );
          const state = arr.join(",");
          if (snapshots.length === 0 || snapshots.at(-1) !== state)
            snapshots.push(state);

          const sorted = arr.every((v, i, a) => i === 0 || a[i] >= a[i - 1]);
          if (sorted) {
            clearInterval(interval);
            resolve(snapshots);
          }
        }, 20);
      });
    });

    console.log("🔄 swap states observed:", states.length - 1);
    expect(states.length).toBeGreaterThan(1);
  });

  // 5️⃣ RESPONSIVENESS
  test("measure sorting duration", async ({ page }) => {
    const start = Date.now();
    await page.click("#sortButton");

    await page.waitForFunction(() => {
      const heights = [...document.querySelectorAll("#array .bar")].map((b) =>
        parseInt(b.style.height)
      );
      return heights.every((v, i, a) => i === 0 || a[i] >= a[i - 1]);
    });
    const duration = Date.now() - start;

    console.log(`⚡ Sort duration: ${duration}ms`);
    expect(duration).toBeLessThan(5000); // should complete within 5s
  });

  // 6️⃣ ROBUSTNESS – Console Errors
  test("no console errors during sorting", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.click("#sortButton");

    await page.waitForFunction(() => {
      const heights = [...document.querySelectorAll("#array .bar")].map((b) =>
        parseInt(b.style.height)
      );
      return heights.every((v, i, a) => i === 0 || a[i] >= a[i - 1]);
    });

    console.log("🚫 Console errors:", errors);
    expect(errors.length).toBe(0);
  });

  // 7️⃣ IDEMPOTENCY
  test("clicking sort again keeps array sorted", async ({ page }) => {
    await page.click("#sortButton");

    await page.waitForFunction(() => {
      const heights = [...document.querySelectorAll("#array .bar")].map((b) =>
        parseInt(b.style.height)
      );
      return heights.every((v, i, a) => i === 0 || a[i] >= a[i - 1]);
    });

    // click again
    await page.click("#sortButton");
    await page.waitForTimeout(200);

    const finalHeights = await getHeights(page);
    expect(await isSorted(finalHeights)).toBe(true);
  });

  // 8️⃣ RAPID CLICKS STRESS TEST
  test("resilient under rapid clicks", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await Promise.all([
      page.click("#sortButton"),
      page.click("#sortButton"),
      page.click("#sortButton"),
    ]);

    await page.waitForFunction(() => {
      const heights = [...document.querySelectorAll("#array .bar")].map((b) =>
        parseInt(b.style.height)
      );
      return heights.every((v, i, a) => i === 0 || a[i] >= a[i - 1]);
    });

    const finalHeights = await getHeights(page);
    expect(await isSorted(finalHeights)).toBe(true);
    expect(errors.length).toBe(0);
  });

  // 9️⃣ VISUAL SNAPSHOT (optional)
  test("save screenshot before and after sorting", async ({ page }) => {
    await page.screenshot({ path: "screenshots/bubble_initial.png" });
    await page.click("#sortButton");
    await page.waitForFunction(() => {
      const heights = [...document.querySelectorAll("#array .bar")].map((b) =>
        parseInt(b.style.height)
      );
      return heights.every((v, i, a) => i === 0 || a[i] >= a[i - 1]);
    });
    await page.screenshot({ path: "screenshots/bubble_sorted.png" });
  });
});
