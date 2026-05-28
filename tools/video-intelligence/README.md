# Video Intelligence Parser

Ferramenta local para transformar videos curtos em transcricao bruta de locucao para o Cosmos Brain.

Esta fase implementa apenas:

```text
upload manual .mp4
-> ffmpeg local
-> audio .wav
-> Whisper local
-> transcricao_bruta.txt
```

Ela nao faz analise semantica, nao gera `padrao_locucao`, nao chama LLM, nao usa OpenAI API e nao salva nada no Brain.

## Por que existe

O objetivo futuro e aprender padroes de locucao de videos curtos:

- estrutura de fala
- ordem de persuasao
- tipo de gancho
- promessa
- objecao atacada
- ritmo
- tom
- CTA

O objetivo nao e copiar roteiros ou reutilizar transcricoes literais como conteudo final.

## Por que nao baixa videos automaticamente

Esta ferramenta nao implementa downloader, scraping ou captura automatica de Instagram, TikTok ou Facebook.

A entrada inicial e upload manual de um arquivo `.mp4`, mantendo o fluxo local, auditavel e mais seguro.

## Dependencias locais

Tudo roda localmente/offline depois que as dependencias estiverem instaladas.

Verifique Python:

```bash
python --version
```

Verifique ffmpeg:

```bash
ffmpeg -version
```

Instale Whisper local:

```bash
pip install openai-whisper
```

O servidor usa o modelo `tiny` por padrao. Para trocar:

```bash
set WHISPER_MODEL=base
```

No PowerShell:

```powershell
$env:WHISPER_MODEL="base"
```

Se precisar apontar para outro Python:

```powershell
$env:WHISPER_PYTHON="C:\caminho\python.exe"
```

## Whisper Quality Tuning

O upload permite escolher modelo e idioma antes da transcricao.

Modelos disponiveis:

- `tiny`: mais rapido, menor qualidade.
- `base`: rapido, ainda com mais erros.
- `small`: equilibrio recomendado para portugues.
- `medium`: melhor qualidade, mais lento.
- `large`: mais pesado, exige mais maquina.

Idioma:

- `pt`: padrao recomendado para videos em portugues.
- `auto`: deixa o Whisper detectar idioma automaticamente.

Comando manual equivalente:

```bash
python tools/video-intelligence/transcribe.py --audio audio.wav --model small --language pt --output transcricao.txt
```

A primeira execucao de um modelo pode baixar pesos localmente. A curadoria humana continua necessaria, mesmo com modelos maiores.

## Como rodar

```bash
node tools/video-intelligence/server.js
```

## Como acessar

```text
http://localhost:5600
```

## Saidas geradas

- Videos enviados: `tools/video-intelligence/uploads/`
- Audios extraidos: `tools/video-intelligence/audio/`
- Transcricoes brutas: `tools/video-intelligence/transcricoes_brutas/`
- Transcricoes curadas: `tools/video-intelligence/transcricoes_curadas/`

Cada video processado gera um `.wav` com o mesmo nome base e um `.txt` na pasta de transcricoes brutas.

## Curadoria manual

A camada de curadoria prepara o texto para analise semantica futura.

- Transcricao bruta: saida direta do Whisper, literal e sem limpeza.
- Transcricao curada: texto revisado manualmente, limpo, pontuado e mais facil de analisar depois.

Esta etapa nao entende o conteudo, nao classifica, nao gera `padrao_locucao` e nao salva nada no Brain. Ela apenas transforma um `.txt` bruto em outro `.txt` curado.

Exemplo:

```text
transcricoes_brutas/exemplo_transcricao_bruta.txt
-> transcricoes_curadas/exemplo_transcricao_bruta_curada.txt
```

## Endpoints locais

Lista transcricoes brutas:

```text
GET /transcricoes-brutas
```

Le uma transcricao bruta:

```text
GET /transcricao-bruta/:filename
```

Salva uma transcricao curada:

```text
POST /salvar-transcricao-curada
```

Body:

```json
{
  "filename": "exemplo_transcricao_bruta.txt",
  "text": "texto curado manualmente"
}
```

Resposta:

```json
{
  "success": true,
  "curatedFilename": "exemplo_transcricao_bruta_curada.txt"
}
```

## Limitacoes atuais

- Curadoria e manual.
- Nao ha IA de limpeza.
- Nao ha embeddings.
- Nao ha classificacao semantica.
- Nao ha envio automatico para o Cosmos Brain.

## Extracao manual de padrao de locucao

A etapa de extracao manual transforma uma transcricao curada em um arquivo JSON local de `padrao_locucao`.

- Transcricao curada: texto limpo e revisado manualmente.
- Padrao de locucao: estrutura semantica preenchida manualmente com base na taxonomia oficial.

