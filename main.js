// ===============================
// COSMOS CONTENT BRAIN
// ===============================

// Estado em memoria. Depois que os JSONs carregam, a interface usa estes arrays.
let bibliotecas = {
    ganchos: [],
    tendencias: [],
    chamadas_acao: []
};

// Fallback interno: se o fetch falhar, a pagina continua funcionando.
// Isso tambem ajuda quando a pessoa abre o HTML por duplo clique (file://).
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
            id: "fallback_gancho_cinematografico_001",
            type: "gancho",
            product: "geral",
            objective: "vender",
            style: "cinematografico",
            emotion: "impacto",
            strength: 4,
            text: "Seu uniforme merece uma apresentacao de cinema.",
            context: "Fallback para conteudos cinematograficos.",
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
        },
        {
            id: "fallback_chamada_acao_qualidade_001",
            type: "chamada_acao",
            product: "geral",
            objective: "qualidade",
            style: "tecnico",
            strength: 5,
            text: "Fale com nossa equipe e veja como os detalhes fazem diferenca no resultado final.",
            context: "Fallback de qualidade.",
            source_type: "fallback"
        },
        {
            id: "fallback_chamada_acao_bastidor_001",
            type: "chamada_acao",
            product: "geral",
            objective: "bastidor",
            style: "emocional",
            strength: 4,
            text: "Continue acompanhando para ver mais bastidores da nossa producao.",
            context: "Fallback de bastidor.",
            source_type: "fallback"
        },
        {
            id: "fallback_chamada_acao_clientes_001",
            type: "chamada_acao",
            product: "geral",
            objective: "clientes",
            style: "direto",
            strength: 4,
            text: "Entre em contato e descubra como sua empresa pode ter uniformes mais profissionais.",
            context: "Fallback para atrair clientes.",
            source_type: "fallback"
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

// ===============================
// CARREGAMENTO DOS JSONS
// ===============================

// Um manifesto e um index.json com a lista dos arquivos daquela biblioteca.
// Usamos manifesto porque frontend puro nao consegue listar uma pasta com fetch.
// Exemplo: primeiro buscamos data/ganchos/index.json; depois buscamos cada arquivo listado ali.
async function carregarBiblioteca(tipo) {
    try {
        const manifesto = await carregarArquivoJson(`data/${tipo}/index.json`);

        if (!Array.isArray(manifesto)) {
            throw new Error(`Manifesto invalido para ${tipo}`);
        }

        const caminhos = manifesto.map((arquivo) => `data/${tipo}/${arquivo}`);
        const itens = await Promise.all(caminhos.map(carregarArquivoJson));

        return itens.filter(Boolean);
    } catch (erro) {
        console.warn(`Falha ao carregar ${tipo}. Usando fallback interno.`, erro);
        return fallbackBibliotecas[tipo] || [];
    }
}

// Funcao pequena e isolada para buscar qualquer JSON.
// Futuramente, este ponto pode trocar fetch de arquivos por uma API/backend.
async function carregarArquivoJson(caminho) {
    const resposta = await fetch(caminho);

    if (!resposta.ok) {
        throw new Error(`Nao foi possivel carregar ${caminho}`);
    }

    return resposta.json();
}

// Carrega ganchos, tendencias e chamadas de acao quando a pagina abre.
async function inicializarBibliotecas() {
    mostrarLoading();
    generateBtn.disabled = true;

    const [ganchos, tendencias, chamadas_acao] = await Promise.all([
        carregarBiblioteca("ganchos"),
        carregarBiblioteca("tendencias"),
        carregarBiblioteca("chamadas_acao")
    ]);

    bibliotecas = { ganchos, tendencias, chamadas_acao };

    generateBtn.disabled = false;
    resultadoEl.innerHTML = "Seu conteudo aparecera aqui...";
}

// ===============================
// SELECAO DE CONTEUDO
// ===============================

// Escolhe um item aleatorio de forma segura.
function pegarItemAleatorio(lista) {
    if (!Array.isArray(lista) || lista.length === 0) {
        return null;
    }

    const indiceAleatorio = Math.floor(Math.random() * lista.length);
    return lista[indiceAleatorio];
}

// Filtra por style, objective, product e type.
// Se nao encontrar combinacao perfeita, relaxa os filtros aos poucos para nao quebrar a UI.
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
            if (campo === "product") return produtoCompativel(item.product, valor);
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

function mostrarLoading() {
    resultadoEl.innerHTML = `
        <div class="result-card">
            <h3>Carregando</h3>
            <p>Preparando bibliotecas de ganchos, tendencias e chamadas de acao...</p>
        </div>
    `;
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
// FUNCAO PRINCIPAL
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

    const resultadoHTML = `
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

    resultadoEl.innerHTML = resultadoHTML;
}

// ===============================
// EVENTOS
// ===============================

generateBtn.addEventListener("click", gerarConteudo);
inicializarBibliotecas();
