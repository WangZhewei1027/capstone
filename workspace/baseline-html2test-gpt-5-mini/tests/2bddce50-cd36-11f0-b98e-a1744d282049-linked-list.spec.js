import { test, expect } from '@playwright/test';

// Test file: 2bddce50-cd36-11f0-b98e-a1744d282049-linked-list.spec.js
// This suite validates the Interactive Singly Linked List demo.
// It exercises all main controls, verifies DOM updates, visual markers, edge cases,
// and ensures there are no unexpected console errors or page errors during interactions.

// Page Object to encapsulate selectors and common actions
class LinkedListPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce50-cd36-11f0-b98e-a1744d282049.html';

    // Controls
    this.valueInput = page.locator('#value-input');
    this.indexInput = page.locator('#index-input');
    this.valueRemove = page.locator('#value-remove');

    this.addTailBtn = page.locator('#add-tail');
    this.addHeadBtn = page.locator('#add-head');
    this.insertIndexBtn = page.locator('#insert-index');
    this.removeIndexBtn = page.locator('#remove-index');
    this.removeValueBtn = page.locator('#remove-value');
    this.findBtn = page.locator('#find');
    this.traverseBtn = page.locator('#traverse');
    this.autoTraverseBtn = page.locator('#auto-traverse');
    this.reverseBtn = page.locator('#reverse');
    this.clearBtn = page.locator('#clear');
    this.sampleBtn = page.locator('#fill-sample');

    // Labels and outputs
    this.headLabel = page.locator('#head-label');
    this.tailLabel = page.locator('#tail-label');
    this.sizeLabel = page.locator('#size-label');
    this.repr = page.locator('#repr');
    this.status = page.locator('#status');
    this.nodesWrap = page.locator('#nodes-wrap');
    this.svg = page.locator('#svg');
  }

  // Navigate to the app and wait for initial render
  async goto() {
    await this.page.goto(this.url);
    // Ensure initial render completes: status is updated to Ready...
    await expect(this.status).toContainText('Ready', { timeout: 2000 });
  }

  // Helpers to interact with the UI
  async push(value) {
    await this.valueInput.fill(value);
    await this.addTailBtn.click();
  }
  async unshift(value) {
    await this.valueInput.fill(value);
    await this.addHeadBtn.click();
  }
  async insertAt(index, value) {
    await this.indexInput.fill(String(index));
    await this.valueInput.fill(value);
    await this.insertIndexBtn.click();
  }
  async removeAt(index) {
    await this.indexInput.fill(String(index));
    await this.removeIndexBtn.click();
  }
  async removeValue(value) {
    await this.valueRemove.fill(value);
    await this.removeValueBtn.click();
  }
  async findValue(value) {
    await this.valueInput.fill(value);
    await this.findBtn.click();
  }
  async traverseStep() {
    await this.traverseBtn.click();
  }
  async autoTraverseToggle() {
    await this.autoTraverseBtn.click();
  }
  async reverseList() {
    await this.reverseBtn.click();
  }
  async clearList() {
    await this.clearBtn.click();
  }
  async fillSample() {
    await this.sampleBtn.click();
  }

  // Node locator by index
  nodeByIndex(i) {
    return this.page.locator(`.node[data-index="${i}"]`);
  }

  // Read labels & status
  async getHeadText() { return (await this.headLabel.textContent()).trim(); }
  async getTailText() { return (await this.tailLabel.textContent()).trim(); }
  async getSizeText() { return (await this.sizeLabel.textContent()).trim(); }
  async getReprText() { return (await this.repr.textContent()).trim(); }
  async getStatusText() { return (await this.status.textContent()).trim(); }

  // Count SVG connector paths
  async connectorCount() {
    return this.page.locator('#svg path').count();
  }
}

