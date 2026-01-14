import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa596-d59e-11f0-89ab-2f71529652ac.html';

// Page object encapsulating interactions with the adjacency list page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.edgeInput = page.locator('#edge-input');
    this.addButton = page.locator('text=Add Edge');
    this.generateButton = page.locator('text=Generate Adjacency List');
    this.listBody = page.locator('#list-body');
    this.table = page.locator('#adjacency-list');
  }

  // Fill the edge input
  async fillEdge(edge) {
    await this.edgeInput.fill(edge);
  }

  // Click the "Add Edge" button (alerts are handled by the test harness)
  async clickAddEdge() {
    await this.addButton.click();
  }

  // Click the "Generate Adjacency List" button
  async clickGenerate() {
    await this.generateButton.click();
  }

  // Returns the number of rows currently in the adjacency table tbody
  async rowCount() {
    return await this.listBody.locator('tr').count();
  }

  // Get text content of a specific row's cells [node, connections]
  async getRowTexts(rowIndex) {
    const row = this.listBody.locator('tr').nth(rowIndex);
    const cells = row.locator('td');
    const count = await cells.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await cells.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Get the full tbody text (for debugging/assertions)
  async getBodyText() {
    return (await this.listBody.innerText()).trim();
  }

  // Check if the input is empty
  async isInputEmpty() {
    return (await this.edgeInput.inputValue()) === '';
  }
}

