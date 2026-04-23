import "../../shared/styles/base.css";
import "./premium-home.css";
import { ApiError, storeApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import { premiumHomeConfig } from "./config";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const root = document.createElement("main");
root.className = "premium-home-screen";
root.style.setProperty("--bg-image", `url("${premiumHomeConfig.assets.bg}")`);

const statsMarkup = premiumHomeConfig.stats
  .map(
    (stat) => `
      <div class="premium-stat-pill" data-id="${stat.id}">
        <img class="premium-stat-pill-icon" src="${stat.icon}" alt="${stat.alt}" />
        <span class="premium-stat-pill-value">${stat.value}</span>
      </div>
    `,
  )
  .join("");

const exerciseListMarkup = premiumHomeConfig.exerciseList
  .map(
    (item) => `
      <button class="premium-exercise-item" type="button" data-id="${item.id}">
        ${item.label}
      </button>
    `,
  )
  .join("");

const tasksMarkup = premiumHomeConfig.dailyTasks
  .map(
    (task) => `
      <button class="premium-daily-item" type="button" data-id="${task.id}">
        <span class="premium-daily-item-title">${task.title}</span>
        <span class="premium-daily-item-reward">${task.reward}</span>
        <img class="premium-daily-item-arrow" src="${task.icon}" alt="" />
      </button>
    `,
  )
  .join("");

root.innerHTML = `
  <header class="premium-header">
    <div class="premium-header-inner">
      <div class="premium-brand">
        <img class="premium-brand-mascot" src="${premiumHomeConfig.assets.mascot}" alt="" />
        <p class="premium-brand-text">${premiumHomeConfig.texts.brand}</p>
      </div>
      <h1 class="premium-title">${premiumHomeConfig.texts.pageTitle}</h1>
      <button class="premium-burger" type="button" aria-label="${premiumHomeConfig.texts.burgerAriaLabel}">
        <img src="${premiumHomeConfig.assets.burger}" alt="" />
      </button>
    </div>
  </header>

  <section class="premium-main">
    <div class="premium-main-scroll">
      <div class="premium-top-row">
        <article class="premium-course-card" role="button" tabindex="0">
          <img class="premium-course-icon" src="${premiumHomeConfig.assets.courseIcon}" alt="" />
          <div class="premium-course-content">
            <p class="premium-course-title">${premiumHomeConfig.texts.courseTitle}</p>
            <p class="premium-course-description">${premiumHomeConfig.texts.courseDescription}</p>
          </div>
          <div class="premium-course-prices">
            <span>${premiumHomeConfig.courseCard.priceCrystals}</span>
            <span>${premiumHomeConfig.courseCard.priceRubles}</span>
          </div>
        </article>
        <div class="premium-stats">${statsMarkup}</div>
      </div>

      <div class="premium-content-grid">
        <section class="premium-exercises-card">
          <div class="premium-exercises-scroll">${exerciseListMarkup}</div>
        </section>

        <section class="premium-daily-card">
          <p class="premium-daily-card-title">${premiumHomeConfig.texts.dailyTitle}</p>
          <div class="premium-daily-list">${tasksMarkup}</div>
        </section>
      </div>
      <p class="premium-status" hidden></p>
    </div>
  </section>
`;

app.append(root);

const burger = root.querySelector<HTMLButtonElement>(".premium-burger");
const courseCard = root.querySelector<HTMLElement>(".premium-course-card");
const exerciseButtons = root.querySelectorAll<HTMLButtonElement>(".premium-exercise-item");
const dailyButtons = root.querySelectorAll<HTMLButtonElement>(".premium-daily-item");
const statusEl = root.querySelector<HTMLParagraphElement>(".premium-status");

if (!burger || !courseCard || !statusEl) {
  throw new Error("Missing premium controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";

burger.addEventListener("click", () => {
  window.location.href = "/fifth.html";
});

const setStatus = (text: string): void => {
  statusEl.hidden = false;
  statusEl.textContent = text;
};

const runUpgrade = async (): Promise<void> => {
  try {
    setStatus("Оформляем апгрейд...");
    await storeApi.upgradeSubscription({
      planId: "upgrade-b1",
      amount: Number.parseInt(String(premiumHomeConfig.courseCard.priceRubles), 10) || 599,
      currency: "rub",
    });
    setStatus("Премиум активирован");
  } catch (error) {
    setStatus(error instanceof ApiError ? error.message : "Не удалось оформить апгрейд");
  }
};

courseCard.addEventListener("click", () => {
  void runUpgrade();
});
courseCard.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    void runUpgrade();
  }
});

exerciseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.id;
    if (id === "match") window.location.href = "/exercise-match.html";
    if (id === "word") window.location.href = "/exercise-word.html";
    if (id === "speak") window.location.href = "/exercise-speak.html";
    if (id === "gap") window.location.href = "/exercise-gap.html";
    if (id === "build") window.location.href = "/exercise-build.html";
  });
});

dailyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.id;
    if (id === "audio") window.location.href = "/audio.html";
    if (id === "translation") window.location.href = "/translation.html";
  });
});

void ensureSession().then(async () => {
  try {
    await storeApi.getCatalog();
  } catch {
    // Keep static data in UI.
  }
});
