import "../../shared/styles/base.css";
import "./exercise-build.css";
import { ApiError, exerciseApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import {
  buildDailyTaskUrl,
  clearMiniLessonSession,
  ensureMiniLessonSession,
  getBuildChallenge,
  isLessonStepUnlocked,
  markLessonStepCompleted,
  parseDailyTaskContext,
  parseLessonStepContext,
} from "../../shared/game-content";
import { exerciseBuildConfig } from "./config";

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
const challenge = dailyContext.taskId === "mini" && dailyContext.miniStep === "build" && roundState.round === 1
  ? ensureMiniLessonSession().build
  : getBuildChallenge();

const appRoot = document.createElement("main");
appRoot.className = "exercise-build-screen";
appRoot.style.setProperty("--bg-image", `url("${exerciseBuildConfig.assets.bg}")`);
appRoot.style.setProperty("--content-max-width", `${exerciseBuildConfig.layout.contentMaxWidth}px`);
appRoot.style.setProperty("--card-max-width", `${exerciseBuildConfig.layout.cardMaxWidth}px`);
appRoot.style.setProperty("--button-max-width", `${exerciseBuildConfig.layout.buttonMaxWidth}px`);

const optionsMarkup = challenge.options
  .map(
    (option, index) => `
      <button class="exercise-build-option" type="button" data-id="${index}" data-label="${option}">
        ${option}
      </button>
    `,
  )
  .join("");

appRoot.innerHTML = `
  <button class="exercise-build-close" type="button" aria-label="${exerciseBuildConfig.texts.closeAriaLabel}">
    <img src="${exerciseBuildConfig.assets.closeIcon}" alt="" />
  </button>

  <section class="exercise-build-main">
    <h1 class="exercise-build-title">${exerciseBuildConfig.texts.pageTitle}</h1>

    <article class="exercise-build-prompt-card">
      <p class="exercise-build-prompt">${challenge.prompt}</p>
    </article>

    <div class="exercise-build-options">${optionsMarkup}</div>

    <button class="exercise-build-check" type="button">${exerciseBuildConfig.texts.checkLabel}</button>
    <p class="exercise-build-status" hidden></p>
  </section>
`;

app.append(appRoot);

const closeButton = appRoot.querySelector<HTMLButtonElement>(".exercise-build-close");
const checkButton = appRoot.querySelector<HTMLButtonElement>(".exercise-build-check");
const statusEl = appRoot.querySelector<HTMLParagraphElement>(".exercise-build-status");
const optionButtons = Array.from(appRoot.querySelectorAll<HTMLButtonElement>(".exercise-build-option"));

if (!closeButton || !checkButton || !statusEl || optionButtons.length === 0) {
  throw new Error("Missing exercise-build controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";

const goBack = (): void => {
  window.location.href = exerciseBuildConfig.actions.closeHref;
};

const selectedOptionIds: string[] = [];
let hasWrongOrder = false;
let isSubmitting = false;

const updateCheckButtonState = (): void => {
  const allSelected = selectedOptionIds.length === optionButtons.length;
  checkButton.classList.toggle("exercise-build-check--ready", allSelected);
};

const resetWrongState = (): void => {
  hasWrongOrder = false;
  optionButtons.forEach((button) => button.classList.remove("is-wrong"));
};

const renderOptionState = (): void => {
  optionButtons.forEach((button) => {
    const optionId = button.dataset.id ?? "";
    const optionLabel = button.dataset.label ?? "";
    const selectedIndex = selectedOptionIds.indexOf(optionId);
    const isSelected = selectedIndex >= 0;

    button.classList.toggle("is-selected", isSelected);
    button.classList.toggle("is-wrong", hasWrongOrder);

    if (!isSelected) {
      button.textContent = optionLabel;
      return;
    }

    button.innerHTML = `
      <span class="exercise-build-option-remove">&times;</span>
      <span>${optionLabel}</span>
      <span class="exercise-build-option-counter">${selectedIndex + 1}</span>
    `;
  });
};

optionButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();

    const optionId = button.dataset.id ?? "";
    if (!optionId) return;

    const selectedIndex = selectedOptionIds.indexOf(optionId);
    if (selectedIndex >= 0) {
      resetWrongState();
      selectedOptionIds.splice(selectedIndex, 1);
      renderOptionState();
      updateCheckButtonState();
      statusEl.hidden = true;
      return;
    }

    resetWrongState();
    selectedOptionIds.push(optionId);
    renderOptionState();
    updateCheckButtonState();
    statusEl.hidden = true;
  });
});

closeButton.addEventListener("click", goBack);
checkButton.addEventListener("click", async () => {
  if (selectedOptionIds.length !== optionButtons.length || isSubmitting) return;
  if (lessonContext.lessonStep && !isLessonStepUnlocked(lessonContext.lessonStep)) {
    statusEl.hidden = false;
    statusEl.textContent = "Сначала пройдите предыдущие уровни.";
    return;
  }

  const labelById = new Map<string, string>();
  optionButtons.forEach((button) => {
    const id = button.dataset.id;
    const label = button.dataset.label;
    if (id && label) {
      labelById.set(id, label);
    }
  });

  const userSequence = selectedOptionIds.map((id) => labelById.get(id) ?? id);

  try {
    isSubmitting = true;
    checkButton.disabled = true;
    optionButtons.forEach((button) => {
      button.disabled = true;
    });
    const isFinalRound = roundState.round >= TOTAL_ROUNDS;
    statusEl.hidden = false;
    statusEl.textContent = `Проверяем раунд ${roundState.round}/${TOTAL_ROUNDS}...`;

    const result = await exerciseApi.check("build", {
      expectedSequence: challenge.expectedSequence,
      userSequence,
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

    hasWrongOrder = !result.correct;
    renderOptionState();
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
    isSubmitting = false;
    checkButton.disabled = false;
    optionButtons.forEach((button) => {
      button.disabled = false;
    });
    statusEl.hidden = false;
    statusEl.textContent = error instanceof ApiError ? error.message : "Не удалось проверить упражнение";
  }
});

renderOptionState();
updateCheckButtonState();
void ensureSession();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    goBack();
  }
});
