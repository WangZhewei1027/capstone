import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24933591-d1d2-11f0-a359-f3a4ddd3c298.html';

test.beforeEach(async ({ page }) => {
    await page.goto(url);
});

test.describe('Hash Map Demonstration Tests', () => {
    
    test('should add a key-value pair', async ({ page }) => {
        // Arrange: Set key and value
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        
        // Act: Click the Add Key-Value Pair button
        await page.click('button[onclick="addKeyValue()"]');
        
        // Assert: Check if the output reflects the added key-value pair
        const output = await page.textContent('#output');
        expect(output).toBe('Added: {testKey: testValue}');
    });

    test('should retrieve a value by key', async ({ page }) => {
        // Arrange: Set key and value, then add it
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button[onclick="addKeyValue()"]');
        
        // Act: Click the Get Value button
        await page.click('button[onclick="getValue()"]');
        
        // Assert: Check if the output reflects the retrieved value
        const output1 = await page.textContent('#output1');
        expect(output).toBe('Value for "testKey": testValue');
    });

    test('should return "Key not found" when retrieving a non-existent key', async ({ page }) => {
        // Arrange: Set a non-existent key
        await page.fill('#key', 'nonExistentKey');
        
        // Act: Click the Get Value button
        await page.click('button[onclick="getValue()"]');
        
        // Assert: Check if the output reflects the key not found message
        const output2 = await page.textContent('#output2');
        expect(output).toBe('Value for "nonExistentKey": Key not found');
    });

    test('should delete a key', async ({ page }) => {
        // Arrange: Set key and value, then add it
        await page.fill('#key', 'testKey');
        await page.fill('#value', 'testValue');
        await page.click('button[onclick="addKeyValue()"]');
        
        // Act: Click the Delete Key button
        await page.click('button[onclick="deleteKey()"]');
        
        // Assert: Check if the output reflects the key deletion
        const output3 = await page.textContent('#output3');
        expect(output).toBe('Key deleted');
    });

    test('should return "Key not found" when deleting a non-existent key', async ({ page }) => {
        // Arrange: Set a non-existent key
        await page.fill('#key', 'nonExistentKey');
        
        // Act: Click the Delete Key button
        await page.click('button[onclick="deleteKey()"]');
        
        // Assert: Check if the output reflects the key not found message
        const output4 = await page.textContent('#output4');
        expect(output).toBe('Key not found');
    });

    test('should display the hash map contents', async ({ page }) => {
        // Arrange: Add some key-value pairs
        await page.fill('#key', 'key1');
        await page.fill('#value', 'value1');
        await page.click('button[onclick="addKeyValue()"]');
        
        await page.fill('#key', 'key2');
        await page.fill('#value', 'value2');
        await page.click('button[onclick="addKeyValue()"]');
        
        // Act: Click the Display Hash Map button
        await page.click('button[onclick="displayHashMap()"]');
        
        // Assert: Check if the output reflects the hash map contents
        const output5 = await page.textContent('#output5');
        expect(output).toBe(JSON.stringify({ key1: 'value1', key2: 'value2' }, null, 4));
    });

    test('should handle empty hash map display', async ({ page }) => {
        // Act: Click the Display Hash Map button without adding any key-value pairs
        await page.click('button[onclick="displayHashMap()"]');
        
        // Assert: Check if the output reflects an empty object
        const output6 = await page.textContent('#output6');
        expect(output).toBe(JSON.stringify({}, null, 4));
    });
});