#!/usr/bin/env node
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('workspace/batch-1207/human-evaluation-template.json', 'utf-8'));

console.log('📊 Human Evaluation Template Summary\n');
console.log(`Total Samples: ${data.metadata.totalSamples}`);
console.log(`Samples Per Model: ${data.metadata.samplesPerModel}\n`);

console.log('Model Distribution:');
data.metadata.modelOrder.forEach((model, idx) => {
  const samples = data.samples.filter(s => s.model === model);
  console.log(`\n${idx + 1}. ${model}: ${samples.length} samples`);
  console.log('   Sample concepts:');
  samples.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.concept} (FSM: ${s.fsm_reference.score})`);
  });
});

console.log('\n✅ Template is ready for human evaluation!');
console.log('📄 Open: workspace/batch-1207/human-evaluation-interface-optimized.html');
