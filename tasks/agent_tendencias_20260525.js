'use strict';

const { saveBrainItem } = require('../core/writer');

const tendencias = [
  {
    type: 'tendencia',
    product: 'corporativo',
    objective: 'autoridade',
    style: 'premium',
    strength: 5,
    text: 'Reels de bastidores: videos de 15 a 30 segundos do processo produtivo geram mais alcance organico no Instagram.',
    context: 'Usar para mostrar corte, costura, acabamento, bordado e controle de qualidade da fabrica.',
    source_type: 'agent_tendencias_20260525',
    sources: ['26 Tendencias do Instagram para 2026 - Rafael Terra'],
    tags: ['reels', 'bastidores', 'instagram', 'producao', 'premium']
  },
  {
    type: 'tendencia',
    product: 'corporativo',
    objective: 'autoridade',
    style: 'tecnico',
    strength: 5,
    text: 'Carrossel educativo LinkedIn: serie tecnica B2B posiciona a fabrica como referencia para gestores de compras.',
    context: 'Usar para posts em carrossel explicando tecido, acabamento, prazo, amostra, lote minimo e reposicao.',
    source_type: 'agent_tendencias_20260525',
    sources: [
      'Tendencias para LinkedIn em 2026 - Digital Sem Igual',
      'Empresas B2B investem em comunicacao premium - Copy House'
    ],
    tags: ['linkedin', 'b2b', 'carrossel', 'compras', 'autoridade']
  },
  {
    type: 'tendencia',
    product: 'geral',
    objective: 'awareness',
    style: 'premium',
    strength: 4,
    text: 'ESG como argumento de compra: empresas com metas ESG exigem provas documentadas de fornecedores sustentaveis.',
    context: 'Usar para conteudos sobre materiais, desperdicio, producao responsavel, documentacao e confianca do fornecedor.',
    source_type: 'agent_tendencias_20260525',
    sources: [
      'Uniformes Corporativos e Sustentabilidade - Uzan Uniformes',
      'Tendencias de uniformes corporativos para 2026 - Alternativa Uniformes'
    ],
    tags: ['esg', 'sustentabilidade', 'documentacao', 'fornecedor', 'premium']
  },
  {
    type: 'tendencia',
    product: 'hospitalar',
    objective: 'autoridade',
    style: 'tecnico',
    strength: 5,
    text: 'Uniformes hospitalares premium: categoria de maior crescimento; decisores buscam laudos tecnicos antes do pedido.',
    context: 'Usar para conteudos sobre tecido, higiene, conforto, padronizacao, ficha tecnica e aprovacao antes da compra.',
    source_type: 'agent_tendencias_20260525',
    sources: ['Tendencias de uniformes corporativos para 2026 - Alternativa Uniformes'],
    tags: ['hospitalar', 'laudo', 'tecnico', 'higiene', 'autoridade']
  },
  {
    type: 'tendencia',
    product: 'corporativo',
    objective: 'engajamento',
    style: 'emocional',
    strength: 4,
    text: 'UGC e prova social: fotos de equipes reais superam conteudo de estudio em engajamento.',
    context: 'Usar para incentivar registros de clientes, antes e depois, depoimentos e equipes usando os uniformes no dia a dia.',
    source_type: 'agent_tendencias_20260525',
    sources: ['26 Tendencias do Instagram para 2026 - Rafael Terra'],
    tags: ['ugc', 'prova-social', 'engajamento', 'clientes', 'equipes']
  },
  {
    type: 'tendencia',
    product: 'corporativo',
    objective: 'awareness',
    style: 'premium',
    strength: 4,
    text: 'Identidade visual B2B premium: paleta neutra e fotografia editorial substituem o catalogo generico.',
    context: 'Usar para orientar conteudos com composicao limpa, close em detalhes, prova de acabamento e percepcao de valor.',
    source_type: 'agent_tendencias_20260525',
    sources: [
      'O Novo Branding Corporativo B2B para 2026 - Avorbi',
      'Empresas B2B investem em comunicacao premium - Copy House'
    ],
    tags: ['branding', 'b2b', 'premium', 'fotografia', 'identidade-visual']
  },
  {
    type: 'tendencia',
    product: 'esportivo',
    objective: 'awareness',
    style: 'emocional',
    strength: 3,
    text: 'Copa do Mundo 2026: design esportivo infiltra o corporativo; janela de oportunidade entre maio e julho.',
    context: 'Usar para conteudos sazonais com camisetas, acoes internas, uniformes de torcida corporativa e campanhas de equipe.',
    source_type: 'agent_tendencias_20260525',
    sources: ['Tendencias de uniformes corporativos para 2026 - Alternativa Uniformes'],
    tags: ['copa-2026', 'esportivo', 'sazonal', 'campanha', 'awareness']
  },
  {
    type: 'tendencia',
    product: 'geral',
    objective: 'engajamento',
    style: 'tecnico',
    strength: 4,
    text: 'Social selling LinkedIn: perfil do socio ou diretor como autoridade gera leads qualificados sem trafego pago.',
    context: 'Usar para conteudos em primeira pessoa mostrando decisao tecnica, criterio de producao, atendimento B2B e cases.',
    source_type: 'agent_tendencias_20260525',
    sources: [
      'Tendencias para LinkedIn em 2026 - Digital Sem Igual',
      'Empresas B2B investem em comunicacao premium - Copy House'
    ],
    tags: ['linkedin', 'social-selling', 'b2b', 'autoridade', 'leads']
  }
];

for (const tendencia of tendencias) {
  console.log(saveBrainItem(tendencia));
}

