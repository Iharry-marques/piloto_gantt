/**
 * @file uiComponents.js
 * @description Componentes de UI reutilizáveis para o Dashboard de Tarefas
 * @project Dashboard de Tarefas - SUNO
 */

/**
 * Obtém um elemento pelo ID
 * @param {string} id - ID do elemento
 * @returns {HTMLElement} Elemento encontrado ou null
 */
export const getEl = (id) => document.getElementById(id);

/**
 * Exibe ou oculta indicador de carregamento
 * @param {HTMLElement} container - Elemento HTML onde mostrar o loading
 * @param {boolean} mostrar - Se true, mostra o loading; se false, limpa o container
 */
export function mostrarLoading(container, mostrar) {
  if (!container) return;

  if (mostrar) {
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="mt-3">Carregando dados...</p>
      </div>
    `;
  }
}

/**
 * Exibe uma notificação toast
 * @param {string} titulo - Título da notificação
 * @param {string} mensagem - Texto da mensagem
 * @param {string} tipo - Tipo da notificação: "info", "success", "warning" ou "error"
 */
export function mostrarNotificacao(titulo, mensagem, tipo = "info") {
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

/**
 * Cria um modal dinâmico
 * @param {string} titulo - Título do modal
 * @param {string} conteudo - Conteúdo HTML do corpo do modal
 * @param {Function} onClose - Callback opcional ao fechar o modal
 * @returns {HTMLElement} Elemento do modal criado
 */
export function criarModal(titulo, conteudo, onClose = null) {
  const modal = document.createElement('div');
  modal.className = 'modal fade show';
  modal.style.display = 'block';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">${titulo}</h5>
          <button type="button" class="btn-close" data-action="fechar"></button>
        </div>
        <div class="modal-body">${conteudo}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="fechar">Fechar</button>
        </div>
      </div>
    </div>`;
  
  document.body.appendChild(modal);
  
  // Configurar eventos de fechamento
  const fecharModal = () => {
    modal.remove();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };
  
  modal.querySelectorAll('[data-action="fechar"]').forEach(btn => {
    btn.addEventListener('click', fecharModal);
  });
  
  return modal;
}

/**
 * Cria um alerta na página
 * @param {string} mensagem - Mensagem do alerta
 * @param {string} tipo - Tipo do alerta: "info", "success", "warning" ou "error"
 * @param {HTMLElement} container - Container onde o alerta será inserido
 * @returns {HTMLElement} Elemento do alerta criado
 */
export function criarAlerta(mensagem, tipo = "info", container = document.body) {
  const tipoClasse = tipo === "error" ? "danger" : 
                    tipo === "success" ? "success" :
                    tipo === "warning" ? "warning" : "info";
  
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipoClasse} alert-dismissible fade show`;
  alerta.innerHTML = `
    ${mensagem}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
  `;
  
  container.appendChild(alerta);
  
  // Auto-remover após 5 segundos
  setTimeout(() => {
    alerta.classList.remove('show');
    setTimeout(() => alerta.remove(), 150);
  }, 5000);
  
  return alerta;
}

/**
 * Atualiza o ano atual no rodapé
 */
export function atualizarAnoRodape() {
  const anoElement = getEl("ano-atual");
  if (anoElement) {
    anoElement.textContent = new Date().getFullYear();
  }
}
