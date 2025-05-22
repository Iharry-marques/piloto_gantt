/**
 * @file dashboardView.js
 * @description Visualização principal do dashboard por equipe
 * @project Dashboard de Tarefas - SUNO
 */

// Garantir que as bibliotecas externas estejam disponíveis
const vis = window.vis;
const moment = window.moment;
const bootstrap = window.bootstrap;

import { carregarDados, aplicarFiltros } from '../services/dataService.js';
import { formatarTarefasParaCSV, exportarParaCSV } from '../services/exportService.js';
import { 
  criarTimelineTarefas, 
  moverTimeline, 
  irParaHoje, 
  ajustarZoom,
  configurarEventoTelaCheia,
  CONFIG 
} from '../services/timelineService.js';
import { 
  getEl, 
  mostrarLoading, 
  mostrarNotificacao, 
  atualizarAnoRodape 
} from '../components/uiComponents.js';
import {
  preencherSelectClientes,
  preencherSelectGrupos,
  preencherSelectSubgrupos,
  configurarFiltroPeriodo,
  configurarFiltroTipoTarefa,
  obterValoresFiltros
} from '../components/filterComponents.js';

// Estado da aplicação
let appState = {
  allData: [],
  filteredData: [],
  timeline: null,
  isLoading: false,
  settings: {
    dataSource: localStorage.getItem("dataSource") || "json",
    jsonUrl: localStorage.getItem("jsonUrl") || "dados.json",
  },
};

/**
 * Inicializa o dashboard
 */
export function initDashboard() {
  console.log("Inicializando dashboard por equipe");
  
  // Atualizar o ano no rodapé
  atualizarAnoRodape();
  
  // Configurar event listeners
  setupEventListeners();
  
  // Carregar dados
  carregarDadosDashboard();
}

/**
 * Configura os event listeners
 */
function setupEventListeners() {
  // Botões de navegação da timeline
  getEl("btn-anterior")?.addEventListener("click", () => moverTimeline(appState.timeline, -7));
  getEl("btn-hoje")?.addEventListener("click", () => irParaHoje(appState.timeline));
  getEl("btn-proximo")?.addEventListener("click", () => moverTimeline(appState.timeline, 7));
  getEl("btn-zoom-out")?.addEventListener("click", () => ajustarZoom(appState.timeline, 0.7));
  getEl("btn-zoom-in")?.addEventListener("click", () => ajustarZoom(appState.timeline, 1.3));
  
  // Botão de exportação
  getEl("exportar-dados")?.addEventListener("click", exportarCSV);
  
  // Filtros
  getEl("cliente-principal-select")?.addEventListener("change", atualizarFiltros);
  getEl("periodo-select")?.addEventListener("change", atualizarFiltros);
  
  getEl("grupo-select")?.addEventListener("change", () => {
    atualizarSubgrupos();
    atualizarFiltros();
  });
  
  getEl("subgrupo-select")?.addEventListener("change", atualizarFiltros);
  
  // Filtros de tipo de tarefa
  getEl("mostrar-tarefas")?.addEventListener("change", atualizarFiltros);
  getEl("mostrar-subtarefas")?.addEventListener("change", atualizarFiltros);
  
  // Configurar botão de tela cheia
  const btnFullscreen = getEl("btn-fullscreen");
  const timelineCard = document.querySelector(".cronograma-card");
  
  if (btnFullscreen && timelineCard) {
    configurarEventoTelaCheia(btnFullscreen, timelineCard, appState.timeline);
  }
}

/**
 * Carrega os dados do JSON
 */
async function carregarDadosDashboard() {
  try {
    const timelineContainer = getEl("timeline");
    mostrarLoading(timelineContainer, true);
    appState.isLoading = true;
    
    appState.allData = await carregarDados(appState.settings.jsonUrl);
    
    preencherFiltros();
    atualizarFiltros();
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    mostrarNotificacao("Erro ao carregar dados", error.message, "error");
  } finally {
    appState.isLoading = false;
    mostrarLoading(getEl("timeline"), false);
  }
}

/**
 * Preenche os filtros com base nos dados carregados
 */
function preencherFiltros() {
  if (!appState.allData || appState.allData.length === 0) return;
  
  // Preencher selects de cliente e grupo
  preencherSelectClientes(appState.allData, 'cliente-principal-select');
  preencherSelectGrupos(appState.allData, 'grupo-select');
  
  // Preencher subgrupos com base no grupo selecionado
  atualizarSubgrupos();
  
  // Configurar filtro de período
  configurarFiltroPeriodo('periodo-select', atualizarFiltros);
  
  // Configurar filtros de tipo de tarefa
  configurarFiltroTipoTarefa('mostrar-tarefas', 'mostrar-subtarefas', atualizarFiltros);
}

/**
 * Atualiza o select de subgrupos com base no grupo selecionado
 */
function atualizarSubgrupos() {
  const grupoSelecionado = getEl("grupo-select")?.value || "todos";
  preencherSelectSubgrupos(appState.allData, grupoSelecionado, 'subgrupo-select');
}

/**
 * Atualiza os filtros e a visualização
 */
function atualizarFiltros() {
  if (!appState.allData || appState.allData.length === 0) return;
  
  // Obter valores dos filtros
  const filtros = obterValoresFiltros({
    clienteSelectId: 'cliente-principal-select',
    grupoSelectId: 'grupo-select',
    subgrupoSelectId: 'subgrupo-select',
    periodoSelectId: 'periodo-select',
    mostrarTarefasId: 'mostrar-tarefas',
    mostrarSubtarefasId: 'mostrar-subtarefas'
  });
  
  // Aplicar filtros
  appState.filteredData = aplicarFiltros(appState.allData, filtros);
  
  // Criar timeline
  criarTimeline(appState.filteredData);
}

/**
 * Cria a timeline com os dados filtrados
 * @param {Array} dados - Dados filtrados para exibir na timeline
 */
function criarTimeline(dados) {
  const container = getEl("timeline");
  if (!container) return;
  
  // Limpar container
  container.innerHTML = "";
  
  if (!dados || dados.length === 0) {
    container.innerHTML = '<div class="alert alert-info m-3">Nenhuma tarefa encontrada</div>';
    return;
  }
  
  // Criar timeline
  const timelineResult = criarTimelineTarefas(container, dados, {
    priorityClasses: CONFIG.priorityClasses
  });
  
  if (timelineResult) {
    appState.timeline = timelineResult.timeline;
  }
}

/**
 * Exporta os dados filtrados para CSV
 */
function exportarCSV() {
  if (!appState.filteredData || appState.filteredData.length === 0) {
    mostrarNotificacao("Exportação", "Não há dados para exportar.", "warning");
    return;
  }
  
  const { headers, formatarLinha } = formatarTarefasParaCSV();
  
  exportarParaCSV(
    appState.filteredData,
    headers,
    formatarLinha,
    "tarefas_por_equipe"
  );
}

// Inicializar imediatamente, já que o script é carregado após o DOM estar pronto
initDashboard();
