'use strict';

function composeContentDirection(brief = {}, patterns = []) {
  const approvedPatterns = Array.isArray(patterns)
    ? patterns.filter((pattern) => pattern && pattern.type === 'padrao_locucao' && pattern.status === 'approved')
    : [];

  return {
    brief: {
      segmento: brief.segmento || '',
      objetivo_comercial: brief.objetivo_comercial || ''
    },
    recommendedHooks: buildHookSuggestions(approvedPatterns),
    recommendedNarratives: buildNarrativeSuggestions(approvedPatterns),
    recommendedCTAs: buildCTASuggestions(approvedPatterns),
    recommendedVisualStyles: buildVisualDirectionSuggestions(approvedPatterns),
    strategicSummary: buildStrategicSummary(approvedPatterns),
    sourcePatterns: approvedPatterns.map(toSourcePattern)
  };
}

function buildHookSuggestions(patterns = []) {
  return buildRankedSuggestions(patterns, 'hook_type');
}

function buildNarrativeSuggestions(patterns = []) {
  return buildRankedSuggestions(patterns, 'estrutura_narrativa');
}

function buildCTASuggestions(patterns = []) {
  return buildRankedSuggestions(patterns, 'tipo_cta');
}

function buildVisualDirectionSuggestions(patterns = []) {
  return buildRankedSuggestions(patterns, 'estilo_visual');
}

function buildStrategicSummary(patterns = []) {
  const approvedPatterns = patterns.filter((pattern) => pattern && pattern.type === 'padrao_locucao' && pattern.status === 'approved');

  if (approvedPatterns.length === 0) {
    return 'Nenhum padrao aprovado encontrado para este brief. O Cosmos Midia deve evitar recomendacoes sem fonte.';
  }

  const segmentos = joinTopValues(approvedPatterns, 'segmento');
  const objetivos = joinTopValues(approvedPatterns, 'objetivo_comercial');
  const hooks = joinTopValues(approvedPatterns, 'hook_type');
  const narrativas = joinTopValues(approvedPatterns, 'estrutura_narrativa');
  const ctas = joinTopValues(approvedPatterns, 'tipo_cta');
  const tons = joinTopValues(approvedPatterns, 'tom_emocional');

  return [
    `Padroes aprovados para ${segmentos} com foco em ${objetivos}`,
    `indicam hooks de ${hooks}, narrativas de ${narrativas}, tom ${tons} e CTAs como ${ctas}.`
  ].join(' ');
}

function buildRankedSuggestions(patterns, field) {
  const counts = new Map();

  for (const pattern of patterns || []) {
    if (!pattern || pattern.type !== 'padrao_locucao' || pattern.status !== 'approved' || !pattern[field]) {
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
    })
    .map(([value, count]) => ({
      value,
      count
    }));
}

function joinTopValues(patterns, field) {
  const suggestions = buildRankedSuggestions(patterns, field).slice(0, 3).map((item) => item.value);
  return suggestions.length ? suggestions.join(', ') : 'sem evidencias suficientes';
}

function toSourcePattern(pattern) {
  return {
    filename: pattern.filename || '',
    titulo: pattern.titulo || '',
    segmento: pattern.segmento || '',
    objetivo_comercial: pattern.objetivo_comercial || '',
    hook_type: pattern.hook_type || '',
    estrutura_narrativa: pattern.estrutura_narrativa || '',
    tipo_cta: pattern.tipo_cta || '',
    tom_emocional: pattern.tom_emocional || ''
  };
}

module.exports = {
  buildCTASuggestions,
  buildHookSuggestions,
  buildNarrativeSuggestions,
  buildStrategicSummary,
  buildVisualDirectionSuggestions,
  composeContentDirection
};
