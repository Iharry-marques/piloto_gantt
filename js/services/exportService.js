/**
 * @file exportService.js
 * @description Serviço para exportação de dados para CSV
 * @project Dashboard de Tarefas - SUNO
 */

/**
 * Exporta dados para CSV
 * @param {Array} dados - Dados a serem exportados
 * @param {Array} headers - Cabeçalhos do CSV
 * @param {Function} formatarLinha - Função para formatar cada linha
 * @param {string} nomeArquivo - Nome do arquivo a ser gerado
 */
export function exportarParaCSV(dados, headers, formatarLinha, nomeArquivo = 'dados') {
  if (!dados || dados.length === 0) {
    mostrarNotificacao("Exportação", "Não há dados para exportar.", "warning");
    return;
  }

  const linhas = dados.map(formatarLinha);

  const csvContent = [
    headers.join(","),
    ...linhas.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `${nomeArquivo}_${moment().format("YYYY-MM-DD")}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  mostrarNotificacao(
    "Exportação",
    "Arquivo CSV gerado com sucesso!",
    "success"
  );
}

/**
 * Formata dados de tarefas para exportação CSV
 * @param {Array} dados - Dados de tarefas
 * @returns {Array} - Dados formatados para CSV
 */
export function formatarTarefasParaCSV(dados) {
  const headers = [
    "Cliente",
    "Projeto",
    "Tarefa",
    "Tipo",
    "Data Início",
    "Data Fim",
    "Responsável",
    "Grupo",
    "Subgrupo",
    "Prioridade",
    "Status",
  ];

  const formatarLinha = (item) => {
    // Extrair subgrupo do caminho completo
    let subgrupo = "";
    if (item.TaskOwnerFullPath) {
      const partes = item.TaskOwnerFullPath.split("/").map((p) => p.trim());
      if (partes.length > 1) {
        subgrupo = partes.slice(1).join(" / ");
      }
    }

    return [
      item.client || "N/A",
      item.project || "N/A",
      item.name || "Sem título",
      item.tipo || "Tarefa",
      item.start ? moment(item.start).format("DD/MM/YYYY") : "N/A",
      item.end ? moment(item.end).format("DD/MM/YYYY") : "N/A",
      item.responsible || "N/A",
      item.TaskOwnerGroup || "N/A",
      subgrupo || "N/A",
      item.Priority || "N/A",
      item.PipelineStepTitle || "N/A",
    ];
  };

  return {
    headers,
    formatarLinha,
  };
}

/**
 * Formata dados de projetos para exportação CSV
 * @param {Array} dados - Dados de projetos
 * @returns {Array} - Dados formatados para CSV
 */
export function formatarProjetosParaCSV(dados) {
  const headers = [
    "Cliente",
    "Projeto",
    "Data Início",
    "Data Fim",
    "Responsáveis",
    "Equipes",
    "Status",
    "Progresso",
    "Prioridade",
    "Qtd. Tarefas",
  ];

  const formatarLinha = (item) => {
    return [
      item.client || "N/A",
      item.name || "Sem título",
      item.start ? moment(item.start).format("DD/MM/YYYY") : "N/A",
      item.end ? moment(item.end).format("DD/MM/YYYY") : "N/A",
      item.responsibles ? item.responsibles.join(", ") : "N/A",
      item.groups ? item.groups.join(", ") : "N/A",
      item.status || "N/A",
      `${item.progress || 0}%`,
      item.priority || "N/A",
      item.tasks ? item.tasks.length : 0,
    ];
  };

  return {
    headers,
    formatarLinha,
  };
}

/**
 * Exibe uma notificação toast
 * @param {string} titulo - Título da notificação
 * @param {string} mensagem - Texto da mensagem
 * @param {string} tipo - Tipo da notificação: "info", "success", "warning" ou "error"
 */
function mostrarNotificacao(titulo, mensagem, tipo = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    container.style.zIndex = "1050";
    document.body.appendChild(container);
  }

  const toastId = `toast-${Date.now()}`;
  const html = `
    <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header ${tipo === "error" ? "bg-danger text-white" :
        tipo === "success" ? "bg-success text-white" :
        tipo === "warning" ? "bg-warning" :
        "bg-info text-white"}">
        <strong class="me-auto">${titulo}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">${mensagem}</div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", html);
  const toastElement = document.getElementById(toastId);
  new bootstrap.Toast(toastElement, { delay: 5000 }).show();

  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}
