'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  buildSourcePatternPreview,
  buildSuggestionCards,
  getBrainSuggestions
} = require('../midia/brainSuggestions');

const rootDir = path.join(__dirname, '..');
const midiaModulePath = path.join(rootDir, 'midia', 'brainSuggestions.js');
const dashboardPath = path.join(rootDir, 'index.html');

function run() {
  assert.strictEqual(typeof getBrainSuggestions, 'function', 'getBrainSuggestions exists');
  assert.strictEqual(typeof buildSuggestionCards, 'function', 'buildSuggestionCards exists');
  assert.strictEqual(typeof buildSourcePatternPreview, 'function', 'buildSourcePatternPreview exists');

  const moduleSource = fs.readFileSync(midiaModulePath, 'utf8');
  assert.ok(moduleSource.includes("require('../core/knowledgeReader')"), 'uses knowledgeReader');
  assert.ok(moduleSource.includes("require('../core/contentStrategyComposer')"), 'uses contentStrategyComposer');

  const suggestions = getBrainSuggestions({
    segmento: 'pesca',
    objetivo_comercial: 'gerar_lead'
  });

  assert.strictEqual(suggestions.brief.segmento, 'pesca', 'keeps brief segment');
  assert.strictEqual(suggestions.brief.objetivo_comercial, 'gerar_lead', 'keeps brief objective');
  assert.ok(Array.isArray(suggestions.hooks), 'hooks array exists');
  assert.ok(suggestions.hooks.length > 0, 'hooks are returned');
  assert.ok(Array.isArray(suggestions.narratives), 'narratives array exists');
  assert.ok(Array.isArray(suggestions.ctas), 'ctas array exists');
  assert.ok(suggestions.ctas.length > 0, 'CTAs are returned');
  assert.ok(Array.isArray(suggestions.visualStyles), 'visual styles array exists');
  assert.ok(Array.isArray(suggestions.emotionalTones), 'emotional tones array exists');
  assert.ok(suggestions.emotionalTones.length > 0, 'emotional tones are returned');
  assert.ok(typeof suggestions.strategicSummary === 'string' && suggestions.strategicSummary.length > 0, 'summary exists');
  assert.ok(Array.isArray(suggestions.sourcePatterns), 'sourcePatterns array exists');
  assert.ok(suggestions.sourcePatterns.length > 0, 'sourcePatterns are returned');
  assert.ok(suggestions.sourcePatterns.every((pattern) => pattern.filename), 'sourcePatterns are traceable');
  assert.ok(!suggestions.sourcePatterns.some((pattern) => pattern.filename === 'exemplo_padrao_locucao.json'), 'drafts do not appear');

  const cards = buildSuggestionCards(suggestions);
  assert.ok(cards.some((card) => card.type === 'hooks' && card.items.length > 0), 'cards include hooks');
  assert.ok(cards.some((card) => card.type === 'ctas' && card.items.length > 0), 'cards include CTAs');
  assert.ok(cards.some((card) => card.type === 'emotionalTones' && card.items.length > 0), 'cards include tones');

  const preview = buildSourcePatternPreview(suggestions.sourcePatterns);
  assert.deepStrictEqual(preview[0], suggestions.sourcePatterns[0], 'source preview is stable');

  assert.ok(!moduleSource.toLowerCase().includes('openai'), 'no external AI API is used');
  assert.ok(!moduleSource.toLowerCase().includes('embedding'), 'no embeddings are implemented');
  assert.ok(fs.existsSync(dashboardPath), 'dashboard principal remains intact');

  console.log('test_brain_powered_midia_suggestions: 25 passed');
}

run();
