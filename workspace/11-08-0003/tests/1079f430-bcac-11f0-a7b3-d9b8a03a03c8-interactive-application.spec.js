import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1079f430-bcac-11f0-a7b3-d9b8a03a03c8.html';

class FloydWarshallPage {
    constructor(page) {
        this.page = page;
        this.startButton = page.locator('#startBtn');
        this.resetButton = page.locator('#resetBtn');
        this.output = page.locator('#output');
        this.nodes = page.locator('.node');
    }

    async navigate() {
        await this.page.goto(BASE_URL);
    }

    async startAlgorithm() {
        await this.startButton.click();
    }

    async resetAlgorithm() {
        await this.resetButton.click();
    }

    async getOutputText() {
        return await this.output.innerText();
    }

    async getNodeClass(nodeId) {
        return await this.page.locator(`#${nodeId}`).getAttribute('class');
    }
}

test.describe('Floyd-Warshall Algorithm Interactive Exploration', () => {
    let page;
    let floydWarshallPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        floydWarshallPage = new FloydWarshallPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should start in idle state', async () => {
        await floydWarshallPage.navigate();
        const outputText = await floydWarshallPage.getOutputText();
        expect(outputText).toBe('');
    });

    test('should transition to running state on start', async () => {
        await floydWarshallPage.startAlgorithm();
        const outputText1 = await floydWarshallPage.getOutputText();
        expect(outputText).toContain('Algorithm is running');
    });

    test('should transition to updating state on intermediate update', async () => {
        await floydWarshallPage.startAlgorithm();
        await page.waitForTimeout(1000); // Simulate waiting for an intermediate update
        const nodeClass = await floydWarshallPage.getNodeClass('nodeA');
        expect(nodeClass).toContain('active');
    });

    test('should transition back to running state after intermediate update complete', async () => {
        await page.evaluate(() => {
            // Simulate intermediate update complete
            document.dispatchEvent(new Event('INTERMEDIATE_UPDATE_COMPLETE'));
        });
        const outputText2 = await floydWarshallPage.getOutputText();
        expect(outputText).toContain('Algorithm is running');
    });

    test('should transition to done state on algorithm complete', async () => {
        await page.evaluate(() => {
            // Simulate algorithm complete
            document.dispatchEvent(new Event('ALGORITHM_COMPLETE'));
        });
        const outputText3 = await floydWarshallPage.getOutputText();
        expect(outputText).toContain('Algorithm is complete');
    });

    test('should reset to idle state', async () => {
        await floydWarshallPage.resetAlgorithm();
        const outputText4 = await floydWarshallPage.getOutputText();
        expect(outputText).toBe('');
    });

    test('should handle reset during running state', async () => {
        await floydWarshallPage.startAlgorithm();
        await page.waitForTimeout(500); // Simulate some processing
        await floydWarshallPage.resetAlgorithm();
        const outputText5 = await floydWarshallPage.getOutputText();
        expect(outputText).toBe('');
    });
});