/**
 * @file filterComponents.js
 * @description Componentes de filtros reutilizáveis para o Dashboard de Tarefas
 * @project Dashboard de Tarefas - SUNO
 */

import { getEl } from './uiComponents.js';

/**
 * Preenche o select de clientes com base nos dados
 * @param {Array} dados - Dados para extrair clientes
 * @param {string} selectId - ID do elemento select (aceita múltiplos IDs separados por vírgula)
 */
export function preencherSelectClientes(dados, selectId = 'cliente-principal-select') {
  if (!dados || dados.length === 0) return;
  
  // Suporta múltiplos IDs (cliente-select,cliente-principal-select)
  const ids = selectId.split(',').map(id => id.trim());
  
  // Extrair clientes únicos
  const clientes = [...new Set(dados.map(item => item.client).filter(Boolean))].sort();
  
  // Preencher cada select encontrado
  ids.forEach(id => {
    const select = getEl(id);
    if (!select) return;
    
    // Limpar e adicionar opção "Todos"
    select.innerHTML = '<option value="todos">Todos</option>';
    
    // Adicionar clientes
    clientes.forEach(cliente => {
      select.add(new Option(cliente, cliente));
    });
  });
}

/**
 * Preenche o select de grupos com base nos dados
 * @param {Array} dados - Dados para extrair grupos
 * @param {string} selectId - ID do elemento select (aceita múltiplos IDs separados por vírgula)
 */
export function preencherSelectGrupos(dados, selectId = 'grupo-select') {
  if (!dados || dados.length === 0) return;
  
  // Suporta múltiplos IDs (grupo-select,grupo-principal-select)
  const ids = selectId.split(',').map(id => id.trim());
  
  // Lista de grupos principais válidos
  const gruposPrincipais = [
    "Criação",
    "Mídia",
    "Produção",
    "Operações",
    "BI",
    "Estratégia",
  ];
  
  // Preencher cada select encontrado
  ids.forEach(id => {
    const select = getEl(id);
    if (!select) return;
    
    // Limpar e adicionar opção "Todos"
    select.innerHTML = '<option value="todos">Todos</option>';
    
    // Adicionar apenas grupos que existem nos dados
    gruposPrincipais.forEach(grupo => {
      if (dados.some(item => item.TaskOwnerGroup === grupo)) {
        select.add(new Option(grupo, grupo));
      }
    });
  });
}

/**
 * Preenche o select de subgrupos com base no grupo selecionado
 * @param {Array} dados - Dados para extrair subgrupos
 * @param {string} grupoSelecionado - Grupo selecionado
 * @param {string} selectId - ID do elemento select
 */
export function preencherSelectSubgrupos(dados, grupoSelecionado, selectId = 'subgrupo-select') {
  const subgrupoSelect = getEl(selectId);
  if (!subgrupoSelect) return;

  // Limpar e adicionar a opção "Todos"
  subgrupoSelect.innerHTML = '<option value="todos">Todos</option>';

  // Se "todos" estiver selecionado, não mostrar subgrupos
  if (grupoSelecionado === "todos") {
    return;
  }

  // Filtrar tarefas pelo grupo selecionado
  const tarefasDoGrupo = dados.filter(
    (item) => item.TaskOwnerGroup === grupoSelecionado
  );

  // Coletar todos os caminhos completos únicos para este grupo
  const caminhos = new Set();

  tarefasDoGrupo.forEach((item) => {
    if (item.TaskOwnerFullPath) {
      caminhos.add(item.TaskOwnerFullPath);
    }
  });

  // Extrair subgrupos destes caminhos
  const subgrupos = new Set();
  const membrosDiretos = new Set();

  caminhos.forEach((caminho) => {
    // Ignorar o caso "Ana Luisa Andre" que é tratado como membro direto
    if (caminho === "Ana Luisa Andre") {
      membrosDiretos.add(caminho);
      return;
    }

    const partes = caminho.split("/").map((p) => p.trim());

    // Se o caminho começa com o grupo principal
    if (partes[0] === grupoSelecionado) {
      // Remover o grupo principal para extrair o subgrupo
      const subgrupo = partes.slice(1).join(" / ");
      if (subgrupo) {
        subgrupos.add(subgrupo);
      }
    }
    // Casos especiais sem prefixo de grupo principal
    else if (
      (grupoSelecionado === "Criação" && partes[0] === "Bruno Prosperi") ||
      (grupoSelecionado === "Operações" && partes[0] === "Carol")
    ) {
      // Todo o caminho é considerado subgrupo
      subgrupos.add(caminho);
    }
  });

  // Adicionar subgrupos ao select
  if (subgrupos.size > 0) {
    // Adicionar cabeçalho de subgrupos
    const headerOption = document.createElement("option");
    headerOption.disabled = true;
    headerOption.textContent = "--- Subgrupos ---";
    subgrupoSelect.appendChild(headerOption);

    // Ordenar e adicionar subgrupos
    [...subgrupos].sort().forEach((sub) => {
      subgrupoSelect.add(new Option(sub, sub));
    });
  }

  // Adicionar membros diretos (tarefas atribuídas diretamente a membros sem subgrupo)
  if (membrosDiretos.size > 0) {
    // Adicionar cabeçalho de membros diretos
    const headerOption = document.createElement("option");
    headerOption.disabled = true;
    headerOption.textContent = "--- Membros Diretos ---";
    subgrupoSelect.appendChild(headerOption);

    // Ordenar e adicionar membros diretos
    [...membrosDiretos].sort().forEach((membro) => {
      subgrupoSelect.add(new Option(membro, membro));
    });
  }
}

