import "../../shared/styles/base.css";
import "./settings.css";
import { ApiError, profileApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import { applyNightMode, persistNightMode } from "../../shared/theme";
import { settingsConfig } from "./config";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const root = document.createElement("main");
root.className = "settings-screen";
root.style.setProperty("--bg-image", `url("${settingsConfig.assets.bg}")`);

const settingsMarkup = settingsConfig.toggles
  .map((toggle) => {
    const extraContent =
      toggle.withIcon
        ? `
          <div class="settings-night-row">
            <img class="settings-night-icon" src="${settingsConfig.assets.moonIcon}" alt="" />
            <span class="settings-night-label">${settingsConfig.texts.nightModeLabel}</span>
          </div>
        `
        : "";

    const ariaLabel = toggle.withIcon ? settingsConfig.texts.nightModeLabel : toggle.label;

    return `
      <article class="settings-item">
        <p class="settings-item-title">${toggle.label}</p>
        <div class="settings-item-row">
          ${extraContent}
          <button
            class="settings-switch"
            type="button"
            role="switch"
            aria-label="${ariaLabel}"
            aria-checked="${toggle.defaultOn ? "true" : "false"}"
            data-toggle-id="${toggle.id}"
            data-on="${toggle.defaultOn ? "true" : "false"}"
          >
            <span class="settings-switch-thumb" aria-hidden="true"></span>
          </button>
        </div>
        <div class="settings-item-line"></div>
      </article>
    `;
  })
  .join("");

const actionsMarkup = settingsConfig.actions
  .map(
    (action) => `
      <button class="settings-action" type="button" data-action-id="${action.id}">
        ${action.label}
      </button>
    `,
  )
  .join("");

const drawerItemsMarkup = settingsConfig.drawerItems
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
        <img class="drawer-line" src="${settingsConfig.assets.drawerLine}" alt="" />
      </li>
    `,
  )
  .join("");

root.innerHTML = `
  <header class="settings-header">
    <div class="settings-header-inner">
      <div class="settings-brand">
        <img class="settings-brand-mascot" src="${settingsConfig.assets.mascot}" alt="" />
        <p class="settings-brand-text">${settingsConfig.texts.brand}</p>
      </div>
      <h1 class="settings-title">${settingsConfig.texts.pageTitle}</h1>
      <button class="settings-burger" type="button" aria-label="${settingsConfig.texts.burgerAriaLabel}">
        <img src="${settingsConfig.assets.burger}" alt="" />
      </button>
    </div>
  </header>

  <section class="settings-main">
    <div class="settings-scroll">
      <div class="settings-grid">${settingsMarkup}</div>
      <div class="settings-actions">${actionsMarkup}</div>
      <p class="settings-status" hidden></p>
    </div>
  </section>

  <div class="drawer-overlay" hidden></div>
  <aside class="drawer" aria-hidden="true">
    <header class="drawer-head">
      <img class="drawer-head-icon" src="${settingsConfig.assets.mascot}" alt="" />
      <p class="drawer-head-title">${settingsConfig.texts.brand}</p>
    </header>
    <ul class="drawer-list">${drawerItemsMarkup}</ul>
  </aside>
`;

app.append(root);

const burger = root.querySelector<HTMLButtonElement>(".settings-burger");
const overlay = root.querySelector<HTMLDivElement>(".drawer-overlay");
const drawer = root.querySelector<HTMLElement>(".drawer");
const drawerLinks = root.querySelectorAll<HTMLButtonElement>(".drawer-link");
const switches = root.querySelectorAll<HTMLButtonElement>(".settings-switch");
const actionButtons = root.querySelectorAll<HTMLButtonElement>(".settings-action");
const statusEl = root.querySelector<HTMLParagraphElement>(".settings-status");

if (!burger || !overlay || !drawer || !statusEl) {
  throw new Error("Missing drawer controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";

const toggleState = new Map<string, boolean>();
settingsConfig.toggles.forEach((toggle) => toggleState.set(toggle.id, toggle.defaultOn));

const setSwitchState = (el: HTMLButtonElement, isOn: boolean): void => {
  el.dataset.on = isOn ? "true" : "false";
  el.setAttribute("aria-checked", isOn ? "true" : "false");
};

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

const toSettingsPayload = (): {
  musicEnabled: boolean;
  soundEnabled: boolean;
  telegramNotifications: boolean;
  nightMode: boolean;
} => ({
  musicEnabled: toggleState.get("music") ?? false,
  soundEnabled: toggleState.get("sound") ?? true,
  telegramNotifications: toggleState.get("telegram") ?? true,
  nightMode: toggleState.get("night") ?? false,
});

const setStatus = (text: string, visible = true): void => {
  statusEl.hidden = !visible;
  statusEl.textContent = text;
};

switches.forEach((switchButton) =>
  switchButton.addEventListener("click", async () => {
    const toggleId = switchButton.dataset.toggleId;
    if (!toggleId) return;

    const nextState = !(toggleState.get(toggleId) ?? false);
    toggleState.set(toggleId, nextState);
    setSwitchState(switchButton, nextState);

    if (toggleId === "night") {
      applyNightMode(nextState);
    }

    try {
      setStatus("Сохраняем настройки...");
      await profileApi.patchSettings(toSettingsPayload());
      if (toggleId === "night") {
        persistNightMode(nextState);
      }
      setStatus("Настройки сохранены", true);
    } catch (error) {
      toggleState.set(toggleId, !nextState);
      setSwitchState(switchButton, !nextState);
      if (toggleId === "night") {
        applyNightMode(!nextState);
      }
      setStatus(error instanceof ApiError ? error.message : "Не удалось сохранить настройки", true);
    }
  }),
);

actionButtons.forEach((button) =>
  button.addEventListener("click", () => {
    const id = button.dataset.actionId;
    if (id === "change-language") {
      window.location.href = "/third.html";
      return;
    }

    if (id === "support") {
      window.location.href = "mailto:support@triolingo.app?subject=Triolingo%20Support";
    }
  }),
);

const hydrateSettings = async (): Promise<void> => {
  try {
    setStatus("Загружаем настройки...");
    const data = await profileApi.getSettings();

    toggleState.set("music", data.settings.musicEnabled);
    toggleState.set("sound", data.settings.soundEnabled);
    toggleState.set("telegram", data.settings.telegramNotifications);
    toggleState.set("night", data.settings.nightMode);

    applyNightMode(data.settings.nightMode);
    persistNightMode(data.settings.nightMode);

    switches.forEach((button) => {
      const id = button.dataset.toggleId;
      if (!id) return;
      setSwitchState(button, toggleState.get(id) ?? false);
    });

    setStatus("Настройки загружены", true);
  } catch (error) {
    setStatus(error instanceof ApiError ? error.message : "Не удалось загрузить настройки", true);
  }
};

void ensureSession().then(() => {
  void hydrateSettings();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});
