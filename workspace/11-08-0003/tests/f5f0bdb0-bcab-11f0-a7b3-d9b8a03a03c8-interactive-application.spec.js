import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f5f0bdb0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Application - FSM Tests', () => {
    test('Initial state is idle', async ({ page }) => {
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('Drag and drop a number from Set A to Set B', async ({ page }) => {
        const numberToDrag = await page.locator('#setA .number').nth(0);
        await numberToDrag.dragTo('#setB');

        const resultText1 = await page.textContent('#result');
        expect(resultText).toContain('1'); // Assuming the drop updates the result
    });

    test('Drag and drop a number from Set B to Set A', async ({ page }) => {
        const numberToDrag1 = await page.locator('#setB .number').nth(0);
        await numberToDrag.dragTo('#setA');

        const resultText2 = await page.textContent('#result');
        expect(resultText).toContain('3'); // Assuming the drop updates the result
    });

    test('Perform Union operation', async ({ page }) => {
        await page.locator('#setA .number').nth(0).dragTo('#setB');
        await page.locator('button:has-text("Union")').click();

        const resultText3 = await page.textContent('#result');
        expect(resultText).toContain('1, 2, 3, 4, 5'); // Assuming this is the expected result
    });

    test('Perform Intersection operation', async ({ page }) => {
        await page.locator('#setA .number').nth(2).dragTo('#setB'); // Move '3' to Set B
        await page.locator('button:has-text("Intersection")').click();

        const resultText4 = await page.textContent('#result');
        expect(resultText).toContain('3'); // Assuming '3' is the intersection
    });

    test('Perform Difference operation', async ({ page }) => {
        await page.locator('#setA .number').nth(1).dragTo('#setB'); // Move '2' to Set B
        await page.locator('button:has-text("Difference")').click();

        const resultText5 = await page.textContent('#result');
        expect(resultText).toContain('1, 3'); // Assuming '1' and '3' are the difference
    });

    test('Drag end should return to idle state', async ({ page }) => {
        const numberToDrag2 = await page.locator('#setA .number').nth(0);
        await numberToDrag.dragTo('#setB');
        await page.mouse.up(); // Simulate drag end

        const resultText6 = await page.textContent('#result');
        expect(resultText).toContain('1'); // Assuming the drop updates the result
    });

    test('Check visual feedback on drag', async ({ page }) => {
        const numberToDrag3 = await page.locator('#setA .number').nth(0);
        await numberToDrag.hover();
        const isHighlighted = await numberToDrag.evaluate(el => el.style.backgroundColor === 'lightblue'); // Assuming lightblue is the hover color
        expect(isHighlighted).toBe(true);
    });

    test('Edge case: Dragging a number not in the set', async ({ page }) => {
        const numberToDrag4 = await page.locator('#setB .number').nth(2); // Dragging '5'
        await numberToDrag.dragTo('#setA');

        const resultText7 = await page.textContent('#result');
        expect(resultText).toContain('5'); // Assuming the drop updates the result
    });

    test('Operation complete should reset result', async ({ page }) => {
        await page.locator('#setA .number').nth(0).dragTo('#setB');
        await page.locator('button:has-text("Union")').click();
        await page.locator('button:has-text("Union")').click(); // Trigger operation complete

        const resultText8 = await page.textContent('#result');
        expect(resultText).toBe(''); // Assuming it resets after operation complete
    });
});