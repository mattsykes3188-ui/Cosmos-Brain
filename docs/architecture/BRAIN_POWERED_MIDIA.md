# Brain-Powered Midia

## Objetivo

Brain-Powered Midia e a primeira integracao operacional entre o Cosmos Midia e o Cosmos Brain.

O Midia passa a pedir direcao de conteudo ao Brain usando apenas padroes aprovados.

## Como funciona

```text
brief do Midia
-> midia/brainSuggestions.js
-> core/knowledgeReader.js
-> core/contentStrategyComposer.js
-> sugestoes rastreaveis
```

Input minimo:

```json
{
  "segmento": "pesca",
  "objetivo_comercial": "gerar_lead"
}
```

Output:

- hooks sugeridos
- narrativas sugeridas
- CTAs sugeridos
- tons emocionais
- estilos visuais
- resumo estrategico
- sourcePatterns usados

## Regras

- Usar somente `status: approved`.
- Ignorar drafts.
- Nao usar OpenAI API.
- Nao usar embeddings.
- Nao fazer semantic search por linguagem natural.
- Nao criar recommendation engine avancado.

## Rastreabilidade

Toda sugestao precisa apontar para `sourcePatterns`.

Isso garante que o Cosmos Midia nao gere direcao solta: cada recomendacao vem de conhecimento aprovado do Brain.

## Estado atual

Esta fase nao cria frontend definitivo.

Ela prova a integracao operacional com:

```text
midia/brainSuggestions.js
experiments/brain-powered-midia-demo.js
```
