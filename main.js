// ===============================
// COSMOS MIDIA - INTELLIGENCE UI
// ===============================

// Estado central da interface. O frontend continua simples: HTML, CSS e JS puro.
let bibliotecas = {
    ganchos: [],
    tendencias: [],
    chamadas_acao: [],
    dores_mercado: [],
    biblioteca_anuncios: [],
    estrategia_mateus: []
};

let ultimoLogValidacao = null;

// Um manifesto e um index.json com a lista dos arquivos daquela biblioteca.
// Usamos manifestos porque o navegador nao consegue listar diretorios via fetch.
// Futuramente, este ponto pode trocar arquivos locais por uma API/backend.
const bibliotecasConfig = {
    ganchos: {
        caminho: "data/ganchos",
        label: "Ganchos",
        type: "gancho"
    },
    tendencias: {
        caminho: "data/tendencias",
        label: "Tendencias",
        type: "tendencia"
    },
    chamadas_acao: {
        caminho: "data/chamadas_acao",
        label: "Chamadas de Acao",
        type: "chamada_acao"
    },
    dores_mercado: {
        caminho: "data/dores_mercado",
        label: "Dores de Mercado",
        type: "dor_mercado"
    },
    biblioteca_anuncios: {
        caminho: "data/biblioteca_anuncios",
        label: "Biblioteca de Anuncios",
        type: "insight_anuncio"
    },
    estrategia_mateus: {
        caminho: "data/estrategia_mateus",
        label: "Estrategia Mateus",
        type: "insight_estrategico"
    }
};

// Fallback interno: se fetch falhar, a pagina abre e o gerador segue funcionando.
// Isso tambem cobre o caso de abrir o HTML por duplo clique usando file://.
const fallbackBibliotecas = {
    ganchos: [
        {
            id: "fallback_gancho_premium_001",
            type: "gancho",
            product: "geral",
            objective: "vender",
            style: "premium",
            emotion: "autoridade",
            strength: 5,
            text: "Seu uniforme pode parecer muito mais premium antes mesmo da producao.",
            context: "Fallback para conteudos premium.",
            source_type: "fallback"
        },
        {
            id: "fallback_gancho_emocional_001",
            type: "gancho",
            product: "geral",
            objective: "clientes",
            style: "emocional",
            emotion: "pertencimento",
            strength: 4,
            text: "Todo uniforme carrega uma historia de equipe, identidade e confianca.",
            context: "Fallback para conteudos emocionais.",
            source_type: "fallback"
        },
        {
            id: "fallback_gancho_tecnico_001",
            type: "gancho",
            product: "geral",
            objective: "qualidade",
            style: "tecnico",
            emotion: "seguranca",
            strength: 5,
            text: "Tecido, acabamento e modelagem fazem toda diferenca no resultado final.",
            context: "Fallback para conteudos tecnicos.",
            source_type: "fallback"
        },
        {
            id: "fallback_gancho_direto_001",
            type: "gancho",
            product: "geral",
            objective: "vender",
            style: "direto",
            emotion: "clareza",
            strength: 4,
            text: "Um bom uniforme comeca com uma boa apresentacao.",
            context: "Fallback para conteudos diretos.",
            source_type: "fallback"
        }
    ],
    tendencias: [
        {
            id: "fallback_tendencia_tecnico_001",
            type: "tendencia",
            product: "geral",
            objective: "autoridade",
            style: "tecnico",
            strength: 4,
            text: "Clientes valorizam cada vez mais ver o uniforme antes da producao.",
            context: "Fallback sobre aprovacao visual e processo.",
            source_type: "fallback"
        }
    ],
    chamadas_acao: [
        {
            id: "fallback_chamada_acao_vender_001",
            type: "chamada_acao",
            product: "geral",
            objective: "vender",
            style: "direto",
            strength: 4,
            text: "Chame nossa equipe e solicite um orcamento para criar seu uniforme.",
            context: "Fallback comercial.",
            source_type: "fallback"
        },
        {
            id: "fallback_chamada_acao_autoridade_001",
            type: "chamada_acao",
            product: "geral",
            objective: "autoridade",
            style: "tecnico",
            strength: 4,
            text: "Acompanhe nosso perfil para entender como um uniforme profissional e criado.",
            context: "Fallback de autoridade.",
            source_type: "fallback"
        }
    ],
    dores_mercado: [
        {
            id: "fallback_dor_mercado_001",
            type: "dor_mercado",
            product: "geral",
            objective: "autoridade",
            style: "direto",
            strength: 4,
            text: "Compradores de uniformes sofrem quando nao conseguem visualizar o resultado final antes do pedido.",
            context: "Fallback para leitura de dor do mercado.",
            source_type: "fallback"
        }
    ],
    biblioteca_anuncios: [
        {
            id: "fallback_insight_anuncio_001",
            type: "insight_anuncio",
            source: "fallback",
            marca: "Fabrica de uniformes",
            produto: "uniforme corporativo",
            promessa: "entrega rapida com atendimento direto",
            dor_principal: "cliente precisa de uniforme sem atrasar a operacao",
            formato: "anuncio estatico",
            estilo_visual: "direto e comercial",
            estrutura_copy: "dor, promessa, prova e chamada para orcamento",
            strength: 3,
            text: "Anuncios diretos tendem a funcionar quando conectam urgencia, prazo e clareza de orcamento.",
            context: "Fallback para inteligencia de anuncios.",
            created_at: "2026-05-26"
        }
    ],
    estrategia_mateus: [
        {
            id: "fallback_estrategia_mateus_001",
            type: "insight_estrategico",
            source: "fallback",
            padrao_mercado: "fabricas ainda comunicam uniforme como produto comum",
            interpretacao_estrategica: "a oportunidade esta em vender percepcao de marca, nao apenas tecido",
            angulo_conteudo: "autoridade sobre valor percebido",
            formato_recomendado: "carrossel educativo ou reels de bastidor",
            strength: 5,
            text: "A fabrica que educa o cliente sobre valor percebido sai da briga por preco.",
            context: "Fallback para direcao estrategica.",
            created_at: "2026-05-26"
        }
    ]
};

