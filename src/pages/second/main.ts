import "../../shared/styles/base.css";
import "./second.css";
import { secondConfig } from "./config";
import type { Rect, SocialButton } from "../../shared/types/second";
import { authApi } from "../../shared/api";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app container");
}

const toCssRectVars = (element: HTMLElement, desktop: Rect, mobile: Rect): void => {
  element.style.setProperty("--desktop-x", `${desktop.x}`);
  element.style.setProperty("--desktop-y", `${desktop.y}`);
  element.style.setProperty("--desktop-w", `${desktop.w}`);
  element.style.setProperty("--desktop-h", `${desktop.h}`);
  element.style.setProperty("--mobile-x", `${mobile.x}`);
  element.style.setProperty("--mobile-y", `${mobile.y}`);
  element.style.setProperty("--mobile-w", `${mobile.w}`);
  element.style.setProperty("--mobile-h", `${mobile.h}`);
};

const createSocialButton = (button: SocialButton): HTMLElement => {
  const item = document.createElement("div");
  item.className = "second-social-item";
  item.dataset.socialId = button.id;
  toCssRectVars(item, button.desktop, button.mobile);

  const link = document.createElement("a");
  link.className = "second-social-link";
  link.href = button.href;
  link.textContent = button.text;
  link.setAttribute("aria-label", button.text);

  const iconWrap = document.createElement("span");
  iconWrap.className = "second-social-icon";
  iconWrap.style.setProperty("--icon-desktop-x", `${button.iconDesktop.x - button.desktop.x}`);
  iconWrap.style.setProperty("--icon-desktop-y", `${button.iconDesktop.y - button.desktop.y}`);
  iconWrap.style.setProperty("--icon-desktop-w", `${button.iconDesktop.w}`);
  iconWrap.style.setProperty("--icon-desktop-h", `${button.iconDesktop.h}`);
  iconWrap.style.setProperty("--icon-mobile-x", `${button.iconMobile.x - button.mobile.x}`);
  iconWrap.style.setProperty("--icon-mobile-y", `${button.iconMobile.y - button.mobile.y}`);
  iconWrap.style.setProperty("--icon-mobile-w", `${button.iconMobile.w}`);
  iconWrap.style.setProperty("--icon-mobile-h", `${button.iconMobile.h}`);

  const icon = document.createElement("img");
  icon.src = button.iconSrc;
  icon.alt = button.iconAlt;
  iconWrap.append(icon);

  item.append(link, iconWrap);
  return item;
};

const scene = document.createElement("main");
scene.className = "second-screen";

const background = document.createElement("img");
background.className = "second-screen__background";
background.src = secondConfig.background.src;
background.alt = secondConfig.background.alt;
scene.append(background);

const mascot = document.createElement("img");
mascot.className = "second-screen__mascot";
mascot.src = secondConfig.mascot.src;
mascot.alt = secondConfig.mascot.alt;
toCssRectVars(mascot, secondConfig.mascot.desktop, secondConfig.mascot.mobile);
scene.append(mascot);

const title = document.createElement("h1");
title.className = "second-screen__title";
title.innerHTML = secondConfig.title.text.replace("\n", "<br>");
toCssRectVars(title, secondConfig.title.desktop, secondConfig.title.mobile);
scene.append(title);

secondConfig.buttons.forEach((button) => {
  scene.append(createSocialButton(button));
});

const authStatus = document.createElement("p");
authStatus.style.position = "absolute";
authStatus.style.left = "50%";
authStatus.style.bottom = "24px";
authStatus.style.transform = "translateX(-50%)";
authStatus.style.padding = "10px 14px";
authStatus.style.borderRadius = "12px";
authStatus.style.fontFamily = "inherit";
authStatus.style.fontSize = "14px";
authStatus.style.background = "rgba(255,255,255,0.88)";
authStatus.style.color = "#1d2359";
authStatus.hidden = true;
scene.append(authStatus);

app.append(scene);

const links = Array.from(scene.querySelectorAll<HTMLAnchorElement>(".second-social-link"));

const setStatus = (text: string): void => {
  authStatus.hidden = false;
  authStatus.textContent = text;
};

const isLanHost = (hostname: string): boolean => {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;
  return (
    /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
};

const shouldUseLocalFallbackAuth = (): boolean => isLanHost(window.location.hostname);

const fallbackOauthIdKey = (provider: "google" | "telegram"): string => `triolingo.fallback.${provider}.oauthId`;

const getOrCreateFallbackOauthId = (provider: "google" | "telegram"): string => {
  const key = fallbackOauthIdKey(provider);
  const existing = localStorage.getItem(key);
  if (existing && existing.trim().length > 1) {
    return existing.trim();
  }

  const randomPart = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const generated = `lan-${provider}-${randomPart}`;
  localStorage.setItem(key, generated);
  return generated;
};

const doLocalFallbackAuth = async (provider: "google" | "telegram"): Promise<void> => {
  const startMessage =
    provider === "telegram"
      ? "Telegram-заглушка: выполняем локальный вход..."
      : "LAN-режим: выполняем локальный вход...";
  setStatus(startMessage);
  const oauthId = getOrCreateFallbackOauthId(provider);

  localStorage.setItem(
    "triolingo.localAuth.session",
    JSON.stringify({
      provider,
      oauthId,
      createdAt: new Date().toISOString(),
    }),
  );

  await authApi.oauthLogin(provider, {
    oauthId,
    name: provider === "telegram" ? "Telegram local user" : `LAN ${provider} user`,
  });

  setStatus("Вход выполнен. Переходим...");
  window.setTimeout(() => {
    window.location.href = "/third.html";
  }, 350);
};

let isAuthInProgress = false;

links.forEach((link) => {
  const provider = link.closest(".second-social-item")?.getAttribute("data-social-id");
  if (!provider || (provider !== "google" && provider !== "telegram")) return;

  link.addEventListener("click", async (event) => {
    event.preventDefault();
    if (isAuthInProgress) return;
    isAuthInProgress = true;

    try {
      if (provider === "telegram") {
        await doLocalFallbackAuth("telegram");
        return;
      }

      if (shouldUseLocalFallbackAuth()) {
        await doLocalFallbackAuth(provider);
        return;
      }

      setStatus("Перенаправляем в OAuth...");
      const origin = window.location.origin;
      const oauthStartUrl =
        provider === "google" ? authApi.getGoogleStartUrl(origin) : authApi.getTelegramStartUrl(origin);
      window.location.href = oauthStartUrl;
    } catch {
      setStatus("Не удалось выполнить вход. Попробуйте еще раз.");
      isAuthInProgress = false;
    }
  });
});