/**
 * Configura os filtros de período
 * @param {string} selectId - ID do elemento select
 * @param {Function} callback - Função a ser chamada quando o filtro mudar
 */
export function configurarFiltroPeriodo(selectId = 'periodo-select', callback = null) {
  const periodoSelect = getEl(selectId);
  if (!periodoSelect) return;
  
  // Limpar e adicionar opções padrão
  periodoSelect.innerHTML = `
    <option value="30" selected>30 dias</option>
    <option value="90">90 dias</option>
    <option value="180">6 meses</option>
    <option value="365">1 ano</option>
  `;
  
  // Adicionar evento de mudança
  if (callback && typeof callback === 'function') {
    periodoSelect.addEventListener('change', callback);
  }
}

/**
 * Configura os filtros de tipo de tarefa
 * @param {string} tarefasId - ID do checkbox de tarefas
 * @param {string} subtarefasId - ID do checkbox de subtarefas
 * @param {Function} callback - Função a ser chamada quando o filtro mudar
 */
export function configurarFiltroTipoTarefa(tarefasId = 'mostrar-tarefas', subtarefasId = 'mostrar-subtarefas', callback = null) {
  const tarefasCheckbox = getEl(tarefasId);
  const subtarefasCheckbox = getEl(subtarefasId);
  
  if (tarefasCheckbox) {
    tarefasCheckbox.checked = true;
    if (callback) tarefasCheckbox.addEventListener('change', callback);
  }
  
  if (subtarefasCheckbox) {
    subtarefasCheckbox.checked = true;
    if (callback) subtarefasCheckbox.addEventListener('change', callback);
  }
}

/**
 * Obtém os valores atuais dos filtros
 * @param {Object} config - Configuração com IDs dos elementos
 * @returns {Object} Objeto com os valores dos filtros
 */
export function obterValoresFiltros(config = {}) {
  const clienteSelectId = config.clienteSelectId || 'cliente-principal-select';
  const grupoSelectId = config.grupoSelectId || 'grupo-select';
  const subgrupoSelectId = config.subgrupoSelectId || 'subgrupo-select';
  const periodoSelectId = config.periodoSelectId || 'periodo-select';
  const mostrarTarefasId = config.mostrarTarefasId || 'mostrar-tarefas';
  const mostrarSubtarefasId = config.mostrarSubtarefasId || 'mostrar-subtarefas';
  
  // Verificar ambos os possíveis IDs para cliente
  const clienteSelect = getEl(clienteSelectId) || getEl('cliente-select');
  const cliente = clienteSelect?.value || "todos";
  
  // Verificar ambos os possíveis IDs para grupo
  const grupoSelect = getEl(grupoSelectId) || getEl('grupo-principal-select');
  const grupo = grupoSelect?.value || "todos";
  
  const subgrupo = getEl(subgrupoSelectId)?.value || "todos";
  const dias = parseInt(getEl(periodoSelectId)?.value || "30");
  const mostrarTarefas = getEl(mostrarTarefasId)?.checked !== false;
  const mostrarSubtarefas = getEl(mostrarSubtarefasId)?.checked !== false;
  
  return {
    cliente,
    grupo,
    subgrupo,
    dias,
    mostrarTarefas,
    mostrarSubtarefas
  };
}