Esta etapa ainda nao usa IA. A classificacao manual protege a qualidade da taxonomia antes de qualquer automacao.

Os arquivos sao salvos em:

```text
tools/video-intelligence/padroes_locucao/
```

Exemplo:

```text
transcricoes_curadas/exemplo_transcricao_bruta_curada.txt
-> padroes_locucao/exemplo_transcricao_bruta_curada_padrao_locucao.json
```

Campos validados contra `data/taxonomia/`:

- segmento
- tipo_dor
- hook_type
- estrutura_narrativa
- tom_emocional
- tipo_cta
- formato_conteudo
- estilo_visual
- objetivo_comercial

Endpoints da extracao manual:

```text
GET /transcricoes-curadas
GET /transcricao-curada/:filename
GET /taxonomias
POST /salvar-padrao-locucao
```

Body de exemplo:

```json
{
  "sourceFilename": "exemplo_transcricao_bruta_curada.txt",
  "titulo": "Exemplo de padrao de locucao",
  "segmento": "agro",
  "tipo_dor": "baixa_percepcao_premium",
  "hook_type": "dor_direta",
  "estrutura_narrativa": "problema_solucao",
  "tom_emocional": "confiavel",
  "tipo_cta": "chamar_whatsapp",
  "formato_conteudo": "reel",
  "estilo_visual": "fabrica_real",
  "objetivo_comercial": "gerar_lead",
  "observacoes": "Padrao extraido manualmente a partir de transcricao curada."
}
```

Para validar:

```bash
node tests/test_manual_pattern_extraction.js
```

## Revisao e promocao de padroes

Nem todo padrao extraido deve virar conhecimento oficial do Brain.

Draft local:

```text
tools/video-intelligence/padroes_locucao/
status: draft
```

Padrao aprovado:

```text
data/biblioteca_anuncios/padroes_locucao/
status: approved
```

O draft nao e apagado depois da promocao. Ele permanece como rastro de trabalho e auditoria local.

Durante a promocao, o sistema:

- valida o JSON minimo do padrao
- valida os campos semanticos contra `data/taxonomia/`
- preserva `source`
- preserva `createdAt` quando existir
- altera `status` para `approved`
- adiciona `approvedAt`
- adiciona `promotedFrom`
- grava uma copia aprovada em `data/biblioteca_anuncios/padroes_locucao/`

Endpoints da promocao:

```text
GET /padroes-locucao-draft
GET /padrao-locucao-draft/:filename
POST /promover-padrao-locucao
```

Body de promocao:

```json
{
  "filename": "exemplo_padrao_locucao.json"
}
```

Resposta:

```json
{
  "success": true,
  "promotedFilename": "exemplo_padrao_locucao.json",
  "destination": "data/biblioteca_anuncios/padroes_locucao/exemplo_padrao_locucao.json"
}
```

Para validar:

```bash
node tests/test_pattern_review_promotion.js
```

## Indice de padroes aprovados

O indice aprovado e um inventario estrategico derivado dos arquivos aprovados em:

```text
data/biblioteca_anuncios/padroes_locucao/
```

Ele e gerado em:

```text
data/biblioteca_anuncios/padroes_locucao/index.json
```

Esse arquivo nao deve ser editado manualmente. Ele pode ser reconstruido a qualquer momento a partir dos padroes com:

```bash
node scripts/build_padroes_locucao_index.js
```

O indice agrega:

- total de padroes aprovados
- contagens por segmento, dor, hook, narrativa, tom, CTA e objetivo
- coverage contra taxonomias oficiais
- lista resumida dos itens aprovados

Esta camada ainda nao faz busca semantica, embeddings, analytics avancado ou recomendacao. Ela apenas organiza o inventario consultavel.

## Relatorio de Cobertura

O relatorio de cobertura e um diagnostico legivel derivado do indice aprovado.

Ele fica em:

```text
reports/padroes_locucao_coverage_report.md
```

O relatorio mostra:

- data de geracao
- total de padroes aprovados
- resumo executivo
- top categorias cobertas
- lacunas de segmentos, dores e hooks

Ele nao deve ser editado manualmente. Para reconstruir:

```bash
node scripts/build_padroes_locucao_coverage_report.js
```

Se ainda nao houver padroes aprovados, o relatorio informa claramente o estado zero e lista as categorias sem cobertura.

## Seed Approved Pattern Dataset

Os seeds aprovados sao os primeiros padroes manuais usados para validar o ciclo completo:

```text
padroes aprovados
-> index.json
-> relatorio de cobertura
-> lacunas estrategicas
```

Eles ficam em:

```text
data/biblioteca_anuncios/padroes_locucao/
```

