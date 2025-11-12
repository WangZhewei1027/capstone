import { test, expect } from '@playwright/test';

// Page Object Model for Array Explorer
class ArrayExplorerPage {
  constructor(page) {
    this.page = page;
    this.inputField = page.locator('input[type="text"]');
    this.pushButton = page.locator('button:has-text("Push")');
    this.unshiftButton = page.locator('button:has-text("Unshift")');
    this.popButton = page.locator('button:has-text("Pop")');
    this.shiftButton = page.locator('button:has-text("Shift")');
    this.clearButton = page.locator('button:has-text("Clear")');
    this.removeSelectedButton = page.locator('button:has-text("Remove Selected")');
    this.arrayContainer = page.locator('.array-wrapper');
    this.emptyMessage = page.locator('.empty-message');
    this.codeOutput = page.locator('.code-output');
    this.stateIndicator = page.locator('.state-indicator');
  }

  async navigate() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/62a002c0-bf83-11f0-a230-7b3d5f0a2067.html');
  }

  async addElement(value) {
    await this.inputField.fill(value);
  }

  async getArrayElements() {
    return this.page.locator('.array-element');
  }

  async getSelectedElement() {
    return this.page.locator('.array-element.selected');
  }

  async clickElement(index) {
    const elements = await this.getArrayElements();
    await elements.nth(index).click();
  }

  async waitForAnimation() {
    // Wait for animation class to be removed
    await this.page.waitForTimeout(600); // Slightly longer than animation duration
  }

  async getCurrentState() {
    const stateText = await this.stateIndicator.textContent();
    return stateText.replace('State: ', '').toLowerCase();
  }
}

