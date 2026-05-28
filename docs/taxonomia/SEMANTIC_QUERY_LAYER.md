# Semantic Query Layer

A Semantic Query Layer permite consultar padroes de locucao aprovados usando filtros estruturados da taxonomia oficial.

Ela nao faz busca vetorial, nao usa IA e nao interpreta linguagem natural. O objetivo desta fase e permitir perguntas deterministicas sobre o conhecimento ja aprovado.

## Fonte

```text
data/biblioteca_anuncios/padroes_locucao/index.json
```

O index e gerado por:

```bash
node scripts/build_padroes_locucao_index.js
```

## Filtros Permitidos

- `segmento`
- `tipo_dor`
- `hook_type`
- `estrutura_narrativa`
- `tom_emocional`
- `tipo_cta`
- `objetivo_comercial`
- `formato_conteudo`
- `estilo_visual`

Cada filtro aponta para uma taxonomia em `data/taxonomia/`. Valores fora da taxonomia oficial devem ser rejeitados.

## Por Que Validar Contra Taxonomia

Os filtros semanticos precisam ser governados. Sem essa validacao, consultas futuras poderiam depender de nomes soltos, grafias inconsistentes ou categorias inventadas.

A taxonomia oficial garante:

- consistencia de linguagem
- comparabilidade entre padroes
- relatorios confiaveis
- base limpa para analytics
- base futura para dashboard, API e busca semantica

## Exemplos

```bash
node scripts/query_padroes_locucao.js --segmento agro
node scripts/query_padroes_locucao.js --hook_type autoridade
node scripts/query_padroes_locucao.js --segmento hospitalar --tom_emocional tecnico
node scripts/query_padroes_locucao.js --objetivo_comercial gerar_lead --save
```

## Relatórios de Consulta

As consultas tambem podem gerar relatorios em Markdown para leitura humana.

Use quando precisar transformar uma query estruturada em material de analise, briefing, planejamento ou revisao estrategica.

Exemplos:

```bash
node scripts/query_padroes_locucao.js --segmento agro --report
node scripts/query_padroes_locucao.js --segmento hospitalar --tom_emocional tecnico --report
node scripts/query_padroes_locucao.js --objetivo_comercial gerar_lead --save --report
```

Saida:

```text
reports/semantic_queries/
```

A query JSON mostra o resultado estruturado para scripts e automacoes. O relatorio Markdown mostra a mesma consulta em formato legivel, com filtros aplicados, resumo e detalhes de cada padrao encontrado.

## Batch Reports

Batch Reports geram varios relatorios Markdown de uma vez, sempre a partir dos valores oficiais da taxonomia.

Grupos disponiveis:

- `segmentos`
- `tons_emocionais`
- `objetivos_comerciais`
- `tipos_dor`
- `hooks`

Comandos:

```bash
node scripts/build_semantic_query_batch_reports.js --group segmentos
node scripts/build_semantic_query_batch_reports.js --group tons_emocionais
node scripts/build_semantic_query_batch_reports.js --all
```

Saida:

```text
reports/semantic_queries/batch/{groupName}/
reports/semantic_queries/batch/index.md
```

Um relatorio individual responde uma consulta especifica. O batch cria pacotes de leitura por grupo semantico, incluindo categorias com `total 0`, para deixar lacunas visiveis.

## Coverage Summary

O Coverage Summary consolida os batch reports em um resumo executivo unico.

Saida:

```text
reports/semantic_queries/batch/summary.md
```

Comando:

```bash
node scripts/build_semantic_query_batch_summary.js
```

Diferença entre camadas:

- Relatorio individual: responde uma consulta especifica, como `--segmento agro`.
- Batch reports: geram varios relatorios por grupo semantico.
- Summary executivo: consolida cobertura, vazios, lacunas e recomendacoes deterministicas.

O summary e derivado dos batch reports e de `data/biblioteca_anuncios/padroes_locucao/index.json`. Ele nao usa IA, embeddings ou interpretacao livre.

## Knowledge Gap Backlog

O Knowledge Gap Backlog transforma lacunas de cobertura em itens acionaveis.

Saida:

```text
reports/semantic_queries/knowledge_gap_backlog.md
```

Comando:

```bash
node scripts/build_semantic_knowledge_gap_backlog.js
```

Coverage mostra o que esta coberto ou faltando. O backlog organiza essas faltas por prioridade, impacto esperado e acao recomendada.

O Cosmos usa apenas:

- `coverage.segmentos.missing`
- `coverage.tipos_dor.missing`
- `coverage.hooks.missing`
- contagens do `index.json`
- totais do `summary.md`
- IDs oficiais de `data/taxonomia/`

Isso prepara futuras coletas, novos seeds e expansao do Brain sem depender de IA generativa.

## Knowledge Expansion Plan

O Knowledge Expansion Plan transforma o backlog em um plano de expansao semantica.

Saida:

```text
reports/semantic_queries/knowledge_expansion_plan.md
```

Comando:

```bash
node scripts/build_semantic_knowledge_expansion_plan.js
```

Diferença entre camadas:

- Coverage: mostra categorias cobertas e ausentes.
- Backlog: transforma ausencias em itens de prioridade, impacto e acao.
- Expansion Plan: organiza metas minimas, ordem de expansao e proximos seeds recomendados.

O plano continua deterministico. Ele usa apenas backlog, summary, index e taxonomias oficiais para orientar futuras coletas e expansao do Brain.

## Assisted Semantic Extraction

A Assisted Semantic Extraction transforma classificacao manual em sugestao assistida.

Ela nao salva, nao promove e nao aprova nada automaticamente. O sistema apenas analisa uma transcricao curada, procura sinais em mapas de palavras-chave e sugere campos semanticos editaveis.

Diferença entre camadas:

- Classificacao manual: o usuario escolhe todos os campos sozinho.
- Sugestao assistida: o sistema sugere valores com confianca e sinais encontrados.
- Aprovacao humana: o usuario revisa, corrige, salva draft e depois promove manualmente.

Os mapas ficam em:

```text
data/semantic_assists/
```

Cada chave dos mapas precisa existir na taxonomia oficial. Assim, a assistencia nunca inventa IDs e continua governada pela linguagem do Cosmos.

## Futuro

Esta camada prepara:

- filtros no dashboard
- endpoints de consulta
- analytics por cobertura
- recomendacao baseada em regras
- busca semantica com embeddings em fase posterior

Nesta fase, a consulta continua simples, local e deterministica.
