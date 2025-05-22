/**
 * @file timelineService.js
 * @description Serviço para manipulação e configuração da timeline
 * @project Dashboard de Tarefas - SUNO
 */

/**
 * Configurações padrão para a timeline
 * @returns {Object} Objeto de configuração da timeline
 */
export function getTimelineOptions() {
  return {
    orientation: "top",
    stack: true,
    margin: { item: 10 },
    zoomMin: 1000 * 60 * 60 * 24 * 7,    // Mínimo de 7 dias
    zoomMax: 1000 * 60 * 60 * 24 * 180,  // Máximo de 180 dias
    start: moment().subtract(1, "weeks"),
    end: moment().add(2, "weeks"),
    groupOrder: (a, b) => a.content.localeCompare(b.content),
    horizontalScroll: true,
    verticalScroll: true,
    height: "100%",
  };
}

/**
 * Move a timeline para frente ou para trás em dias
 * @param {object} timeline - Instância da timeline
 * @param {number} dias - Número de dias para mover (positivo = futuro, negativo = passado)
 */
export function moverTimeline(timeline, dias) {
  if (!timeline) return;

  const range = timeline.getWindow();
  timeline.setWindow({
    start: moment(range.start).add(dias, "days").valueOf(),
    end: moment(range.end).add(dias, "days").valueOf(),
  });
}

/**
 * Centraliza a timeline na data atual
 * @param {object} timeline - Instância da timeline
 */
export function irParaHoje(timeline) {
  if (!timeline) return;

  const range = timeline.getWindow();
  const intervalo = range.end - range.start;
  const hoje = moment().valueOf();

  timeline.setWindow({
    start: hoje - intervalo / 2,
    end: hoje + intervalo / 2,
  });
}

/**
 * Ajusta o zoom da timeline
 * @param {object} timeline - Instância da timeline
 * @param {number} fator - Fator de zoom (>1 = zoom in, <1 = zoom out)
 */
export function ajustarZoom(timeline, fator) {
  if (!timeline) return;

  const range = timeline.getWindow();
  const centro = new Date((range.end.getTime() + range.start.getTime()) / 2);
  const novoIntervalo = (range.end - range.start) / fator;

  timeline.setWindow({
    start: new Date(centro.getTime() - novoIntervalo / 2),
    end: new Date(centro.getTime() + novoIntervalo / 2),
  });
}

/**
 * Configura eventos de tela cheia para o container da timeline
 * @param {HTMLElement} btnFullscreen - Botão para ativar modo tela cheia
 * @param {HTMLElement} timelineCard - Container da timeline que será expandido
 * @param {object} timeline - Instância da timeline para redimensionar
 */
export function configurarEventoTelaCheia(btnFullscreen, timelineCard, timeline) {
  if (!btnFullscreen || !timelineCard || !timeline) return;

  btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      (timelineCard.requestFullscreen || timelineCard.webkitRequestFullscreen || timelineCard.msRequestFullscreen).call(timelineCard);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
    }

    setTimeout(() => {
      document.getElementById("timeline").style.height = document.fullscreenElement ? `${window.innerHeight - 150}px` : "600px";
      timeline.redraw();
    }, 100);
  });

  document.addEventListener("fullscreenchange", () => {
    document.getElementById("timeline").style.height = document.fullscreenElement ? `${window.innerHeight - 150}px` : "600px";
    timeline.redraw();
  });
}

/**
 * Cria uma timeline para visualização de tarefas por responsável
 * @param {HTMLElement} container - Container onde a timeline será renderizada
 * @param {Array} dados - Dados a serem exibidos na timeline
 * @param {Object} config - Configurações adicionais
 * @returns {Object} Objeto com a timeline e os datasets
 */
