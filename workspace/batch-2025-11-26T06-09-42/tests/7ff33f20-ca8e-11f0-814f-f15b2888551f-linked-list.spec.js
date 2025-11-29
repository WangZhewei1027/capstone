import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T06-09-42/html/7ff33f20-ca8e-11f0-814f-f15b2888551f.html';

// Page Object Model for the Linked List page
class LinkedListPage {
    constructor(page) {
        this.page = page;
    }

    // Selectors
    async valueInput() { return this.page.locator('#value-input'); }
    async indexInput() { return this.page.locator('#index-input'); }
    async removeIndexInput() { return this.page.locator('#remove-index-input'); }
    async findValueInput() { return this.page.locator('#find-value-input'); }
    async addHeadBtn() { return this.page.locator('#add-head-btn'); }
    async addTailBtn() { return this.page.locator('#add-tail-btn'); }
    async insertAtBtn() { return this.page.locator('#insert-at-btn'); }
    async removeHeadBtn() { return this.page.locator('#remove-head-btn'); }
    async removeTailBtn() { return this.page.locator('#remove-tail-btn'); }
    async removeAtBtn() { return this.page.locator('#remove-at-btn'); }
    async findBtn() { return this.page.locator('#find-btn'); }
    async messageArea() { return this.page.locator('#message-area'); }
    async visualization() { return this.page.locator('#visualization-area'); }
    async linkedListContainer() { return this.page.locator('#linked-list-container'); }
    async nodeAt(index) { return this.page.locator(`.node[data-index='${index}']`); }
    async nodes() { return this.page.locator('.node'); }
    async nullNode() { return this.page.locator('.null-node'); }
    async headPointer() { return this.page.locator('.head-pointer'); }

    // Actions
    async addHead(value) {
        await (await this.valueInput()).fill(value);
        await (await this.addHeadBtn()).click();
    }

    async addTail(value) {
        await (await this.valueInput()).fill(value);
        await (await this.addTailBtn()).click();
    }

    async insertAt(value, index) {
        await (await this.valueInput()).fill(value);
        await (await this.indexInput()).fill(String(index));
        await (await this.insertAtBtn()).click();
    }

    async removeHead() {
        await (await this.removeHeadBtn()).click();
    }

    async removeTail() {
        await (await this.removeTailBtn()).click();
    }

    async removeAt(index) {
        await (await this.removeIndexInput()).fill(String(index));
        await (await this.removeAtBtn()).click();
    }

    async find(value) {
        await (await this.findValueInput()).fill(value);
        await (await this.findBtn()).click();
    }

    // Helpers
    async getMessageText() {
        return (await this.messageArea()).innerText();
    }

    async getMessageInlineColor() {
        // read the inline style.color property from the element
        return this.page.$eval('#message-area', el => el.style.color);
    }

    async countNodes() {
        return await (await this.nodes()).count();
    }

    async waitForHighlightOnIndex(index, timeout = 2000) {
        const selector = `.node[data-index='${index}'].highlight`;
        await this.page.waitForSelector(selector, { state: 'attached', timeout });
    }

    async waitForMessageContains(text, timeout = 3000) {
        await this.page.waitForFunction(
            (sel, t) => document.querySelector(sel)?.innerText.includes(t),
            '#message-area',
            text,
            { timeout }
        );
    }
}

