# Creative Direction Layer

## Objetivo

A Creative Direction Layer traduz conhecimento semantico aprovado do Cosmos Brain em orientacao criativa operacional para o Cosmos Midia.

Ela nao gera campanha automaticamente. Ela transforma padroes aprovados em direcao clara para criacao.

## Fluxo

```text
Brain
-> padroes aprovados
-> Creative Direction Layer
-> direcao criativa
-> Cosmos Midia
```

## Diferencas importantes

### Semantica

Semantica e a estrutura do conhecimento:

- segmento
- hook_type
- estrutura_narrativa
- tom_emocional
- tipo_cta
- estilo_visual

### Estrategia

Estrategia e a leitura operacional do que esses campos indicam.

Exemplo:

```text
pesca + gerar_lead + autoridade
```

indica que a criacao deve construir confianca antes de vender.

### Direcao criativa

Direcao criativa e a traducao para linguagem de criacao:

```text
Abra posicionando autoridade.
Mostre detalhes reais do produto.
Finalize levando para consultores via WhatsApp.
```

## Regras

- Usar apenas approved patterns.
- Preservar sourcePatterns.
- Nao usar OpenAI API.
- Nao usar embeddings.
- Nao inventar estrategia sem base.
- Manter o Brain invisivel para o usuario final.

## Modulos

```text
midia/creativeTranslations.js
midia/creativeDirector.js
```

`creativeTranslations.js` traduz IDs semanticos para linguagem humana.

`creativeDirector.js` monta direcoes para:

- video
- post
- campanha

## Papel no produto

O Brain armazena conhecimento.

A Creative Direction Layer traduz conhecimento em orientacao.

O Cosmos Midia transforma essa orientacao em experiencia criativa.
