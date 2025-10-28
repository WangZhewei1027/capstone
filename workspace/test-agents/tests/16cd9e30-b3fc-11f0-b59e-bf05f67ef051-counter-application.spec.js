import { test, expect } from "@playwright/test";

const BASE_URL =
  "http://127.0.0.1:5500/workspace/test-agents/html/1bdbde50-b3fc-11f0-b59e-bf05f67ef051.html";

test.describe("Counter Application Tests", () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("Initial state is idle and counter displays 0", async () => {
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("0");
  });

  test("Clicking Increment button changes state to incrementing and updates counter", async () => {
    await page.click("button.increment");
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("1"); // Counter should increment to 1
  });

  test("Clicking Increment button again keeps state in incrementing and updates counter", async () => {
    await page.click("button.increment");
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("2"); // Counter should increment to 2
  });

  test("Clicking Decrement button changes state to decrementing and updates counter", async () => {
    await page.click("button.decrement");
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("1"); // Counter should decrement to 1
  });

  test("Clicking Decrement button again keeps state in decrementing and updates counter", async () => {
    await page.click("button.decrement");
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("0"); // Counter should decrement to 0
  });

  test("Clicking Increment after Decrement returns to incrementing state and updates counter", async () => {
    await page.click("button.increment");
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("1"); // Counter should increment to 1
  });

  test("Clicking Decrement after Increment returns to decrementing state and updates counter", async () => {
    await page.click("button.decrement");
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("0"); // Counter should decrement to 0
  });

  test("Counter does not go below 0 when decrementing", async () => {
    await page.click("button.decrement"); // Decrement from 0
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("-1"); // Counter should show -1
  });

  test("Counter can increment from negative value", async () => {
    await page.click("button.increment"); // Increment from -1
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("0"); // Counter should return to 0
  });

  test("Counter can increment multiple times and check final value", async () => {
    for (let i = 0; i < 5; i++) {
      await page.click("button.increment");
    }
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("5"); // Counter should be 5
  });

  test("Counter can decrement multiple times and check final value", async () => {
    for (let i = 0; i < 3; i++) {
      await page.click("button.decrement");
    }
    const counterDisplay = await page.locator("#counter").innerText();
    expect(counterDisplay).toBe("2"); // Counter should be 2
  });
});
