import "../../shared/styles/base.css";
import "./third.css";
import { thirdConfig } from "./config";
import type { FlagKind } from "./config";
import { ApiError, profileApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app container");
}

const setRectVars = (el: HTMLElement, rect: { x: number; y: number; w: number; h: number }): void => {
  el.style.setProperty("--x", `${rect.x}`);
  el.style.setProperty("--y", `${rect.y}`);
  el.style.setProperty("--w", `${rect.w}`);
  el.style.setProperty("--h", `${rect.h}`);
};

const flagImageByKind: Record<FlagKind, string> = {
  germany: "/assets/images/third/flags/germany.svg",
  uk: "/assets/images/third/flags/eng.svg",
  spain: "/assets/images/third/flags/spain.svg",
  portugal: "/assets/images/third/flags/portugal.svg",
  russia: "/assets/images/third/flags/russia.svg",
  france: "/assets/images/third/flags/france.svg",
  japan: "/assets/images/third/flags/japan.svg",
  italy: "/assets/images/third/flags/italy.svg",
  poland: "/assets/images/third/flags/poland.svg",
  belarus: "/assets/images/third/flags/belarus.svg",
  greece: "/assets/images/third/flags/greece.svg",
  hungary: "/assets/images/third/flags/veng.svg",
  turkey: "/assets/images/third/flags/turkey.svg",
  kazakhstan: "/assets/images/third/flags/kazakhstan.svg",
  romania: "/assets/images/third/flags/romania.svg",
};

const scene = document.createElement("main");
scene.className = "third-screen";

const bg = document.createElement("img");
bg.className = "third-bg";
bg.src = "/assets/images/third/background-clouds.png";
bg.alt = "Небо с облаками";
scene.append(bg);

thirdConfig.decorations.forEach((d) => {
  const wrap = document.createElement("div");
  wrap.className = "third-monster";
  setRectVars(wrap, d.rect);

  const img = document.createElement("img");
  img.src = "/assets/images/third/monsters-sprite.png";
  img.alt = "";
  img.style.setProperty("--sprite-left", `${d.sprite.left}`);
  img.style.setProperty("--sprite-top", `${d.sprite.top}`);
  img.style.setProperty("--sprite-w", `${d.sprite.w}`);
  img.style.setProperty("--sprite-h", `${d.sprite.h}`);
  wrap.append(img);
  scene.append(wrap);
});

const title = document.createElement("h1");
title.className = "third-title";
title.textContent = thirdConfig.title;
scene.append(title);

const board = document.createElement("section");
board.className = "third-board";
setRectVars(board, thirdConfig.board);
const boardContent = document.createElement("div");
boardContent.className = "third-board-content";
board.append(boardContent);

const status = document.createElement("p");
status.style.position = "absolute";
status.style.left = "50%";
status.style.bottom = "12px";
status.style.transform = "translateX(-50%)";
status.style.padding = "8px 12px";
status.style.borderRadius = "10px";
status.style.background = "rgba(255,255,255,0.9)";
status.style.color = "#1d2359";
status.hidden = true;

let selectedLanguageId = "";
const startButton = document.createElement("button");
startButton.className = "third-start";
startButton.type = "button";
startButton.textContent = "Start";
setRectVars(startButton, thirdConfig.start);
startButton.disabled = true;
startButton.addEventListener("click", async () => {
  if (!selectedLanguageId) return;
  try {
    startButton.disabled = true;
    status.hidden = false;
    status.textContent = "Сохраняем язык...";
    await profileApi.switchLanguage(selectedLanguageId);
    window.location.href = "/fourth.html";
  } catch (error) {
    startButton.disabled = false;
    status.hidden = false;
    status.textContent = error instanceof ApiError ? error.message : "Не удалось сохранить язык";
  }
});

thirdConfig.cards.forEach((card) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lang-card";
  btn.dataset.id = card.id;

  const flag = document.createElement("div");
  flag.className = "lang-flag";
  const flagImage = document.createElement("img");
  flagImage.className = "lang-flag-image";
  flagImage.alt = "";
  flagImage.src = flagImageByKind[card.flag];
  flag.append(flagImage);

  const label = document.createElement("span");
  label.className = "lang-label";
  label.textContent = card.label;

  btn.append(flag, label);
  btn.addEventListener("click", () => {
    boardContent.querySelectorAll(".lang-card").forEach((item) => item.classList.remove("is-selected"));
    btn.classList.add("is-selected");
    selectedLanguageId = card.id;
    startButton.disabled = false;
    status.hidden = true;
  });

  boardContent.append(btn);
});

scene.append(board, startButton, status);
app.append(scene);

void ensureSession();
