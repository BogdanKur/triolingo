import "../../shared/styles/base.css";
import "./exercise-word.css";
import { ApiError, exerciseApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import { getWordChallenge, isLessonStepUnlocked, markLessonStepCompleted, parseLessonStepContext } from "../../shared/game-content";
import { exerciseWordConfig } from "./config";

const TOTAL_ROUNDS = 5;
const ROUND_DELAY_MS = 3000;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const lessonContext = parseLessonStepContext();

const createRounds = (): Array<ReturnType<typeof getWordChallenge>> => {
  const rounds: Array<ReturnType<typeof getWordChallenge>> = [];
  const used = new Set<string>();

  while (rounds.length < TOTAL_ROUNDS) {
    const challenge = getWordChallenge();
    if (used.has(challenge.id)) continue;
    used.add(challenge.id);
    rounds.push(challenge);
  }

  return rounds;
};

const rounds = createRounds();
let currentRoundIndex = 0;
let hadMistake = false;
let isTransitioning = false;

const root = document.createElement("main");
root.className = "exercise-word-screen";
root.style.setProperty("--bg-image", `url("${exerciseWordConfig.assets.bg}")`);
root.style.setProperty("--content-max-width", `${exerciseWordConfig.layout.contentMaxWidth}px`);
root.style.setProperty("--card-max-width", `${exerciseWordConfig.layout.cardMaxWidth}px`);
root.style.setProperty("--button-max-width", `${exerciseWordConfig.layout.buttonMaxWidth}px`);

root.innerHTML = `
  <button class="exercise-word-close" type="button" aria-label="${exerciseWordConfig.texts.closeAriaLabel}">
    <img src="${exerciseWordConfig.assets.closeIcon}" alt="" />
  </button>

  <section class="exercise-word-main">
    <h1 class="exercise-word-title">${exerciseWordConfig.texts.pageTitle}</h1>

    <div class="exercise-word-layout">
      <article class="exercise-word-illustration-wrap">
        <img class="exercise-word-illustration" src="${exerciseWordConfig.assets.illustration}" alt="" />
      </article>

      <section class="exercise-word-content">
        <p class="exercise-word-prompt"></p>
        <div class="exercise-word-options"></div>
      </section>
    </div>

    <button class="exercise-word-check" type="button">${exerciseWordConfig.texts.checkLabel}</button>
    <p class="exercise-word-status" hidden></p>
  </section>
`;

app.append(root);

const closeButton = root.querySelector<HTMLButtonElement>(".exercise-word-close");
const checkButton = root.querySelector<HTMLButtonElement>(".exercise-word-check");
const statusEl = root.querySelector<HTMLParagraphElement>(".exercise-word-status");
const promptEl = root.querySelector<HTMLParagraphElement>(".exercise-word-prompt");
const optionsEl = root.querySelector<HTMLDivElement>(".exercise-word-options");

if (!closeButton || !checkButton || !statusEl || !promptEl || !optionsEl) {
  throw new Error("Missing exercise-word controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";

const goBack = (): void => {
  window.location.href = exerciseWordConfig.actions.closeHref;
};

closeButton.addEventListener("click", goBack);

let optionButtons: HTMLButtonElement[] = [];
let selectedOptionId: string | null = null;

const updateCheckButtonState = (): void => {
  checkButton.classList.toggle("exercise-word-check--has-selection", Boolean(selectedOptionId));
};

const resetOptionState = (): void => {
  optionButtons.forEach((button) => {
    button.classList.remove("exercise-word-option--selected", "exercise-word-option--correct", "exercise-word-option--wrong");
    button.setAttribute("aria-pressed", "false");
  });
};

const setControlsDisabled = (disabled: boolean): void => {
  checkButton.disabled = disabled;
  optionButtons.forEach((button) => {
    button.disabled = disabled;
  });
};

const renderRound = (): void => {
  const challenge = rounds[currentRoundIndex];
  if (!challenge) return;

  promptEl.textContent = challenge.promptWord;
  optionsEl.innerHTML = challenge.options
    .map(
      (option, index) => `
        <button class="exercise-word-option" type="button" data-id="opt-${index}">
          ${option}
        </button>
      `,
    )
    .join("");

  optionButtons = Array.from(optionsEl.querySelectorAll<HTMLButtonElement>(".exercise-word-option"));
  selectedOptionId = null;
  statusEl.hidden = true;
  setControlsDisabled(false);
  updateCheckButtonState();

  optionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (isTransitioning) return;
      selectedOptionId = button.dataset.id ?? null;
      resetOptionState();
      button.classList.add("exercise-word-option--selected");
      button.setAttribute("aria-pressed", "true");
      statusEl.hidden = true;
      updateCheckButtonState();
    });
  });
};

checkButton.addEventListener("click", async () => {
  if (!selectedOptionId || isTransitioning) return;
  const selectedButton = optionButtons.find((button) => button.dataset.id === selectedOptionId);
  if (!selectedButton) return;

  if (lessonContext.lessonStep && !isLessonStepUnlocked(lessonContext.lessonStep)) {
    statusEl.hidden = false;
    statusEl.textContent = "Сначала пройдите предыдущие уровни.";
    return;
  }

  try {
    const challenge = rounds[currentRoundIndex];
    if (!challenge) return;

    const isFinalRound = currentRoundIndex + 1 >= TOTAL_ROUNDS;
    setControlsDisabled(true);
    statusEl.hidden = false;
    statusEl.textContent = `Проверяем раунд ${currentRoundIndex + 1}/${TOTAL_ROUNDS}...`;

    const result = await exerciseApi.check("word", {
      expected: challenge.expected,
      userAnswer: selectedButton.textContent?.trim() ?? "",
      prompt: challenge.promptWord,
      taskContext: lessonContext.lessonStep
        ? {
            mode: "lessonMap",
            stepId: lessonContext.lessonStep,
          }
        : undefined,
      round: {
        current: currentRoundIndex + 1,
        total: TOTAL_ROUNDS,
      },
      session: isFinalRound
        ? {
            forceFail: hadMistake,
          }
        : undefined,
    });

    selectedButton.classList.remove("exercise-word-option--selected");
    selectedButton.classList.add(result.correct ? "exercise-word-option--correct" : "exercise-word-option--wrong");

    hadMistake = hadMistake || !result.correct;

    if (!isFinalRound) {
      statusEl.textContent = result.correct
        ? `Раунд ${currentRoundIndex + 1}/${TOTAL_ROUNDS}: верно. Следующий раунд через 3 сек.`
        : `Раунд ${currentRoundIndex + 1}/${TOTAL_ROUNDS}: ошибка. Следующий раунд через 3 сек.`;

      isTransitioning = true;
      window.setTimeout(() => {
        currentRoundIndex += 1;
        isTransitioning = false;
        renderRound();
      }, ROUND_DELAY_MS);
      return;
    }

    if (result.correct && lessonContext.lessonStep) {
      markLessonStepCompleted(lessonContext.lessonStep);
      statusEl.textContent = "Игра завершена. Уровень пройден: +10 XP";
    } else if (result.correct) {
      statusEl.textContent = "Игра завершена. Раунды пройдены успешно.";
    } else {
      statusEl.textContent = `Игра завершена. ${result.grammarHint ?? result.feedback}`;
    }

    window.setTimeout(goBack, ROUND_DELAY_MS);
  } catch (error) {
    setControlsDisabled(false);
    statusEl.hidden = false;
    statusEl.textContent = error instanceof ApiError ? error.message : "Не удалось проверить упражнение";
  }
});

renderRound();
void ensureSession();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    goBack();
  }
});

