'use strict';

const {
  buildSuggestionCards,
  getBrainSuggestions
} = require('../midia/brainSuggestions');

const brief = {
  segmento: 'pesca',
  objetivo_comercial: 'gerar_lead'
};

const suggestions = getBrainSuggestions(brief);
const cards = buildSuggestionCards(suggestions);

function printItems(title, items) {
  console.log(`${title}:`);

  if (!items.length) {
    console.log('- nenhum padrao aprovado encontrado');
    return;
  }

  for (const item of items) {
    console.log(`- ${item.value} (${item.count})`);
  }
}

console.log('Brain-Powered Midia Demo');
console.log('Brief:', JSON.stringify(brief, null, 2));
console.log('');

for (const card of cards) {
  printItems(card.title.toUpperCase(), card.items);
  console.log('');
}

console.log('SUMMARY:');
console.log(suggestions.strategicSummary);
console.log('');
console.log('SOURCE PATTERNS:');
for (const pattern of suggestions.sourcePatterns) {
  console.log(`- ${pattern.filename}`);
}
