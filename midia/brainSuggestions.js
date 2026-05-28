'use strict';

const { getBestPatternsForBrief } = require('../core/knowledgeReader');
const { composeContentDirection } = require('../core/contentStrategyComposer');

function getBrainSuggestions(brief = {}, options = {}) {
  const normalizedBrief = normalizeBrief(brief);
  const patterns = options.patterns || getBestPatternsForBrief(normalizedBrief, {
    limit: options.limit || 5
  });
  const strategy = composeContentDirection(normalizedBrief, patterns);

  return {
    brief: normalizedBrief,
    hooks: strategy.recommendedHooks,
    narratives: strategy.recommendedNarratives,
    ctas: strategy.recommendedCTAs,
    visualStyles: strategy.recommendedVisualStyles,
    emotionalTones: buildToneSuggestions(patterns),
    strategicSummary: strategy.strategicSummary,
    sourcePatterns: buildSourcePatternPreview(strategy.sourcePatterns)
  };
}

function buildSuggestionCards(strategy = {}) {
  return [
    {
      title: 'Hooks sugeridos',
      type: 'hooks',
      items: strategy.hooks || strategy.recommendedHooks || []
    },
    {
      title: 'Narrativas sugeridas',
      type: 'narratives',
      items: strategy.narratives || strategy.recommendedNarratives || []
    },
    {
      title: 'CTAs sugeridos',
      type: 'ctas',
      items: strategy.ctas || strategy.recommendedCTAs || []
    },
    {
      title: 'Estilos visuais',
      type: 'visualStyles',
      items: strategy.visualStyles || strategy.recommendedVisualStyles || []
    },
    {
      title: 'Tons emocionais',
      type: 'emotionalTones',
      items: strategy.emotionalTones || []
    }
  ];
}

function buildSourcePatternPreview(patterns = []) {
  return (patterns || []).map((pattern) => ({
    filename: pattern.filename || '',
    titulo: pattern.titulo || '',
    segmento: pattern.segmento || '',
    objetivo_comercial: pattern.objetivo_comercial || '',
    hook_type: pattern.hook_type || '',
    estrutura_narrativa: pattern.estrutura_narrativa || '',
    tipo_cta: pattern.tipo_cta || '',
    tom_emocional: pattern.tom_emocional || ''
  }));
}

function buildToneSuggestions(patterns = []) {
  const counts = new Map();

  for (const pattern of patterns || []) {
    const tone = pattern && pattern.tom_emocional;

    if (!tone) {
      continue;
    }

    counts.set(tone, (counts.get(tone) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })
    .map(([value, count]) => ({
      value,
      count
    }));
}

function normalizeBrief(brief = {}) {
  return {
    segmento: String(brief.segmento || '').trim(),
    objetivo_comercial: String(brief.objetivo_comercial || '').trim()
  };
}

module.exports = {
  buildSourcePatternPreview,
  buildSuggestionCards,
  getBrainSuggestions
};
