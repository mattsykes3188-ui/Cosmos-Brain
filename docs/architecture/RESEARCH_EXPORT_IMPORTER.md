# Research Export Importer

## Objetivo

O Research Export Importer cria a ponte governada entre Cosmos Research e Cosmos Brain.

Cosmos Research produz exports estruturados a partir de:

- Radar de Mercado
- Analise de Perfil/Post
- Analise de Locucao
- Analise Visual
- Pesquisa Aprofundada

Esses arquivos nao entram diretamente no Brain. Eles passam por staging, validacao, normalizacao, deduplicacao e indexacao.

## Fluxo

```text
research_exports/
-> research_staging/
-> validacao
-> normalizacao
-> research_imported/ ou research_rejected/
-> data/research_library/
-> index
-> consumo futuro pelo Midia
```

## Governanca

Arquivos sao rejeitados quando:

- JSON e invalido
- `type` esta ausente ou nao e suportado
- `status` nao e `draft` ou `approved`
- titulo ou insight estao ausentes
- taxonomia declarada e invalida
- duplicidade e detectada

## Biblioteca oficial

Os itens normalizados ficam em:

```text
data/research_library/
```

Tipos suportados:

- `market_signal`
- `creative_reference`
- `visual_pattern`
- `profile_analysis`
- `padrao_locucao`
- `positioning_pattern`
- `campaign_reference`

Cada tipo separa:

```text
approved/
draft/
```

## Consumo

O indice principal:

```text
data/research_library/index.json
```

expoe apenas itens `approved`. Drafts ficam em:

```text
data/research_library/drafts_index.json
```

Assim o Cosmos Midia pode consumir conhecimento aprovado sem tocar em drafts ou exports brutos.

## Scripts

Importar exports:

```bash
node scripts/import_research_exports.js
```

Reconstruir indices:

```bash
node scripts/build_research_indexes.js
```

Relatorio:

```text
reports/research_import_report.md
```

## Limites

Esta camada nao faz scraping, nao usa IA externa, nao cria embeddings e nao sincroniza com cloud. Ela e uma ponte local de importacao governada.