const roteirosPorEstilo = {
    premium: `
        Cena 1 -> Mostrar o uniforme lentamente com iluminacao forte.<br>
        Cena 2 -> Mostrar detalhes premium do tecido e acabamento.<br>
        Cena 3 -> Mostrar logo, bordado e personalizacao.<br>
        Cena 4 -> Revelacao final cinematografica do uniforme.
    `,
    emocional: `
        Cena 1 -> Mostrar pessoas usando o uniforme.<br>
        Cena 2 -> Mostrar momentos de uniao ou rotina real da equipe.<br>
        Cena 3 -> Mostrar detalhes que representam identidade.<br>
        Cena 4 -> Encerrar com uma mensagem forte e humana.
    `,
    tecnico: `
        Cena 1 -> Explicar tecido e materiais.<br>
        Cena 2 -> Mostrar processo de producao.<br>
        Cena 3 -> Mostrar qualidade da personalizacao.<br>
        Cena 4 -> Mostrar resultado final pronto.
    `,
    cinematografico: `
        Cena 1 -> Ambiente escuro com reveal do uniforme.<br>
        Cena 2 -> Close cinematografico nos detalhes.<br>
        Cena 3 -> Movimento de camera dramatico.<br>
        Cena 4 -> Shot final com a equipe ou a peca em destaque.
    `,
    direto: `
        Cena 1 -> Mostrar o uniforme rapidamente.<br>
        Cena 2 -> Mostrar detalhes importantes.<br>
        Cena 3 -> Mostrar producao.<br>
        Cena 4 -> Mostrar resultado e chamada de acao.
    `
};

const legendasPorObjetivo = {
    vender: "Seu uniforme precisa vender valor antes mesmo de chegar ao cliente. Uma boa apresentacao mostra profissionalismo, cuidado e diferencia sua marca da concorrencia.",
    autoridade: "Uniforme nao e so tecido e estampa. Cada escolha de material, acabamento e apresentacao comunica profissionalismo e fortalece a percepcao da marca.",
    qualidade: "A qualidade de um uniforme aparece nos detalhes: tecido, costura, acabamento, personalizacao e na forma como ele e apresentado ao cliente.",
    bastidor: "Por tras de cada uniforme existe processo, cuidado e muita atencao aos detalhes. Cada etapa ajuda a transformar uma ideia em uma peca profissional.",
    clientes: "Sua empresa, time ou grupo merece um uniforme que transmita identidade, organizacao e profissionalismo desde o primeiro contato."
};

