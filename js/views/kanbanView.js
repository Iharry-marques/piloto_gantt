/**
 * @file kanbanView.js
 * @description Visualização Kanban – agora agrupada por Time e exibindo Projetos.
 * @project Dashboard de Tarefas – SUNO
 */

// Bibliotecas globais disponíveis
const moment = window.moment;
const bootstrap = window.bootstrap;

import { carregarDados, processarProjetos } from "../services/dataService.js";
import { getEl, mostrarLoading, mostrarNotificacao } from "../components/uiComponents.js";

// ────────────────────────────────────────────────────────────────────────────────
// Estado
// ────────────────────────────────────────────────────────────────────────────────
const state = {
  tasks: [],      // dados crus
  projects: [],   // projetos processados
  isLoading: false,
  settings: {
    jsonUrl: localStorage.getItem("jsonUrl") || "dados.json",
  },
};

// ────────────────────────────────────────────────────────────────────────────────
// Init
// ────────────────────────────────────────────────────────────────────────────────
export function initKanbanView() {
  console.log("[KANBAN] Init ➜ agrupação por Time | cartão = Projeto");
  carregarDadosKanban();
}

async function carregarDadosKanban() {
  const container = getEl("kanban-container");
  mostrarLoading(container, true);
  state.isLoading = true;

  try {
    state.tasks = await carregarDados(state.settings.jsonUrl);
    state.projects = processarProjetos(state.tasks);
    renderizarKanban(state.projects);
  } catch (err) {
    console.error(err);
    mostrarNotificacao("Erro ao carregar dados", err.message, "error");
    container.innerHTML = `<div class="alert alert-danger m-3"><strong>Erro:</strong> ${err.message}</div>`;
  } finally {
    state.isLoading = false;
    mostrarLoading(container, false);
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Render
// ────────────────────────────────────────────────────────────────────────────────
function renderizarKanban(projetos) {
  const container = getEl("kanban-container");
  if (!container) return;
  container.innerHTML = "";

  if (!projetos.length) {
    container.innerHTML = `<div class="alert alert-info m-3">Nenhum projeto encontrado</div>`;
    return;
  }

  // Agrupar projetos por TIME (TaskOwnerGroup)
  const mapaTimes = {};
  projetos.forEach((proj) => {
    proj.groups.forEach((time) => {
      if (!mapaTimes[time]) mapaTimes[time] = [];
      mapaTimes[time].push(proj);
    });
  });

  // Criar coluna para cada time
  Object.entries(mapaTimes).sort().forEach(([time, listaProjetos]) => {
    const col = document.createElement("div");
    col.className = "kanban-column";

    col.innerHTML = `
      <div class="kanban-column-header">${time} <span class="task-count">${listaProjetos.length}</span></div>
    `;

    listaProjetos.sort((a, b) => a.name.localeCompare(b.name)).forEach((p) => {
      col.appendChild(criarCartaoProjeto(p));
    });

    container.appendChild(col);
  });
}

function criarCartaoProjeto(proj) {
  const card = document.createElement("div");
  card.className = "kanban-card priority-" + proj.priority;

  card.innerHTML = `
    <div class="card-header">${proj.name}</div>
    <div class="card-client"><span class="kanban-badge client">${proj.client}</span></div>
    <div class="card-date">${moment(proj.start).format("DD/MM/YYYY")} – ${moment(proj.end).format("DD/MM/YYYY")}</div>
    <div class="card-footer">
      <span class="responsavel">${proj.mainResponsible}</span>
      <span class="tipo">${proj.tasks.length} tarefas</span>
    </div>
  `;

  return card;
}

// Inicialização imediata (o script é injetado após DOMContentLoaded)
initKanbanView();
