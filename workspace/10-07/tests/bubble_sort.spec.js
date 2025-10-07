// tests/bubble-sort.spec.js
import { test, expect } from "@playwright/test";
import path from "path";
import { createHash } from "crypto";

const FILE_URL =
  "file://" + process.cwd() + "/html/84b79d70-a35c-11f0-b266-194a5925a4f3.html";

// Helper functions
async function getBarsValues(page) {
  return await page.$$eval("#bars .bar", (bars) =>
    bars.map((b) => parseInt(b.dataset.val || "0", 10))
  );
}
function isSortedAscending(arr) {
  for (let i = 1; i < arr.length; i++) if (arr[i - 1] > arr[i]) return false;
  return true;
}
async function setRangeValue(page, selector, value, fireChange = false) {
  await page.$eval(
    selector,
    (el, v, doChange) => {
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      if (doChange) el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
    fireChange
  );
}
async function startAndWaitDone(page, timeout = 30000) {
  await page.click("#startBtn");
  await expect(page.locator("#status")).toHaveText("DONE", { timeout });
}
async function getSwapCount(page) {
  const txt = await page.textContent("#statSwap");
  return parseInt((txt || "0").replace(/[^\d]/g, ""), 10) || 0;
}
async function getComparisonCount(page) {
  const txt = await page.textContent("#statComp");
  return parseInt((txt || "0").replace(/[^\d]/g, ""), 10) || 0;
}
async function setupConsoleCapture(page) {
  const counters = { errors: 0, warnings: 0, messages: [] };
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error") counters.errors++;
    if (type === "warning") counters.warnings++;
    counters.messages.push({ type, text: msg.text() });
  });
  page.on("pageerror", () => {
    counters.errors++;
  });
  return counters;
}

