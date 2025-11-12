import { test, expect } from '@playwright/test';

// Test file for Interactive Application Binary Search Trees (BST) module

// Test setup
beforeEach(async ({ page }) => {
  await page.goto('http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/2772c970-bf48-11f0-bf20-c5be43303284.html');
});

// Test cases
test('User can add a node to the Binary Search Tree', async ({ page }) => {
  // Simulate user clicking 'Add Node' button
  await page.click('button[data-testid="add-node-button"]');
  
  // Enter a value in the input field
  await page.fill('input[data-testid="node-value-input"]', '10');
  
  // Simulate user confirming the node addition
  await page.click('button[data-testid="confirm-button"]');
  
  // Verify the node is added by checking the visual representation on the screen
  const nodeAdded = await page.isVisible('div[data-testid="node-10"]');
  expect(nodeAdded).toBeTruthy();
});

test('User can remove a node from the Binary Search Tree', async ({ page }) => {
  // Simulate user clicking 'Remove Node' button
  await page.click('button[data-testid="remove-node-button"]');
  
  // Enter a value in the input field
  await page.fill('input[data-testid="node-value-input"]', '10');
  
  // Simulate user confirming the node removal
  await page.click('button[data-testid="confirm-button"]');
  
  // Verify the node is removed by checking the visual representation on the screen
  const nodeRemoved = await page.isVisible('div[data-testid="node-10"]');
  expect(nodeRemoved).toBeFalsy();
});

test('User can search for a node in the Binary Search Tree', async ({ page }) => {
  // Add a node to the tree for searching
  await page.click('button[data-testid="add-node-button"]');
  await page.fill('input[data-testid="node-value-input"]', '15');
  await page.click('button[data-testid="confirm-button"]');
  
  // Simulate user clicking 'Search Node' button
  await page.click('button[data-testid="search-node-button"]');
  
  // Enter a value in the input field
  await page.fill('input[data-testid="node-value-input"]', '15');
  
  // Simulate user confirming the search
  await page.click('button[data-testid="confirm-button"]');
  
  // Verify the node is highlighted as found
  const nodeFound = await page.getAttribute('div[data-testid="node-15"]', 'data-state');
  expect(nodeFound).toBe('found');
});

// Additional tests for edge cases and error scenarios can be added here

// Test teardown
afterEach(async ({ page }) => {
  // Perform any cleanup after each test if needed
});