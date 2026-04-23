import "../../shared/styles/base.css";
import "./courses.css";
import { ApiError, storeApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import type { CourseCard } from "../../shared/types/courses";
import { coursesConfig } from "./config";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const root = document.createElement("main");
root.className = "courses-screen";
root.style.setProperty("--bg-image", `url("${coursesConfig.assets.bg}")`);

const renderCard = (card: CourseCard): string => {
  if (card.kind === "soon") {
    return `
      <article class="course-card course-card--soon" data-id="${card.id}">
        <p class="course-soon-text">${card.title}</p>
      </article>
    `;
  }

  return `
    <article class="course-card course-card--upgrade" data-id="${card.id}">
      <img class="course-icon" src="${coursesConfig.assets.courseIcon}" alt="" />
      <div class="course-content">
        <h2 class="course-title">${card.title}</h2>
        <p class="course-description">${card.description}</p>
      </div>
      <div class="course-action">
        <p class="course-price">${card.price ?? ""}</p>
        <button class="course-buy" type="button" data-course-id="${card.id}">${card.ctaLabel ?? ""}</button>
      </div>
    </article>
  `;
};

const cardsMarkup = coursesConfig.cards.map(renderCard).join("");

const drawerItemsMarkup = coursesConfig.drawerItems
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
        <img class="drawer-line" src="${coursesConfig.assets.drawerLine}" alt="" />
      </li>
    `,
  )
  .join("");

root.innerHTML = `
  <header class="courses-header">
    <div class="courses-header-inner">
      <div class="courses-brand">
        <img class="courses-brand-mascot" src="${coursesConfig.assets.mascot}" alt="" />
        <p class="courses-brand-text">${coursesConfig.texts.brand}</p>
      </div>
      <h1 class="courses-title">${coursesConfig.texts.pageTitle}</h1>
      <button class="courses-burger" type="button" aria-label="${coursesConfig.texts.burgerAriaLabel}">
        <img src="${coursesConfig.assets.burger}" alt="" />
      </button>
    </div>
  </header>

  <section class="courses-main">
    <div class="courses-stack">${cardsMarkup}</div>
    <p class="courses-status" hidden></p>
  </section>

  <div class="drawer-overlay" hidden></div>
  <aside class="drawer" aria-hidden="true">
    <header class="drawer-head">
      <img class="drawer-head-icon" src="${coursesConfig.assets.mascot}" alt="" />
      <p class="drawer-head-title">${coursesConfig.texts.brand}</p>
    </header>
    <ul class="drawer-list">${drawerItemsMarkup}</ul>
  </aside>
`;

app.append(root);

const burger = root.querySelector<HTMLButtonElement>(".courses-burger");
const overlay = root.querySelector<HTMLDivElement>(".drawer-overlay");
const drawer = root.querySelector<HTMLElement>(".drawer");
const drawerLinks = root.querySelectorAll<HTMLButtonElement>(".drawer-link");
const buyButtons = root.querySelectorAll<HTMLButtonElement>(".course-buy");
const statusEl = root.querySelector<HTMLParagraphElement>(".courses-status");

if (!burger || !overlay || !drawer || !statusEl) {
  throw new Error("Missing drawer controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";

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

buyButtons.forEach((button) =>
  button.addEventListener("click", async () => {
    try {
      statusEl.hidden = false;
      statusEl.textContent = "Оформляем подписку...";
      await storeApi.upgradeSubscription({
        planId: button.dataset.courseId ?? "upgrade-b1",
        amount: 999,
        currency: "rub",
      });
      statusEl.textContent = "Подписка активирована";
    } catch (error) {
      statusEl.hidden = false;
      statusEl.textContent = error instanceof ApiError ? error.message : "Не удалось оформить подписку";
    }
  }),
);

void ensureSession().then(async () => {
  try {
    await storeApi.getCatalog();
  } catch {
    // Soft dependency: keep static fallback cards.
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});