Esses arquivos nao vieram de videos reais ainda. Eles sao exemplos controlados, aprovados manualmente, para testar indexacao, contagens por taxonomia e diagnostico de cobertura.

Com o tempo, devem ser substituidos ou expandidos por padroes reais extraidos do fluxo de video, curadoria, revisao e promocao.

Para validar os seeds:

```bash
node tests/test_seed_approved_patterns.js
```

## Semantic Query Layer

A camada de query semantica permite consultar os padroes aprovados usando filtros estruturados da taxonomia oficial.

Ela usa como fonte:

```text
data/biblioteca_anuncios/padroes_locucao/index.json
```

Nao e busca vetorial, nao usa IA, nao usa embeddings e nao interpreta linguagem natural. Ela apenas aplica filtros deterministico sobre campos semanticos ja aprovados.

Exemplos:

```bash
node scripts/query_padroes_locucao.js --segmento agro
node scripts/query_padroes_locucao.js --hook_type autoridade
node scripts/query_padroes_locucao.js --segmento hospitalar --tom_emocional tecnico
node scripts/query_padroes_locucao.js --objetivo_comercial gerar_lead --save
```

Filtros aceitos:

- segmento
- tipo_dor
- hook_type
- estrutura_narrativa
- tom_emocional
- tipo_cta
- objetivo_comercial
- formato_conteudo
- estilo_visual

Todos os valores sao validados contra `data/taxonomia/`. Isso prepara o caminho para analytics, dashboard e busca semantica futura sem abrir mao da governanca atual.

### Semantic Query Reports

Consultas semanticas tambem podem gerar Markdown legivel em:

```text
reports/semantic_queries/
```

Exemplo:

```bash
node scripts/query_padroes_locucao.js --segmento agro --report
```

Use `--save --report` quando quiser salvar tanto o JSON estruturado quanto o relatorio Markdown.

### Semantic Query Batch Reports

Relatorios em lote geram pacotes Markdown por grupo semantico:

```bash
node scripts/build_semantic_query_batch_reports.js --group segmentos
node scripts/build_semantic_query_batch_reports.js --all
```

Os arquivos ficam em:

```text
reports/semantic_queries/batch/
```

Cada batch tambem gera um `index.md` com os grupos e caminhos dos relatorios criados.

### Semantic Query Coverage Summary

O resumo executivo consolida os batch reports em:

```text
reports/semantic_queries/batch/summary.md
```

Para gerar:

```bash
node scripts/build_semantic_query_batch_summary.js
```

Ele mostra cobertura geral, cobertura por grupo, principais lacunas e recomendacoes deterministicas baseadas apenas nos dados do index e dos relatorios batch.

### Semantic Knowledge Gap Backlog

O backlog transforma lacunas semanticas em prioridades acionaveis:

```bash
node scripts/build_semantic_knowledge_gap_backlog.js
```

Saida:

```text
reports/semantic_queries/knowledge_gap_backlog.md
```

Ele usa apenas `summary.md`, `index.json` e taxonomias oficiais para sugerir proximos seeds e areas de coleta.

### Knowledge Expansion Plan

O plano de expansao organiza metas minimas, prioridades e proximos seeds:

```bash
node scripts/build_semantic_knowledge_expansion_plan.js
```

Saida:

```text
reports/semantic_queries/knowledge_expansion_plan.md
```

Ele transforma o backlog em uma ordem pratica de expansao semantica, sem IA e sem automacao de coleta.

## Workflow Automation

O fluxo local agora guia o trabalho do upload ate a atualizacao dos relatorios sem remover revisao humana.

Fluxo:

```text
upload .mp4
-> audio .wav
-> transcricao bruta
-> curadoria humana
-> extracao manual de padrao
-> draft local
-> promocao humana para Brain
-> rebuild deterministico de indices e relatorios
```

Endpoint de estado:

```text
GET /workflow-state
```

Retorna uploads, audios, transcricoes brutas, transcricoes curadas, drafts, aprovados e o proximo passo sugerido.

Endpoint de rebuild:

```text
POST /rebuild-semantic-reports
```

Scripts executados:

```text
scripts/build_padroes_locucao_index.js
scripts/build_padroes_locucao_coverage_report.js
scripts/build_semantic_query_batch_reports.js --all
scripts/build_semantic_query_batch_summary.js
scripts/build_semantic_knowledge_gap_backlog.js
scripts/build_semantic_knowledge_expansion_plan.js
```

Depois de promover um draft para o Brain, o servidor tenta rodar o rebuild automaticamente. Se o rebuild falhar, o padrao promovido nao e apagado; o erro volta no retorno para revisao.

