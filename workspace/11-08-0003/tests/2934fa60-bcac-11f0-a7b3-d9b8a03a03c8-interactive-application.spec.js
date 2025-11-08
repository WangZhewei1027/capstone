import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/2934fa60-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Divide and Conquer Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display initial message in idle state', async ({ page }) => {
        const message = await page.locator('.message p').innerText();
        expect(message).toBe('Click the button below to visualize how the Divide and Conquer algorithm works!');
    });

    test('should transition to generating_array state on start button click', async ({ page }) => {
        await page.click('#start-button');
        await page.waitForTimeout(100); // Wait for the state transition
        const arrayContainer = await page.locator('#array-container').innerHTML();
        expect(arrayContainer).not.toBe('');
    });

    test('should generate an array and transition to visualizing state', async ({ page }) => {
        await page.click('#start-button');
        await page.waitForTimeout(500); // Allow time for array generation
        const arrayBoxes = await page.locator('.array-box').count();
        expect(arrayBoxes).toBeGreaterThan(0);
    });

    test('should set button to visualizing state', async ({ page }) => {
        await page.click('#start-button');
        await page.waitForTimeout(500); // Allow time for array generation
        const button = await page.locator('#start-button');
        await expect(button).toHaveText('Visualizing...');
    });

    test('should transition to dividing state after starting divide and conquer', async ({ page }) => {
        await page.click('#start-button');
        await page.waitForTimeout(500); // Allow time for array generation
        await page.evaluate(() => {
            // Simulate the event to start dividing
            document.dispatchEvent(new Event('DIVIDE_AND_CONQUER_STARTED'));
        });
        await page.waitForTimeout(500); // Allow time for state transition
        const message1 = await page.locator('.message1').innerText();
        expect(message).toContain('Dividing');
    });

    test('should transition back to visualizing state after animation triggered', async ({ page }) => {
        await page.click('#start-button');
        await page.waitForTimeout(500); // Allow time for array generation
        await page.evaluate(() => {
            // Simulate the event to trigger animation
            document.dispatchEvent(new Event('ANIMATION_TRIGGERED'));
        });
        await page.waitForTimeout(500); // Allow time for state transition
        const message2 = await page.locator('.message2').innerText();
        expect(message).toContain('Visualizing');
    });

    test('should transition to done state after animation complete', async ({ page }) => {
        await page.click('#start-button');
        await page.waitForTimeout(500); // Allow time for array generation
        await page.evaluate(() => {
            // Simulate the event to complete animation
            document.dispatchEvent(new Event('ANIMATION_COMPLETE'));
        });
        await page.waitForTimeout(500); // Allow time for state transition
        const completionMessage = await page.locator('.message').innerText();
        expect(completionMessage).toContain('Completed');
    });

    test('should reset to idle state on restart button click', async ({ page }) => {
        await page.click('#start-button');
        await page.waitForTimeout(500); // Allow time for array generation
        await page.evaluate(() => {
            // Simulate the event to complete animation
            document.dispatchEvent(new Event('ANIMATION_COMPLETE'));
        });
        await page.waitForTimeout(500); // Allow time for state transition
        await page.evaluate(() => {
            // Simulate restart button click
            document.dispatchEvent(new Event('RESTART_BUTTON_CLICK'));
        });
        await page.waitForTimeout(100); // Allow time for state transition
        const message3 = await page.locator('.message3 p').innerText();
        expect(message).toBe('Click the button below to visualize how the Divide and Conquer algorithm works!');
    });
});