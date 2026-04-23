import "../../shared/styles/base.css";
import "./welcome.css";
import type { DecorationItem, Rect } from "../../shared/types/welcome";
import { authApi, sessionStorageApi, type SessionUser } from "../../shared/api";
import { hydrateNightModeFromStorage } from "../../shared/theme";
import { welcomeConfig } from "./config";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app container");
}

const hasCourse = (user: SessionUser): boolean => {
  const status = user.subscriptionStatus.trim().toLowerCase();
  return !["", "free", "none", "basic", "starter"].includes(status);
};

const resolveHomePath = (user: SessionUser): string => (hasCourse(user) ? "/premium-home.html" : "/fifth.html");

const tryRedirectAuthorizedUser = async (): Promise<boolean> => {
  const token = sessionStorageApi.getToken();
  if (!token) return false;

  try {
    const user = await authApi.me();
    window.location.href = resolveHomePath(user);
    return true;
  } catch {
    sessionStorageApi.clearSession();
    return false;
  }
};

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

const createDecoration = (item: DecorationItem): HTMLElement => {
  const wrapper = document.createElement("div");
  wrapper.className = "welcome-decoration";
  wrapper.dataset.decorationId = item.id;
  toCssRectVars(wrapper, item.desktop, item.mobile);

  const img = document.createElement("img");
  img.src = item.src;
  img.alt = item.alt;
  img.loading = "eager";

  img.style.setProperty("--sprite-left", `${item.sprite.leftPct}`);
  img.style.setProperty("--sprite-top", `${item.sprite.topPct}`);
  img.style.setProperty("--sprite-width", `${item.sprite.widthPct}`);
  img.style.setProperty("--sprite-height", `${item.sprite.heightPct}`);

  wrapper.append(img);
  return wrapper;
};

const renderWelcome = (): void => {
  const scene = document.createElement("main");
  scene.className = "welcome-scene";

  const updateDecorationScale = (): void => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const baseWidth = isMobile ? 390 : 1200;
    const baseHeight = isMobile ? 844 : 700;
    const scaleX = window.innerWidth / baseWidth;
    const scaleY = window.innerHeight / baseHeight;
    const uniformScale = Math.min(scaleX, scaleY);

    scene.style.setProperty("--scene-scale-x", `${scaleX}`);
    scene.style.setProperty("--scene-scale-y", `${scaleY}`);
    scene.style.setProperty("--scene-scale-uniform", `${uniformScale}`);
  };

  updateDecorationScale();
  window.addEventListener("resize", updateDecorationScale);

  const background = document.createElement("img");
  background.className = "welcome-background";
  background.src = welcomeConfig.background.src;
  background.alt = welcomeConfig.background.alt;
  scene.append(background);

  welcomeConfig.decorations.forEach((item) => {
    scene.append(createDecoration(item));
  });

  const title = document.createElement("h1");
  title.className = "welcome-title";
  title.textContent = welcomeConfig.title.text;
  toCssRectVars(title, welcomeConfig.title.desktop, welcomeConfig.title.mobile);
  scene.append(title);

  const cta = document.createElement("a");
  cta.className = "welcome-cta";
  cta.textContent = welcomeConfig.cta.text;
  cta.href = welcomeConfig.cta.href;
  toCssRectVars(cta, welcomeConfig.cta.desktop, welcomeConfig.cta.mobile);
  scene.append(cta);

  app.append(scene);
};

const bootstrap = async (): Promise<void> => {
  hydrateNightModeFromStorage();
  const redirected = await tryRedirectAuthorizedUser();
  if (redirected) return;
  renderWelcome();
};

void bootstrap();