export function criarTimelineTarefas(container, dados, config = {}) {
  if (!container || !dados || dados.length === 0) {
    if (container) {
      container.innerHTML = '<div class="alert alert-info m-3">Nenhuma tarefa encontrada</div>';
    }
    return null;
  }

  try {
    // Agrupar por responsável
    const responsaveis = [
      ...new Set(dados.map((t) => t.responsible).filter(Boolean)),
    ].sort();

    const items = new vis.DataSet(
      dados.map((item, idx) => {
        const startDate = moment(item.start);
        const endDate = item.end
          ? moment(item.end)
          : startDate.clone().add(3, "days");

        // Verificar se é uma tarefa de curta duração (menos de 3 dias)
        const duration = endDate.diff(startDate, "days");
        const isShortDuration = duration <= 2;

        const isSubtask = item.tipo === "Subtarefa";
        const titlePrefix = isSubtask ? "↳ " : "";
        const taskClass = config.priorityClasses?.[item.Priority] || "";

        // Conteúdo com base na duração da tarefa
        let content;
        if (isShortDuration) {
          // Tarefa curta - mostrar como bolinha
          content = `<div class="timeline-dot ${taskClass} ${isSubtask ? "subtask" : ""}" data-type="curta" title="${item.name}"></div>`;
        } else {
          // Tarefa longa - mostrar como barra
          content = `<div class="timeline-item-content ${isSubtask ? "subtask" : ""}" data-type="longa" title="${item.name}">
                        <span class="priority-dot ${taskClass}"></span>
                        ${titlePrefix}${item.name.substring(0, 25)}${
            item.name.length > 25 ? "..." : ""
          }
                      </div>`;
        }

        return {
          id: idx,
          content: content,
          start: startDate.toDate(),
          end: endDate.toDate(),
          group: item.responsible,
          title: `
          <div class="timeline-tooltip">
            <h5>${item.name}</h5>
            <p><strong>Cliente:</strong> ${item.client || "N/A"}</p>
            <p><strong>Responsável:</strong> ${item.responsible || "N/A"}</p>
            <p><strong>Período:</strong> ${startDate.format(
              "DD/MM/YYYY"
            )} - ${endDate.format("DD/MM/YYYY")}</p>
            <p><strong>Status:</strong> ${item.PipelineStepTitle || "N/A"}</p>
            <p><strong>Grupo:</strong> ${item.TaskOwnerFullPath || "N/A"}</p>
            <p><strong>Tipo:</strong> ${item.tipo || "Tarefa"}</p>
          </div>`,
          className: `${taskClass} ${isSubtask ? "subtask" : ""} ${isShortDuration ? "curta" : "longa"}`,
          isShortDuration: isShortDuration,
          itemData: item
        };
      })
    );

    const visGroups = new vis.DataSet(
      responsaveis.map((resp) => ({
        id: resp,
        content: resp,
      }))
    );

    const options = {
      ...getTimelineOptions(),
      ...config.timelineOptions
    };

    const timeline = new vis.Timeline(container, items, visGroups, options);
    timeline.fit();

    // Configurar eventos
    configurarEventosTimeline(timeline, items);

    return {
      timeline,
      items,
      groups: visGroups
    };
  } catch (error) {
    console.error("Erro ao criar timeline:", error);
    container.innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
    return null;
  }
}

/**
 * Cria uma timeline para visualização de projetos por cliente
 * @param {HTMLElement} container - Container onde a timeline será renderizada
 * @param {Array} projetos - Dados de projetos a serem exibidos
 * @param {Object} config - Configurações adicionais
 * @returns {Object} Objeto com a timeline e os datasets
 */
