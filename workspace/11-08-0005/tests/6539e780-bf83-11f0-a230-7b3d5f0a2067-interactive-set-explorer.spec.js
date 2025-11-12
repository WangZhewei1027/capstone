import { test, expect } from '@playwright/test';

test.describe('Interactive Set Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/6539e780-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should display empty sets on load', async ({ page }) => {
      // Verify both sets are empty
      await expect(page.locator('#setA .set-size')).toHaveText('Size: 0');
      await expect(page.locator('#setB .set-size')).toHaveText('Size: 0');
      
      // Verify no elements are displayed
      await expect(page.locator('#setA .element')).toHaveCount(0);
      await expect(page.locator('#setB .element')).toHaveCount(0);
      
      // Verify result section is empty
      await expect(page.locator('#result')).toBeEmpty();
    });

    test('should have all controls enabled in idle state', async ({ page }) => {
      // Check Set A controls
      await expect(page.locator('#inputA')).toBeEnabled();
      await expect(page.locator('#setA .btn-primary')).toBeEnabled();
      await expect(page.locator('#setA button:has-text("Clear")')).toBeEnabled();
      await expect(page.locator('#setA button:has-text("Fill Random")')).toBeEnabled();
      
      // Check Set B controls
      await expect(page.locator('#inputB')).toBeEnabled();
      await expect(page.locator('#setB .btn-primary')).toBeEnabled();
      await expect(page.locator('#setB button:has-text("Clear")')).toBeEnabled();
      await expect(page.locator('#setB button:has-text("Fill Random")')).toBeEnabled();
      
      // Check operation buttons
      await expect(page.locator('button:has-text("Union")')).toBeEnabled();
      await expect(page.locator('button:has-text("Intersection")')).toBeEnabled();
      await expect(page.locator('button:has-text("Difference")')).toBeEnabled();
    });
  });

  test.describe('Adding Elements', () => {
    test('should add valid element to set A', async ({ page }) => {
      // Enter element and add
      await page.fill('#inputA', '5');
      await page.click('#setA .btn-primary');
      
      // Verify element was added
      await expect(page.locator('#setA .element')).toHaveCount(1);
      await expect(page.locator('#setA .element')).toHaveText('5');
      await expect(page.locator('#setA .set-size')).toHaveText('Size: 1');
      
      // Verify input was cleared
      await expect(page.locator('#inputA')).toHaveValue('');
    });

    test('should add multiple elements to set B', async ({ page }) => {
      const elements = ['10', '20', '30'];
      
      for (const element of elements) {
        await page.fill('#inputB', element);
        await page.click('#setB .btn-primary');
      }
      
      // Verify all elements were added
      await expect(page.locator('#setB .element')).toHaveCount(3);
      await expect(page.locator('#setB .set-size')).toHaveText('Size: 3');
      
      // Verify each element text
      const elementTexts = await page.locator('#setB .element').allTextContents();
      expect(elementTexts).toEqual(elements);
    });

    test('should reject duplicate elements with shake animation', async ({ page }) => {
      // Add element first time
      await page.fill('#inputA', '42');
      await page.click('#setA .btn-primary');
      
      // Try to add same element again
      await page.fill('#inputA', '42');
      await page.click('#setA .btn-primary');
      
      // Verify shake animation class is applied
      await expect(page.locator('#inputA')).toHaveClass(/shake/);
      
      // Verify element count didn't increase
      await expect(page.locator('#setA .element')).toHaveCount(1);
      await expect(page.locator('#setA .set-size')).toHaveText('Size: 1');
      
      // Wait for animation to complete and verify class is removed
      await page.waitForTimeout(600);
      await expect(page.locator('#inputA')).not.toHaveClass(/shake/);
    });

    test('should handle empty input gracefully', async ({ page }) => {
      // Try to add empty input
      await page.fill('#inputA', '');
      await page.click('#setA .btn-primary');
      
      // Verify no element was added
      await expect(page.locator('#setA .element')).toHaveCount(0);
      await expect(page.locator('#setA .set-size')).toHaveText('Size: 0');
    });

    test('should handle Enter key for adding elements', async ({ page }) => {
      await page.fill('#inputB', '99');
      await page.press('#inputB', 'Enter');
      
      // Verify element was added
      await expect(page.locator('#setB .element')).toHaveCount(1);
      await expect(page.locator('#setB .element')).toHaveText('99');
    });
  });

  test.describe('Removing Elements', () => {
    test('should remove element on click with fade animation', async ({ page }) => {
      // Add elements first
      await page.fill('#inputA', '1');
      await page.click('#setA .btn-primary');
      await page.fill('#inputA', '2');
      await page.click('#setA .btn-primary');
      
      // Click to remove first element
      await page.click('#setA .element:first-child');
      
      // Verify fade-out class is applied
      await expect(page.locator('#setA .element:first-child')).toHaveClass(/fade-out/);
      
      // Wait for animation and verify element is removed
      await page.waitForTimeout(400);
      await expect(page.locator('#setA .element')).toHaveCount(1);
      await expect(page.locator('#setA .element')).toHaveText('2');
      await expect(page.locator('#setA .set-size')).toHaveText('Size: 1');
    });
  });

  test.describe('Clearing Sets', () => {
    test('should clear all elements with staggered animation', async ({ page }) => {
      // Fill set with random elements
      await page.click('#setB button:has-text("Fill Random")');
      await page.waitForTimeout(100);
      
      const initialCount = await page.locator('#setB .element').count();
      expect(initialCount).toBeGreaterThan(0);
      
      // Clear the set
      await page.click('#setB button:has-text("Clear")');
      
      // Verify fade-out class is applied to all elements
      const elements1 = page.locator('#setB .element');
      const count = await elements.count();
      for (let i = 0; i < count; i++) {
        await expect(elements.nth(i)).toHaveClass(/fade-out/);
      }
      
      // Wait for animations to complete
      await page.waitForTimeout(600);
      
      // Verify all elements are removed
      await expect(page.locator('#setB .element')).toHaveCount(0);
      await expect(page.locator('#setB .set-size')).toHaveText('Size: 0');
    });
  });

  test.describe('Fill Random', () => {
    test('should fill set with random elements', async ({ page }) => {
      await page.click('#setA button:has-text("Fill Random")');
      
      // Wait for elements to be added
      await page.waitForTimeout(100);
      
      // Verify elements were added (should be between 3-7 elements)
      const count1 = await page.locator('#setA .element').count1();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(7);
      
      // Verify size is updated
      await expect(page.locator('#setA .set-size')).toHaveText(`Size: ${count}`);
      
      // Verify all elements have numeric values
      const elements2 = await page.locator('#setA .element').allTextContents();
      elements.forEach(text => {
        expect(parseInt(text)).toBeGreaterThanOrEqual(1);
        expect(parseInt(text)).toBeLessThanOrEqual(50);
      });
    });
  });

  test.describe('Set Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Setup test data
      // Set A: [1, 2, 3]
      for (const num of ['1', '2', '3']) {
        await page.fill('#inputA', num);
        await page.click('#setA .btn-primary');
      }
      
      // Set B: [2, 3, 4]
      for (const num of ['2', '3', '4']) {
        await page.fill('#inputB', num);
        await page.click('#setB .btn-primary');
      }
    });

    test('should compute union correctly', async ({ page }) => {
      await page.click('button:has-text("Union")');
      
      // Wait for operation to complete
      await page.waitForSelector('#result .element');
      
      // Verify result contains all unique elements
      const resultElements = await page.locator('#result .element').allTextContents();
      expect(resultElements.sort()).toEqual(['1', '2', '3', '4']);
      
      // Verify result header
      await expect(page.locator('.result-header')).toContainText('A ∪ B = {1, 2, 3, 4}');
    });

    test('should compute intersection with highlighting', async ({ page }) => {
      await page.click('button:has-text("Intersection")');
      
      // Wait for operation to complete
      await page.waitForSelector('#result .element');
      
      // Verify result contains only common elements
      const resultElements1 = await page.locator('#result .element').allTextContents();
      expect(resultElements.sort()).toEqual(['2', '3']);
      
      // Verify common elements are highlighted in original sets
      await expect(page.locator('#setA .element:has-text("2")')).toHaveClass(/highlight/);
      await expect(page.locator('#setA .element:has-text("3")')).toHaveClass(/highlight/);
      await expect(page.locator('#setB .element:has-text("2")')).toHaveClass(/highlight/);
      await expect(page.locator('#setB .element:has-text("3")')).toHaveClass(/highlight/);
      
      // Verify result header
      await expect(page.locator('.result-header')).toContainText('A ∩ B = {2, 3}');
    });

    test('should compute difference correctly', async ({ page }) => {
      await page.click('button:has-text("Difference")');
      
      // Wait for operation to complete
      await page.waitForSelector('#result .element');
      
      // Verify result contains only elements in A but not in B
      const resultElements2 = await page.locator('#result .element').allTextContents();
      expect(resultElements).toEqual(['1']);
      
      // Verify result header
      await expect(page.locator('.result-header')).toContainText('A - B = {1}');
    });

    test('should handle empty set operations', async ({ page }) => {
      // Clear both sets
      await page.click('#setA button:has-text("Clear")');
      await page.waitForTimeout(600);
      await page.click('#setB button:has-text("Clear")');
      await page.waitForTimeout(600);
      
      // Test union with empty sets
      await page.click('button:has-text("Union")');
      await expect(page.locator('.result-header')).toContainText('A ∪ B = {}');
      
      // Test intersection with empty sets
      await page.click('button:has-text("Intersection")');
      await expect(page.locator('.result-header')).toContainText('A ∩ B = {}');
      
      // Test difference with empty sets
      await page.click('button:has-text("Difference")');
      await expect(page.locator('.result-header')).toContainText('A - B = {}');
    });

    test('should animate result elements with stagger', async ({ page }) => {
      await page.click('button:has-text("Union")');
      
      // Wait for first element to appear
      await page.waitForSelector('#result .element');
      
      // Verify elements appear with slide-in animation
      const elements3 = page.locator('#result .element');
      const count2 = await elements.count2();
      
      for (let i = 0; i < count; i++) {
        await expect(elements.nth(i)).toHaveClass(/slide-in/);
      }
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle special characters in input', async ({ page }) => {
      const specialInputs = ['@', '#', '$', '!'];
      
      for (const input of specialInputs) {
        await page.fill('#inputA', input);
        await page.click('#setA .btn-primary');
      }
      
      // Verify all special characters were added
      await expect(page.locator('#setA .element')).toHaveCount(4);
      const texts = await page.locator('#setA .element').allTextContents();
      expect(texts).toEqual(specialInputs);
    });

    test('should handle very long input strings', async ({ page }) => {
      const longString = 'ThisIsAVeryLongStringThatShouldStillBeHandledProperly';
      await page.fill('#inputB', longString);
      await page.click('#setB .btn-primary');
      
      // Verify element was added
      await expect(page.locator('#setB .element')).toHaveCount(1);
      await expect(page.locator('#setB .element')).toHaveText(longString);
    });

    test('should maintain state consistency during rapid operations', async ({ page }) => {
      // Rapidly add multiple elements
      for (let i = 1; i <= 5; i++) {
        await page.fill('#inputA', i.toString());
        await page.click('#setA .btn-primary');
      }
      
      // Immediately perform operation
      await page.click('button:has-text("Union")');
      
      // Verify state is consistent
      await expect(page.locator('#setA .set-size')).toHaveText('Size: 5');
      await page.waitForSelector('#result .element');
      const resultCount = await page.locator('#result .element').count();
      expect(resultCount).toBe(5);
    });
  });

  test.describe('Visual Feedback and Animations', () => {
    test('should show hover effects on elements', async ({ page }) => {
      // Add an element
      await page.fill('#inputA', 'hover-test');
      await page.click('#setA .btn-primary');
      
      // Hover over element
      await page.hover('#setA .element');
      
      // Verify hover state (transform scale)
      const element = page.locator('#setA .element');
      await expect(element).toHaveCSS('transform', 'matrix(1.05, 0, 0, 1.05, 0, 0)');
    });

    test('should show focus states on inputs', async ({ page }) => {
      await page.focus('#inputA');
      
      // Verify focus styling
      await expect(page.locator('#inputA')).toHaveCSS('border-color', 'rgb(90, 103, 216)');
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should handle viewport changes gracefully', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify layout adjusts (containers should stack)
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toHaveCSS('flex-direction', 'column');
      
      // Reset to desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(mainContent).toHaveCSS('flex-direction', 'row');
    });
  });
});