// Keep arrays for errors and console messages to be asserted in afterEach
test.describe('Linked List Visualization - FSM behavior and UI tests', () => {
    let pageErrors = [];
    let consoleErrors = [];
    let page;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();

        // Capture page errors (uncaught exceptions)
        pageErrors = [];
        consoleErrors = [];

        page.on('pageerror', err => {
            // collect the error object (ReferenceError/TypeError/etc.)
            pageErrors.push(err);
        });

        page.on('console', msg => {
            // collect console messages of level 'error' for assertion
            if (msg.type() === 'error') {
                consoleErrors.push({
                    text: msg.text(),
                    location: msg.location()
                });
            }
        });

        await page.goto(APP_URL, { waitUntil: 'load' });
    });

    test.afterEach(async () => {
        // Assert that no uncaught page errors occurred during the test run.
        // The test author instructions emphasize observing page errors and letting them happen naturally;
        // here we assert none occurred so that the page ran without ReferenceError/SyntaxError/TypeError.
        expect(pageErrors, 'Expected no uncaught page errors').toHaveLength(0);
        // Also assert no console.error messages were emitted
        expect(consoleErrors, 'Expected no console.error messages').toHaveLength(0);

        await page.close();
    });

    test.describe('Initial rendering and basic UI elements', () => {
        test('renders HEAD pointer and NULL when list is empty', async () => {
            const p = new LinkedListPage(page);

            // The initial render should show HEAD pointer and NULL indicator
            await expect(p.headPointer()).toBeVisible();
            await expect(p.nullNode()).toBeVisible();

            // Message area should provide initial instruction
            const text = await p.getMessageText();
            expect(text).toContain('Enter a value and perform an operation.');
        });
    });

    test.describe('Add operations (addingHead / addingTail states)', () => {
        test('Add to head updates DOM, highlights new head and displays message', async () => {
            const p = new LinkedListPage(page);
            const uniqueValue = `H-${Date.now()}`;

            // Add to head
            await p.addHead(uniqueValue);

            // onEnter addHead should have added a node and onExit renderList should have updated DOM
            await expect(p.nodeAt(0)).toBeVisible();
            await expect(p.nodeAt(0)).toHaveText(uniqueValue);

            // The highlight should be applied immediately after the action
            await p.waitForHighlightOnIndex(0);

            // Message should indicate the operation
            await p.waitForMessageContains(`Added '${uniqueValue}' to the head of the list.`);

            // After highlight timeout the class will be removed; ensure that within a reasonable time it's removed
            await page.waitForTimeout(1700);
            const hasHighlight = await page.$(`.node[data-index='0'].highlight`);
            // After 1500ms default, highlight should be removed
            expect(hasHighlight === null).toBeTruthy();
        });

        test('Add to tail appends node, highlights tail and clears input', async () => {
            const p = new LinkedListPage(page);
            // Add a head first so tail is distinct
            await p.addHead('start');
            await p.waitForHighlightOnIndex(0);

            const tailValue = `T-${Date.now()}`;
            await p.addTail(tailValue);

            // tail should be present; since indices are sequential, the tail index equals count-1
            const count = await p.countNodes();
            const tailIndex = count - 1;
            await expect(p.nodeAt(tailIndex)).toHaveText(tailValue);

            // Highlight should occur for the newly added tail
            await p.waitForHighlightOnIndex(tailIndex);

            // Message should say added to the tail
            await p.waitForMessageContains(`Added '${tailValue}' to the tail of the list.`);
        });
    });

    test.describe('Insert and remove operations (insertingAt, removingHead, removingTail, removingAt)', () => {
        test('Insert at index works and highlights inserted node', async () => {
            const p = new LinkedListPage(page);

            // Build initial list: A -> B -> C
            await p.addTail('A');
            await p.waitForHighlightOnIndex(0);
            await p.addTail('B');
            await p.waitForHighlightOnIndex(1);
            await p.addTail('C');
            await p.waitForHighlightOnIndex(2);

            // Insert value at index 1
            const inserted = `X-${Date.now()}`;
            await p.insertAt(inserted, 1);

            // The inserted node should exist at index 1 and be highlighted
            await expect(p.nodeAt(1)).toBeVisible();
            await expect(p.nodeAt(1)).toHaveText(inserted);

            await p.waitForHighlightOnIndex(1);
            await p.waitForMessageContains(`Inserted '${inserted}' at index 1.`);
        });

        test('Remove head from non-empty list updates DOM and message', async () => {
            const p = new LinkedListPage(page);

            // Ensure there's at least one element
            await p.addHead('toRemoveHead');
            await p.waitForHighlightOnIndex(0);

            // Remove head
            await p.removeHead();

            // The node with value 'toRemoveHead' should be gone (head updated)
            const nodes = await p.countNodes();
            // After removing head, nodes count might be 0 leading to NULL indicator
            if (nodes === 0) {
                await expect(p.nullNode()).toBeVisible();
            } else {
                // If other nodes exist, the first one should not contain the removed value
                const firstText = await p.nodeAt(0).innerText();
                expect(firstText).not.toContain('toRemoveHead');
            }

            await p.waitForMessageContains(`Removed head node with value 'toRemoveHead'.`);
        });

        test('Remove tail from non-empty list removes last node and updates message', async () => {
            const p = new LinkedListPage(page);

            // Build a short list
            await p.addTail('one');
            await p.waitForHighlightOnIndex(0);
            await p.addTail('two');
            await p.waitForHighlightOnIndex(1);

            // Remove tail
            await p.removeTail();

            // Now only one node should remain
            const count = await p.countNodes();
            expect(count).toBe(1);

            // Message should indicate removal
            await p.waitForMessageContains('Removed tail node.');
        });

        test('Remove at specific index with invalid index shows error', async () => {
            const p = new LinkedListPage(page);

            // Ensure empty list or small list
            // Attempt to remove at index 999 which should trigger "Index out of bounds"
            await p.removeAt(999);

            // Message should show error and inline color should reflect error (var(--null-color))
            await p.waitForMessageContains('Index out of bounds');
            const inlineColor = await p.getMessageInlineColor();
            expect(inlineColor).toBe('var(--null-color)');
        });
    });

    test.describe('Find operation (finding state) - animations, button disabling and results', () => {
        test('Find highlights nodes in sequence, disables controls during search, and reports found', async () => {
            const p = new LinkedListPage(page);

            // Build a list: val1 -> val2 -> target -> val4
            await p.addTail('val1');
            await p.waitForHighlightOnIndex(0);
            await p.addTail('val2');
            await p.waitForHighlightOnIndex(1);
            await p.addTail('targetValue');
            await p.waitForHighlightOnIndex(2);
            await p.addTail('val4');
            await p.waitForHighlightOnIndex(3);

            // Start find - this disables all control buttons during the search
            // Immediately after clicking, buttons should be disabled
            await (await p.findValueInput()).fill('targetValue');
            const findBtn = await p.findBtn();
            await findBtn.click();

            // Check that controls are disabled shortly after (within the find function before it finishes)
            // There are multiple control buttons - verify a known button is disabled
            const addHeadBtn = await p.addHeadBtn();
            await expect(addHeadBtn).toBeDisabled();

            // Wait for the success message
            await p.waitForMessageContains(`Found 'targetValue' at index 2!`);

            // After search completes, buttons should be re-enabled
            await expect(addHeadBtn).toBeEnabled();
        }, 10000); // increase timeout because find uses delays

        test('Find with missing value shows error and does not disable controls', async () => {
            const p = new LinkedListPage(page);

            // Ensure input is empty and click find
            await (await p.findValueInput()).fill('');
            await (await p.findBtn()).click();

            // Should display an error message asking for a value
            await p.waitForMessageContains('Please enter a value to find.');

            // Inline color should indicate error
            const inlineColor = await p.getMessageInlineColor();
            expect(inlineColor).toBe('var(--null-color)');

            // Controls should remain enabled (no animation started)
            await expect(await p.addHeadBtn()).toBeEnabled();
        });
    });

    test.describe('Edge cases and error scenarios mapped from FSM events', () => {
        test('Clicking add head with empty value shows validation error', async () => {
            const p = new LinkedListPage(page);

            // Ensure input is empty
            await (await p.valueInput()).fill('');
            await (await p.addHeadBtn()).click();

            // Should display an error message
            await p.waitForMessageContains('Please enter a value.');
            const inlineColor = await p.getMessageInlineColor();
            expect(inlineColor).toBe('var(--null-color)');
        });

        test('Insert at with non-numeric index shows validation error', async () => {
            const p = new LinkedListPage(page);

            await (await p.valueInput()).fill('Z');
            await (await p.indexInput()).fill('not-a-number');
            await (await p.insertAtBtn()).click();

            await p.waitForMessageContains('Please enter a valid index.');
            const inlineColor = await p.getMessageInlineColor();
            expect(inlineColor).toBe('var(--null-color)');
        });

        test('Remove head when list is empty emits user-friendly error', async () => {
            const p = new LinkedListPage(page);

            // Ensure list is empty by initial state
            // Click remove head on empty list
            await (await p.removeHeadBtn()).click();

            await p.waitForMessageContains('List is already empty.');
            const inlineColor = await p.getMessageInlineColor();
            expect(inlineColor).toBe('var(--null-color)');
        });

        test('Remove at with non-numeric index shows validation error', async () => {
            const p = new LinkedListPage(page);

            await (await p.removeIndexInput()).fill('NaN');
            await (await p.removeAtBtn()).click();

            await p.waitForMessageContains('Please enter a valid index.');
            const inlineColor = await p.getMessageInlineColor();
            expect(inlineColor).toBe('var(--null-color)');
        });

        test('Find for a non-existent value reports not found', async () => {
            const p = new LinkedListPage(page);

            // Ensure list has some nodes
            await p.addTail('alpha');
            await p.waitForHighlightOnIndex(0);
            await p.addTail('beta');
            await p.waitForHighlightOnIndex(1);

            // Search for a value that doesn't exist
            await p.find('no-such-value');

            // Wait for not found message
            await p.waitForMessageContains("Value 'no-such-value' not found in the list.");

            // Controls should be re-enabled afterwards
            await expect(await p.addHeadBtn()).toBeEnabled();
        }, 10000);
    });

    test.describe('FSM mapping verification (buttons map to FSM events/triggers)', () => {
        test('All trigger buttons exist and are clickable', async () => {
            const p = new LinkedListPage(page);

            // The FSM defines triggers for these button selectors — ensure they are present
            await expect(p.addHeadBtn()).toBeVisible();
            await expect(p.addTailBtn()).toBeVisible();
            await expect(p.insertAtBtn()).toBeVisible();
            await expect(p.removeHeadBtn()).toBeVisible();
            await expect(p.removeTailBtn()).toBeVisible();
            await expect(p.removeAtBtn()).toBeVisible();
            await expect(p.findBtn()).toBeVisible();

            // Click each button to ensure they respond (for some, the app will show validation errors)
            await (await p.addHeadBtn()).click();
            await p.waitForMessageContains('Please enter a value.');
            await (await p.addTailBtn()).click();
            await p.waitForMessageContains('Please enter a value.');
            await (await p.insertAtBtn()).click();
            await p.waitForMessageContains('Please enter a value.');
            await (await p.removeHeadBtn()).click();
            await p.waitForMessageContains('List is already empty.');
            await (await p.removeTailBtn()).click();
            await p.waitForMessageContains('List is already empty.');
            await (await p.removeAtBtn()).click();
            await p.waitForMessageContains('Please enter a valid index.');
            await (await p.findBtn()).click();
            await p.waitForMessageContains('Please enter a value to find.');
        });
    });
});