import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/ff53b1f0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Union-Find Interactive Application', () => {
    test('should start in idle state', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
        
        const sets = await page.locator('.set').count();
        for (let i = 0; i < sets; i++) {
            const setColor = await page.locator(`#set${i}`).evaluate(el => el.style.backgroundColor);
            expect(setColor).toBe(''); // Initially no color change
        }
    });

    test('should transition to set_selected state on SET_CLICKED', async ({ page }) => {
        await page.click('#set0');
        
        const setColor1 = await page.locator('#set0').evaluate(el => el.style.backgroundColor);
        expect(setColor).toBe('rgb(51, 51, 51)'); // Check if color changed to indicate selection
    });

    test('should remain in set_selected state on multiple SET_CLICKED', async ({ page }) => {
        await page.click('#set0');
        await page.click('#set0'); // Click again to ensure state remains
        
        const setColor2 = await page.locator('#set0').evaluate(el => el.style.backgroundColor);
        expect(setColor).toBe('rgb(51, 51, 51)'); // Color should still indicate selection
    });

    test('should transition to displaying_sets state on SHOW_SETS_CLICKED', async ({ page }) => {
        await page.click('#set0');
        await page.click('#showSetsBtn');

        const output1 = await page.locator('#output1').innerText();
        expect(output).toContain('Current sets:'); // Assuming output contains this text
    });

    test('should transition back to idle state on SHOW_SETS_CLICKED after displaying sets', async ({ page }) => {
        await page.click('#set0');
        await page.click('#showSetsBtn');
        await page.click('#showSetsBtn'); // Click again to return to idle
        
        const output2 = await page.locator('#output2').innerText();
        expect(output).toBe(''); // Output should be cleared in idle state
    });

    test('should highlight selected set when transitioning to set_selected', async ({ page }) => {
        await page.click('#set1');
        const setColor3 = await page.locator('#set1').evaluate(el => el.style.backgroundColor);
        expect(setColor).toBe('rgb(51, 51, 51)'); // Check if set1 is highlighted
    });

    test('should reset visuals on entering idle state', async ({ page }) => {
        await page.click('#set2');
        await page.click('#showSetsBtn');
        await page.click('#showSetsBtn'); // Transition back to idle
        
        const setColor4 = await page.locator('#set2').evaluate(el => el.style.backgroundColor);
        expect(setColor).toBe(''); // Color should reset
    });

    test('should handle edge cases when no sets are selected', async ({ page }) => {
        await page.click('#showSetsBtn'); // Click without selecting any sets
        
        const output3 = await page.locator('#output3').innerText();
        expect(output).toBe(''); // Output should not show anything
    });

    test('should merge sets and display updated groups', async ({ page }) => {
        await page.click('#set0');
        await page.click('#set1'); // Assume this merges sets A and B
        await page.click('#showSetsBtn');

        const output4 = await page.locator('#output4').innerText();
        expect(output).toContain('A, B'); // Assuming output reflects merged sets
    });
});