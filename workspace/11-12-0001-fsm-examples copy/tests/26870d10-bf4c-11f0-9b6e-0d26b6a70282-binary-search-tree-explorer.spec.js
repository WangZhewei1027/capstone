import { test, expect } from '@playwright/test';

class BSTExplorer {
  constructor(page) {
    this.page = page;
    this.insertButton = page.locator('#insert-btn');
    this.searchButton = page.locator('#search-btn');
    this.resetButton = page.locator('#reset-btn');
    this.valueInput = page.locator('#value-input');
    this.statusPanel = page.locator('#status');
    this.treeNodes = page.locator('.tree-node');
    this.infoPanel = page.locator('#operation-info');
    this.toast = page.locator('.toast');
  }

  async navigate() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/26870d10-bf4c-11f0-9b6e-0d26b6a70282.html');
  }

  async insertValue(value) {
    await this.valueInput.fill(value);
    await this.insertButton.click();
  }

  async searchValue(value) {
    await this.valueInput.fill(value);
    await this.searchButton.click();
  }

  async resetTree() {
    await this.resetButton.click();
  }
}

test.describe('Binary Search Tree Explorer FSM Tests', () => {
  let bst;
  
  test.beforeEach(async ({ page }) => {
    bst = new BSTExplorer(page);
    await bst.navigate();
  });

  test('Initial state is idle', async () => {
    await expect(bst.statusPanel).toContainText('Ready for operations');
    await expect(bst.insertButton).toBeEnabled();
    await expect(bst.searchButton).toBeEnabled();
    await expect(bst.resetButton).toBeEnabled();
  });

  test('Transition to inserting state when insert clicked', async () => {
    await bst.insertValue('10');
    await expect(bst.infoPanel).toContainText('Inserting node: 10');
    await expect(bst.statusPanel).toContainText('Inserting...');
    await expect(bst.insertButton).toBeDisabled();
    await expect(bst.searchButton).toBeDisabled();
    await expect(bst.resetButton).toBeDisabled();
  });

  test('Return to idle after insertion completes', async () => {
    await bst.insertValue('15');
    await expect(bst.infoPanel).toContainText('Inserting node: 15');
    await expect(bst.treeNodes.filter({ hasText: '15' })).toBeVisible();
    await expect(bst.statusPanel).toContainText('Ready for operations', { timeout: 5000 });
    await expect(bst.insertButton).toBeEnabled();
    await expect(bst.searchButton).toBeEnabled();
    await expect(bst.resetButton).toBeEnabled();
  });

  test('Transition to searching state when search clicked', async () => {
    await bst.insertValue('20');
    await bst.searchValue('20');
    await expect(bst.infoPanel).toContainText('Searching for: 20');
    await expect(bst.statusPanel).toContainText('Searching...');
    await expect(bst.treeNodes.filter({ hasText: '20' })).toHaveClass(/highlighted/);
    await expect(bst.insertButton).toBeDisabled();
    await expect(bst.searchButton).toBeDisabled();
    await expect(bst.resetButton).toBeDisabled();
  });

  test('Return to idle after search completes', async () => {
    await bst.insertValue('25');
    await bst.searchValue('25');
    await expect(bst.infoPanel).toContainText('Searching for: 25');
    await expect(bst.statusPanel).toContainText('Ready for operations', { timeout: 5000 });
    await expect(bst.treeNodes.filter({ hasText: '25' })).not.toHaveClass(/highlighted/);
    await expect(bst.insertButton).toBeEnabled();
    await expect(bst.searchButton).toBeEnabled();
  });

  test('Transition to resetting state when reset clicked', async () => {
    await bst.insertValue('30');
    await bst.resetTree();
    await expect(bst.infoPanel).toContainText('Resetting tree');
    await expect(bst.statusPanel).toContainText('Resetting...');
    await expect(bst.treeNodes).toHaveCount(0, { timeout: 3000 });
  });

  test('Return to idle after reset completes', async () => {
    await bst.insertValue('35');
    await bst.resetTree();
    await expect(bst.statusPanel).toContainText('Ready for operations', { timeout: 3000 });
    await expect(bst.treeNodes).toHaveCount(0);
    await expect(bst.insertButton).toBeEnabled();
    await expect(bst.searchButton).toBeEnabled();
  });

  test('Ignore events during inserting state', async () => {
    await bst.insertValue('40');
    const initialNodeCount = await bst.treeNodes.count();
    await bst.searchButton.click();
    await bst.resetButton.click();
    await expect(bst.infoPanel).toContainText('Inserting node: 40');
    await expect(bst.treeNodes).toHaveCount(initialNodeCount + 1);
    await expect(bst.statusPanel).toContainText('Inserting...');
  });

  test('Ignore events during searching state', async () => {
    await bst.insertValue('45');
    await bst.searchValue('45');
    await bst.insertButton.click();
    await bst.resetButton.click();
    await expect(bst.infoPanel).toContainText('Searching for: 45');
    await expect(bst.statusPanel).toContainText('Searching...');
    await expect(bst.treeNodes.filter({ hasText: '45' })).toHaveClass(/highlighted/);
  });

  test('Error handling for duplicate insertion', async () => {
    await bst.insertValue('50');
    await bst.insertValue('50');
    await expect(bst.toast).toContainText('Duplicate value not allowed');
    await expect(bst.statusPanel).toContainText('Ready for operations');
  });

  test('Error handling for search not found', async () => {
    await bst.searchValue('999');
    await expect(bst.toast).toContainText('Value not found');
    await expect(bst.statusPanel).toContainText('Ready for operations', { timeout: 3000 });
  });

  test('Complex scenario: insert, search, reset sequence', async () => {
    await bst.insertValue('5');
    await bst.insertValue('3');
    await bst.insertValue('7');
    await expect(bst.treeNodes).toHaveCount(3);
    
    await bst.searchValue('3');
    await expect(bst.infoPanel).toContainText('Searching for: 3');
    await expect(bst.treeNodes.filter({ hasText: '3' })).toHaveClass(/highlighted/);
    
    await bst.resetTree();
    await expect(bst.infoPanel).toContainText('Resetting tree');
    await expect(bst.treeNodes).toHaveCount(0, { timeout: 3000 });
    await expect(bst.statusPanel).toContainText('Ready for operations');
  });
});