/**
 * @file dataService.js
 * @description Serviço para carregamento e processamento de dados
 * @project Dashboard de Tarefas - SUNO
 */

/**
 * Carrega dados do arquivo JSON
 * @param {string} jsonUrl - URL do arquivo JSON
 * @returns {Promise<Array>} - Dados processados
 */
export async function carregarDados(jsonUrl = 'dados.json') {
  try {
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const dadosOriginais = await response.json();
    return dadosOriginais.map(preprocessarDados);
  } catch (error) {
    throw new Error(`Falha ao carregar dados do JSON: ${error.message}`);
  }
}

/**
 * Preprocessa dados para normalizar campos
 * @param {object} item - Item a ser processado
 * @returns {object} - Item processado
 */
export function preprocessarDados(item) {
  const processado = { ...item };

  // Mapear prioridade com base no status
  const statusPriority = {
    "Não iniciada": "low",
    "Backlog": "medium",
    "Em Produção": "high",
  };
  processado.Priority = statusPriority[processado.PipelineStepTitle] || "medium";

  // Lista de grupos principais válidos
  const gruposPrincipais = [
    "Criação",
    "Mídia",
    "Produção",
    "Operações",
    "BI",
    "Estratégia",
  ];

  // Inicializar valores
  let grupo = undefined;
  let caminhoCompleto = item.group_subgroup || "";

  // Extrair o grupo principal do caminho completo
  if (caminhoCompleto) {
    // Caso especial para Ana Luisa Andre (sem barra, mas pertence a Produção)
    if (caminhoCompleto.trim() === "Ana Luisa Andre") {
      grupo = "Produção";
    } else {
      const partes = caminhoCompleto.split("/").map((p) => p.trim());

      // Verificar se a primeira parte é um grupo principal reconhecido
      if (partes.length > 0) {
        if (gruposPrincipais.includes(partes[0])) {
          grupo = partes[0];
        } else if (partes[0] === "Bruno Prosperi") {
          // Caso do "Bruno Prosperi" sem o prefixo "Criação"
          grupo = "Criação";
        } else if (partes[0] === "Carol") {
          // Caso do "Carol" sem o prefixo "Operações"
          grupo = "Operações";
        } else {
          console.warn(
            `Grupo não reconhecido: ${partes[0]} em ${caminhoCompleto}`
          );
          grupo = "Outros";
        }
      }
    }
  }

  // Armazenar grupo principal e caminho completo
  processado.TaskOwnerGroup = grupo;
  processado.TaskOwnerFullPath = caminhoCompleto;

  // Normalizar datas
  processado.RequestDate = processado.start || new Date().toISOString();
  processado.TaskClosingDate =
    processado.end ||
    moment(processado.RequestDate).add(3, "days").toISOString();
  processado.CurrentDueDate = processado.TaskClosingDate;

  // Garantir que o campo tipo esteja sempre definido
  processado.tipo = processado.tipo || "Tarefa";

  return processado;
}

/**
 * Processa projetos a partir de tarefas
 * @param {Array} tarefas - Lista de tarefas
 * @returns {Array} - Lista de projetos processados
 */
export function processarProjetos(tarefas) {
  // Objeto para agrupar por cliente+projeto 
  const projetosPorCliente = {};
  
  // Agrupar tarefas por combinação de cliente e projeto
  tarefas.forEach(tarefa => {
    if (!tarefa.client || !tarefa.project) return;
    
    const chave = `${tarefa.client}::${tarefa.project}`;
    
    if (!projetosPorCliente[chave]) {
      projetosPorCliente[chave] = {
        id: chave,
        name: tarefa.project,
        client: tarefa.client,
        tasks: [],
        responsibles: new Set(),
        groups: new Set(),
        start: tarefa.start,
        end: tarefa.end,
        status: tarefa.PipelineStepTitle || "Em andamento",
        priority: tarefa.Priority || "medium",
        progress: 0
      };
    }
    
    // Adicionar tarefa ao projeto
    const projeto = projetosPorCliente[chave];
    projeto.tasks.push(tarefa);
    
    // Adicionar responsável e grupo
    if (tarefa.responsible) projeto.responsibles.add(tarefa.responsible);
    if (tarefa.TaskOwnerGroup) projeto.groups.add(tarefa.TaskOwnerGroup);
    
    // Ajustar datas (início mais antigo, fim mais recente)
    if (!projeto.start || new Date(tarefa.start) < new Date(projeto.start)) {
      projeto.start = tarefa.start;
    }
    
    if (!projeto.end || (tarefa.end && new Date(tarefa.end) > new Date(projeto.end))) {
      projeto.end = tarefa.end;
    }
    
    // Atualizar prioridade (usar a mais alta)
    if (tarefa.Priority === "high") {
      projeto.priority = "high";
    } else if (tarefa.Priority === "medium" && projeto.priority !== "high") {
      projeto.priority = "medium";
    }
  });
  
  // Processar projetos após agrupamento
  return Object.values(projetosPorCliente).map(projeto => {
    // Converter Sets para Arrays
    projeto.responsibles = Array.from(projeto.responsibles).sort();
    projeto.groups = Array.from(projeto.groups).sort();
    
    // Determinar o responsável principal
    projeto.mainResponsible = projeto.responsibles[0] || "Não atribuído";
    
    // Calcular progresso do projeto
    const tarefasConcluidas = projeto.tasks.filter(t => 
      t.PipelineStepTitle === "Concluída" || t.status === "Concluída"
    ).length;
    
    projeto.progress = projeto.tasks.length > 0 
      ? Math.round((tarefasConcluidas / projeto.tasks.length) * 100) 
      : 0;
    
    // Determinar status do projeto
    if (projeto.progress === 100) {
      projeto.status = "Concluído";
    } else {
      // Verificar se há tarefas atrasadas
      const hoje = new Date();
      const temTarefasAtrasadas = projeto.tasks.some(t => 
        t.end && new Date(t.end) < hoje && 
        t.PipelineStepTitle !== "Concluída" && 
        t.status !== "Concluída"
      );
      
      if (temTarefasAtrasadas) {
        projeto.status = "Atrasado";
      }
    }
    
    return projeto;
  });
}

