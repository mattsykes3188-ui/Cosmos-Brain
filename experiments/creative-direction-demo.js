'use strict';

const { buildCreativeDirection } = require('../midia/creativeDirector');

const brief = {
  segmento: 'pesca',
  objetivo_comercial: 'gerar_lead',
  formato: 'video'
};

const direction = buildCreativeDirection(brief);

console.log('Creative Direction Demo');
console.log('INPUT:');
console.log(JSON.stringify(brief, null, 2));
console.log('');
console.log('DIREÇÃO CRIATIVA:');
console.log(`Hook: ${direction.hookDirection || 'sem direção suficiente'}`);
console.log('');
console.log('Narrativa:');
for (const item of direction.narrativeDirection) {
  console.log(`- ${item}`);
}
console.log('');
console.log('Visual:');
for (const item of direction.visualDirection) {
  console.log(`- ${item}`);
}
console.log('');
console.log(`Emocional: ${direction.emotionalDirection || 'sem direção suficiente'}`);
console.log(`CTA: ${direction.ctaDirection || 'sem direção suficiente'}`);
console.log('');
console.log('Resumo:');
console.log(direction.creativeSummary);
console.log('');
console.log('Confiança:');
console.log(JSON.stringify(direction.confidence, null, 2));
console.log('');
console.log('Source Patterns:');
for (const filename of direction.sourcePatterns) {
  console.log(`- ${filename}`);
}
