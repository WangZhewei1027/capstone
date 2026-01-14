node batch-html-to-test.mjs -c 100 --html-model "gpt-5-mini" --playwright-model "gpt-5-mini" -w "baseline-html2test-gpt-5-mini" -q "./question-list.json"

npx playwright test workspace/baseline-html2test-gpt-5-mini/tests/ --workers=100

node validate-tests.mjs workspace/baseline-html2test-gpt-5-mini

node analyze-pass-rate.mjs workspace/baseline-html2test-gpt-4o