const hashtagsPorUniforme = {
    esportivo: "#uniformeesportivo #timepersonalizado #camisadetime #sublimacao #fabricadeuniformes",
    pesca: "#camisetadepesca #uniformedepesca #pescaesportiva #dryfit #fabricadeuniformes",
    social: "#camisasocialpersonalizada #uniformesocial #bordado #uniformeprofissional #fabricadeuniformes",
    polo: "#camisapolo #polopersonalizada #uniformeempresarial #bordado #fabricadeuniformes",
    empresa: "#uniformeempresarial #uniformeprofissional #camisapersonalizada #identidadevisual #fabricadeuniformes",
    comitiva: "#comitiva #camisetadecomitiva #uniformepersonalizado #bordado #dtf"
};

// ===============================
// ELEMENTOS DO HTML
// ===============================

const generateBtn = document.getElementById("generateBtn");
const resultadoEl = document.getElementById("resultado");
const generatorStatusEl = document.getElementById("generatorStatus");
const loadingBadgeEl = document.getElementById("loadingBadge");
const dataAtualEl = document.getElementById("dataAtual");

// ===============================
// CARREGAMENTO DOS JSONS
// ===============================

async function carregarArquivoJson(caminho) {
    const resposta = await fetch(caminho);

    if (!resposta.ok) {
        throw new Error(`Nao foi possivel carregar ${caminho}`);
    }

    return resposta.json();
}

async function carregarBiblioteca(tipo) {
    const config = bibliotecasConfig[tipo];

    if (!config) {
        return [];
    }

    try {
        const manifesto = await carregarArquivoJson(`${config.caminho}/index.json`);

        if (!Array.isArray(manifesto)) {
            throw new Error(`Manifesto invalido para ${tipo}`);
        }

        const caminhos = manifesto.map((arquivo) => `${config.caminho}/${arquivo}`);
        const itens = await Promise.all(caminhos.map(carregarArquivoJson));

        return itens.filter(Boolean);
    } catch (erro) {
        return fallbackBibliotecas[tipo] || [];
    }
}

async function carregarTodasBibliotecas() {
    const tipos = Object.keys(bibliotecasConfig);
    const resultados = await Promise.all(tipos.map((tipo) => carregarBiblioteca(tipo)));

    return tipos.reduce((acumulador, tipo, indice) => {
        acumulador[tipo] = resultados[indice];
        return acumulador;
    }, {});
}

async function carregarUltimoLogValidacao() {
    const hoje = formatarDataArquivo(new Date());
    const caminho = `logs/push_safety/push_validation_${hoje}.json`;

    try {
        ultimoLogValidacao = await carregarArquivoJson(caminho);
    } catch (erro) {
        ultimoLogValidacao = null;
    }
}

async function inicializarBibliotecas() {
    mostrarDataAtual();
    mostrarLoading();
    renderDashboard();

    if (generateBtn) {
        generateBtn.disabled = true;
    }

    const [dados, log] = await Promise.all([
        carregarTodasBibliotecas(),
        carregarUltimoLogValidacao()
    ]);

    bibliotecas = dados;

    if (generateBtn) {
        generateBtn.disabled = false;
    }

    if (loadingBadgeEl) {
        loadingBadgeEl.textContent = "Brain ativo";
        loadingBadgeEl.classList.add("success");
    }

    renderDashboard();
    renderTimeline();
    renderInsightsRecentes();
    renderGenerator();
    renderSecoesDeBiblioteca();
    renderLogs(log);
}

// ===============================
// RENDERIZACAO DA CENTRAL
// ===============================

function renderDashboard() {
    const dashboardCardsEl = document.getElementById("dashboardCards");

    if (!dashboardCardsEl) {
        return;
    }

    const contagens = contarItensPorTipo();
    const forcaTendencias = calcularForcaMedia(bibliotecas.tendencias);
    const forcaEstrategia = calcularForcaMedia(bibliotecas.estrategia_mateus);
    const statusLog = ultimoLogValidacao && ultimoLogValidacao.success ? "Aprovado" : "Pendente";

    dashboardCardsEl.innerHTML = [
        criarMetricCard("Tendencias detectadas", contagens.tendencias, `Forca media ${forcaTendencias}`),
        criarMetricCard("Dores de mercado", contagens.dores_mercado, "Leituras para posicionamento e pauta"),
        criarMetricCard("Ganchos disponiveis", contagens.ganchos, "Entradas criativas para Reels e posts"),
        criarMetricCard("Insights de anuncios", contagens.biblioteca_anuncios, "Padroes competitivos catalogados"),
        criarMetricCard("Insights estrategicos", contagens.estrategia_mateus, `Forca media ${forcaEstrategia}`),
        criarMetricCard("Ultimo log", statusLog, ultimoLogValidacao ? "Validacao local encontrada" : "Sem log servido para a data atual")
    ].join("");
}