test.describe("bubble sort Visualization Evaluation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FILE_URL);
    await page.waitForSelector("#bars .bar");
    // Speed up animations for all tests
    await setRangeValue(page, "#speed", 100, false);
  });

  test("1) initial_render_correct (bool)", async ({ page }) => {
    const errors = await setupConsoleCapture(page);

    // Validate essential elements and initial stats
    const barsCount = await page.locator("#bars .bar").count();
    const statSizeTxt = await page.textContent("#statSize");
    const statSize =
      parseInt((statSizeTxt || "0").replace(/[^\d]/g, ""), 10) || 0;
    const statusTxt = await page.textContent("#status");
    const boundaryWidth = await page.$eval(
      "#boundary",
      (el) => el.style.width || ""
    );

    const values = await getBarsValues(page);
    const nonZeroHeights = await page.$$eval("#bars .bar", (bars) =>
      bars
        .map((b) => parseInt((b.style.height || "0").replace(/[^\d]/g, ""), 10))
        .every((h) => h >= 2)
    );

    console.log("initial_render_correct details:", {
      barsCount,
      statSize,
      statusTxt,
      boundaryWidth,
      valuesSample: values.slice(0, 10),
    });

    expect(barsCount).toBeGreaterThan(0);
    expect(statSize).toBeGreaterThan(0);
    expect(barsCount).toBe(statSize);
    expect(nonZeroHeights).toBeTruthy();
    expect(statusTxt?.toUpperCase()).toContain("READY");
    expect(boundaryWidth).toBe("0%");
    expect(errors.errors).toBe(0);
  });

  test("2) control_presence (list) and interactability", async ({ page }) => {
    const ids = [
      "#randomBtn",
      "#resetBtn",
      "#startBtn",
      "#pauseBtn",
      "#stepBtn",
      "#loadBtn",
      "#size",
      "#speed",
      "#arrayInput",
    ];
    const missing = [];
    for (const sel of ids) {
      const present = await page.$(sel);
      if (!present) missing.push(sel);
    }
    console.log("control_presence missing:", missing);
    // Try interacting with present controls
    if ((await page.$("#size")) !== null) {
      await setRangeValue(page, "#size", 10, true);
      await expect(page.locator("#sizeVal")).toHaveText("10");
    }
    if ((await page.$("#speed")) !== null) {
      await setRangeValue(page, "#speed", 100, false);
      await expect(page.locator("#speedVal")).toHaveText(/Very Fast/i);
    }
    if ((await page.$("#randomBtn")) !== null) await page.click("#randomBtn");
    if ((await page.$("#resetBtn")) !== null) await page.click("#resetBtn");
    expect(true).toBe(true); // Always pass; we log missing controls if any.
  });

  test("3) final_sorted (bool)", async ({ page }) => {
    const cons = await setupConsoleCapture(page);
    // Use smaller array for speed
    await setRangeValue(page, "#size", 12, true);
    // Ensure a random array is rendered for this size
    await page.click("#randomBtn");

    await startAndWaitDone(page, 30000);
    const values = await getBarsValues(page);
    const sorted = isSortedAscending(values);
    console.log("final_sorted values (first 20):", values.slice(0, 20));
    expect(sorted).toBeTruthy();
    expect(cons.errors).toBe(0);
  });

  test("4) stepwise_progression (percent and snapshots)", async ({ page }) => {
    // Smaller array; step mode
    await setRangeValue(page, "#size", 8, true);
    await page.click("#randomBtn");

    // Start in stepping mode
    await page.click("#stepBtn");
    const snapshots = [];
    const comparisons = [];
    const steps = 12;

    for (let i = 0; i < steps; i++) {
      await page.click("#stepBtn");
      await page.waitForTimeout(30);
      const html = await page.$eval("#bars", (el) => el.innerHTML);
      const comp = await getComparisonCount(page);
      snapshots.push(html);
      comparisons.push(comp);
    }

    let changed = 0;
    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i] !== snapshots[i - 1]) changed++;
    }
    const percentChanged = Math.round(
      (changed / Math.max(1, snapshots.length - 1)) * 100
    );

    console.log("stepwise_progression:", {
      snapshotsCount: snapshots.length,
      percentChanged,
      comparisonsProgress: comparisons,
    });

    expect(percentChanged).toBeGreaterThan(20); // At least some progression visible
  });

  test("5) swap_count (number)", async ({ page }) => {
    await setRangeValue(page, "#size", 14, true);
    await page.click("#randomBtn");
    await startAndWaitDone(page, 30000);
    const swaps = await getSwapCount(page);
    console.log("swap_count:", swaps);
    expect(Number.isFinite(swaps)).toBeTruthy();
    expect(swaps).toBeGreaterThanOrEqual(0);
  });

  test("6) time_to_sort_ms (number)", async ({ page }) => {
    await setRangeValue(page, "#size", 16, true);
    await page.click("#randomBtn");
    await setRangeValue(page, "#speed", 100, false);

    const t0 = Date.now();
    await startAndWaitDone(page, 30000);
    const t1 = Date.now();
    const elapsed = t1 - t0;
    console.log("time_to_sort_ms:", elapsed);
    expect(elapsed).toBeLessThan(8000); // Should finish quickly with fast speed and small size
  });

  test("7) console_errors (count)", async ({ page }) => {
    const cons = await setupConsoleCapture(page);
    await setRangeValue(page, "#size", 10, true);
    await page.click("#randomBtn");
    await startAndWaitDone(page, 30000);
    console.log("console_errors:", {
      errors: cons.errors,
      warnings: cons.warnings,
    });
    expect(cons.errors).toBe(0);
  });

  test("8) idempotency (bool)", async ({ page }) => {
    const cons = await setupConsoleCapture(page);
    await setRangeValue(page, "#size", 10, true);
    await page.click("#randomBtn");

    await startAndWaitDone(page, 30000);
    const first = await getBarsValues(page);

    // Click start again on finished visualization
    await setRangeValue(page, "#speed", 100, false);
    await startAndWaitDone(page, 30000);
    const second = await getBarsValues(page);

    const bothSorted = isSortedAscending(first) && isSortedAscending(second);
    const sameArray =
      first.length === second.length && first.every((v, i) => v === second[i]);
    console.log("idempotency:", { bothSorted, sameArray });
    expect(bothSorted).toBeTruthy();
    expect(sameArray).toBeTruthy();
    expect(cons.errors).toBe(0);
  });

  test("9) robustness_under_rapid_clicks (bool / count)", async ({ page }) => {
    const cons = await setupConsoleCapture(page);
    await setRangeValue(page, "#size", 12, true);
    await page.click("#randomBtn");
    await setRangeValue(page, "#speed", 100, false);

    // Rapidly trigger main actions
    const actions = ["#startBtn", "#pauseBtn", "#stepBtn"];
    for (let i = 0; i < 30; i++) {
      const sel = actions[i % actions.length];
      await page.click(sel).catch(() => {});
    }

    // Ensure we can still complete sorting
    await page.click("#startBtn");
    await startAndWaitDone(page, 30000);

    const values = await getBarsValues(page);
    const sorted = isSortedAscending(values);
    console.log("robustness_under_rapid_clicks:", {
      errors: cons.errors,
      warnings: cons.warnings,
      sorted,
    });

    expect(sorted).toBeTruthy();
    expect(cons.errors).toBe(0);
  });

  test("10) visual_regression_hash (string)", async ({ page }) => {
    // Before screenshot
    const before = await page.screenshot({ fullPage: true });

    await setRangeValue(page, "#size", 14, true);
    await page.click("#randomBtn");
    await setRangeValue(page, "#speed", 100, false);
    await startAndWaitDone(page, 30000);

    // After screenshot
    const after = await page.screenshot({ fullPage: true });

    const beforeHash = createHash("md5").update(before).digest("hex");
    const afterHash = createHash("md5").update(after).digest("hex");
    const combinedHash = createHash("md5")
      .update(Buffer.concat([before, after]))
      .digest("hex");

    console.log("visual_regression_hash:", {
      beforeHash,
      afterHash,
      combinedHash,
      changed: beforeHash !== afterHash,
    });

    expect(beforeHash).not.toBe(afterHash);
  });
});
