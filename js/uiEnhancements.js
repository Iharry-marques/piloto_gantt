// uiEnhancements.js – Modern visual enhancements for SUNO Dashboards
// ---------------------------------------------------------------
// ➤ Como usar
// 1. Salve este arquivo em "js/uiEnhancements.js".
// 2. No final do <body> de cada página, logo depois dos outros <script>, adicione:
//    <script type="module" src="js/uiEnhancements.js"></script>
// 3. Recarregue: o tema escuro/claro, densidade e animações já estarão ativos.
// ---------------------------------------------------------------

/*
  Este módulo adiciona recursos visuais modernos sem alterar a lógica principal:
  • Alternância de tema (claro/escuro) via botão 🌙/☀️.
  • Controle de densidade (Compacto vs. Confortável) ajustando a base rem.
  • Redimensionamento automático das timelines (vis.js) ao viewport.
  • Linha "Hoje" fixa na timeline para melhor referência temporal.
  • Animação de revelação suave dos cards ao rolar.
  • Persistência de preferências (localStorage).
*/

const UIEnhancer = (() => {
  const state = {
    isDark: localStorage.getItem("theme") === "dark",
    density: localStorage.getItem("density") || "compact",
    timelines: new Set(),
  };

  /* ------------------------------ Tema ------------------------------ */
  function applyTheme(dark) {
    const root = document.documentElement;

    if (dark) {
      root.style.setProperty("--bg-color", "#1e1e1e");
      root.style.setProperty("--text-color", "#e5e5e5");
      root.style.setProperty("--card-bg", "#262626");
    } else {
      root.style.setProperty("--bg-color", "#ffffff");
      root.style.setProperty("--text-color", "#333333");
      root.style.setProperty("--card-bg", "#ffffff");
    }

    document.body.classList.toggle("dark-mode", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
    state.isDark = dark;
  }

  function injectThemeToggle() {
    const header = document.querySelector(".app-header .container-fluid");
    if (!header) return;

    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-control d-flex align-items-center";
    btn.style.minWidth = "32px";
    btn.title = "Alternar tema (claro/escuro)";
    btn.innerHTML = `<i class="fas fa-${state.isDark ? "sun" : "moon"}"></i>`;

    btn.addEventListener("click", () => {
      const next = !state.isDark;
      applyTheme(next);
      btn.innerHTML = `<i class="fas fa-${next ? "sun" : "moon"}"></i>`;
    });

    // Insere antes dos links de navegação
    header.insertBefore(btn, header.lastElementChild);
  }

  /* ---------------------------- Densidade --------------------------- */
  function applyDensity(level) {
    const root = document.documentElement;
    // "compact" mantém 10px do CSS base; "comfortable" sobe para 12px
    root.style.fontSize = level === "compact" ? "10px" : "13px";
    localStorage.setItem("density", level);
    state.density = level;
  }

  function injectDensitySelect() {
    const header = document.querySelector(".app-header .container-fluid");
    if (!header) return;

    const select = document.createElement("select");
    select.className = "form-select form-select-sm w-auto";
    select.title = "Densidade do layout";
    select.innerHTML = `
      <option value="compact">Compacto</option>
      <option value="comfortable">Confortável</option>`;
    select.value = state.density;

    select.addEventListener("change", () => applyDensity(select.value));
    header.insertBefore(select, header.lastElementChild);
  }

  /* ---------------------- Timeline & Responsivo --------------------- */
  function resizeTimelines() {
    const height = window.innerHeight;
    const overhead = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--layout-overhead") || 160
    );

    document.querySelectorAll(".timeline-container").forEach((el) => {
      el.style.height = `${height - overhead}px`;
    });

    // Redesenhar timelines existentes
    state.timelines.forEach((tl) => {
      try {
        tl.redraw();
      } catch (_) {}
    });
  }

  // Intercepta a criação da vis.Timeline para aplicar extras
  function observeTimelineCreation() {
    if (!window.vis || !window.vis.Timeline || window.vis.Timeline.__patched)
      return;

    const Original = window.vis.Timeline;
    function PatchedTimeline(container, items, groups, options) {
      const instance = new Original(container, items, groups, options);
      state.timelines.add(instance);

      // Adiciona linha "Hoje" (customTime)
      const todayId = "today-line";
      try {
        instance.addCustomTime(new Date(), todayId);
        instance.setCustomTimeTitle(todayId, "Hoje");
      } catch (_) {
        /* ignora se já existir */
      }

      resizeTimelines();
      return instance;
    }

    // Copia protótipo e marca como patchado
    PatchedTimeline.prototype = Original.prototype;
    window.vis.Timeline = PatchedTimeline;
    window.vis.Timeline.__patched = true;
  }

  /* ----------------------- Animações de Cards ----------------------- */
  function addCardReveal() {
    const style = document.createElement("style");
    style.textContent = `.card{opacity:0;transform:translateY(30px);transition:all .6s ease-out}.card.reveal{opacity:1;transform:none}`;
    document.head.appendChild(style);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".card").forEach((card) => observer.observe(card));
  }

  /* ------------------------------ Init ------------------------------ */
  function init() {
    applyTheme(state.isDark);
    applyDensity(state.density);

    injectThemeToggle();
    injectDensitySelect();

    addCardReveal();
    observeTimelineCreation();
    resizeTimelines();

    window.addEventListener("resize", resizeTimelines);
  }

  window.addEventListener("DOMContentLoaded", init);

  // Expor para debug se necessário
  return { state, applyTheme, applyDensity, resizeTimelines };
})();
