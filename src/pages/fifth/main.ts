import "../../shared/styles/base.css";
import "./fifth.css";
import { ApiError, learningApi, progressApi, sessionStorageApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import {
  buildDailyTaskUrl,
  ensureMiniLessonSession,
  isLessonStepCompleted,
  isLessonStepUnlocked,
  type LessonStepId,
  startMiniLessonSession,
} from "../../shared/game-content";
import { fifthConfig } from "./config";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const root = document.createElement("main");
root.className = "home-screen";
root.style.setProperty("--bg-image", `url("${fifthConfig.assets.bg}")`);

const statsMarkup = fifthConfig.stats
  .map(
    (stat) => `
      <div class="stat-pill" data-id="${stat.id}">
        <img class="stat-pill-icon" src="${stat.icon}" alt="${stat.alt}" />
        <span class="stat-pill-value">${stat.value}</span>
      </div>
    `,
  )
  .join("");

const mapStepsMarkup = fifthConfig.mapSteps
  .map(
    (step) =>
      step.href
        ? `
      <button
        class="map-step${step.primary ? " is-primary" : ""}"
        type="button"
        style="--x:${step.x}%; --y:${step.y}%;"
        data-step-id="${step.id}"
        data-step-href="${step.href}"
      >
        ${step.label}
      </button>
    `
        : `
      <span
        class="map-step${step.primary ? " is-primary" : ""}"
        style="--x:${step.x}%; --y:${step.y}%;"
      >
        ${step.label}
      </span>
    `,
  )
  .join("");

const tasksMarkup = fifthConfig.dailyTasks
  .map(
    (task) => `
      <button class="daily-item" type="button" data-id="${task.id}">
        <span class="daily-item-title">${task.title}</span>
        <span class="daily-item-reward">${task.reward}</span>
        <img class="daily-item-arrow" src="${task.icon}" alt="" />
      </button>
    `,
  )
  .join("");

const drawerItemsMarkup = fifthConfig.drawerItems
  .map(
    (item) => `
      <li class="drawer-row">
        <button
          type="button"
          class="drawer-link"
          data-item-id="${item.id}"
          data-item-href="${item.href ?? ""}"
        >
          ${item.label}
        </button>
        <img class="drawer-line" src="${fifthConfig.assets.drawerLine}" alt="" />
      </li>
    `,
  )
  .join("");

root.innerHTML = `
  <header class="home-header">
    <div class="home-header-inner">
      <div class="home-brand">
        <img class="home-brand-mascot" src="${fifthConfig.assets.mascot}" alt="" />
        <p class="home-brand-text">${fifthConfig.texts.brand}</p>
      </div>
      <h1 class="home-title">${fifthConfig.texts.pageTitle}</h1>
      <button class="home-burger" type="button" aria-label="${fifthConfig.texts.burgerAriaLabel}">
        <img src="${fifthConfig.assets.burger}" alt="" />
      </button>
    </div>
  </header>

  <section class="home-main">
    <div class="home-main-scroll">
      <div class="home-top-row">
        <h2 class="home-greeting">${fifthConfig.texts.greeting}</h2>
        <div class="home-stats">${statsMarkup}</div>
      </div>

      <div class="home-content-grid">
        <article class="lesson-card">
          <p class="lesson-card-title">${fifthConfig.texts.lessonTitle}</p>
          <div class="lesson-map-wrap">
            <img class="lesson-map" src="${fifthConfig.assets.lessonMap}" alt="" />
            ${mapStepsMarkup}
          </div>
        </article>

        <section class="daily-card">
          <p class="daily-card-title">${fifthConfig.texts.dailyTitle}</p>
          <div class="daily-list">${tasksMarkup}</div>
        </section>
      </div>
      <p class="home-status" hidden></p>
    </div>
  </section>

  <div class="drawer-overlay" hidden></div>
  <aside class="drawer" aria-hidden="true">
    <header class="drawer-head">
      <img class="drawer-head-icon" src="${fifthConfig.assets.drawerIcon}" alt="" />
      <p class="drawer-head-title">${fifthConfig.texts.brand}</p>
    </header>
    <ul class="drawer-list">${drawerItemsMarkup}</ul>
  </aside>
`;

app.append(root);

const burger = root.querySelector<HTMLButtonElement>(".home-burger");
const overlay = root.querySelector<HTMLDivElement>(".drawer-overlay");
const drawer = root.querySelector<HTMLElement>(".drawer");
const drawerLinks = root.querySelectorAll<HTMLButtonElement>(".drawer-link");
const dailyButtons = root.querySelectorAll<HTMLButtonElement>(".daily-item");
const mapStepButtons = root.querySelectorAll<HTMLButtonElement>(".map-step[data-step-href]");
const greeting = root.querySelector<HTMLHeadingElement>(".home-greeting");
const statusEl = root.querySelector<HTMLParagraphElement>(".home-status");

if (!burger || !overlay || !drawer || !statusEl) {
  throw new Error("Missing drawer controls");
}

statusEl.style.textAlign = "center";
statusEl.style.marginTop = "8px";
statusEl.style.color = "#1f275a";
statusEl.style.fontWeight = "600";
let statusHideTimer: number | null = null;

const openDrawer = (): void => {
  root.classList.add("is-drawer-open");
  overlay.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
};

const closeDrawer = (): void => {
  root.classList.remove("is-drawer-open");
  overlay.hidden = true;
  drawer.setAttribute("aria-hidden", "true");
};

const normalizePath = (path: string): string => path.replace(/\/+$/, "") || "/";

burger.addEventListener("click", () => {
  if (root.classList.contains("is-drawer-open")) {
    closeDrawer();
    return;
  }
  openDrawer();
});

overlay.addEventListener("click", closeDrawer);
drawerLinks.forEach((link) =>
  link.addEventListener("click", () => {
    const href = link.dataset.itemHref?.trim();
    if (href) {
      const targetPath = normalizePath(new URL(href, window.location.origin).pathname);
      const currentPath = normalizePath(window.location.pathname);
      if (targetPath !== currentPath) {
        window.location.href = href;
        return;
      }
    }
    closeDrawer();
  }),
);

mapStepButtons.forEach((button) =>
  button.addEventListener("click", () => {
    const stepId = button.dataset.stepId ?? "";
    const lessonStep = lessonStepById[stepId];
    if (!lessonStep) return;

    if (!isLessonStepUnlocked(lessonStep)) {
      setStatus("Сначала пройдите предыдущие уровни.", true, 5000);
      return;
    }

    const href = button.dataset.stepHref?.trim();
    if (href) {
      const url = new URL(href, window.location.origin);
      url.searchParams.set("lessonStep", String(lessonStep));
      window.location.href = `${url.pathname}${url.search}`;
    }
  }),
);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});

