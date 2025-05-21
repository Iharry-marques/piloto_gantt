// kanban.js

// Carrega o JSON e inicializa o Kanban
fetch('dados.json')
  .then(res => res.json())
  .then(data => {
    createKanban(data);
  })
  .catch(err => console.error("Erro ao carregar os dados:", err));

function createKanban(tasks) {
  const container = document.getElementById("kanban-container");

  // Times principais
  const times = {
    'Criação': [],
    'Mídia': [],
    'Operações': [],
    'BI': [],
    'Outros': []
  };

  tasks.forEach(task => {
    const grupo = task.group_subgroup.toLowerCase();
    if (grupo.includes("criação")) times["Criação"].push(task);
    else if (grupo.includes("mídia")) times["Mídia"].push(task);
    else if (grupo.includes("operações")) times["Operações"].push(task);
    else if (grupo.includes("bi")) times["BI"].push(task);
    else times["Outros"].push(task);
  });

  // Cria as colunas e adiciona cards
  for (const [time, tarefas] of Object.entries(times)) {
    const col = document.createElement('div');
    col.className = 'kanban-column';

    col.innerHTML = `<div class="kanban-column-header">${time} (${tarefas.length})</div>`;

    // Agrupa por responsável dentro do time
    const responsaveis = {};
    tarefas.forEach(tarefa => {
      if (!responsaveis[tarefa.responsible]) responsaveis[tarefa.responsible] = [];
      responsaveis[tarefa.responsible].push(tarefa);
    });

    for (const [responsavel, tasks] of Object.entries(responsaveis)) {
      tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'kanban-card';

        card.innerHTML = `
          <div class="card-header">${task.name}</div>
          <div class="card-subtitle">📋 ${task.PipelineStepTitle}</div>
          <div class="card-date">📅 ${formatDate(task.end)}</div>
          <div class="card-client">${task.client}</div>
          <div class="card-footer">
            ${task.tipo === 'Subtarefa' ? '<span class="subtask">☰ Subtarefa</span>' : ''}
            <span class="responsavel">👤 ${task.responsible}</span>
          </div>
        `;

        col.appendChild(card);
      });
    }

    container.appendChild(col);
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}
