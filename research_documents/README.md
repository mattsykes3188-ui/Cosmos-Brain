# Research Documents

Esta pasta guarda documentos humanos completos usados como materia-prima do Cosmos Research.

## raw

Use `research_documents/raw/` para relatorios completos, markdowns longos, PDFs convertidos, dumps estrategicos e documentos de pesquisa profunda ainda nao tratados.

Esses arquivos nao entram diretamente no Cosmos Brain.

## processed

Use `research_documents/processed/` para sinteses humanas, resumos intermediarios e versoes tratadas antes de virar JSON estruturado.

Depois dessa etapa, o conhecimento deve ser convertido manualmente para exports em `research_exports/`.

## Fluxo correto

```text
research_documents/raw
-> research_documents/processed
-> research_exports
-> research_staging
-> research_imported ou research_rejected
-> data/research_library
```

O Brain consome somente a biblioteca oficial governada em `data/research_library/`.
