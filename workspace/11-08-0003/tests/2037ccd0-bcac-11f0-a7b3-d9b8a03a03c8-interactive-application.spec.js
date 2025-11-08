import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/2037ccd0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Huffman Coding Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const frequencyDisplay = page.locator('#frequencyDisplay');
        const huffmanTreeDisplay = page.locator('#huffmanTreeDisplay');
        
        // Verify that frequency and huffman tree displays are hidden
        await expect(frequencyDisplay).toBeHidden();
        await expect(huffmanTreeDisplay).toBeHidden();
    });

    test('should alert when generate button is clicked with empty input', async ({ page }) => {
        await page.click('#generateButton');
        const dialog = await page.waitForEvent('dialog');
        expect(dialog.message()).toBe('Please enter a valid string.');
        await dialog.dismiss();
    });

    test('should transition to calculating_frequency state on valid input', async ({ page }) => {
        await page.fill('#inputString', 'hello');
        await page.click('#generateButton');

        // Verify frequency calculation
        const frequencyDisplay1 = page.locator('#frequencyDisplay1');
        await expect(frequencyDisplay).toBeVisible();
        await expect(frequencyDisplay).toContainText('Character Frequencies:');
    });

    test('should display frequency and transition to displaying_frequency state', async ({ page }) => {
        await page.fill('#inputString', 'hello');
        await page.click('#generateButton');

        // Verify frequency display
        const frequencyDisplay2 = page.locator('#frequencyDisplay2');
        await expect(frequencyDisplay).toBeVisible();
        await expect(frequencyDisplay).toContainText('h: 1');
        await expect(frequencyDisplay).toContainText('e: 1');
        await expect(frequencyDisplay).toContainText('l: 2');
        await expect(frequencyDisplay).toContainText('o: 1');
    });

    test('should build huffman tree and transition to displaying_huffman_tree state', async ({ page }) => {
        await page.fill('#inputString', 'hello');
        await page.click('#generateButton');

        // Verify huffman tree display
        const huffmanTreeDisplay1 = page.locator('#huffmanTreeDisplay1');
        await expect(huffmanTreeDisplay).toBeVisible();
        await expect(huffmanTreeDisplay).toContainText('Huffman Tree:'); // Assuming this text is part of the tree display
    });

    test('should return to idle state after displaying huffman tree', async ({ page }) => {
        await page.fill('#inputString', 'hello');
        await page.click('#generateButton');

        // Verify that after displaying the huffman tree, we return to idle state
        const frequencyDisplay3 = page.locator('#frequencyDisplay3');
        const huffmanTreeDisplay2 = page.locator('#huffmanTreeDisplay2');
        await expect(frequencyDisplay).toBeHidden();
        await expect(huffmanTreeDisplay).toBeHidden();
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#inputString', '');
        await page.click('#generateButton');

        // Verify alert for invalid input
        const dialog1 = await page.waitForEvent('dialog1');
        expect(dialog.message()).toBe('Please enter a valid string.');
        await dialog.dismiss();
    });

    test('should handle edge case with single character input', async ({ page }) => {
        await page.fill('#inputString', 'a');
        await page.click('#generateButton');

        // Verify frequency display for single character
        const frequencyDisplay4 = page.locator('#frequencyDisplay4');
        await expect(frequencyDisplay).toBeVisible();
        await expect(frequencyDisplay).toContainText('a: 1');
    });
});