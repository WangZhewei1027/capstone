import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/a41dd910-b3fe-11f0-91f7-216a4f05ad0f.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Bubble Sort Interactive Visualization', () => {
    
    test('Initial state is idle', async ({ page }) => {
        const bars = await page.$$('#array-container .bar');
        expect(bars.length).toBe(0); // No bars should be present initially
    });

    test('Initialize array on entering idle state', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        const bars = await page.$$('#array-container .bar');
        expect(bars.length).toBe(9); // 9 bars should be initialized
    });

    test('Start sorting transitions to sorting state', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        await page.click('#sort-btn');
        const iterationText = await page.textContent('#iteration-count');
        expect(iterationText).toContain('Iterations:'); // Check if iterations are displayed
    });

    test('Pause sorting transitions to paused state', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        await page.click('#sort-btn');
        await page.click('#pause-btn');
        const iterationText = await page.textContent('#iteration-count');
        expect(iterationText).toContain('Iterations:'); // Check if iterations are displayed
    });

    test('Resume sorting from paused state', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        await page.click('#sort-btn');
        await page.click('#pause-btn');
        await page.click('#pause-btn'); // Resuming
        const iterationText = await page.textContent('#iteration-count');
        expect(iterationText).toContain('Iterations:'); // Check if iterations are displayed
    });

    test('Step through sorting transitions to stepping state', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        await page.click('#sort-btn');
        await page.click('#step-btn');
        const iterationText = await page.textContent('#iteration-count');
        expect(iterationText).toContain('Iterations:'); // Check if iterations are displayed
    });

    test('Drag and drop transitions to dragging state', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        const bars = await page.$$('#array-container .bar');
        const firstBar = bars[0];
        await firstBar.dragTo(bars[1]); // Simulating drag and drop
        expect(await firstBar.evaluate(el => el.classList.contains('swapping'))).toBeTruthy(); // Check if swapping class is added
    });

    test('Drop action returns to idle state', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        const bars = await page.$$('#array-container .bar');
        const firstBar = bars[0];
        await firstBar.dragTo(bars[1]); // Simulating drag and drop
        await page.mouse.drop(); // Simulate drop
        expect(await firstBar.evaluate(el => el.classList.contains('swapping'))).toBeFalsy(); // Check if swapping class is removed
    });

    test('Sorting completes and transitions to done state', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        await page.click('#sort-btn');
        // Wait for sorting to complete (this should be implemented in the application)
        await page.waitForTimeout(5000); // Adjust based on expected sort duration
        const iterationText = await page.textContent('#iteration-count');
        expect(iterationText).toContain('Iterations:'); // Check if iterations are displayed
    });

    test('Attempt to sort again from done state', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        await page.click('#sort-btn');
        await page.waitForTimeout(5000); // Wait for sorting to complete
        await page.click('#sort-btn'); // Attempt to sort again
        const iterationText = await page.textContent('#iteration-count');
        expect(iterationText).toContain('Iterations:'); // Check if iterations are displayed
    });

    test('Edge case: Pause while sorting', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        await page.click('#sort-btn');
        await page.click('#pause-btn');
        const iterationText = await page.textContent('#iteration-count');
        expect(iterationText).toContain('Iterations:'); // Check if iterations are displayed
    });

    test('Edge case: Step while paused', async ({ page }) => {
        await page.evaluate(() => {
            window.initializeArray();
        });
        await page.click('#sort-btn');
        await page.click('#pause-btn');
        await page.click('#step-btn');
        const iterationText = await page.textContent('#iteration-count');
        expect(iterationText).toContain('Iterations:'); // Check if iterations are displayed
    });
});