test.describe('Adjacency List App - 7e8aa596-d59e-11f0-89ab-2f71529652ac', () => {
  let pageErrors;
  let consoleErrors;
  let dialogs;

  // Setup before each test: navigate and attach listeners to capture console/page errors and dialogs
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    dialogs = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      // collect the error message (stack may differ across environments)
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Capture dialogs (alerts) and automatically accept them so tests can continue
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    await page.goto(APP_URL);
  });

  // Teardown assertion: ensure no unexpected runtime errors or console errors occurred
  test.afterEach(async () => {
    // Assert there were no uncaught page errors during the test
    expect(pageErrors, `Expected no page errors, but got: ${JSON.stringify(pageErrors)}`).toEqual([]);
    // Assert there were no console.error messages
    expect(consoleErrors, `Expected no console.error messages, but got: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });

  test('Initial page load shows controls and a "No edges added yet." message after generating', async ({ page }) => {
    // Purpose: Verify initial DOM state, controls visibility, and behavior when no edges exist.
    const gp = new GraphPage(page);

    // Controls should be visible
    await expect(gp.edgeInput).toBeVisible();
    await expect(gp.addButton).toBeVisible();
    await expect(gp.generateButton).toBeVisible();
    await expect(gp.table).toBeVisible();

    // Initially, list body may be empty. Click "Generate Adjacency List" to show the placeholder message.
    await gp.clickGenerate();

    // After generation with empty graph, there should be exactly one row stating "No edges added yet."
    const rowCount = await gp.rowCount();
    expect(rowCount).toBe(1);

    const rowTexts = await gp.getRowTexts(0);
    // The table uses a single td spanning both columns with the placeholder text
    expect(rowTexts.length).toBe(1);
    expect(rowTexts[0]).toBe('No edges added yet.');

    // No alerts other than the generate action (which doesn't alert) should have occurred
    expect(dialogs.length).toBe(0);
  });

  test('Adding a valid edge shows an alert, clears the input, and generate displays the edge', async ({ page }) => {
    // Purpose: Validate addEdge flow including alert text and input clearing, and that generate displays the nodes.
    const gp1 = new GraphPage(page);

    // Enter a valid edge and add it
    await gp.fillEdge('A-B');
    await gp.clickAddEdge();

    // Expect exactly one alert with the success message
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    // The most recent dialog should be the edge-added alert
    expect(dialogs[dialogs.length - 1]).toBe('Edge added: A - B');

    // Input should be cleared after adding
    expect(await gp.isInputEmpty()).toBe(true);

    // Generate adjacency list and assert table shows nodes A and B
    await gp.clickGenerate();

    const rowCount1 = await gp.rowCount1();
    // For A-B there should be two rows (A and B)
    expect(rowCount).toBe(2);

    // Rows are expected in insertion order: A then B (A created first when adding A-B)
    const first = await gp.getRowTexts(0); // [node, connections]
    const second = await gp.getRowTexts(1);

    expect(first[0]).toBe('A');
    // A should be connected to B
    expect(first[1]).toBe('B');

    expect(second[0]).toBe('B');
    // B should be connected to A
    expect(second[1]).toBe('A');
  });

  test('Generating adjacency list after multiple edges displays correct connections (A-B, B-C, C-A)', async ({ page }) => {
    // Purpose: Add multiple edges to build a triangle and assert adjacency connections display correctly.
    const gp2 = new GraphPage(page);

    // Add three edges: A-B, B-C, C-A
    await gp.fillEdge('A-B');
    await gp.clickAddEdge();
    await gp.fillEdge('B-C');
    await gp.clickAddEdge();
    await gp.fillEdge('C-A');
    await gp.clickAddEdge();

    // Expect three "Edge added" alerts in order
    const addedAlerts = dialogs.filter(d => d.startsWith('Edge added:'));
    expect(addedAlerts.length).toBe(3);
    expect(addedAlerts[0]).toBe('Edge added: A - B');
    expect(addedAlerts[1]).toBe('Edge added: B - C');
    expect(addedAlerts[2]).toBe('Edge added: C - A');

    // Now generate the adjacency list
    await gp.clickGenerate();

    // There should be three rows for A, B, C in insertion order A, B, C
    const rowCount2 = await gp.rowCount2();
    expect(rowCount).toBe(3);

    // Validate each row's connections.
    const r0 = await gp.getRowTexts(0); // A
    const r1 = await gp.getRowTexts(1); // B
    const r2 = await gp.getRowTexts(2); // C

    // A was first created, connections expected "B, C" (note ordering matches push sequence)
    expect(r0[0]).toBe('A');
    // Accept either "B, C" or "C, B" but based on the implementation and add order it should be "B, C"
    expect(r0[1]).toBe('B, C');

    expect(r1[0]).toBe('B');
    expect(r1[1]).toBe('A, C');

    expect(r2[0]).toBe('C');
    expect(r2[1]).toBe('B, A');
  });

  test('Invalid edge input triggers validation alert and does not modify the graph', async ({ page }) => {
    // Purpose: Ensure validation alert appears for bad input and graph remains empty.
    const gp3 = new GraphPage(page);

    // Enter invalid input (missing hyphen) and attempt to add
    await gp.fillEdge('AB'); // invalid format
    await gp.clickAddEdge();

    // Expect an alert indicating invalid format
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const lastDialog = dialogs[dialogs.length - 1];
    expect(lastDialog).toBe('Please enter a valid edge in the format A-B');

    // Input should remain as the code does not clear it on invalid input (per implementation)
    // The implementation actually does not clear input when invalid; assert that behavior
    expect(await gp.edgeInput.inputValue()).toBe('AB');

    // Generate adjacency list - since no valid edges were added, it should show the placeholder
    await gp.clickGenerate();

    const rowCount3 = await gp.rowCount3();
    expect(rowCount).toBe(1);
    const rowTexts1 = await gp.getRowTexts(0);
    expect(rowTexts[0]).toBe('No edges added yet.');
  });

  test('Adding duplicate edges results in duplicated connections (edge-case behavior verification)', async ({ page }) => {
    // Purpose: Verify how the implementation handles adding the same edge twice (duplicates expected).
    const gp4 = new GraphPage(page);

    // Add the same edge twice
    await gp.fillEdge('X-Y');
    await gp.clickAddEdge();
    await gp.fillEdge('X-Y');
    await gp.clickAddEdge();

    // Expect two alerts for both additions
    const addedAlerts1 = dialogs.filter(d => d.startsWith('Edge added: X - Y'));
    expect(addedAlerts.length).toBe(2);

    // Generate adjacency list
    await gp.clickGenerate();

    // Two nodes expected
    const rowCount4 = await gp.rowCount4();
    expect(rowCount).toBe(2);

    // Each node's connections should reflect duplicates (e.g., X -> Y, Y, or "Y, Y")
    const rx = await gp.getRowTexts(0);
    const ry = await gp.getRowTexts(1);

    // Order of rows is based on creation: X then Y
    expect(rx[0]).toBe('X');
    // Because we added X-Y twice, X's adjacency list will contain Y twice: "Y, Y"
    expect(rx[1]).toBe('Y, Y');

    expect(ry[0]).toBe('Y');
    expect(ry[1]).toBe('X, X');
  });
});