export function criarTimelineProjetos(container, projetos, config = {}) {
  if (!container || !projetos || projetos.length === 0) {
    if (container) {
      container.innerHTML = '<div class="alert alert-info m-3">Nenhum projeto encontrado</div>';
    }
    return null;
  }

  try {
    // Agrupar por cliente
    const clientes = [...new Set(projetos.map(p => p.client).filter(Boolean))].sort();

    // Criação dos itens da timeline - projetos mostram EQUIPE e RESPONSÁVEL
    const items = new vis.DataSet(
      projetos.map((projeto, idx) => {
        const startDate = moment(projeto.start);
        const endDate = projeto.end 
          ? moment(projeto.end) 
          : startDate.clone().add(14, "days");
        
        // Status color class
        let statusClass = "";
        switch(projeto.status) {
          case "Concluído": 
            statusClass = "status-concluido"; break;
          case "Atrasado": 
            statusClass = "status-atrasado"; break;
          default: 
            statusClass = "status-andamento";
        }
        
        // Priority class 
        const priorityClass = config.priorityClasses?.[projeto.priority] || "";
        
        // Exibir equipe e responsável no conteúdo
        const equipe = projeto.groups.join(" / ") || "Sem equipe";
        const responsavel = projeto.responsibles.join(", ") || "Sem responsável";
        
        const content = `<div class="timeline-item-content ${priorityClass} ${statusClass}" title="${projeto.name}">
                           <span class="priority-dot ${priorityClass}"></span>
                           <strong>${equipe}</strong> - ${responsavel}
                         </div>`;

        return {
          id: idx,
          content,
          title: `
            <div class="timeline-tooltip">
              <h5>${projeto.name}</h5>
              <p><strong>Cliente:</strong> ${projeto.client || "N/A"}</p>
              <p><strong>Time:</strong> ${projeto.groups.join(" / ") || "N/A"}</p>
              <p><strong>Período:</strong> ${startDate.format("DD/MM/YYYY")} - ${endDate.format("DD/MM/YYYY")}</p>
              <p><strong>Status:</strong> <span class="${statusClass}">${projeto.status}</span></p>
              <p><strong>Progresso:</strong> ${projeto.progress}%</p>
            </div>`,
          start: startDate.toDate(),
          end: endDate.toDate(),
          group: projeto.client,
          className: `${priorityClass} ${statusClass}`,
          projeto
        };
      })
    );

    // Clientes em negrito
    const visGroups = new vis.DataSet(
      clientes.map(cliente => ({
        id: cliente,
        content: `<strong>${cliente}</strong>`,
        className: config.clientColors?.[cliente.toUpperCase()] || ""
      }))
    );

    // Definir opções
    const options = {
      ...getTimelineOptions(),
      ...config.timelineOptions
    };

    const timeline = new vis.Timeline(container, items, visGroups, options);
    timeline.fit();

    // Configurar eventos
    configurarEventosTimeline(timeline, items);

    return {
      timeline,
      items,
      groups: visGroups
    };
  } catch (error) {
    console.error("Erro ao criar timeline:", error);
    container.innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
    return null;
  }
}

/**
 * Configura eventos para a timeline
 * @param {Object} timeline - Instância da timeline
 * @param {Object} items - Dataset de itens da timeline
 */
function configurarEventosTimeline(timeline, items) {
  // EVENTO NATIVO de clique da timeline para tarefas curtas e longas
  timeline.on("click", function(properties) {
    if (!properties.item) return;
    
    const id = properties.item;
    const item = items.get(id);
    
    if (!item) return;
    
    // Se for uma tarefa curta, mostrar o modal
    if (item.isShortDuration) {
      const tarefaData = item.itemData;
      const content = `
        <div style="padding: 1rem">
          <h4>${tarefaData.name}</h4>
          <p><strong>Cliente:</strong> ${tarefaData.client || "N/A"}</p>
          <p><strong>Responsável:</strong> ${tarefaData.responsible || "N/A"}</p>
          <p><strong>Status:</strong> ${tarefaData.PipelineStepTitle || "N/A"}</p>
          <p><strong>Prioridade:</strong> ${tarefaData.Priority || "N/A"}</p>
          <p><strong>Tipo:</strong> ${tarefaData.tipo || "Tarefa"}</p>
          <p><strong>Período:</strong> ${moment(tarefaData.start).format("DD/MM/YYYY")} - ${moment(tarefaData.end).format("DD/MM/YYYY")}</p>
          <p><strong>Grupo:</strong> ${tarefaData.TaskOwnerFullPath || "N/A"}</p>
        </div>`;

      const modal = document.createElement('div');
      modal.className = 'modal fade show';
      modal.style.display = 'block';
      modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
      modal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Detalhes da Tarefa</h5>
              <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
            </div>
            <div class="modal-body">${content}</div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fechar</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    } else {
      // Se for uma tarefa longa, trocar a classe 'expanded'
      const element = document.querySelector(`.vis-item[data-id="${id}"]`);
      if (!element) return;
      
      if (element.classList.contains('expanded')) {
        element.classList.remove('expanded');
      } else {
        // Remove expanded class from all other elements first
        document.querySelectorAll('.vis-item.expanded').forEach(el => {
          if (el !== element) {
            el.classList.remove('expanded');
          }
        });
        
        element.classList.add('expanded');
      }
    }
  });
}

// Configurações globais compartilhadas
export const CONFIG = {
  priorityClasses: {
    high: "task-priority-high",
    medium: "task-priority-medium",
    low: "task-priority-low",
  },
  clientColors: {
    SICREDI: "cliente-sicredi",
    SAMSUNG: "cliente-samsung",
    VIVO: "cliente-vivo",
    RD: "cliente-rd",
    AMERICANAS: "cliente-americanas",
    OBOTICARIO: "cliente-oboticario",
    COGNA: "cliente-cogna",
    ENGIE: "cliente-engie",
  }
};
