import "../../shared/styles/base.css";
import "./translation.css";
import { ApiError, exerciseApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import { ensureDailyChallengeSession, getTranslationChallenge, parseDailyTaskContext } from "../../shared/game-content";
import { translationConfig } from "./config";

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
const roundState = readRoundState();
const challenge = dailyContext.taskId === "translation" && roundState.round === 1
  ? ensureDailyChallengeSession().translation
  : getTranslationChallenge();

const root = document.createElement("main");
root.className = "translation-screen";
root.style.setProperty("--bg-image", `url("${translationConfig.assets.bg}")`);
root.style.setProperty("--content-max-width", `${translationConfig.layout.contentMaxWidth}px`);
root.style.setProperty("--card-max-width", `${translationConfig.layout.cardMaxWidth}px`);
root.style.setProperty("--button-max-width", `${translationConfig.layout.buttonMaxWidth}px`);

root.innerHTML = `
  <button class="translation-close" type="button" aria-label="${translationConfig.texts.closeAriaLabel}">
    <img src="${translationConfig.assets.closeIcon}" alt="" />
  </button>

  <section class="translation-main">
    <h1 class="translation-title">${translationConfig.texts.pageTitle}</h1>

    <article class="translation-card translation-card--source">
      <p class="translation-source-text">${challenge.sourcePhrase}</p>
    </article>

    <article class="translation-card translation-card--input">
      <textarea
        class="translation-input"
        aria-label="${translationConfig.texts.inputAriaLabel}"
        placeholder="${translationConfig.input.placeholder}"
        maxlength="${translationConfig.input.maxLength ?? 500}"
      ></textarea>
    </article>

    <button class="translation-check" type="button">${translationConfig.texts.checkLabel}</button>
    <p class="translation-status" hidden></p>
  </section>
`;

app.append(root);

const closeButton = root.querySelector<HTMLButtonElement>(".translation-close");
const checkButton = root.querySelector<HTMLButtonElement>(".translation-check");
const input = root.querySelector<HTMLTextAreaElement>(".translation-input");
const statusEl = root.querySelector<HTMLParagraphElement>(".translation-status");

if (!closeButton || !checkButton || !input || !statusEl) {
  throw new Error("Missing translation controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";

let isSubmitting = false;

const goBackToHome = (): void => {
  window.location.href = "/fifth.html";
};

closeButton.addEventListener("click", goBackToHome);
checkButton.addEventListener("click", async () => {
  if (isSubmitting) return;
  const userAnswer = input.value.trim();
  if (!userAnswer) return;

  try {
    const isFinalRound = roundState.round >= TOTAL_ROUNDS;
    isSubmitting = true;
    checkButton.disabled = true;
    input.disabled = true;

    statusEl.hidden = false;
    statusEl.textContent = `Проверяем раунд ${roundState.round}/${TOTAL_ROUNDS}...`;

    const result = await exerciseApi.check("translation", {
      expected: challenge.expected,
      userAnswer,
      prompt: challenge.sourcePhrase,
      taskContext: dailyContext.taskId === "translation"
        ? {
            mode: "daily",
            taskId: "translation",
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

    if (!isFinalRound) {
      statusEl.textContent = result.correct
        ? `Раунд ${roundState.round}/${TOTAL_ROUNDS} пройден. Следующий раунд через 3 сек.`
        : `Раунд ${roundState.round}/${TOTAL_ROUNDS} с ошибкой. Следующий раунд через 3 сек.`;
      window.setTimeout(() => {
        window.location.href = nextRoundUrl(hadMistake);
      }, ROUND_DELAY_MS);
      return;
    }

    if (result.dailyTask?.taskId === "translation") {
      if (result.dailyTask.status === "passed") {
        statusEl.textContent = `Задание выполнено! +${result.rewards.crystals} кристалл и +${result.rewards.xp} XP`;
      } else {
        statusEl.textContent = "Попытка использована. Это задание на сегодня завершено.";
      }

      window.setTimeout(() => {
        window.location.href = "/fifth.html";
      }, ROUND_DELAY_MS);
      return;
    }

    statusEl.textContent = result.correct
      ? "Игра завершена. Все 5 раундов пройдены."
      : `Игра завершена. ${result.grammarHint ?? result.feedback}`;

    window.setTimeout(() => {
      goBackToHome();
    }, ROUND_DELAY_MS);
  } catch (error) {
    isSubmitting = false;
    checkButton.disabled = false;
    input.disabled = false;
    statusEl.hidden = false;
    statusEl.textContent = error instanceof ApiError ? error.message : "Не удалось проверить перевод";
  }
});

const updateCheckButtonState = (): void => {
  const hasText = input.value.trim().length > 0;
  checkButton.classList.toggle("translation-check--has-text", hasText);
};

input.addEventListener("input", updateCheckButtonState);
updateCheckButtonState();

void ensureSession();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    goBackToHome();
  }
});

