// ===============================
// BIBLIOTECAS DE CONTEÚDO
// ===============================

const ganchosPremium = [
    "Seu uniforme pode parecer muito mais premium antes mesmo da produção.",
    "A apresentação certa muda completamente o valor percebido do uniforme.",
    "Clientes compram primeiro pelo visual, depois pelo produto."
];

const ganchosEmocionais = [
    "Todo uniforme carrega uma história.",
    "Mais que tecido: identidade.",
    "Um uniforme representa pessoas, times e memórias."
];

const ganchosTecnicos = [
    "Tecido, acabamento e modelagem fazem toda diferença.",
    "Nem todo uniforme é produzido da mesma forma.",
    "Os detalhes técnicos mudam completamente o resultado final."
];

const ganchosCinematograficos = [
    "Seu uniforme merece uma apresentação de cinema.",
    "Imagine apresentar sua coleção como um trailer premium.",
    "O visual certo transforma percepção em desejo."
];

const ctasPorObjetivo = {
    vender: "Chame nossa equipe e solicite um orçamento para criar seu uniforme.",
    autoridade: "Acompanhe nosso perfil para entender como um uniforme profissional é criado.",
    qualidade: "Fale com nossa equipe e veja como os detalhes fazem diferença no resultado final.",
    bastidor: "Continue acompanhando para ver mais bastidores da nossa produção.",
    clientes: "Entre em contato e descubra como sua empresa pode ter uniformes mais profissionais."
};

const roteirosPorEstilo = {

    premium: `
        Cena 1 → Mostrar o uniforme lentamente com iluminação forte.<br>
        Cena 2 → Mostrar detalhes premium do tecido e acabamento.<br>
        Cena 3 → Mostrar logo, bordado e personalização.<br>
        Cena 4 → Revelação final cinematográfica do uniforme.
    `,

    emocional: `
        Cena 1 → Mostrar pessoas usando o uniforme.<br>
        Cena 2 → Mostrar momentos emocionais ou de união.<br>
        Cena 3 → Mostrar detalhes que representam identidade.<br>
        Cena 4 → Encerrar com mensagem forte e inspiradora.
    `,

    tecnico: `
        Cena 1 → Explicar tecido e materiais.<br>
        Cena 2 → Mostrar processo de produção.<br>
        Cena 3 → Mostrar qualidade da personalização.<br>
        Cena 4 → Mostrar resultado final pronto.
    `,

    cinematografico: `
        Cena 1 → Ambiente escuro com reveal do uniforme.<br>
        Cena 2 → Close cinematográfico nos detalhes.<br>
        Cena 3 → Movimento de câmera dramático.<br>
        Cena 4 → Shot épico final estilo trailer.
    `,

    direto: `
        Cena 1 → Mostrar o uniforme rapidamente.<br>
        Cena 2 → Mostrar detalhes importantes.<br>
        Cena 3 → Mostrar produção.<br>
        Cena 4 → Mostrar resultado e CTA.
    `
};

const legendasPorObjetivo = {
    vender: "Seu uniforme precisa vender valor antes mesmo de chegar ao cliente. Uma boa apresentação mostra profissionalismo, cuidado e diferencia sua marca da concorrência.",

    autoridade: "Uniforme não é só tecido e estampa. Cada escolha de material, acabamento e apresentação comunica profissionalismo e fortalece a percepção da marca.",

    qualidade: "A qualidade de um uniforme aparece nos detalhes: tecido, costura, acabamento, personalização e na forma como ele é apresentado ao cliente.",

    bastidor: "Por trás de cada uniforme existe processo, cuidado e muita atenção aos detalhes. Cada etapa ajuda a transformar uma ideia em uma peça profissional.",

    clientes: "Sua empresa, time ou grupo merece um uniforme que transmita identidade, organização e profissionalismo desde o primeiro contato."
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

// ===============================
// EVENTOS
// ===============================

generateBtn.addEventListener("click", gerarConteudo);

// ===============================
// FUNÇÃO AUXILIAR
// ===============================

function pegarItemAleatorio(lista) {
    const indiceAleatorio = Math.floor(Math.random() * lista.length);

    return lista[indiceAleatorio];
}

// ===============================
// FUNÇÃO PRINCIPAL
// ===============================

function gerarConteudo() {
    const tipoUniforme = document.getElementById("tipoUniforme").value;
    const objetivo = document.getElementById("objetivo").value;
    const estilo = document.getElementById("estilo").value;
    const tema = document.getElementById("tema").value;

    let gancho = "";

    if (estilo === "premium") {
        gancho = pegarItemAleatorio(ganchosPremium);
    } else if (estilo === "emocional") {
        gancho = pegarItemAleatorio(ganchosEmocionais);
    } else if (estilo === "tecnico") {
        gancho = pegarItemAleatorio(ganchosTecnicos);
    } else if (estilo === "cinematografico") {
        gancho = pegarItemAleatorio(ganchosCinematograficos);
    } else {
        gancho = "Um bom uniforme começa com uma boa apresentação.";
    }

    const cta = ctasPorObjetivo[objetivo];
    const roteiro = roteirosPorEstilo[estilo];
    const legenda = legendasPorObjetivo[objetivo];
    const hashtags = hashtagsPorUniforme[tipoUniforme];

    const resultadoHTML = `
        <div class="result-card">
            <h3>Ideia de Reels</h3>

            <p>
                Conteúdo para uniforme <strong>${tipoUniforme}</strong>
                com foco em <strong>${objetivo}</strong>.
            </p>
        </div>

        <div class="result-card">
            <h3>Tema</h3>

            <p>
                ${tema}
            </p>
        </div>

        <div class="result-card">
            <h3>Gancho</h3>

            <p>
                "${gancho}"
            </p>
        </div>

        <div class="result-card">
            <h3>Roteiro</h3>

            <p>
                ${roteiro}
            </p>
        </div>

        <div class="result-card">
            <h3>Legenda</h3>

            <p>
                ${legenda}
            </p>
        </div>

        <div class="result-card">
            <h3>CTA</h3>

            <p>
                ${cta}
            </p>
        </div>

        <div class="result-card">
            <h3>Hashtags</h3>

            <p>
                ${hashtags}
            </p>
        </div>
        </div>
    `;

    document.getElementById("resultado").innerHTML = resultadoHTML;
}