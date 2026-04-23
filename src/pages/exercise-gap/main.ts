import "../../shared/styles/base.css";
import "./exercise-gap.css";
import { ApiError, exerciseApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import {
  buildDailyTaskUrl,
  clearMiniLessonSession,
  ensureMiniLessonSession,
  getGapChallenge,
  isLessonStepUnlocked,
  markLessonStepCompleted,
  parseDailyTaskContext,
  parseLessonStepContext,
} from "../../shared/game-content";
import { exerciseGapConfig } from "./config";

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

const dailyContext = parseDailyTaskContext();
const lessonContext = parseLessonStepContext();
const roundState = readRoundState();
const challenge = dailyContext.taskId === "mini" && dailyContext.miniStep === "gap" && roundState.round === 1
  ? ensureMiniLessonSession().gap
  : getGapChallenge();

const root = document.createElement("main");
root.className = "exercise-gap-screen";
root.style.setProperty("--bg-image", `url("${exerciseGapConfig.assets.bg}")`);
root.style.setProperty("--content-max-width", `${exerciseGapConfig.layout.contentMaxWidth}px`);
root.style.setProperty("--card-max-width", `${exerciseGapConfig.layout.cardMaxWidth}px`);
root.style.setProperty("--button-max-width", `${exerciseGapConfig.layout.buttonMaxWidth}px`);

const optionsMarkup = challenge.options
  .map(
    (option, index) => `
      <button class="exercise-gap-option" type="button" data-id="${index}">
        ${option}
      </button>
    `,
  )
  .join("");

const promptWithDropzone = challenge.prompt.replace(
  "______",
  `<span class="exercise-gap-dropzone" data-filled="false">______</span>`,
);

root.innerHTML = `
  <button class="exercise-gap-close" type="button" aria-label="${exerciseGapConfig.texts.closeAriaLabel}">
    <img src="${exerciseGapConfig.assets.closeIcon}" alt="" />
  </button>

  <section class="exercise-gap-main">
    <h1 class="exercise-gap-title">${exerciseGapConfig.texts.pageTitle}</h1>

    <article class="exercise-gap-prompt-card">
      <p class="exercise-gap-prompt">${promptWithDropzone}</p>
    </article>

    <div class="exercise-gap-options">${optionsMarkup}</div>

    <button class="exercise-gap-check" type="button">${exerciseGapConfig.texts.checkLabel}</button>
    <p class="exercise-gap-status" hidden></p>
  </section>
`;

app.append(root);

const closeButton = root.querySelector<HTMLButtonElement>(".exercise-gap-close");
const checkButton = root.querySelector<HTMLButtonElement>(".exercise-gap-check");
const dropzone = root.querySelector<HTMLSpanElement>(".exercise-gap-dropzone");
const statusEl = root.querySelector<HTMLParagraphElement>(".exercise-gap-status");
const optionButtons = Array.from(root.querySelectorAll<HTMLButtonElement>(".exercise-gap-option"));

if (!closeButton || !checkButton || !dropzone || !statusEl || optionButtons.length === 0) {
  throw new Error("Missing exercise-gap controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";

const goBack = (): void => {
  window.location.href = exerciseGapConfig.actions.closeHref;
};

let filledOptionButton: HTMLButtonElement | null = null;
let selectedOptionId: string | null = null;
let isSubmitting = false;

const updateCheckButtonState = (): void => {
  checkButton.classList.toggle("exercise-gap-check--has-answer", Boolean(selectedOptionId));
};

const resetDropzoneResult = (): void => {
  dropzone.classList.remove("exercise-gap-dropzone--correct", "exercise-gap-dropzone--wrong");
};

const fillDropzone = (optionButton: HTMLButtonElement): void => {
  if (filledOptionButton && filledOptionButton !== optionButton) {
    filledOptionButton.hidden = false;
  }

  const optionLabel = optionButton.textContent?.trim() ?? "";
  filledOptionButton = optionButton;
  selectedOptionId = optionButton.dataset.id ?? null;

  optionButton.hidden = true;
  dropzone.textContent = optionLabel;
  dropzone.dataset.filled = "true";
  resetDropzoneResult();
  statusEl.hidden = true;
  updateCheckButtonState();
};

const isPointInDropzone = (clientX: number, clientY: number): boolean => {
  const rect = dropzone.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
};

optionButtons.forEach((optionButton) => {
  optionButton.addEventListener("pointerdown", (downEvent) => {
    if (optionButton.hidden) return;

    downEvent.preventDefault();
    optionButton.setPointerCapture(downEvent.pointerId);

    const buttonRect = optionButton.getBoundingClientRect();
    const ghost = optionButton.cloneNode(true) as HTMLButtonElement;
    ghost.classList.add("exercise-gap-option--ghost");
    document.body.append(ghost);

    const pointerOffsetX = downEvent.clientX - buttonRect.left;
    const pointerOffsetY = downEvent.clientY - buttonRect.top;

    const moveGhost = (clientX: number, clientY: number): void => {
      ghost.style.left = `${clientX - pointerOffsetX}px`;
      ghost.style.top = `${clientY - pointerOffsetY}px`;
    };

    moveGhost(downEvent.clientX, downEvent.clientY);

    const onPointerMove = (moveEvent: PointerEvent): void => {
      moveGhost(moveEvent.clientX, moveEvent.clientY);
    };

    const stopDragging = (upEvent: PointerEvent): void => {
      if (isPointInDropzone(upEvent.clientX, upEvent.clientY)) {
        fillDropzone(optionButton);
      }

      ghost.remove();
      optionButton.releasePointerCapture(upEvent.pointerId);
      optionButton.removeEventListener("pointermove", onPointerMove);
      optionButton.removeEventListener("pointerup", stopDragging);
      optionButton.removeEventListener("pointercancel", stopDragging);
    };

    optionButton.addEventListener("pointermove", onPointerMove);
    optionButton.addEventListener("pointerup", stopDragging);
    optionButton.addEventListener("pointercancel", stopDragging);
  });
});

closeButton.addEventListener("click", goBack);
checkButton.addEventListener("click", async () => {
  if (!selectedOptionId || !filledOptionButton || isSubmitting) return;
  if (lessonContext.lessonStep && !isLessonStepUnlocked(lessonContext.lessonStep)) {
    statusEl.hidden = false;
    statusEl.textContent = "Сначала пройдите предыдущие уровни.";
    return;
  }

  try {
    isSubmitting = true;
    checkButton.disabled = true;
    const isFinalRound = roundState.round >= TOTAL_ROUNDS;
    statusEl.hidden = false;
    statusEl.textContent = `Проверяем раунд ${roundState.round}/${TOTAL_ROUNDS}...`;

    const userAnswer = filledOptionButton.textContent?.trim() ?? "";
    const result = await exerciseApi.check("gap", {
      expected: challenge.expected,
      userAnswer,
      prompt: challenge.prompt,
      taskContext: dailyContext.isDaily && dailyContext.taskId
        ? {
            mode: "daily",
            taskId: dailyContext.taskId,
            miniStep: dailyContext.miniStep ?? undefined,
          }
        : lessonContext.lessonStep
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

    resetDropzoneResult();
    dropzone.classList.add(result.correct ? "exercise-gap-dropzone--correct" : "exercise-gap-dropzone--wrong");
    const hadMistake = roundState.hadMistake || !result.correct;

    if (!isFinalRound) {
      statusEl.textContent = result.correct
        ? `Раунд ${roundState.round}/${TOTAL_ROUNDS} пройден. Следующий раунд через 3 сек.`
        : `Раунд ${roundState.round}/${TOTAL_ROUNDS} с ошибкой. Следующий раунд через 3 сек.`;
      window.setTimeout(() => {
        window.location.href = nextRoundUrl(hadMistake);
      }, ROUND_DELAY_MS);
      return;
    }

    if (result.dailyTask?.taskId === "mini") {
      if (result.dailyTask.status === "in_progress" && result.dailyTask.nextMiniStep) {
        statusEl.textContent = "Шаг мини-урока пройден. Переходим дальше...";
        window.setTimeout(() => {
          window.location.href = buildDailyTaskUrl("mini", result.dailyTask?.nextMiniStep ?? "speak");
        }, ROUND_DELAY_MS);
        return;
      }

      if (result.dailyTask.status === "passed") {
        clearMiniLessonSession();
        statusEl.textContent = `Мини-урок пройден! +${result.rewards.crystals} кристалла и +${result.rewards.xp} XP`;
        window.setTimeout(() => {
          window.location.href = "/fifth.html";
        }, ROUND_DELAY_MS);
        return;
      }

      clearMiniLessonSession();
      statusEl.textContent = "Мини-урок завершен. Повторить можно завтра.";
      window.setTimeout(() => {
        window.location.href = "/fifth.html";
      }, ROUND_DELAY_MS);
      return;
    }

    if (result.correct && lessonContext.lessonStep) {
      markLessonStepCompleted(lessonContext.lessonStep);
      statusEl.textContent = "Игра завершена. Уровень пройден: +10 XP";
    } else if (result.correct) {
      statusEl.textContent = "Игра завершена. Все 5 раундов пройдены.";
    } else {
      statusEl.textContent = `Игра завершена. ${result.grammarHint ?? result.feedback}`;
    }

    window.setTimeout(() => {
      goBack();
    }, ROUND_DELAY_MS);
  } catch (error) {
    checkButton.disabled = false;
    isSubmitting = false;
    statusEl.hidden = false;
    statusEl.textContent = error instanceof ApiError ? error.message : "Не удалось проверить упражнение";
  }
});

updateCheckButtonState();
void ensureSession();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    goBack();
  }
});