A aprovacao humana continua obrigatoria. O sistema apenas reduz atrito operacional.

## Assisted Semantic Extraction

A extracao semantica assistida sugere campos para um padrao de locucao a partir da transcricao curada.

Endpoint:

```text
POST /assist-semantic-extraction
```

Body:

```json
{
  "text": "transcricao curada..."
}
```

Resposta:

```json
{
  "success": true,
  "suggestions": {
    "segmento": {
      "value": "pesca",
      "confidence": 0.92,
      "signals": ["camisa uv", "pesca"]
    }
  }
}
```

Na interface local, use o botao "Sugerir campos automaticamente" na secao de extracao manual. A UI preenche os selects, mostra confianca e sinais encontrados, mas todos os campos continuam editaveis.

O sistema apenas sugere; o humano continua revisando, salvando draft e aprovando.

## Manual GPT Semantic Bridge

Esta ponte permite usar o ChatGPT manualmente, sem API e sem automacao externa.

Fluxo:

```text
transcricao curada
-> gerar prompt no Cosmos
-> copiar prompt
-> colar no ChatGPT
-> copiar JSON de volta
-> validar no Cosmos
-> revisar preview
-> salvar no Brain
```

Endpoints:

```text
POST /manual-gpt/build-prompt
POST /manual-gpt/parse-response
```

O prompt inclui:

- transcricao curada
- campos obrigatorios
- IDs permitidos da taxonomia oficial
- regra para nao inventar IDs
- instrucao para retornar somente JSON

O Cosmos valida o JSON antes de salvar. IDs inexistentes sao rejeitados. O botao "Salvar no Brain" executa o fluxo interno de draft, promocao e rebuild ja existente, mas somente depois do clique humano.

Nao ha uso de OpenAI API nesta fase.

## Simplified UI

A tela principal do Video Intelligence agora mostra apenas o fluxo operacional:

```text
1. Enviar video
2. Revisar transcricao
3. Curadoria com ChatGPT
4. Salvar no Brain
```

Os detalhes tecnicos continuam existindo, mas ficam recolhidos em **Avancado / Tecnico**:

- status completo do workflow
- curadoria manual antiga
- extracao tecnica de padrao
- revisao e promocao manual de drafts
- rebuild manual de indices e relatorios
- listas e JSONs internos

O botao **Salvar no Brain** executa o fluxo interno ja governado:

```text
JSON validado
-> salvar rascunho tecnico
-> promover para Brain
-> rebuild deterministico de inteligencia
```

A governanca nao foi removida. A interface apenas esconde a complexidade operacional para reduzir atrito no uso diario.

## Ultra Simplified Intake UI

A interface principal foi reduzida para tres passos reais de ingestao:

```text
1. Upload video
2. Revisar transcricao
3. Colar JSON + Salvar no Brain
```

O usuario nao precisa lidar com draft, promocao, rebuild, taxonomia completa, listas de arquivos ou relatorios durante o uso normal.

O fluxo interno continua existindo:

```text
JSON do ChatGPT
-> validacao contra taxonomia
-> rascunho tecnico
-> promocao approved
-> rebuild de indices e relatorios
-> Brain atualizado
```

O bloco **Modo tecnico / avancado** preserva os controles antigos para auditoria, manutencao e diagnostico, mas a ingestao diaria fica focada em velocidade.

## Semantic Naming Layer

Novos padroes de locucao deixam de usar o nome bruto do video como nome operacional.

Antes:

```text
WhatsApp-Video-2026-05-26-at-23-27-44_2026...
```

Agora:

```text
pesca_autoridade_demonstracao_produto_001.json
pesca_autoridade_demonstracao_produto_002.json
```

O nome e gerado a partir de campos semanticos do JSON validado:

```text
segmento + hook_type + estrutura_narrativa + objetivo_comercial + sequencia
```

O arquivo original nao e perdido. Ele continua salvo em:

```json
{
  "source": {
    "originalFilename": "WhatsApp-Video-2026-05-26-at-23-27-44_curada.txt"
  }
}
```

Arquivos antigos continuam aceitos e nao sao renomeados retroativamente. A camada apenas melhora a organizacao de novos drafts e novos approved patterns.

## Regras de seguranca

- Nao copiar criativos.
- Nao baixar midia automaticamente.
- Nao usar transcricao literal como conteudo final.
- Usar apenas para extrair padroes de comunicacao, persuasao e locucao nas proximas fases.
- Todo dado que virar inteligencia do Brain deve passar por `processBrainBatch()` e `saveBrainItem()`.

## Futuro

```text
transcricao bruta
-> curadoria
-> normalizacao
-> extracao semantica
-> padrao_locucao
-> processBrainBatch()
```
