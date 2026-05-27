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
