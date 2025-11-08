import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/19791d90-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Prim\'s Algorithm Interactive Application', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is idle', async () => {
    const startButton = await page.locator('#startButton');
    const graphContainer = await page.locator('#graph-container');
    
    // Verify that the graph is empty and the start button is visible
    await expect(graphContainer).toHaveCount(0);
    await expect(startButton).toBeVisible();
  });

  test('Transition from idle to visualizing on start button click', async () => {
    const startButton1 = await page.locator('#startButton1');
    
    // Click the start button to initiate visualization
    await startButton.click();

    // Verify that the graph is populated and the visualization is in progress
    const vertices = await page.locator('.vertex');
    await expect(vertices).toHaveCount(5); // Assuming 5 vertices are created
  });

  test('Visualizing state allows for visualization steps', async () => {
    const startButton2 = await page.locator('#startButton2');
    
    // Start the visualization
    await startButton.click();

    // Simulate visualization steps
    await page.evaluate(() => {
      const event = new Event('VISUALIZATION_STEP');
      document.dispatchEvent(event);
    });

    // Verify that the visualization is still ongoing
    const vertices1 = await page.locator('.vertex');
    await expect(vertices).toHaveCount(5);
  });

  test('Transition from visualizing to done on visualization complete', async () => {
    const startButton3 = await page.locator('#startButton3');

    // Start the visualization
    await startButton.click();

    // Simulate visualization complete
    await page.evaluate(() => {
      const event1 = new Event('VISUALIZATION_COMPLETE');
      document.dispatchEvent(event);
    });

    // Verify that the visualization is complete
    const graphContainer1 = await page.locator('#graph-container');
    await expect(graphContainer).toHaveClass(/highlightComplete/);
  });

  test('Transition from done back to idle on start button click', async () => {
    const startButton4 = await page.locator('#startButton4');

    // Start the visualization and complete it
    await startButton.click();
    await page.evaluate(() => {
      const event2 = new Event('VISUALIZATION_COMPLETE');
      document.dispatchEvent(event);
    });

    // Click the start button again to reset
    await startButton.click();

    // Verify that the graph is reset and back to idle state
    const graphContainer2 = await page.locator('#graph-container');
    await expect(graphContainer).toHaveCount(0);
  });

  test('Ensure vertices can be selected during visualization', async () => {
    const startButton5 = await page.locator('#startButton5');

    // Start the visualization
    await startButton.click();

    // Click on a vertex to select it
    const vertices2 = await page.locator('.vertex');
    await vertices.first().click();

    // Verify that the vertex is selected
    await expect(vertices.first()).toHaveClass(/selected/);
  });

  test('Check for error handling when no vertices are present', async () => {
    const startButton6 = await page.locator('#startButton6');

    // Simulate a scenario where no vertices are created
    await page.evaluate(() => {
      const graphContainer3 = document.getElementById('graph-container');
      graphContainer.innerHTML = ''; // Clear vertices
    });

    // Attempt to start visualization
    await startButton.click();

    // Verify that an error message is shown
    const errorMessage = await page.locator('.error-message'); // Assuming an error message element exists
    await expect(errorMessage).toBeVisible();
  });
});