const setStatus = (text: string, visible = true, autoHideMs = 0): void => {
  if (statusHideTimer !== null) {
    window.clearTimeout(statusHideTimer);
    statusHideTimer = null;
  }
  statusEl.hidden = !visible;
  statusEl.textContent = text;
  if (visible && autoHideMs > 0) {
    statusHideTimer = window.setTimeout(() => {
      statusEl.hidden = true;
      statusEl.textContent = "";
      statusHideTimer = null;
    }, autoHideMs);
  }
};

const applySummary = (summary: { totalXp: number; crystals: number; currentStreak: number }): void => {
  const valuesById: Record<string, string> = {
    streak: String(summary.currentStreak),
    crystals: String(summary.crystals),
    xp: String(summary.totalXp),
  };

  root.querySelectorAll<HTMLElement>(".stat-pill").forEach((pill) => {
    const id = pill.dataset.id;
    if (!id) return;
    const valueEl = pill.querySelector<HTMLElement>(".stat-pill-value");
    if (!valueEl) return;
    valueEl.textContent = valuesById[id] ?? valueEl.textContent;
  });
};

const lessonStepById: Record<string, LessonStepId> = {
  "step-1": 1,
  "step-2": 2,
  "step-3": 3,
  "step-4": 4,
  "step-5": 5,
};

const applyLessonMapProgress = (): void => {
  mapStepButtons.forEach((button) => {
    const stepId = button.dataset.stepId ?? "";
    const lessonStep = lessonStepById[stepId];
    if (!lessonStep) return;

    const unlocked = isLessonStepUnlocked(lessonStep);
    const completed = isLessonStepCompleted(lessonStep);

    button.disabled = !unlocked;
    button.classList.toggle("map-step--locked", !unlocked);
    button.classList.toggle("map-step--completed", completed);
  });
};

