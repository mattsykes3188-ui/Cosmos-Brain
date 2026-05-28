'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  buildBrainConfidence,
  buildCreativeDirection,
  translatePatternsToCampaignDirection,
  translatePatternsToPostDirection,
  translatePatternsToVideoDirection
} = require('../midia/creativeDirector');
const {
  humanizeSemanticId,
  translateSemanticValue
} = require('../midia/creativeTranslations');

const rootDir = path.join(__dirname, '..');
const dashboardPath = path.join(rootDir, 'index.html');

function run() {
  assert.strictEqual(typeof buildCreativeDirection, 'function', 'buildCreativeDirection exists');

  const video = buildCreativeDirection({
    segmento: 'pesca',
    objetivo_comercial: 'gerar_lead',
    formato: 'video'
  });

  assert.ok(video.hookDirection.includes('liderança') || video.hookDirection.includes('confiança'), 'hook direction is creative language');
  assert.ok(video.narrativeDirection.length > 0, 'video narrative direction exists');
  assert.ok(video.visualDirection.length > 0, 'video visual direction exists');
  assert.ok(video.emotionalDirection.length > 0, 'emotional direction exists');
  assert.ok(video.ctaDirection.length > 0, 'CTA direction exists');
  assert.ok(video.creativeSummary.length > 0, 'creative summary exists');
  assert.ok(video.confidence.score > 0, 'confidence score is calculated');
  assert.ok(['inicial', 'media', 'forte'].includes(video.confidence.level), 'confidence level is valid');
  assert.ok(video.sourcePatterns.length > 0, 'sourcePatterns exist');
  assert.ok(!video.sourcePatterns.some((filename) => filename === 'exemplo_padrao_locucao.json'), 'drafts are not used');

  const post = buildCreativeDirection({
    segmento: 'pesca',
    objetivo_comercial: 'gerar_lead',
    formato: 'post'
  });
  assert.ok(post.narrativeDirection.some((line) => line.includes('sequência')), 'post format adds post direction');

  const campanha = buildCreativeDirection({
    segmento: 'pesca',
    objetivo_comercial: 'gerar_lead',
    formato: 'campanha'
  });
  assert.ok(campanha.narrativeDirection.some((line) => line.includes('peça principal')), 'campaign format adds campaign direction');

  assert.ok(translatePatternsToVideoDirection([], { formato: 'video' }).creativeSummary.includes('Ainda não há'), 'empty video direction is safe');
  assert.ok(translatePatternsToPostDirection([], { formato: 'post' }).creativeSummary.includes('Ainda não há'), 'empty post direction is safe');
  assert.ok(translatePatternsToCampaignDirection([], { formato: 'campanha' }).creativeSummary.includes('Ainda não há'), 'empty campaign direction is safe');

  assert.strictEqual(translateSemanticValue('estrutura_narrativa', 'demonstracao_produto'), 'Mostre detalhes reais do produto em uso, acabamento, tecido e personalização.');
  assert.strictEqual(humanizeSemanticId('demonstracao_produto'), 'demonstracao produto');

  const noBaseConfidence = buildBrainConfidence([]);
  assert.strictEqual(noBaseConfidence.score, 0, 'empty confidence score is zero');
  assert.strictEqual(noBaseConfidence.level, 'sem_base', 'empty confidence level is sem_base');

  const creativeDirectorSource = fs.readFileSync(path.join(rootDir, 'midia', 'creativeDirector.js'), 'utf8').toLowerCase();
  const translationsSource = fs.readFileSync(path.join(rootDir, 'midia', 'creativeTranslations.js'), 'utf8').toLowerCase();
  assert.ok(!creativeDirectorSource.includes('openai') && !translationsSource.includes('openai'), 'no external AI is used');
  assert.ok(!creativeDirectorSource.includes('embedding') && !translationsSource.includes('embedding'), 'no embeddings are implemented');
  assert.ok(fs.existsSync(dashboardPath), 'dashboard principal remains intact');

  console.log('test_creative_direction_layer: 24 passed');
}

run();