function renderTimeline() {
    const timelineListEl = document.getElementById("timelineList");

    if (!timelineListEl) {
        return;
    }

    const eventos = [
        criarEvento("Nova tendencia adicionada", pegarItensRecentes(bibliotecas.tendencias, 1)[0]),
        criarEvento("Nova dor detectada", pegarItensRecentes(bibliotecas.dores_mercado, 1)[0]),
        criarEvento("Gancho gerado", pegarItensRecentes(bibliotecas.ganchos, 1)[0]),
        criarEvento("Insight de anuncio criado", pegarItensRecentes(bibliotecas.biblioteca_anuncios, 1)[0]),
        criarEvento("Insight estrategico criado", pegarItensRecentes(bibliotecas.estrategia_mateus, 1)[0])
    ];

    timelineListEl.innerHTML = eventos.map((evento) => `
        <article class="timeline-item">
            <strong>${escaparHtml(evento.titulo)}</strong>
            <p>${escaparHtml(evento.texto)}</p>
        </article>
    `).join("");
}

function renderInsightsRecentes() {
    const recentInsightsEl = document.getElementById("recentInsights");

    if (!recentInsightsEl) {
        return;
    }

    const itens = [
        ...pegarItensRecentes(bibliotecas.tendencias, 2),
        ...pegarItensRecentes(bibliotecas.ganchos, 2),
        ...pegarItensRecentes(bibliotecas.biblioteca_anuncios, 1),
        ...pegarItensRecentes(bibliotecas.estrategia_mateus, 1)
    ].slice(0, 6);

    if (itens.length === 0) {
        recentInsightsEl.innerHTML = criarEmptyState("Nenhum insight carregado ainda.");
        return;
    }

    recentInsightsEl.innerHTML = itens.map((item) => `
        <article class="insight-card">
            <strong>${escaparHtml(rotuloTipo(item.type))}</strong>
            <p>${escaparHtml(item.text)}</p>
            <div class="library-meta">
                ${criarChip(`forca ${item.strength || "-"}`)}
                ${criarChip(item.style || item.formato || item.source || "brain")}
            </div>
        </article>
    `).join("");
}

function renderGenerator() {
    if (resultadoEl) {
        resultadoEl.innerHTML = "Seu conteudo aparecera aqui...";
    }

    if (generatorStatusEl) {
        generatorStatusEl.textContent = "Brain pronto";
    }
}

function renderSecoesDeBiblioteca() {
    renderListaBiblioteca("tendenciasList", bibliotecas.tendencias);
    renderListaBiblioteca("doresList", bibliotecas.dores_mercado);
    renderListaBiblioteca("ganchosList", bibliotecas.ganchos);
    renderListaBiblioteca("chamadasList", bibliotecas.chamadas_acao);
    renderListaBiblioteca("anunciosList", bibliotecas.biblioteca_anuncios);
    renderListaBiblioteca("estrategiaList", bibliotecas.estrategia_mateus);
}

function renderListaBiblioteca(elementId, lista) {
    const elemento = document.getElementById(elementId);

    if (!elemento) {
        return;
    }

    if (!Array.isArray(lista) || lista.length === 0) {
        elemento.innerHTML = criarEmptyState("Ainda nao ha itens reais nesta biblioteca.");
        return;
    }

    elemento.innerHTML = pegarItensRecentes(lista, 12).map((item) => `
        <article class="library-card">
            <strong>${escaparHtml(item.text || item.promessa || item.interpretacao_estrategica)}</strong>
            <p>${escaparHtml(item.context || item.dor_principal || item.padrao_mercado || "Item do Cosmos Brain.")}</p>
            <div class="library-meta">
                ${criarChip(rotuloTipo(item.type))}
                ${criarChip(`forca ${item.strength || "-"}`)}
                ${criarChip(item.product || item.produto || "geral")}
            </div>
        </article>
    `).join("");
}

