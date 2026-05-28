'use strict';

const TRANSLATIONS = {
  segmento: {
    pesca: 'Use contexto real de pesca, produto em uso e sensação de performance ao ar livre.',
    agro: 'Mostre rotina de campo, resistência e organização visual da equipe.',
    esportivo: 'Valorize movimento, energia de equipe e transformação visual.',
    hospitalar: 'Priorize segurança, limpeza visual e confiança técnica.',
    corporativo: 'Posicione profissionalismo, padronização e presença de marca.'
  },
  objetivo_comercial: {
    gerar_lead: 'Conduza a peça para uma conversa comercial simples e direta.',
    converter_whatsapp: 'Leve o público para ação imediata no WhatsApp.',
    vender_premium: 'Aumente percepção de valor antes de falar de preço.',
    aumentar_autoridade: 'Use a peça para demonstrar domínio técnico e experiência.',
    educar_cliente: 'Explique critérios de escolha para reduzir dúvida e insegurança.'
  },
  hook_type: {
    autoridade: 'Abra posicionando liderança, experiência e confiança logo nos primeiros segundos.',
    dor_direta: 'Comece nomeando a dor principal de forma clara e sem rodeio.',
    transformacao: 'Abra mostrando a mudança percebida antes e depois do uniforme.',
    pergunta: 'Comece com uma pergunta que faça o cliente repensar a imagem da equipe.',
    comparativo: 'Abra colocando duas situações lado a lado para deixar o contraste evidente.',
    bastidor: 'Abra prometendo mostrar o processo real por trás do resultado.',
    choque: 'Abra com um contraste forte para quebrar expectativa.',
    curiosidade: 'Abra criando lacuna de informação e vontade de continuar.',
    erro_comum: 'Abra apontando um erro comum que prejudica a percepção do uniforme.',
    promessa_pratica: 'Abra prometendo um ganho prático e aplicável.'
  },
  estrutura_narrativa: {
    demonstracao_produto: 'Mostre detalhes reais do produto em uso, acabamento, tecido e personalização.',
    prova_visual: 'Use evidência visual para comprovar qualidade e percepção premium.',
    problema_solucao: 'Apresente a dor primeiro e mostre o uniforme como resposta prática.',
    autoridade: 'Organize a peça como orientação técnica de quem entende do processo.',
    antes_depois: 'Mostre transformação visual entre situação inicial e resultado final.',
    comparativo: 'Compare opções, materiais ou resultados para educar a decisão.',
    bastidor: 'Revele etapas de criação, produção, acabamento ou conferência.',
    quebra_objecao: 'Responda dúvidas sobre preço, prazo, qualidade ou aprovação.',
    transformacao: 'Mostre a mudança de percepção criada pela uniformização.',
    processo_passo_a_passo: 'Organize o conteúdo em etapas simples e fáceis de seguir.'
  },
  tom_emocional: {
    premium: 'Mantenha tom premium, seguro e aspiracional.',
    confiavel: 'Use linguagem confiável, direta e sem exagero.',
    direto: 'Use linguagem objetiva, comercial e fácil de agir.',
    tecnico: 'Use tom técnico, preciso e educativo.',
    corporativo: 'Use tom profissional, maduro e orientado a marca.',
    esportivo: 'Use energia, movimento e sensação de desempenho.'
  },
  tipo_cta: {
    chamar_whatsapp: 'Finalize levando para consultores via WhatsApp.',
    conhecer_modelos: 'Convide o público a conhecer modelos e possibilidades.',
    pedir_orcamento: 'Feche conduzindo para pedido de orçamento.',
    solicitar_mockup: 'Direcione para solicitar mockup antes do pedido.',
    ver_catalogo: 'Convide para ver catálogo e opções disponíveis.'
  },
  estilo_visual: {
    premium_clean: 'Use visual premium clean, fundo limpo e close nos detalhes.',
    fabrica_real: 'Use cenas reais da fábrica para dar prova e concretude.',
    promocional_popular: 'Use composição clara, comercial e orientada à oferta.',
    esportivo_agressivo: 'Use cortes dinâmicos, contraste e sensação de movimento.',
    corporativo_moderno: 'Use composição moderna, organizada e profissional.',
    institucional: 'Use visual limpo, confiável e institucional.'
  },
  formato_conteudo: {
    reel: 'Estruture em cenas curtas e ritmo rápido.',
    carrossel: 'Organize a ideia em sequência de slides com progressão clara.',
    post_estatico: 'Concentre a mensagem em uma única promessa visual.',
    video_bastidor: 'Mostre processo real e detalhes de produção.'
  }
};

const LABELS = {
  gerar_lead: 'geração de lead',
  converter_whatsapp: 'conversão no WhatsApp',
  vender_premium: 'venda premium',
  aumentar_autoridade: 'autoridade',
  educar_cliente: 'educação do cliente',
  demonstracao_produto: 'demonstração do produto',
  prova_visual: 'prova visual',
  problema_solucao: 'problema e solução',
  autoridade: 'autoridade',
  dor_direta: 'dor direta',
  transformacao: 'transformação',
  pergunta: 'pergunta estratégica',
  comparativo: 'comparativo',
  chamar_whatsapp: 'CTA para WhatsApp',
  conhecer_modelos: 'convite para conhecer modelos',
  premium: 'premium',
  confiavel: 'confiável',
  direto: 'direto',
  tecnico: 'técnico'
};

function translateSemanticValue(field, value) {
  return TRANSLATIONS[field] && TRANSLATIONS[field][value]
    ? TRANSLATIONS[field][value]
    : humanizeSemanticId(value);
}

function labelSemanticValue(value) {
  return LABELS[value] || humanizeSemanticId(value);
}

function translatePattern(pattern = {}) {
  return {
    segmento: translateSemanticValue('segmento', pattern.segmento),
    objetivo_comercial: translateSemanticValue('objetivo_comercial', pattern.objetivo_comercial),
    hook_type: translateSemanticValue('hook_type', pattern.hook_type),
    estrutura_narrativa: translateSemanticValue('estrutura_narrativa', pattern.estrutura_narrativa),
    tom_emocional: translateSemanticValue('tom_emocional', pattern.tom_emocional),
    tipo_cta: translateSemanticValue('tipo_cta', pattern.tipo_cta),
    estilo_visual: translateSemanticValue('estilo_visual', pattern.estilo_visual),
    formato_conteudo: translateSemanticValue('formato_conteudo', pattern.formato_conteudo)
  };
}

function humanizeSemanticId(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .join(' ');
}

module.exports = {
  LABELS,
  TRANSLATIONS,
  humanizeSemanticId,
  labelSemanticValue,
  translatePattern,
  translateSemanticValue
};