const defaultTaskTitles = new Map(fifthConfig.dailyTasks.map((task) => [task.id, task.title]));
const defaultTaskRewards = new Map(fifthConfig.dailyTasks.map((task) => [task.id, task.reward]));
const dailyTaskState = new Map<
  string,
  { status: "available" | "in_progress" | "passed" | "failed"; nextMiniStep: "speak" | "build" | "gap" | null }
>();

const applyDailyTaskStates = (
  tasks: Array<{ id: "mini" | "audio" | "translation"; status: "available" | "in_progress" | "passed" | "failed"; nextMiniStep: "speak" | "build" | "gap" | null }>,
): void => {
  tasks.forEach((task) => {
    dailyTaskState.set(task.id, { status: task.status, nextMiniStep: task.nextMiniStep });
  });

  dailyButtons.forEach((button) => {
    const id = button.dataset.id;
    if (!id) return;

    const state = dailyTaskState.get(id);
    const titleEl = button.querySelector<HTMLElement>(".daily-item-title");
    const rewardEl = button.querySelector<HTMLElement>(".daily-item-reward");

    if (titleEl) {
      titleEl.textContent = defaultTaskTitles.get(id) ?? titleEl.textContent;
    }
    if (rewardEl) {
      rewardEl.textContent = defaultTaskRewards.get(id) ?? rewardEl.textContent;
    }

    button.classList.remove("daily-item--locked", "daily-item--progress");
    button.disabled = false;

    if (!state) return;

    if (state.status === "passed") {
      button.disabled = true;
      button.classList.add("daily-item--locked");
      if (rewardEl) rewardEl.textContent = "Готово";
      return;
    }

    if (state.status === "failed") {
      button.disabled = true;
      button.classList.add("daily-item--locked");
      if (rewardEl) rewardEl.textContent = "Завершено";
      return;
    }

    if (id === "mini" && state.status === "in_progress") {
      button.classList.add("daily-item--progress");
      if (titleEl) titleEl.textContent = "Мини-урок (продолжить)";
      if (rewardEl) rewardEl.textContent = "+3 XP / +3";
    }
  });
};

const loadHomeData = async (): Promise<void> => {
  try {
    setStatus("Загружаем прогресс...");
    const [summary, dailyPlan] = await Promise.all([progressApi.getSummary(), learningApi.getDailyPlan()]);
    applySummary(summary);
    applyLessonMapProgress();
    applyDailyTaskStates(dailyPlan.dailyTasks);

    if (greeting) {
      const user = sessionStorageApi.getUser<{ name?: string }>();
      if (user?.name) {
        greeting.textContent = `Приветствуем, ${user.name}!`;
      }
    }

    setStatus(summary.notifications[0]?.message ?? "Дневной план обновлен.", true, 5000);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Не удалось загрузить данные";
    setStatus(message, true, 5000);
  }
};

const openMiniLesson = (): void => {
  const state = dailyTaskState.get("mini");
  if (state?.status === "passed") {
    setStatus("Мини-урок на сегодня уже пройден.", true, 5000);
    return;
  }

  if (state?.status === "failed") {
    setStatus("Попытка мини-урока уже использована. Повторить можно завтра.", true, 5000);
    return;
  }

  if (state?.status === "in_progress") {
    ensureMiniLessonSession();
    window.location.href = buildDailyTaskUrl("mini", state.nextMiniStep ?? "speak");
    return;
  }

  startMiniLessonSession();
  window.location.href = buildDailyTaskUrl("mini", "speak");
};

const openSimpleDailyTask = (taskId: "audio" | "translation"): void => {
  const state = dailyTaskState.get(taskId);
  if (state?.status === "passed") {
    setStatus("Это ежедневное задание уже пройдено.", true, 5000);
    return;
  }

  if (state?.status === "failed") {
    setStatus("Попытка уже использована. Новая будет завтра.", true, 5000);
    return;
  }

  window.location.href = buildDailyTaskUrl(taskId);
};

dailyButtons.forEach((button) =>
  button.addEventListener("click", () => {
    const taskId = button.dataset.id;
    if (taskId === "mini") {
      openMiniLesson();
      return;
    }

    if (taskId === "audio") {
      openSimpleDailyTask("audio");
      return;
    }

    if (taskId === "translation") {
      openSimpleDailyTask("translation");
    }
  }),
);

applyLessonMapProgress();

void ensureSession().then(() => {
  void loadHomeData();
});
