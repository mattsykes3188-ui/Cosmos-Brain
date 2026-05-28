'use strict';

const { getBestPatternsForBrief } = require('../core/knowledgeReader');
const {
  humanizeSemanticId,
  labelSemanticValue,
  translatePattern,
  translateSemanticValue
} = require('./creativeTranslations');

const SUPPORTED_FORMATS = new Set(['video', 'post', 'campanha']);

function buildCreativeDirection(brief = {}, options = {}) {
  const normalizedBrief = normalizeBrief(brief);
  const patterns = options.patterns || getBestPatternsForBrief(
    {
      segmento: normalizedBrief.segmento,
      objetivo_comercial: normalizedBrief.objetivo_comercial
    },
    { limit: options.limit || 5 }
  );

  if (normalizedBrief.formato === 'post') {
    return translatePatternsToPostDirection(patterns, normalizedBrief);
  }

  if (normalizedBrief.formato === 'campanha') {
    return translatePatternsToCampaignDirection(patterns, normalizedBrief);
  }

  return translatePatternsToVideoDirection(patterns, normalizedBrief);
}

function translatePatternsToCreativeDirection(patterns = [], brief = {}) {
  return buildDirection(patterns, normalizeBrief(brief));
}

function translatePatternsToVideoDirection(patterns = [], brief = {}) {
  const direction = buildDirection(patterns, {
    ...normalizeBrief(brief),
    formato: 'video'
  });

  return {
    ...direction,
    narrativeDirection: [
      ...direction.narrativeDirection,
      'Estruture em abertura forte, prova visual do produto e fechamento com ação clara.'
    ]
  };
}

function translatePatternsToPostDirection(patterns = [], brief = {}) {
  const direction = buildDirection(patterns, {
    ...normalizeBrief(brief),
    formato: 'post'
  });

  return {
    ...direction,
    narrativeDirection: [
      ...direction.narrativeDirection,
      'Transforme a narrativa em sequência de ideia, prova e chamada final.'
    ]
  };
}

function translatePatternsToCampaignDirection(patterns = [], brief = {}) {
  const direction = buildDirection(patterns, {
    ...normalizeBrief(brief),
    formato: 'campanha'
  });

  return {
    ...direction,
    narrativeDirection: [
      ...direction.narrativeDirection,
      'Desdobre o ângulo em peça principal, prova visual e reforço de CTA.'
    ]
  };
}

function buildHookDirection(patterns = []) {
  const top = mostFrequentValue(patterns, 'hook_type');

  if (!top) {
    return '';
  }

  return translateSemanticValue('hook_type', top);
}

function buildNarrativeDirection(patterns = []) {
  return uniqueTranslatedValues(patterns, 'estrutura_narrativa');
}

function buildVisualDirection(patterns = []) {
  const visual = uniqueTranslatedValues(patterns, 'estilo_visual');
  const format = uniqueTranslatedValues(patterns, 'formato_conteudo');
  const segment = uniqueTranslatedValues(patterns, 'segmento');

  return uniqueLines([...visual, ...format, ...segment]);
}

function buildCTADirection(patterns = []) {
  const top = mostFrequentValue(patterns, 'tipo_cta');

  if (!top) {
    return '';
  }

  return translateSemanticValue('tipo_cta', top);
}

function buildEmotionalDirection(patterns = []) {
  const tones = uniqueValues(patterns, 'tom_emocional').slice(0, 2);

  if (tones.length === 0) {
    return '';
  }

  return `${tones.map((tone) => humanizeSemanticId(tone)).join(' e ')}.`;
}

function buildBrainConfidence(patterns = []) {
  const approvedCount = patterns.filter(isApprovedPattern).length;
  const diversity = new Set(patterns.flatMap((pattern) => [
    pattern.hook_type,
    pattern.estrutura_narrativa,
    pattern.tipo_cta,
    pattern.tom_emocional
  ].filter(Boolean))).size;
  const score = Math.min(10, Number(((approvedCount * 2.5) + (diversity * 0.6)).toFixed(1)));

  let level = 'sem_base';
  if (score >= 7.5) {
    level = 'forte';
  } else if (score >= 4) {
    level = 'media';
  } else if (score > 0) {
    level = 'inicial';
  }

  return {
    score,
    level
  };
}

function buildDirection(patterns, brief) {
  const approvedPatterns = (patterns || []).filter(isApprovedPattern);

  return {
    hookDirection: buildHookDirection(approvedPatterns),
    narrativeDirection: buildNarrativeDirection(approvedPatterns),
    visualDirection: buildVisualDirection(approvedPatterns),
    emotionalDirection: buildEmotionalDirection(approvedPatterns),
    ctaDirection: buildCTADirection(approvedPatterns),
    creativeSummary: buildCreativeSummary(approvedPatterns, brief),
    confidence: buildBrainConfidence(approvedPatterns),
    sourcePatterns: approvedPatterns.map(toSourcePattern)
  };
}

function buildCreativeSummary(patterns, brief) {
  if (!patterns.length) {
    return 'Ainda não há padrões aprovados suficientes para dirigir esta criação com segurança.';
  }

  const segmento = labelSemanticValue(brief.segmento || patterns[0].segmento);
  const objetivo = labelSemanticValue(brief.objetivo_comercial || patterns[0].objetivo_comercial);
  const hook = labelSemanticValue(mostFrequentValue(patterns, 'hook_type'));
  const narrativa = labelSemanticValue(mostFrequentValue(patterns, 'estrutura_narrativa'));
  const cta = labelSemanticValue(mostFrequentValue(patterns, 'tipo_cta'));

  return `Conteúdos de ${segmento} para ${objetivo} devem combinar ${hook}, ${narrativa} e fechamento com ${cta}.`;
}

function toSourcePattern(pattern) {
  return pattern.filename || '';
}

function isApprovedPattern(pattern) {
  return pattern && pattern.type === 'padrao_locucao' && pattern.status === 'approved';
}

function uniqueTranslatedValues(patterns, field) {
  return uniqueValues(patterns, field).map((value) => translateSemanticValue(field, value));
}

function uniqueValues(patterns, field) {
  return [...new Set(
    (patterns || [])
      .map((pattern) => pattern && pattern[field])
      .filter(Boolean)
  )];
}

function uniqueLines(lines) {
  return [...new Set(lines.filter(Boolean))];
}

function mostFrequentValue(patterns, field) {
  const counts = new Map();

  for (const pattern of patterns || []) {
    if (!pattern || !pattern[field]) {
      continue;
    }

    counts.set(pattern[field], (counts.get(pattern[field]) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })[0]?.[0] || '';
}

function normalizeBrief(brief = {}) {
  const formato = String(brief.formato || 'video').trim();

  return {
    segmento: String(brief.segmento || '').trim(),
    objetivo_comercial: String(brief.objetivo_comercial || '').trim(),
    formato: SUPPORTED_FORMATS.has(formato) ? formato : 'video'
  };
}

module.exports = {
  buildBrainConfidence,
  buildCTADirection,
  buildCreativeDirection,
  buildEmotionalDirection,
  buildHookDirection,
  buildNarrativeDirection,
  buildVisualDirection,
  translatePatternsToCampaignDirection,
  translatePatternsToCreativeDirection,
  translatePatternsToPostDirection,
  translatePatternsToVideoDirection
};
