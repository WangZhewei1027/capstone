import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f740bd50-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Set Exploration Application', () => {
    test('should display instructions on idle state', async ({ page }) => {
        const instructionText = await page.locator('.instruction').textContent();
        expect(instructionText).toContain('Understand how sets work by adding, removing, and visualizing elements.');
    });

    test('should add an element to the set', async ({ page }) => {
        await page.click('button:has-text("Add Element")');
        const messageText = await page.locator('#message').textContent();
        expect(messageText).toContain('Element added');
        const setAreaChildren = await page.locator('#setArea').locator('.element').count();
        expect(setAreaChildren).toBeGreaterThan(0);
    });

    test('should not add an existing element to the set', async ({ page }) => {
        await page.click('button:has-text("Add Element")');
        const firstElement = await page.locator('#setArea .element').first().textContent();
        await page.click('button:has-text("Add Element")');
        const messageText1 = await page.locator('#message').textContent();
        expect(messageText).toContain('Element already exists');
        const setAreaChildren1 = await page.locator('#setArea').locator('.element').count();
        expect(setAreaChildren).toBe(1);
    });

    test('should remove an element from the set', async ({ page }) => {
        await page.click('button:has-text("Add Element")');
        await page.click('button:has-text("Remove Element")');
        const messageText2 = await page.locator('#message').textContent();
        expect(messageText).toContain('Element removed');
        const setAreaChildren2 = await page.locator('#setArea').locator('.element').count();
        expect(setAreaChildren).toBe(0);
    });

    test('should not remove an element if none exists', async ({ page }) => {
        await page.click('button:has-text("Remove Element")');
        const messageText3 = await page.locator('#message').textContent();
        expect(messageText).toContain('No elements to remove');
    });

    test('should clear the set', async ({ page }) => {
        await page.click('button:has-text("Add Element")');
        await page.click('button:has-text("Clear Set")');
        const messageText4 = await page.locator('#message').textContent();
        expect(messageText).toContain('Set cleared');
        const setAreaChildren3 = await page.locator('#setArea').locator('.element').count();
        expect(setAreaChildren).toBe(0);
    });

    test('should handle multiple add and remove operations', async ({ page }) => {
        for (let i = 0; i < 5; i++) {
            await page.click('button:has-text("Add Element")');
        }
        const setAreaChildrenAfterAdd = await page.locator('#setArea').locator('.element').count();
        expect(setAreaChildrenAfterAdd).toBeGreaterThan(0);

        for (let i = 0; i < 3; i++) {
            await page.click('button:has-text("Remove Element")');
        }
        const setAreaChildrenAfterRemove = await page.locator('#setArea').locator('.element').count();
        expect(setAreaChildrenAfterRemove).toBeLessThan(setAreaChildrenAfterAdd);
    });

    test('should display correct messages during operations', async ({ page }) => {
        await page.click('button:has-text("Add Element")');
        let messageText5 = await page.locator('#message').textContent();
        expect(messageText).toContain('Element added');

        await page.click('button:has-text("Remove Element")');
        messageText = await page.locator('#message').textContent();
        expect(messageText).toContain('Element removed');

        await page.click('button:has-text("Clear Set")');
        messageText = await page.locator('#message').textContent();
        expect(messageText).toContain('Set cleared');
    });
});