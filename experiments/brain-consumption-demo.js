'use strict';

const { getBestPatternsForBrief } = require('../core/knowledgeReader');
const { composeContentDirection } = require('../core/contentStrategyComposer');

const brief = {
  segmento: 'pesca',
  objetivo_comercial: 'gerar_lead'
};

const patterns = getBestPatternsForBrief(brief, { limit: 5 });
const direction = composeContentDirection(brief, patterns);

function printGroup(title, items) {
  console.log(`${title}:`);

  if (!items.length) {
    console.log('- nenhum padrao aprovado encontrado');
    return;
  }

  for (const item of items) {
    console.log(`- ${item.value} (${item.count})`);
  }
}

console.log('Brain Consumption Demo');
console.log('Brief:', JSON.stringify(brief, null, 2));
console.log('');
printGroup('HOOKS', direction.recommendedHooks);
console.log('');
printGroup('NARRATIVAS', direction.recommendedNarratives);
console.log('');
printGroup('CTAS', direction.recommendedCTAs);
console.log('');
printGroup('ESTILOS VISUAIS', direction.recommendedVisualStyles);
console.log('');
console.log('SUMMARY:');
console.log(direction.strategicSummary);
console.log('');
console.log('SOURCE PATTERNS:');
for (const pattern of direction.sourcePatterns) {
  console.log(`- ${pattern.filename}`);
}
