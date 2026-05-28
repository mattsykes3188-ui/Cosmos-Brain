# Research Documents Structure

Esta camada separa documentos humanos completos de exports estruturados e da biblioteca oficial governada.

## research_documents/

Guarda material humano completo de pesquisa.

Use para:
- relatorios longos de pesquisa profunda
- markdowns completos
- PDFs convertidos
- dumps estrategicos
- documentos de analise ainda nao estruturados

Essa pasta nao deve ser consumida diretamente pelo Cosmos Brain ou pelo Cosmos Midia.

## research_documents/raw/

Entrada mais bruta da pesquisa humana.

Aqui ficam documentos completos ainda sem sintese operacional.

## research_documents/processed/

Camada intermediaria.

Aqui ficam resumos humanos, sinteses e materiais tratados antes de virar JSON estruturado.

## research_exports/

Guarda JSONs estruturados prontos para importacao governada.

Esses arquivos sao a fronteira entre Cosmos Research e o importer local.

## research_staging/

Etapa temporaria de importacao.

O importer move arquivos para staging antes de validar e normalizar.

## research_imported/

Guarda exports ja processados com sucesso.

Serve como trilha operacional: o arquivo original estruturado foi consumido e importado.

## research_rejected/

Guarda exports recusados por erro de estrutura, status, taxonomia, duplicidade ou JSON invalido.

Nada rejeitado entra na biblioteca oficial.

## data/research_library/

Biblioteca oficial governada e consumivel pelo Cosmos Midia.

Ela separa conhecimento aprovado de drafts e gera indices para consumo operacional.

```text
data/research_library/
├── approved/
├── draft/
├── indexes/
├── market_signals/
├── creative_references/
├── visual_patterns/
├── profile_analysis/
├── locution_patterns/
└── campaign_references/
```

O Cosmos Midia deve consumir apenas conhecimento aprovado e indexado.

## Fluxo recomendado

```text
documento humano completo
-> research_documents/raw
-> sintese humana
-> research_documents/processed
-> JSON estruturado
-> research_exports
-> staging
-> validacao e normalizacao
-> imported ou rejected
-> data/research_library
```

Esse fluxo preserva governanca: dado bruto, export estruturado e conhecimento oficial ficam separados.
