import "../../shared/styles/base.css";
import "./exercise-match.css";
import { ApiError, exerciseApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import { getMatchChallenge, isLessonStepUnlocked, markLessonStepCompleted, parseLessonStepContext } from "../../shared/game-content";
import { exerciseMatchConfig } from "./config";

const TOTAL_ROUNDS = 5;
const ROUND_DELAY_MS = 3000;

const readRoundState = (): { round: number; hadMistake: boolean } => {
  const params = new URLSearchParams(window.location.search);
  const rawRound = Number(params.get("round") ?? "1");
  const round = Number.isInteger(rawRound) && rawRound >= 1 && rawRound <= TOTAL_ROUNDS ? rawRound : 1;
  const hadMistake = params.get("hadMistake") === "1";
  return { round, hadMistake };
};

const nextRoundUrl = (hadMistake: boolean): string => {
  const url = new URL(window.location.href);
  url.searchParams.set("round", String(roundState.round + 1));
  if (hadMistake) {
    url.searchParams.set("hadMistake", "1");
  } else {
    url.searchParams.delete("hadMistake");
  }
  return `${url.pathname}${url.search}`;
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const lessonContext = parseLessonStepContext();
const roundState = readRoundState();
const challenge = getMatchChallenge();

const root = document.createElement("main");
root.className = "exercise-match-screen";
root.style.setProperty("--bg-image", `url("${exerciseMatchConfig.assets.bg}")`);
root.style.setProperty("--content-max-width", `${exerciseMatchConfig.layout.contentMaxWidth}px`);
root.style.setProperty("--card-max-width", `${exerciseMatchConfig.layout.cardMaxWidth}px`);
root.style.setProperty("--button-max-width", `${exerciseMatchConfig.layout.buttonMaxWidth}px`);

const leftWordsMarkup = challenge.leftWords
  .map(
    (word, index) => `
      <button class="exercise-match-word exercise-match-word--left" type="button" data-side="left" data-index="${index}">
        ${word}
      </button>
    `,
  )
  .join("");

const rightWordsMarkup = challenge.rightWords
  .map(
    (word, index) => `
      <button class="exercise-match-word exercise-match-word--right" type="button" data-side="right" data-index="${index}">
        ${word}
      </button>
    `,
  )
  .join("");

root.innerHTML = `
  <button class="exercise-match-close" type="button" aria-label="${exerciseMatchConfig.texts.closeAriaLabel}">
    <img src="${exerciseMatchConfig.assets.closeIcon}" alt="" />
  </button>

  <section class="exercise-match-main">
    <h1 class="exercise-match-title">${exerciseMatchConfig.texts.pageTitle}</h1>

    <div class="exercise-match-board">
      <div class="exercise-match-lines" aria-hidden="true"></div>
      <div class="exercise-match-column">${leftWordsMarkup}</div>
      <div class="exercise-match-column">${rightWordsMarkup}</div>
    </div>

    <p class="exercise-match-error" hidden>${exerciseMatchConfig.texts.errorText}</p>

    <button class="exercise-match-check" type="button">${exerciseMatchConfig.texts.checkLabel}</button>
  </section>
`;

app.append(root);

const closeButton = root.querySelector<HTMLButtonElement>(".exercise-match-close");
const checkButton = root.querySelector<HTMLButtonElement>(".exercise-match-check");
const board = root.querySelector<HTMLDivElement>(".exercise-match-board");
const linesLayer = root.querySelector<HTMLDivElement>(".exercise-match-lines");
const errorText = root.querySelector<HTMLParagraphElement>(".exercise-match-error");
const leftButtons = Array.from(root.querySelectorAll<HTMLButtonElement>(".exercise-match-word--left"));
const rightButtons = Array.from(root.querySelectorAll<HTMLButtonElement>(".exercise-match-word--right"));

if (!closeButton || !checkButton || !board || !linesLayer || !errorText || leftButtons.length === 0 || rightButtons.length === 0) {
  throw new Error("Missing exercise-match controls");
}

const goBack = (): void => {
  window.location.href = exerciseMatchConfig.actions.closeHref;
};

type MatchStatus = "pending" | "correct" | "wrong";
type MatchConnection = {
  leftIndex: number;
  rightIndex: number;
  status: MatchStatus;
};

let connections: MatchConnection[] = [];
let activeLeftIndex: number | null = null;
let activePointerId: number | null = null;
let dragEndPoint: { x: number; y: number } | null = null;
let isSubmitting = false;

const getLeftBlockStartPoint = (element: HTMLElement): { x: number; y: number } => {
  const rect = element.getBoundingClientRect();
  return { x: rect.right, y: rect.top + rect.height / 2 };
};

const getRightBlockEndPoint = (element: HTMLElement): { x: number; y: number } => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top + rect.height / 2 };
};

