# Cosmos Brain — Contexto do Projeto

## Nicho
Fábricas de uniformes e confecções corporativas (B2B).  
Público-alvo: donos e gestores de empresas que compram uniformes em escala.

## Objetivo
Geração automática de conteúdo para redes sociais, roteiros de vídeo e copy de anúncios,
com base em dados estruturados de dores, tendências, ganchos e chamadas para ação.

---

## Estrutura de Pastas

```
COSMOS MIDIA/
├── schemas/          # Schemas JSON que definem os formatos de cada entidade
├── core/             # Configurações globais, prompts-base e variáveis do projeto
├── data/
│   ├── hooks/        # Ganchos de abertura para vídeos e posts
│   ├── trends/       # Tendências do nicho de uniformes
│   ├── ctas/         # Chamadas para ação (Call to Action)
│   ├── storytelling/ # Arcos narrativos e histórias de marca
│   └── pain_points/  # Dores, objeções e problemas do público
├── agents/           # Definições dos agentes de IA (persona, tarefa, tom)
├── tasks/            # Tarefas agendadas ou executadas pelos agentes
├── schedules/        # Cronogramas de publicação e execução
└── logs/             # Registros de execuções e saídas geradas
```

---

## Padrão de IDs

Todos os registros usam IDs no formato:

```
{TIPO}_{SUBTIPO}_{SEQUENCIAL_4DIGITOS}
```

Exemplos:
- `HOOK_VIDEO_0001`
- `CTA_WHATSAPP_0003`
- `PAIN_PRAZO_0012`
- `TREND_SUSTENTABILIDADE_0002`
- `STORY_FUNDADOR_0001`

Regras:
- Sempre maiúsculo
- Sequencial com 4 dígitos e zero à esquerda
- Sem espaços ou caracteres especiais (apenas `_`)

---

## Formato JSON — Regras Gerais

- Encoding: `UTF-8`
- Indentação: 2 espaços
- Datas no formato `YYYY-MM-DD`
- Arrays nunca nulos — usar `[]` quando vazio
- Strings nunca nulas — usar `""` quando vazio
- Todo arquivo JSON deve ter um campo `_meta` no topo

---

## Campos Obrigatórios por Entidade

### Hook (`data/hooks/`)
```json
{
  "_meta": {
    "id": "HOOK_VIDEO_0001",
    "tipo": "hook",
    "subtipo": "video | carrossel | legenda",
    "criado_em": "YYYY-MM-DD",
    "status": "ativo | rascunho | arquivado"
  },
  "texto": "",
  "emocao_alvo": "",
  "formato_recomendado": "",
  "tags": []
}
```

### CTA (`data/ctas/`)
```json
{
  "_meta": {
    "id": "CTA_WHATSAPP_0001",
    "tipo": "cta",
    "subtipo": "whatsapp | link | comentario | dm",
    "criado_em": "YYYY-MM-DD",
    "status": "ativo | rascunho | arquivado"
  },
  "texto": "",
  "objetivo": "",
  "canal": "",
  "tags": []
}
```

### Pain Point (`data/pain_points/`)
```json
{
  "_meta": {
    "id": "PAIN_PRAZO_0001",
    "tipo": "pain_point",
    "subtipo": "prazo | qualidade | preco | fornecedor | logistica",
    "criado_em": "YYYY-MM-DD",
    "status": "ativo | rascunho | arquivado"
  },
  "descricao": "",
  "intensidade": "alta | media | baixa",
  "segmento_afetado": [],
  "solucao_sugerida": "",
  "tags": []
}
```

### Trend (`data/trends/`)
```json
{
  "_meta": {
    "id": "TREND_SUSTENTABILIDADE_0001",
    "tipo": "trend",
    "subtipo": "mercado | comportamento | tecnologia | regulatorio",
    "criado_em": "YYYY-MM-DD",
    "validade_ate": "YYYY-MM-DD",
    "status": "ativo | rascunho | arquivado"
  },
  "titulo": "",
  "descricao": "",
  "oportunidade": "",
  "fontes": [],
  "tags": []
}
```

### Storytelling (`data/storytelling/`)
```json
{
  "_meta": {
    "id": "STORY_FUNDADOR_0001",
    "tipo": "storytelling",
    "subtipo": "fundador | cliente | bastidor | transformacao",
    "criado_em": "YYYY-MM-DD",
    "status": "ativo | rascunho | arquivado"
  },
  "titulo": "",
  "arco": {
    "situacao": "",
    "conflito": "",
    "virada": "",
    "resolucao": ""
  },
  "personagem": "",
  "moral": "",
  "tags": []
}
```

### Agent (`agents/`)
```json
{
  "_meta": {
    "id": "AGENT_COPYWRITER_0001",
    "tipo": "agent",
    "criado_em": "YYYY-MM-DD",
    "status": "ativo | inativo"
  },
  "nome": "",
  "persona": "",
  "tom": "",
  "objetivo": "",
  "entradas_aceitas": [],
  "saidas_geradas": [],
  "prompt_base": ""
}
```

---

## Nicho — Contexto Específico

**Setor:** Uniformes corporativos, EPIs, camisetas bordadas, aventais, jalecos.  
**Dores comuns do cliente:**
- Prazo de entrega atrasado
- Qualidade inconsistente entre lotes
- Fornecedor sumindo após o pedido
- Preço variável sem previsibilidade
- Dificuldade em padronizar uniformes em múltiplas filiais

**Diferenciais que o conteúdo deve reforçar:**
- Produção própria = controle de qualidade
- Atendimento personalizado
- Prazo cumprido como compromisso
- Amostras antes do pedido
- Parcelamento e NF garantida

**Tom de voz:** Profissional, direto, confiável. Sem exageros. Fala com o gestor, não com o consumidor final.