/**
 * Filtra dados por período
 * @param {Array} dados - Dados a serem filtrados
 * @param {number} dias - Número de dias para filtrar
 * @returns {Array} - Dados filtrados
 */
export function filtrarPorPeriodo(dados, dias = 30) {
  const limite = moment().subtract(dias, "days");
  
  return dados.filter(item => {
    return moment(item.start).isSameOrAfter(limite);
  });
}

/**
 * Filtra dados por cliente
 * @param {Array} dados - Dados a serem filtrados
 * @param {string} cliente - Cliente para filtrar
 * @returns {Array} - Dados filtrados
 */
export function filtrarPorCliente(dados, cliente) {
  if (cliente === "todos") return dados;
  
  return dados.filter(item => item.client === cliente);
}

/**
 * Filtra dados por grupo
 * @param {Array} dados - Dados a serem filtrados
 * @param {string} grupo - Grupo para filtrar
 * @returns {Array} - Dados filtrados
 */
export function filtrarPorGrupo(dados, grupo) {
  if (grupo === "todos") return dados;
  
  return dados.filter(item => item.TaskOwnerGroup === grupo);
}

/**
 * Filtra dados por subgrupo
 * @param {Array} dados - Dados a serem filtrados
 * @param {string} grupo - Grupo principal
 * @param {string} subgrupo - Subgrupo para filtrar
 * @returns {Array} - Dados filtrados
 */
export function filtrarPorSubgrupo(dados, grupo, subgrupo) {
  if (subgrupo === "todos") return dados;
  
  return dados.filter(item => {
    // Se for o caso especial "Ana Luisa Andre"
    if (subgrupo === "Ana Luisa Andre" && item.TaskOwnerFullPath === "Ana Luisa Andre") {
      return true;
    }

    // Verificar se o caminho completo contém ou termina com o subgrupo selecionado
    const fullPath = item.TaskOwnerFullPath;
    if (fullPath) {
      // Se o caminho começa com o grupo principal
      if (fullPath.startsWith(grupo)) {
        // Remover o grupo principal e verificar se o resto começa com o subgrupo
        const restPath = fullPath.replace(`${grupo} / `, "");
        return restPath === subgrupo || restPath.startsWith(`${subgrupo} / `);
      }
      // Casos especiais sem prefixo de grupo principal
      else if (
        (grupo === "Criação" && fullPath.startsWith("Bruno Prosperi")) ||
        (grupo === "Operações" && fullPath.startsWith("Carol"))
      ) {
        // Verificar se o caminho completo começa com o subgrupo
        return fullPath === subgrupo || fullPath.startsWith(`${subgrupo} / `);
      }
    }

    return false;
  });
}

/**
 * Filtra dados por tipo de tarefa
 * @param {Array} dados - Dados a serem filtrados
 * @param {boolean} mostrarTarefas - Se deve mostrar tarefas
 * @param {boolean} mostrarSubtarefas - Se deve mostrar subtarefas
 * @returns {Array} - Dados filtrados
 */
export function filtrarPorTipoTarefa(dados, mostrarTarefas = true, mostrarSubtarefas = true) {
  if (mostrarTarefas && mostrarSubtarefas) return dados;
  
  return dados.filter(item => {
    const isSubtask = item.tipo === "Subtarefa";
    if (!mostrarTarefas && !isSubtask) return false;
    if (!mostrarSubtarefas && isSubtask) return false;
    return true;
  });
}

/**
 * Aplica todos os filtros aos dados
 * @param {Array} dados - Dados a serem filtrados
 * @param {Object} filtros - Objeto com os filtros a serem aplicados
 * @returns {Array} - Dados filtrados
 */
export function aplicarFiltros(dados, filtros) {
  let resultado = [...dados];
  
  // Filtro por período
  if (filtros.dias) {
    resultado = filtrarPorPeriodo(resultado, filtros.dias);
  }
  
  // Filtro por cliente
  if (filtros.cliente) {
    resultado = filtrarPorCliente(resultado, filtros.cliente);
  }
  
  // Filtro por grupo
  if (filtros.grupo) {
    resultado = filtrarPorGrupo(resultado, filtros.grupo);
  }
  
  // Filtro por subgrupo
  if (filtros.grupo && filtros.subgrupo) {
    resultado = filtrarPorSubgrupo(resultado, filtros.grupo, filtros.subgrupo);
  }
  
  // Filtro por tipo de tarefa
  if (filtros.mostrarTarefas !== undefined || filtros.mostrarSubtarefas !== undefined) {
    resultado = filtrarPorTipoTarefa(
      resultado, 
      filtros.mostrarTarefas !== false, 
      filtros.mostrarSubtarefas !== false
    );
  }
  
  return resultado;
}