test.describe('Interactive Array Explorer - FSM State Management', () => {
  let arrayExplorer;

  test.beforeEach(async ({ page }) => {
    arrayExplorer = new ArrayExplorerPage(page);
    await arrayExplorer.navigate();
  });

  test.describe('Empty State', () => {
    test('should start in empty state with empty message displayed', async () => {
      // Verify initial empty state
      await expect(arrayExplorer.emptyMessage).toBeVisible();
      await expect(arrayExplorer.emptyMessage).toContainText('Array is empty');
      
      // Verify no array elements exist
      const elements1 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(0);
      
      // Verify state indicator shows empty
      await expect(arrayExplorer.stateIndicator).toContainText('empty');
    });

    test('should transition from empty to animatingPush when pushing element', async () => {
      // Add element via push
      await arrayExplorer.addElement('First');
      await arrayExplorer.pushButton.click();
      
      // Verify transition to animatingPush state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingPush');
      
      // Wait for animation to complete
      await arrayExplorer.waitForAnimation();
      
      // Verify transition to idle state
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
      
      // Verify element is displayed
      const elements2 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(1);
      await expect(elements.first()).toContainText('First');
    });

    test('should transition from empty to animatingUnshift when unshifting element', async () => {
      // Add element via unshift
      await arrayExplorer.addElement('First');
      await arrayExplorer.unshiftButton.click();
      
      // Verify transition to animatingUnshift state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingUnshift');
      
      // Wait for animation to complete
      await arrayExplorer.waitForAnimation();
      
      // Verify transition to idle state
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
      
      // Verify element is displayed
      const elements3 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(1);
      await expect(elements.first()).toContainText('First');
    });
  });

  test.describe('Idle State', () => {
    test.beforeEach(async () => {
      // Setup: Add some elements to reach idle state
      await arrayExplorer.addElement('Element 1');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      await arrayExplorer.addElement('Element 2');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
    });

    test('should display array elements in idle state', async () => {
      // Verify idle state
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
      
      // Verify elements are displayed
      const elements4 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(2);
      await expect(elements.nth(0)).toContainText('Element 1');
      await expect(elements.nth(1)).toContainText('Element 2');
      
      // Verify empty message is hidden
      await expect(arrayExplorer.emptyMessage).not.toBeVisible();
    });

    test('should transition to animatingPush when pushing new element', async () => {
      await arrayExplorer.addElement('Element 3');
      await arrayExplorer.pushButton.click();
      
      // Verify animation state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingPush');
      
      // Verify new element appears with animation
      const elements5 = await arrayExplorer.getArrayElements();
      const newElement = elements.last();
      await expect(newElement).toHaveClass(/animating/);
      
      await arrayExplorer.waitForAnimation();
      
      // Verify return to idle state
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
      await expect(elements).toHaveCount(3);
    });

    test('should transition to animatingPop when popping element', async () => {
      await arrayExplorer.popButton.click();
      
      // Verify animation state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingPop');
      
      await arrayExplorer.waitForAnimation();
      
      // Verify return to idle state with one less element
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
      const elements6 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(1);
    });

    test('should transition to animatingShift when shifting element', async () => {
      await arrayExplorer.shiftButton.click();
      
      // Verify animation state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingShift');
      
      await arrayExplorer.waitForAnimation();
      
      // Verify return to idle state with one less element
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
      const elements7 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(1);
      await expect(elements.first()).toContainText('Element 2');
    });

    test('should transition to elementSelected when clicking element', async () => {
      await arrayExplorer.clickElement(0);
      
      // Verify state transition
      await expect(arrayExplorer.stateIndicator).toContainText('elementSelected');
      
      // Verify element is highlighted
      const selectedElement = await arrayExplorer.getSelectedElement();
      await expect(selectedElement).toHaveCount(1);
      await expect(selectedElement).toContainText('Element 1');
      await expect(selectedElement).toHaveClass(/selected/);
    });

    test('should transition to empty when clearing array', async () => {
      await arrayExplorer.clearButton.click();
      
      // Verify transition to empty state
      await expect(arrayExplorer.stateIndicator).toContainText('empty');
      
      // Verify empty message is displayed
      await expect(arrayExplorer.emptyMessage).toBeVisible();
      
      // Verify all elements are removed
      const elements8 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(0);
    });
  });

  test.describe('Element Selected State', () => {
    test.beforeEach(async () => {
      // Setup: Add elements and select one
      await arrayExplorer.addElement('Item A');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      await arrayExplorer.addElement('Item B');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      await arrayExplorer.addElement('Item C');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Select middle element
      await arrayExplorer.clickElement(1);
    });

    test('should highlight selected element', async () => {
      // Verify state
      await expect(arrayExplorer.stateIndicator).toContainText('elementSelected');
      
      // Verify selected element
      const selectedElement1 = await arrayExplorer.getSelectedElement();
      await expect(selectedElement).toHaveCount(1);
      await expect(selectedElement).toContainText('Item B');
      
      // Verify remove button is enabled
      await expect(arrayExplorer.removeSelectedButton).toBeEnabled();
    });

    test('should deselect element when clicking it again', async () => {
      // Click selected element again
      await arrayExplorer.clickElement(1);
      
      // Verify transition back to idle
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
      
      // Verify no selected elements
      const selectedElement2 = await arrayExplorer.getSelectedElement();
      await expect(selectedElement).toHaveCount(0);
    });

    test('should change selection when clicking different element', async () => {
      // Click different element
      await arrayExplorer.clickElement(2);
      
      // Verify still in elementSelected state
      await expect(arrayExplorer.stateIndicator).toContainText('elementSelected');
      
      // Verify new selection
      const selectedElement3 = await arrayExplorer.getSelectedElement();
      await expect(selectedElement).toHaveCount(1);
      await expect(selectedElement).toContainText('Item C');
    });

    test('should transition to animatingRemove when removing selected', async () => {
      await arrayExplorer.removeSelectedButton.click();
      
      // Verify animation state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingRemove');
      
      await arrayExplorer.waitForAnimation();
      
      // Verify return to idle state
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
      
      // Verify element was removed
      const elements9 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(2);
      await expect(elements.nth(0)).toContainText('Item A');
      await expect(elements.nth(1)).toContainText('Item C');
    });

    test('should allow array operations while element is selected', async () => {
      // Push new element while one is selected
      await arrayExplorer.addElement('Item D');
      await arrayExplorer.pushButton.click();
      
      await expect(arrayExplorer.stateIndicator).toContainText('animatingPush');
      await arrayExplorer.waitForAnimation();
      
      // Verify return to idle (selection cleared after operation)
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
      
      const elements10 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(4);
    });
  });

  test.describe('Animation States', () => {
    test('should show push animation with proper visual feedback', async () => {
      await arrayExplorer.addElement('Animated');
      await arrayExplorer.pushButton.click();
      
      // Verify animation state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingPush');
      
      // Verify element appears with animation class
      const elements11 = await arrayExplorer.getArrayElements();
      const newElement1 = elements.last();
      await expect(newElement).toHaveClass(/push-animation/);
      
      // Verify code output updates
      await expect(arrayExplorer.codeOutput).toContainText('array.push("Animated")');
      
      await arrayExplorer.waitForAnimation();
      
      // Verify animation class is removed
      await expect(newElement).not.toHaveClass(/push-animation/);
    });

    test('should show unshift animation with proper visual feedback', async () => {
      // Add initial element
      await arrayExplorer.addElement('First');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Unshift new element
      await arrayExplorer.addElement('New First');
      await arrayExplorer.unshiftButton.click();
      
      // Verify animation state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingUnshift');
      
      // Verify element appears at beginning with animation
      const elements12 = await arrayExplorer.getArrayElements();
      const firstElement = elements.first();
      await expect(firstElement).toHaveClass(/unshift-animation/);
      await expect(firstElement).toContainText('New First');
      
      // Verify code output
      await expect(arrayExplorer.codeOutput).toContainText('array.unshift("New First")');
    });

    test('should transition to empty after popping last element', async () => {
      // Add single element
      await arrayExplorer.addElement('Only One');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Pop the element
      await arrayExplorer.popButton.click();
      
      // Verify animation state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingPop');
      
      await arrayExplorer.waitForAnimation();
      
      // Verify transition to empty state
      await expect(arrayExplorer.stateIndicator).toContainText('empty');
      await expect(arrayExplorer.emptyMessage).toBeVisible();
    });

    test('should transition to empty after shifting last element', async () => {
      // Add single element
      await arrayExplorer.addElement('Only One');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Shift the element
      await arrayExplorer.shiftButton.click();
      
      // Verify animation state
      await expect(arrayExplorer.stateIndicator).toContainText('animatingShift');
      
      await arrayExplorer.waitForAnimation();
      
      // Verify transition to empty state
      await expect(arrayExplorer.stateIndicator).toContainText('empty');
      await expect(arrayExplorer.emptyMessage).toBeVisible();
    });
  });

  test.describe('Code Output Updates', () => {
    test('should update code output after each operation', async () => {
      // Push operation
      await arrayExplorer.addElement('Test 1');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      await expect(arrayExplorer.codeOutput).toContainText('array.push("Test 1")');
      
      // Unshift operation
      await arrayExplorer.addElement('Test 0');
      await arrayExplorer.unshiftButton.click();
      await arrayExplorer.waitForAnimation();
      await expect(arrayExplorer.codeOutput).toContainText('array.unshift("Test 0")');
      
      // Pop operation
      await arrayExplorer.popButton.click();
      await arrayExplorer.waitForAnimation();
      await expect(arrayExplorer.codeOutput).toContainText('array.pop()');
      
      // Shift operation
      await arrayExplorer.shiftButton.click();
      await arrayExplorer.waitForAnimation();
      await expect(arrayExplorer.codeOutput).toContainText('array.shift()');
    });

    test('should show splice operation for remove selected', async () => {
      // Setup array with multiple elements
      await arrayExplorer.addElement('A');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      await arrayExplorer.addElement('B');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      await arrayExplorer.addElement('C');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Select and remove middle element
      await arrayExplorer.clickElement(1);
      await arrayExplorer.removeSelectedButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Verify splice operation in code output
      await expect(arrayExplorer.codeOutput).toContainText('array.splice(1, 1)');
    });
  });

  test.describe('Edge Cases and Error Scenarios', () => {
    test('should handle empty input gracefully', async () => {
      // Try to push empty value
      await arrayExplorer.inputField.fill('');
      await arrayExplorer.pushButton.click();
      
      // Should remain in empty state
      await expect(arrayExplorer.stateIndicator).toContainText('empty');
      
      // No elements should be added
      const elements13 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(0);
    });

    test('should disable pop and shift buttons when array is empty', async () => {
      // Verify buttons are disabled in empty state
      await expect(arrayExplorer.popButton).toBeDisabled();
      await expect(arrayExplorer.shiftButton).toBeDisabled();
      
      // Add element
      await arrayExplorer.addElement('Test');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Verify buttons are enabled
      await expect(arrayExplorer.popButton).toBeEnabled();
      await expect(arrayExplorer.shiftButton).toBeEnabled();
    });

    test('should handle rapid clicks gracefully', async () => {
      // Add multiple elements rapidly
      await arrayExplorer.addElement('Rapid 1');
      await arrayExplorer.pushButton.click();
      
      await arrayExplorer.addElement('Rapid 2');
      await arrayExplorer.pushButton.click();
      
      await arrayExplorer.addElement('Rapid 3');
      await arrayExplorer.pushButton.click();
      
      // Wait for all animations
      await arrayExplorer.page.waitForTimeout(2000);
      
      // Verify all elements were added
      const elements14 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(3);
    });

    test('should maintain state consistency through multiple operations', async () => {
      // Complex sequence of operations
      await arrayExplorer.addElement('1');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      await arrayExplorer.addElement('2');
      await arrayExplorer.unshiftButton.click();
      await arrayExplorer.waitForAnimation();
      
      await arrayExplorer.addElement('3');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Select middle element
      await arrayExplorer.clickElement(1);
      await expect(arrayExplorer.stateIndicator).toContainText('elementSelected');
      
      // Remove it
      await arrayExplorer.removeSelectedButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Verify final state
      const elements15 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(2);
      await expect(elements.nth(0)).toContainText('2');
      await expect(elements.nth(1)).toContainText('3');
      await expect(arrayExplorer.stateIndicator).toContainText('idle');
    });

    test('should handle special characters in input', async () => {
      const specialChars = ['<script>', '"; alert("xss")', '🎉', '\\n\\t'];
      
      for (const char of specialChars) {
        await arrayExplorer.addElement(char);
        await arrayExplorer.pushButton.click();
        await arrayExplorer.waitForAnimation();
      }
      
      // Verify all elements were added safely
      const elements16 = await arrayExplorer.getArrayElements();
      await expect(elements).toHaveCount(specialChars.length);
      
      // Verify special characters are displayed correctly
      for (let i = 0; i < specialChars.length; i++) {
        await expect(elements.nth(i)).toContainText(specialChars[i]);
      }
    });
  });

  test.describe('Visual Feedback and Accessibility', () => {
    test('should show hover effects on interactive elements', async () => {
      // Add elements
      await arrayExplorer.addElement('Hover Test');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Test hover on array element
      const element = (await arrayExplorer.getArrayElements()).first();
      await element.hover();
      
      // Verify hover state (checking for transform or opacity change)
      await expect(element).toHaveCSS('cursor', 'pointer');
    });

    test('should maintain keyboard accessibility', async () => {
      // Add elements
      await arrayExplorer.addElement('Tab Test');
      await arrayExplorer.pushButton.click();
      await arrayExplorer.waitForAnimation();
      
      // Tab through interface
      await arrayExplorer.page.keyboard.press('Tab');
      await expect(arrayExplorer.inputField).toBeFocused();
      
      await arrayExplorer.page.keyboard.press('Tab');
      await expect(arrayExplorer.pushButton).toBeFocused();
    });

    test('should show array indices', async () => {
      // Add multiple elements
      for (let i = 0; i < 3; i++) {
        await arrayExplorer.addElement(`Item ${i}`);
        await arrayExplorer.pushButton.click();
        await arrayExplorer.waitForAnimation();
      }
      
      // Verify indices are displayed
      const elements17 = await arrayExplorer.getArrayElements();
      for (let i = 0; i < 3; i++) {
        const element1 = elements.nth(i);
        const indexElement = element.locator('.index');
        await expect(indexElement).toContainText(i.toString());
      }
    });
  });
});