const toBoardPoint = (clientX: number, clientY: number): { x: number; y: number } => {
  const rect = board.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
};

const buildLine = (start: { x: number; y: number }, end: { x: number; y: number }, className: string): HTMLSpanElement => {
  const line = document.createElement("span");
  line.className = `exercise-match-line ${className}`;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  line.style.left = `${start.x}px`;
  line.style.top = `${start.y}px`;
  line.style.width = `${length}px`;
  line.style.transform = `rotate(${angle}deg)`;
  return line;
};

const renderLines = (): void => {
  linesLayer.innerHTML = "";

  connections.forEach((connection) => {
    const leftButton = leftButtons[connection.leftIndex];
    const rightButton = rightButtons[connection.rightIndex];
    if (!leftButton || !rightButton) return;

    const leftStart = getLeftBlockStartPoint(leftButton);
    const rightEnd = getRightBlockEndPoint(rightButton);
    const start = toBoardPoint(leftStart.x, leftStart.y);
    const end = toBoardPoint(rightEnd.x, rightEnd.y);

    const statusClass =
      connection.status === "correct"
        ? "exercise-match-line--correct"
        : connection.status === "wrong"
          ? "exercise-match-line--wrong"
          : "exercise-match-line--pending";

    linesLayer.append(buildLine(start, end, statusClass));
  });

  if (activeLeftIndex !== null && dragEndPoint) {
    const activeLeftButton = leftButtons[activeLeftIndex];
    if (activeLeftButton) {
      const activeStart = getLeftBlockStartPoint(activeLeftButton);
      const start = toBoardPoint(activeStart.x, activeStart.y);
      linesLayer.append(buildLine(start, dragEndPoint, "exercise-match-line--active"));
    }
  }
};

const updateCheckButtonState = (): void => {
  checkButton.classList.toggle("exercise-match-check--ready", connections.length === leftButtons.length);
};

const clearCheckResult = (): void => {
  connections = connections.map((connection) => ({ ...connection, status: "pending" }));
  errorText.hidden = true;
  errorText.style.color = "#f93939";
};

const connectPair = (leftIndex: number, rightIndex: number): void => {
  clearCheckResult();
  connections = connections.filter((connection) => connection.leftIndex !== leftIndex && connection.rightIndex !== rightIndex);
  connections.push({ leftIndex, rightIndex, status: "pending" });
  updateCheckButtonState();
  renderLines();
};

const stopActiveDrag = (): void => {
  activeLeftIndex = null;
  activePointerId = null;
  dragEndPoint = null;
  renderLines();
};

leftButtons.forEach((button, index) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    clearCheckResult();
    activeLeftIndex = index;
    activePointerId = event.pointerId;
    dragEndPoint = toBoardPoint(event.clientX, event.clientY);
    renderLines();
  });
});

document.addEventListener("pointermove", (event) => {
  if (activeLeftIndex === null || activePointerId !== event.pointerId) return;
  dragEndPoint = toBoardPoint(event.clientX, event.clientY);
  renderLines();
});