test.describe('Interactive Singly Linked List - Visual and Functional Tests', () => {
  // Arrays to collect console errors and page errors per test
  let consoleErrors;
  let pageErrors;
  let ll;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages and page errors to assert no unexpected runtime errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    ll = new LinkedListPage(page);
    await ll.goto();
  });

  test.afterEach(async () => {
    // After each test assert that no console error or page error occurred.
    // This helps detect ReferenceError, TypeError, SyntaxError happening in runtime.
    expect(consoleErrors, 'No console errors should be emitted').toHaveLength(0);
    expect(pageErrors, 'No page errors (unhandled exceptions) should occur').toHaveLength(0);
  });

  test('Initial load shows empty list and ready status', async () => {
    // Verify default labels and representation on initial render
    await expect(ll.headLabel).toHaveText('null');
    await expect(ll.tailLabel).toHaveText('null');
    await expect(ll.sizeLabel).toHaveText('0');
    await expect(ll.repr).toHaveText('Empty list');

    // Status should indicate readiness
    await expect(ll.status).toContainText('Ready. Try pushing some nodes!');
    // No nodes present
    await expect(ll.nodesWrap.locator('.node')).toHaveCount(0);
  });

  test('Push (tail) and Unshift (head) update labels, nodes and size', async () => {
    // Push a tail node
    await ll.push('42');
    await expect(ll.sizeLabel).toHaveText('1');
    await expect(ll.headLabel).toHaveText('42');
    await expect(ll.tailLabel).toHaveText('42');

    // Check node DOM element created and marked as head & tail
    const node0 = ll.nodeByIndex(0);
    await expect(node0).toHaveCount(1);
    await expect(node0.locator('.value')).toHaveText('42');
    await expect(node0).toHaveClass(/head/);
    await expect(node0).toHaveClass(/tail/);

    // Unshift a head node
    await ll.unshift('h1');
    await expect(ll.sizeLabel).toHaveText('2');
    await expect(ll.headLabel).toHaveText('h1');
    await expect(ll.tailLabel).toHaveText('42');

    // New head at index 0
    await expect(ll.nodeByIndex(0).locator('.value')).toHaveText('h1');
    await expect(ll.nodeByIndex(1).locator('.value')).toHaveText('42');

    // Representation string should match insertion order using arrow separator
    await expect(ll.repr).toHaveText('h1  ->  42');
  });

  test('Insert at index and Remove at index alter the list correctly', async () => {
    // Prepare base list: push two nodes
    await ll.clearList();
    await expect(ll.sizeLabel).toHaveText('0');
    await ll.push('A');
    await ll.push('B');
    await expect(ll.sizeLabel).toHaveText('2');

    // Insert at index 1
    await ll.insertAt(1, 'mid');
    await expect(ll.sizeLabel).toHaveText('3');
    // Expect values in correct order
    await expect(ll.repr).toHaveText('A  ->  mid  ->  B');

    // Removed node at index 1
    await ll.removeAt(1);
    // After removal should be back to A -> B
    await expect(ll.sizeLabel).toHaveText('2');
    await expect(ll.repr).toHaveText('A  ->  B');
    // Status should reflect removed value
    await expect(ll.status).toContainText('Removed "mid" at index 1.');
  });

  test('Remove by value removes first occurrence and updates DOM', async () => {
    // Build a list with duplicate entries
    await ll.clearList();
    await ll.push('X');
    await ll.push('Y');
    await ll.push('X');
    await expect(ll.repr).toHaveText('X  ->  Y  ->  X');
    await expect(ll.sizeLabel).toHaveText('3');

    // Remove first 'X'
    await ll.removeValue('X');
    await expect(ll.sizeLabel).toHaveText('2');
    await expect(ll.repr).toHaveText('Y  ->  X');
    await expect(ll.status).toContainText('Removed first occurrence of "X".');
  });

  test('Find highlights the node and updates status', async () => {
    await ll.clearList();
    await ll.push('foo');
    await ll.push('bar');

    // Find 'bar' (index 1)
    await ll.findValue('bar');
    await expect(ll.status).toContainText('Found "bar" at index 1.');

    // The found node gets the "found" class briefly; assert it exists immediately
    const foundNode = ll.nodeByIndex(1);
    await expect(foundNode).toHaveClass(/found/);

    // After the animation period the class is removed (max 1500ms)
    await ll.page.waitForTimeout(1600);
    await expect(foundNode).not.toHaveClass(/found/);
  });

  test('Traversal stepper highlights nodes sequentially and auto-play works', async () => {
    // Use sample data to have multiple nodes to traverse
    await ll.fillSample();
    // One click both starts and steps traversal to index 0
    await ll.traverseStep();
    let n0 = ll.nodeByIndex(0);
    await expect(n0).toHaveClass(/highlight/);
    await expect(ll.status).toContainText('Visiting index 0');

    // Another step should move highlight to index 1
    await ll.traverseStep();
    let n1 = ll.nodeByIndex(1);
    await expect(n1).toHaveClass(/highlight/);
    await expect(n0).not.toHaveClass(/highlight/);

    // Test auto-play: start auto-traverse and ensure button text toggles, then stop it
    await ll.autoTraverseToggle();
    // Button text should change to 'Stop auto'
    await expect(ll.autoTraverseBtn).toHaveText(/Stop auto/);

    // Wait a bit for auto-traversal to progress; it will stop automatically when complete.
    // Give it ample time (few intervals).
    await ll.page.waitForTimeout(2200);

    // After auto-play completes, button text should revert to 'Auto-play'
    await expect(ll.autoTraverseBtn).toHaveText(/Auto-play/);
    // Status will contain 'Auto-traversal finished.' at the end
    await expect(ll.status).toContainText(/Auto-traversal finished.|Traversal finished./);
  }, { timeout: 15000 });

  test('Reverse action flips the list and updates labels after animation', async () => {
    // Fill sample to have length > 1 for reverse
    await ll.fillSample();
    // Ensure sample filled
    await expect(ll.sizeLabel).toHaveText('5');

    // Start reverse (animation executed inside)
    await ll.reverseList();

    // The reverse uses a timeout based on node count; wait until status says 'List reversed.'
    await ll.page.waitForFunction(() => {
      const s = document.getElementById('status');
      return s && s.textContent && s.textContent.includes('List reversed.');
    }, null, { timeout: 3000 });

    // After reverse, the head should be the previous tail 'E' and repr should update accordingly
    await expect(ll.headLabel).toHaveText('E');
    await expect(ll.tailLabel).toHaveText('A');
    await expect(ll.repr).toContainText('E'); // basic check that list order changed
  });

  test('Clear and Fill sample buttons behave as expected', async () => {
    // Fill sample
    await ll.fillSample();
    await expect(ll.sizeLabel).toHaveText('5');
    await expect(ll.repr).toContainText('A');

    // Clear list
    await ll.clearList();
    await expect(ll.sizeLabel).toHaveText('0');
    await expect(ll.repr).toHaveText('Empty list');
    await expect(ll.headLabel).toHaveText('null');
    await expect(ll.tailLabel).toHaveText('null');
  });

  test('Edge cases: pushing empty value and removing invalid index produce error statuses', async () => {
    // Ensure empty push triggers error status
    await ll.valueInput.fill('');
    await ll.addTailBtn.click();
    await expect(ll.status).toHaveText('Provide a value to push.');

    // Remove with invalid index (non-numeric)
    await ll.indexInput.fill('not-a-number');
    await ll.removeIndexBtn.click();
    await expect(ll.status).toHaveText('Enter index to remove.');

    // Remove with out-of-bounds numeric index
    await ll.indexInput.fill('99');
    await ll.removeIndexBtn.click();
    await expect(ll.status).toHaveText('Invalid index to remove.');
  });

  test('SVG connectors are rendered when there are at least two nodes', async () => {
    await ll.clearList();
    await ll.push('one');
    await ll.push('two');
    // Wait for connectors layout to run (MutationObserver/layout routines)
    await ll.page.waitForTimeout(200);
    const count = await ll.connectorCount();
    expect(Number(count), 'At least one path should be drawn between nodes').toBeGreaterThanOrEqual(1);
  });
});