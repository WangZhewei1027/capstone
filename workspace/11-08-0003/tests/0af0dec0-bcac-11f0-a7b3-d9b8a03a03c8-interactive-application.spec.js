import { test, expect } from "@playwright/test";

const BASE_URL =
  "http://127.0.0.1:5500/workspace/11-08-0003/html/0af0dec0-bcac-11f0-a7b3-d9b8a03a03c8.html";

test.describe("Bellman-Ford Algorithm Interactive Module", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("should start in idle state", async ({ page }) => {
    const output = await page.locator("#output").innerText();
    expect(output).toBe("");
  });

  test("should highlight node when clicked", async ({ page }) => {
    await page.mouse.click(50, 50); // Simulate clicking on a node
    const node = await page.locator(".node").first();
    expect(await node.evaluate((node) => node.style.backgroundColor)).toBe(
      "rgb(0, 123, 255)"
    ); // Check if the node is highlighted
  });

  test("should transition to selecting_node state on NODE_CLICKED", async ({
    page,
  }) => {
    await page.mouse.click(50, 50); // Click to select a node
    const output1 = await page.locator("#output1").innerText();
    expect(output).toContain("Node selected");
  });

  test("should return to idle state on NODE_CONNECTED", async ({ page }) => {
    await page.mouse.click(50, 50); // Select a node
    await page.mouse.click(100, 100); // Connect to another node
    const output2 = await page.locator("#output2").innerText();
    expect(output).toBe(""); // Check if output is cleared
  });

  test("should transition to running_algorithm state on RUN_BUTTON_CLICKED", async ({
    page,
  }) => {
    await page.mouse.click(50, 50); // Select a node
    await page.mouse.click(100, 100); // Connect to another node
    await page.locator("#run-btn").click(); // Click run button
    const output3 = await page.locator("#output3").innerText();
    expect(output).toContain("Running algorithm..."); // Check if running message is displayed
  });

  test("should transition to done state on ALGORITHM_COMPLETE", async ({
    page,
  }) => {
    await page.mouse.click(50, 50); // Select a node
    await page.mouse.click(100, 100); // Connect to another node
    await page.locator("#run-btn").click(); // Click run button
    await page.waitForTimeout(1000); // Simulate waiting for algorithm to complete
    const output4 = await page.locator("#output4").innerText();
    expect(output).toContain("Algorithm completed"); // Check if completion message is displayed
  });

  test("should reset to idle state on RESET", async ({ page }) => {
    await page.mouse.click(50, 50); // Select a node
    await page.mouse.click(100, 100); // Connect to another node
    await page.locator("#run-btn").click(); // Click run button
    await page.waitForTimeout(1000); // Simulate waiting for algorithm to complete
    await page.locator("#reset-btn").click(); // Click reset button
    const output5 = await page.locator("#output5").innerText();
    expect(output).toBe(""); // Check if output is cleared
  });

  test("should handle edge case of no nodes", async ({ page }) => {
    await page.locator("#run-btn").click(); // Click run button without nodes
    const output6 = await page.locator("#output6").innerText();
    expect(output).toContain("No nodes to run algorithm"); // Check for error message
  });

  test("should handle edge case of disconnected nodes", async ({ page }) => {
    await page.mouse.click(50, 50); // Select a node
    await page.mouse.click(100, 100); // Connect to another node
    await page.mouse.click(150, 150); // Select a third node
    await page.locator("#run-btn").click(); // Click run button
    await page.waitForTimeout(1000); // Simulate waiting for algorithm to complete
    const output7 = await page.locator("#output7").innerText();
    expect(output).toContain("Disconnected nodes"); // Check for error message
  });
});