function renderLogs() {
    const logsPanelEl = document.getElementById("logsPanel");

    if (!logsPanelEl) {
        return;
    }

    if (!ultimoLogValidacao) {
        logsPanelEl.innerHTML = `
            <h3>Validacao local</h3>
            <p>Nenhum log de push safety foi servido para a data atual.</p>
            <p>Quando necessario, rode <strong>node scripts/pre_push_validation.js</strong> antes de commit ou push automatizado.</p>
        `;
        return;
    }

    logsPanelEl.innerHTML = `
        <h3>Validacao local</h3>
        <p>Status: <strong>${ultimoLogValidacao.success ? "aprovado" : "bloqueado"}</strong></p>
        <p>Arquivos verificados: <strong>${ultimoLogValidacao.checked_files || 0}</strong></p>
        <p>Duracao: <strong>${ultimoLogValidacao.duration_ms || 0}ms</strong></p>
    `;
}

function mudarSecao(secao) {
    document.querySelectorAll("[data-section-panel]").forEach((painel) => {
        painel.classList.toggle("active", painel.dataset.sectionPanel === secao);
    });

    document.querySelectorAll(".nav-item").forEach((botao) => {
        botao.classList.toggle("active", botao.dataset.section === secao);
    });
}

// ===============================
// CALCULOS E SELECAO DE CONTEUDO
// ===============================

function contarItensPorTipo() {
    return Object.keys(bibliotecas).reduce((contagens, tipo) => {
        contagens[tipo] = Array.isArray(bibliotecas[tipo]) ? bibliotecas[tipo].length : 0;
        return contagens;
    }, {});
}

function calcularForcaMedia(lista) {
    if (!Array.isArray(lista) || lista.length === 0) {
        return "-";
    }

    const itensComForca = lista.filter((item) => Number.isFinite(Number(item.strength)));

    if (itensComForca.length === 0) {
        return "-";
    }

    const soma = itensComForca.reduce((total, item) => total + Number(item.strength), 0);
    return (soma / itensComForca.length).toFixed(1);
}

function pegarItensRecentes(lista, limite = 4) {
    if (!Array.isArray(lista)) {
        return [];
    }

    return [...lista]
        .sort((a, b) => extrairTempoItem(b) - extrairTempoItem(a))
        .slice(0, limite);
}

function extrairTempoItem(item) {
    const dataTexto = item.created_at || item.processed_at || extrairDataDoId(item.id);
    const tempo = Date.parse(dataTexto);
    return Number.isFinite(tempo) ? tempo : 0;
}

function extrairDataDoId(id) {
    const match = String(id || "").match(/(\d{8})/);

    if (!match) {
        return "";
    }

    const valor = match[1];
    return `${valor.slice(0, 4)}-${valor.slice(4, 6)}-${valor.slice(6, 8)}`;
}

function pegarItemAleatorio(lista) {
    if (!Array.isArray(lista) || lista.length === 0) {
        return null;
    }

    const indiceAleatorio = Math.floor(Math.random() * lista.length);
    return lista[indiceAleatorio];
}

function escolherItemPorFiltros(lista, filtros) {
    if (!Array.isArray(lista) || lista.length === 0) {
        return null;
    }

    const candidatosPorPrioridade = [
        filtrarItens(lista, filtros),
        filtrarItens(lista, { type: filtros.type, style: filtros.style, objective: filtros.objective }),
        filtrarItens(lista, { type: filtros.type, objective: filtros.objective }),
        filtrarItens(lista, { type: filtros.type, style: filtros.style }),
        filtrarItens(lista, { type: filtros.type }),
        lista
    ];

    const candidatos = candidatosPorPrioridade.find((grupo) => grupo.length > 0);
    return pegarItemAleatorio(candidatos);
}

function filtrarItens(lista, filtros) {
    return lista.filter((item) => {
        return Object.entries(filtros).every(([campo, valor]) => {
            if (!valor) return true;
            if (campo === "product") return produtoCompativel(item.product || item.produto, valor);
            return normalizarTexto(item[campo]) === normalizarTexto(valor);
        });
    });
}

function produtoCompativel(produtoItem, produtoFiltro) {
    const item = normalizarProduto(produtoItem);
    const filtro = normalizarProduto(produtoFiltro);

    return item === filtro || item === "geral" || filtro === "geral";
}

function normalizarProduto(produto) {
    const valor = normalizarTexto(produto);

    const aliases = {
        empresa: "corporativo",
        social: "corporativo",
        comitiva: "corporativo"
    };

    return aliases[valor] || valor;
}

function normalizarTexto(valor) {
    return String(valor || "").trim().toLowerCase();
}

// ===============================
// GERADOR
// ===============================

