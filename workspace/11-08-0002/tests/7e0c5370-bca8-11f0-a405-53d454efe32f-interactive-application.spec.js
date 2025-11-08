import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0002/html/7e0c5370-bca8-11f0-a405-53d454efe32f.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Array Manipulation Application', () => {
    test('Initial state should be idle with empty array', async ({ page }) => {
        const arrayOutput = await page.textContent('#arrayOutput');
        expect(arrayOutput).toBe('Current Array: []');
    });

    test('Adding an element transitions to adding state', async ({ page }) => {
        await page.fill('#arrayInput', 'Element 1');
        await page.click('button:has-text("Add Element")');

        const arrayOutput = await page.textContent('#arrayOutput');
        expect(arrayOutput).toBe('Current Array: [Element 1]');
        
        const arrayElements = await page.$$eval('.arrayElement', elements => elements.map(el => el.innerText));
        expect(arrayElements).toEqual(['Element 1']);
    });

    test('Removing the last element transitions to removing_last state', async ({ page }) => {
        await page.fill('#arrayInput', 'Element 1');
        await page.click('button:has-text("Add Element")');
        await page.fill('#arrayInput', 'Element 2');
        await page.click('button:has-text("Add Element")');

        await page.click('button:has-text("Remove Last Element")');

        const arrayOutput = await page.textContent('#arrayOutput');
        expect(arrayOutput).toBe('Current Array: [Element 1]');
        
        const arrayElements = await page.$$eval('.arrayElement', elements => elements.map(el => el.innerText));
        expect(arrayElements).toEqual(['Element 1']);
    });

    test('Removing the first element transitions to removing_first state', async ({ page }) => {
        await page.fill('#arrayInput', 'Element 1');
        await page.click('button:has-text("Add Element")');
        await page.fill('#arrayInput', 'Element 2');
        await page.click('button:has-text("Add Element")');

        await page.click('button:has-text("Remove First Element")');

        const arrayOutput = await page.textContent('#arrayOutput');
        expect(arrayOutput).toBe('Current Array: [Element 2]');
        
        const arrayElements = await page.$$eval('.arrayElement', elements => elements.map(el => el.innerText));
        expect(arrayElements).toEqual(['Element 2']);
    });

    test('Resetting the array transitions to resetting state', async ({ page }) => {
        await page.fill('#arrayInput', 'Element 1');
        await page.click('button:has-text("Add Element")');

        await page.click('button:has-text("Reset Array")');

        const arrayOutput = await page.textContent('#arrayOutput');
        expect(arrayOutput).toBe('Current Array: []');
        
        const arrayElements = await page.$$('.arrayElement');
        expect(arrayElements.length).toBe(0);
    });

    test('Adding an empty element should not change the array', async ({ page }) => {
        await page.fill('#arrayInput', '');
        await page.click('button:has-text("Add Element")');

        const arrayOutput = await page.textContent('#arrayOutput');
        expect(arrayOutput).toBe('Current Array: []');
        
        const arrayElements = await page.$$('.arrayElement');
        expect(arrayElements.length).toBe(0);
    });

    test('Removing an element from an empty array should not change the array', async ({ page }) => {
        await page.click('button:has-text("Remove Last Element")');

        const arrayOutput = await page.textContent('#arrayOutput');
        expect(arrayOutput).toBe('Current Array: []');
        
        const arrayElements = await page.$$('.arrayElement');
        expect(arrayElements.length).toBe(0);
    });

    test('Resetting an already empty array should not change the array', async ({ page }) => {
        await page.click('button:has-text("Reset Array")');

        const arrayOutput = await page.textContent('#arrayOutput');
        expect(arrayOutput).toBe('Current Array: []');
        
        const arrayElements = await page.$$('.arrayElement');
        expect(arrayElements.length).toBe(0);
    });
});