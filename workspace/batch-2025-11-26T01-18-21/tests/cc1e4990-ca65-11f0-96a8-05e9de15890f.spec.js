import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1e4990-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('BFS Visualizer Tests', () => {
  
  test('Initial state should be Idle', async ({ page }) => {
    const playBtnText = await page.textContent('#playBtn');
    expect(playBtnText).toBe('Play');
  });

  test('Clicking Play button transitions to Running state', async ({ page }) => {
    await page.click('#playBtn');
    const playBtnText = await page.textContent('#playBtn');
    expect(playBtnText).toBe('Pause');
  });

  test('Clicking Step button while Idle should transition to Stepping state', async ({ page }) => {
    await page.click('#stepBtn');
    const playBtnText = await page.textContent('#playBtn');
    expect(playBtnText).toBe('Play'); // Should remain in Idle
  });

  test('Clicking Step button while Running should not change state', async ({ page }) => {
    await page.click('#playBtn'); // Start Running
    await page.click('#stepBtn'); // Should not change state
    const playBtnText = await page.textContent('#playBtn');
    expect(playBtnText).toBe('Pause');
  });

  test('Clicking Reset button while Idle should restart BFS', async ({ page }) => {
    await page.click('#resetBtn');
    const queueContent = await page.innerHTML('#queue');
    expect(queueContent).toBe(''); // Queue should be empty
  });

  test('Clicking Random Walls button should randomize walls', async ({ page }) => {
    await page.click('#randomBtn');
    const cellClasses = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cell')).map(cell => cell.className);
    });
    expect(cellClasses).toContain(expect.stringContaining('wall')); // At least one wall should be present
  });

  test('Clicking Clear Walls button should clear all walls', async ({ page }) => {
    await page.click('#randomBtn'); // Randomize walls first
    await page.click('#clearBtn'); // Clear walls
    const cellClasses = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cell')).map(cell => cell.className);
    });
    expect(cellClasses).not.toContain(expect.stringContaining('wall')); // No walls should be present
  });

  test('Changing grid size should build a new grid', async ({ page }) => {
    await page.selectOption('#gridSize', '16'); // Change to 16x16
    const gridCells = await page.locator('.cell').count();
    expect(gridCells).toBe(256); // 16x16 grid should have 256 cells
  });

  test('Setting Start and Goal should update their positions', async ({ page }) => {
    await page.click('#modeStart');
    await page.click('.cell[data-i="0"]'); // Set start at (0,0)
    await page.click('#modeGoal');
    await page.click('.cell[data-i="255"]'); // Set goal at (15,15)
    
    const startCellClass = await page.getAttribute('.cell.start', 'class');
    const goalCellClass = await page.getAttribute('.cell.goal', 'class');
    
    expect(startCellClass).toContain('start');
    expect(goalCellClass).toContain('goal');
  });

  test('Toggling walls should update the grid', async ({ page }) => {
    await page.click('.cell[data-i="5"]'); // Toggle wall at (0,5)
    const cellClass = await page.getAttribute('.cell[data-i="5"]', 'class');
    expect(cellClass).toContain('wall');
  });

  test('Dragging to draw walls should work', async ({ page }) => {
    await page.mouse.move(100, 100); // Move to a cell
    await page.mouse.down(); // Start dragging
    await page.mouse.move(120, 120); // Drag to another cell
    await page.mouse.up(); // Stop dragging

    const cellClass = await page.getAttribute('.cell[data-i="5"]', 'class');
    expect(cellClass).toContain('wall'); // Ensure wall is drawn
  });

  test('Keyboard shortcuts should work', async ({ page }) => {
    await page.keyboard.press(' '); // Press space to play
    const playBtnText = await page.textContent('#playBtn');
    expect(playBtnText).toBe('Pause'); // Should be in Running state

    await page.keyboard.press('s'); // Press 's' to step
    await page.keyboard.press('r'); // Press 'r' to reset
    const queueContent = await page.innerHTML('#queue');
    expect(queueContent).toBe(''); // Queue should be empty
  });

  test('Finishing BFS should transition to Finished state', async ({ page }) => {
    await page.click('#playBtn'); // Start BFS
    await page.waitForTimeout(2000); // Wait for BFS to potentially finish
    const statsText = await page.textContent('#stats');
    expect(statsText).toContain('Shortest distance:'); // Should indicate BFS finished
  });

});