function gerarConteudo() {
    const tipoUniforme = document.getElementById("tipoUniforme").value;
    const objetivo = document.getElementById("objetivo").value;
    const estilo = document.getElementById("estilo").value;
    const tema = document.getElementById("tema").value.trim();

    const filtrosBase = {
        product: tipoUniforme,
        objective: objetivo,
        style: estilo
    };

    const gancho = escolherItemPorFiltros(bibliotecas.ganchos, {
        ...filtrosBase,
        type: "gancho"
    });

    const tendencia = escolherItemPorFiltros(bibliotecas.tendencias, {
        ...filtrosBase,
        type: "tendencia"
    });

    const chamadaAcao = escolherItemPorFiltros(bibliotecas.chamadas_acao, {
        ...filtrosBase,
        type: "chamada_acao"
    });

    const roteiro = roteirosPorEstilo[estilo] || roteirosPorEstilo.direto;
    const legenda = legendasPorObjetivo[objetivo] || legendasPorObjetivo.vender;
    const hashtags = hashtagsPorUniforme[tipoUniforme] || hashtagsPorUniforme.empresa;
    const temaFinal = tema || "Mostrar um uniforme sendo criado do zero";

    resultadoEl.innerHTML = `
        <div class="result-card">
            <h3>Ideia de Reels</h3>
            <p>
                Conteudo para uniforme <strong>${escaparHtml(tipoUniforme)}</strong>
                com foco em <strong>${escaparHtml(objetivo)}</strong>.
            </p>
        </div>

        <div class="result-card">
            <h3>Tema</h3>
            <p>${escaparHtml(temaFinal)}</p>
        </div>

        <div class="result-card">
            <h3>Gancho</h3>
            <p>"${escaparHtml(gancho ? gancho.text : "Um bom uniforme comeca com uma boa apresentacao.")}"</p>
        </div>

        <div class="result-card">
            <h3>Tendencia</h3>
            <p>${escaparHtml(tendencia ? tendencia.text : "Clientes valorizam cada vez mais ver o uniforme antes da producao.")}</p>
        </div>

        <div class="result-card">
            <h3>Roteiro</h3>
            <p>${roteiro}</p>
        </div>

        <div class="result-card">
            <h3>Legenda</h3>
            <p>${escaparHtml(legenda)}</p>
        </div>

        <div class="result-card">
            <h3>Chamada de acao</h3>
            <p>${escaparHtml(chamadaAcao ? chamadaAcao.text : "Chame nossa equipe e solicite um orcamento para seu uniforme.")}</p>
        </div>

        <div class="result-card">
            <h3>Hashtags</h3>
            <p>${escaparHtml(hashtags)}</p>
        </div>
    `;

    if (generatorStatusEl) {
        generatorStatusEl.textContent = "Conteudo gerado";
    }
}

// ===============================
// HELPERS DE UI
// ===============================

function mostrarLoading() {
    if (resultadoEl) {
        resultadoEl.innerHTML = `
            <div class="result-card">
                <h3>Carregando</h3>
                <p>Preparando bibliotecas de ganchos, tendencias, dores e insights...</p>
            </div>
        `;
    }
}

function criarMetricCard(titulo, valor, descricao) {
    return `
        <article class="metric-card">
            <span>${escaparHtml(titulo)}</span>
            <strong>${escaparHtml(valor)}</strong>
            <p>${escaparHtml(descricao)}</p>
        </article>
    `;
}

function criarEvento(titulo, item) {
    return {
        titulo,
        texto: item ? item.text : "Aguardando novos dados desta biblioteca."
    };
}

function criarChip(texto) {
    return `<span class="chip">${escaparHtml(texto)}</span>`;
}

function criarEmptyState(texto) {
    return `<div class="empty-state">${escaparHtml(texto)}</div>`;
}

function rotuloTipo(type) {
    const rotulos = {
        gancho: "Gancho",
        tendencia: "Tendencia",
        chamada_acao: "Chamada de Acao",
        dor_mercado: "Dor de Mercado",
        insight_anuncio: "Insight de Anuncio",
        insight_estrategico: "Insight Estrategico"
    };

    return rotulos[type] || "Item do Brain";
}

function mostrarDataAtual() {
    if (!dataAtualEl) {
        return;
    }

    dataAtualEl.textContent = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatarDataArquivo(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function escaparHtml(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ===============================
// EVENTOS
// ===============================

document.querySelectorAll(".nav-item").forEach((botao) => {
    botao.addEventListener("click", () => mudarSecao(botao.dataset.section));
});

if (generateBtn) {
    generateBtn.addEventListener("click", gerarConteudo);
}

inicializarBibliotecas();