document.addEventListener("pointerup", (event) => {
  if (activeLeftIndex === null || activePointerId !== event.pointerId) return;

  const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
  const rightButton = target?.closest<HTMLButtonElement>(".exercise-match-word--right");
  if (rightButton) {
    const rightIndex = Number(rightButton.dataset.index ?? -1);
    if (Number.isInteger(rightIndex) && rightIndex >= 0) {
      connectPair(activeLeftIndex, rightIndex);
    }
  }

  stopActiveDrag();
});

document.addEventListener("pointercancel", () => {
  if (activeLeftIndex === null) return;
  stopActiveDrag();
});

closeButton.addEventListener("click", goBack);
checkButton.addEventListener("click", async () => {
  if (connections.length !== leftButtons.length || isSubmitting) return;
  if (lessonContext.lessonStep && !isLessonStepUnlocked(lessonContext.lessonStep)) {
    errorText.hidden = false;
    errorText.style.color = "#f93939";
    errorText.textContent = "Сначала пройдите предыдущие уровни.";
    return;
  }

  try {
    const isFinalRound = roundState.round >= TOTAL_ROUNDS;
    isSubmitting = true;
    checkButton.disabled = true;
    leftButtons.forEach((button) => {
      button.disabled = true;
    });
    rightButtons.forEach((button) => {
      button.disabled = true;
    });

    const pairs = connections.map((connection) => ({
      left: challenge.leftWords[connection.leftIndex] ?? "",
      right: challenge.rightWords[connection.rightIndex] ?? "",
    }));

    const result = await exerciseApi.check("match", {
      pairs,
      taskContext: lessonContext.lessonStep
        ? {
            mode: "lessonMap",
            stepId: lessonContext.lessonStep,
          }
        : undefined,
      round: {
        current: roundState.round,
        total: TOTAL_ROUNDS,
      },
      session: isFinalRound
        ? {
            forceFail: roundState.hadMistake,
          }
        : undefined,
    });
    const hadMistake = roundState.hadMistake || !result.correct;

    if (result.correct) {
      if (lessonContext.lessonStep) {
        markLessonStepCompleted(lessonContext.lessonStep);
      }
      connections = connections.map((connection) => ({ ...connection, status: "correct" }));
    }

    if (!isFinalRound) {
      connections = connections.map((connection) => ({ ...connection, status: result.correct ? "correct" : "wrong" }));
      errorText.hidden = false;
      errorText.style.color = result.correct ? "#1fa353" : "#f93939";
      errorText.textContent = result.correct
        ? `Раунд ${roundState.round}/${TOTAL_ROUNDS} пройден. Следующий раунд через 3 сек.`
        : `Раунд ${roundState.round}/${TOTAL_ROUNDS} с ошибкой. Следующий раунд через 3 сек.`;
      renderLines();
      window.setTimeout(() => {
        window.location.href = nextRoundUrl(hadMistake);
      }, ROUND_DELAY_MS);
      return;
    }

    connections = connections.map((connection) => ({ ...connection, status: result.correct ? "correct" : "wrong" }));
    errorText.hidden = false;
    errorText.style.color = result.correct ? "#1fa353" : "#f93939";
    errorText.textContent = result.correct
      ? (lessonContext.lessonStep ? "Игра завершена. Уровень пройден: +10 XP" : "Игра завершена. Все 5 раундов пройдены.")
      : `Игра завершена. ${result.feedback}`;
    renderLines();
    window.setTimeout(() => {
      goBack();
    }, ROUND_DELAY_MS);
  } catch (error) {
    isSubmitting = false;
    checkButton.disabled = false;
    leftButtons.forEach((button) => {
      button.disabled = false;
    });
    rightButtons.forEach((button) => {
      button.disabled = false;
    });
    errorText.hidden = false;
    errorText.style.color = "#f93939";
    errorText.textContent = error instanceof ApiError ? error.message : "Не удалось проверить соответствия";
  }
});

void ensureSession();

document.addEventListener("keydown", (event) => {
  if (activeLeftIndex !== null && event.key === "Escape") {
    stopActiveDrag();
    return;
  }

  if (event.key === "Escape") {
    goBack();
  }
});

window.addEventListener("resize", renderLines);
updateCheckButtonState();
renderLines();
