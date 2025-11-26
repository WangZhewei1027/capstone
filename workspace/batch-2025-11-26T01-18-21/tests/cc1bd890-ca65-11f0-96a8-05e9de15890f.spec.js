import { test, expect } from "@playwright/test";

const BASE_URL =
  "http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1bd890-ca65-11f0-96a8-05e9de15890f.html";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Array Explorer Interactive Demo Tests", () => {
  test("Initial state validation", async ({ page }) => {
    const arrayBox = await page.locator("#arrayBox");
    const log = await page.locator("#log");

    // Validate initial array is displayed correctly
    await expect(arrayBox).toHaveText("(empty array)");

    // Validate log is initialized
    await expect(log).toHaveText(/Initialized with/);
  });

  test("Push operation", async ({ page }) => {
    const newValueInput = await page.locator("#newValue");
    const pushBtn = await page.locator("#pushBtn");
    const arrayBox = await page.locator("#arrayBox");

    await newValueInput.fill("42");
    await pushBtn.click();

    // Validate array state after push
    await expect(arrayBox).toHaveText("42");
  });

  test("Unshift operation", async ({ page }) => {
    const newValueInput = await page.locator("#newValue");
    const unshiftBtn = await page.locator("#unshiftBtn");
    const arrayBox = await page.locator("#arrayBox");

    await newValueInput.fill("100");
    await unshiftBtn.click();

    // Validate array state after unshift
    await expect(arrayBox).toHaveText("100, 42");
  });

  test("Pop operation", async ({ page }) => {
    const popBtn = await page.locator("#popBtn");
    const arrayBox = await page.locator("#arrayBox");

    await popBtn.click();

    // Validate array state after pop
    await expect(arrayBox).toHaveText("100");
  });

  test("Shift operation", async ({ page }) => {
    const shiftBtn = await page.locator("#shiftBtn");
    const arrayBox = await page.locator("#arrayBox");

    await shiftBtn.click();

    // Validate array state after shift
    await expect(arrayBox).toHaveText("(empty array)");
  });

  test("Clear operation", async ({ page }) => {
    const clearBtn = await page.locator("#clearBtn");
    const arrayBox = await page.locator("#arrayBox");

    await clearBtn.click();

    // Validate array state after clear
    await expect(arrayBox).toHaveText("(empty array)");
  });

  test("Reset operation", async ({ page }) => {
    const resetBtn = await page.locator("#resetBtn");
    const arrayBox = await page.locator("#arrayBox");

    await resetBtn.click();

    // Validate array state after reset
    await expect(arrayBox).toHaveText("3, 7, 2, 9, 7");
  });

  test("Access by index", async ({ page }) => {
    const accessIndexBtn = await page.locator("#accessIndexBtn");
    const log = await page.locator("#log");

    await accessIndexBtn.click();
    await page.keyboard.type("2");
    await page.keyboard.press("Enter");

    // Validate log after accessing index
    await expect(log).toHaveText("arr[2] -> 2");
  });

  test("IndexOf operation", async ({ page }) => {
    const indexOfBtn = await page.locator("#indexOfBtn");
    const log = await page.locator("#log");

    await indexOfBtn.click();
    await page.keyboard.type("7");
    await page.keyboard.press("Enter");

    // Validate log after indexOf
    await expect(log).toHaveText("indexOf(7) -> 1");
  });

  test("Includes operation", async ({ page }) => {
    const includesBtn = await page.locator("#includesBtn");
    const log = await page.locator("#log");

    await includesBtn.click();
    await page.keyboard.type("3");
    await page.keyboard.press("Enter");

    // Validate log after includes
    await expect(log).toHaveText("includes(3) -> true");
  });

  test("Find operation", async ({ page }) => {
    const findBtn = await page.locator("#findBtn");
    const log = await page.locator("#log");

    await findBtn.click();
    await page.keyboard.type("x => x > 5");
    await page.keyboard.press("Enter");

    // Validate log after find
    await expect(log).toHaveText("find(x => x > 5) -> 7");
  });

  test("Map operation", async ({ page }) => {
    const mapBtn = await page.locator("#mapBtn");
    const log = await page.locator("#log");

    await mapBtn.click();

    // Validate log after map
    await expect(log).toHaveText("map: doubled numbers ->");
  });

  test("Filter operation", async ({ page }) => {
    const filterBtn = await page.locator("#filterBtn");
    const log = await page.locator("#log");

    await filterBtn.click();
    await page.keyboard.type("x => x % 2 === 1");
    await page.keyboard.press("Enter");

    // Validate log after filter
    await expect(log).toHaveText("filter(x => x % 2 === 1) ->");
  });

  test("Reduce operation", async ({ page }) => {
    const reduceBtn = await page.locator("#reduceBtn");
    const log = await page.locator("#log");

    await reduceBtn.click();
    await page.keyboard.type("(acc, x) => acc + x");
    await page.keyboard.press("Enter");

    // Validate log after reduce
    await expect(log).toHaveText("reduce ->");
  });

  test("ForEach operation", async ({ page }) => {
    const forEachBtn = await page.locator("#forEachBtn");
    const log = await page.locator("#log");

    await forEachBtn.click();

    // Validate log after forEach
    await expect(log).toHaveText("forEach output:");
  });

  test("Sort operation", async ({ page }) => {
    const sortBtn = await page.locator("#sortBtn");
    const log = await page.locator("#log");

    await sortBtn.click();

    // Validate log after sort
    await expect(log).toHaveText("arr sorted ->");
  });

  test("Reverse operation", async ({ page }) => {
    const reverseBtn = await page.locator("#reverseBtn");
    const log = await page.locator("#log");

    await reverseBtn.click();

    // Validate log after reverse
    await expect(log).toHaveText("arr reversed ->");
  });

  test("Concat operation", async ({ page }) => {
    const concatBtn = await page.locator("#concatBtn");
    const log = await page.locator("#log");

    await concatBtn.click();
    await page.keyboard.type("[100, 200]");
    await page.keyboard.press("Enter");

    // Validate log after concat
    await expect(log).toHaveText("concat([100, 200]) ->");
  });

  test("Slice operation", async ({ page }) => {
    const sliceBtn = await page.locator("#sliceBtn");
    const log = await page.locator("#log");

    await sliceBtn.click();
    await page.keyboard.type("0");
    await page.keyboard.press("Enter");

    // Validate log after slice
    await expect(log).toHaveText("slice(0,");
  });

  test("Flat operation", async ({ page }) => {
    const flatBtn = await page.locator("#flatBtn");
    const log = await page.locator("#log");

    await flatBtn.click();
    await page.keyboard.type("1");
    await page.keyboard.press("Enter");

    // Validate log after flat
    await expect(log).toHaveText("flat(1) ->");
  });

  test("TypedArray operation", async ({ page }) => {
    const typedBtn = await page.locator("#typedBtn");
    const log = await page.locator("#log");

    await typedBtn.click();

    // Validate log after typed array creation
    await expect(log).toHaveText("Created Int16Array from numeric elements ->");
  });

  test("Run expression", async ({ page }) => {
    const runExprBtn = await page.locator("#runExpr");
    const log = await page.locator("#log");

    await page.locator("#expr").fill("arr.map(x => x * 2)");
    await runExprBtn.click();

    // Validate log after running expression
    await expect(log).toHaveText("Expression result ->");
  });

  test("Clear log with Ctrl+L", async ({ page }) => {
    const log = await page.locator("#log");

    await page.keyboard.press("Control+L");

    // Validate log is cleared
    await expect(log).toHaveText("(empty)");
  });
});
