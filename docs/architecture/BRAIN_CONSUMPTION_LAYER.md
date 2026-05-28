# Brain Consumption Layer

## Objetivo

A Brain Consumption Layer permite que produtos consumidores, como o Cosmos Midia, usem conhecimento aprovado do Cosmos Brain sem criar IA fake, embeddings ou recomendacoes autonomas.

Ela responde a uma pergunta simples:

```text
Quais padroes aprovados do Brain servem para este brief?
```

## Separacao de camadas

### Brain ingestion

Entrada de candidatos:

- videos
- transcricoes
- JSONs semanticos
- seeds manuais
- futuros agents

Ingestion nao deve ser tratada como conhecimento oficial.

### Brain governance

Governanca valida e aprova:

- schema
- taxonomia
- rastreabilidade
- status draft/approved
- nomes semanticos
- logs

Somente itens approved viram conhecimento consumivel.

### Brain intelligence

Inteligencia derivada organiza o que ja foi aprovado:

- index
- coverage
- reports
- backlog
- expansion plan

Essa camada diagnostica o Brain, mas nao cria campanha sozinha.

### Brain consumption

Consumo transforma approved patterns em direcao operacional:

- hooks recomendados
- narrativas recomendadas
- CTAs recomendados
- estilos visuais recomendados
- resumo estrategico deterministico
- sourcePatterns rastreaveis

## Regras

- Consumir apenas `status: approved`.
- Nunca consumir drafts.
- Nao usar OpenAI API.
- Nao usar embeddings.
- Nao fazer semantic search por linguagem natural.
- Nao inventar estrategia sem source pattern.

## Cosmos Midia

O Cosmos Midia deve usar esta camada para gerar ideias com base em padroes aprovados do Brain.

Fluxo esperado:

```text
brief do usuario
-> getBestPatternsForBrief()
-> composeContentDirection()
-> ideia/campanha com sourcePatterns
```

O Brain continua sendo a fonte oficial. O Midia vira consumidor operacional.
