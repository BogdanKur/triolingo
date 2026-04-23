import "../../shared/styles/base.css";
import "./audio.css";
import { ApiError, exerciseApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import { ensureDailyChallengeSession, getAudioChallenge, parseDailyTaskContext } from "../../shared/game-content";
import { audioConfig } from "./config";

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
const challenge = dailyContext.taskId === "audio" && roundState.round === 1
  ? ensureDailyChallengeSession().audio
  : getAudioChallenge();

const root = document.createElement("main");
root.className = "audio-screen";
root.style.setProperty("--bg-image", `url("${audioConfig.assets.bg}")`);
root.style.setProperty("--content-max-width", `${audioConfig.layout.contentMaxWidth}px`);
root.style.setProperty("--card-max-width", `${audioConfig.layout.cardMaxWidth}px`);
root.style.setProperty("--button-max-width", `${audioConfig.layout.buttonMaxWidth}px`);

root.innerHTML = `
  <button class="audio-close" type="button" aria-label="${audioConfig.texts.closeAriaLabel}">
    <img src="${audioConfig.assets.closeIcon}" alt="" />
  </button>

  <section class="audio-main">
    <h1 class="audio-title">${audioConfig.texts.pageTitle}</h1>

    <article class="audio-card audio-card--prompt" data-id="${audioConfig.instruction.id}">
      <img class="audio-play-icon" src="${audioConfig.instruction.icon}" alt="" />
      <p class="audio-prompt-text">
        <span>${audioConfig.instruction.title}</span>
        <span>${audioConfig.instruction.subtitle}</span>
      </p>
    </article>

    <article class="audio-card audio-card--input">
      <textarea
        class="audio-input"
        aria-label="${audioConfig.texts.inputAriaLabel}"
        placeholder="${audioConfig.input.placeholder}"
        maxlength="${audioConfig.input.maxLength ?? 500}"
      ></textarea>
    </article>

    <button class="audio-check" type="button">${audioConfig.cta.label}</button>
    <p class="audio-status" hidden></p>
  </section>
`;

app.append(root);

const closeButton = root.querySelector<HTMLButtonElement>(".audio-close");
const checkButton = root.querySelector<HTMLButtonElement>(".audio-check");
const promptCard = root.querySelector<HTMLElement>(".audio-card--prompt");
const playIcon = root.querySelector<HTMLImageElement>(".audio-play-icon");
const input = root.querySelector<HTMLTextAreaElement>(".audio-input");
const statusEl = root.querySelector<HTMLParagraphElement>(".audio-status");

if (!closeButton || !checkButton || !promptCard || !playIcon || !input || !statusEl) {
  throw new Error("Missing audio controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";

let isAudioPlaying = false;
let isSubmitting = false;

const speechSynthesisApi =
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
const speechSupported = Boolean(speechSynthesisApi) && typeof window.SpeechSynthesisUtterance === "function";
let activeUtterance: SpeechSynthesisUtterance | null = null;

const updatePlayIcon = (): void => {
  playIcon.src = isAudioPlaying ? audioConfig.assets.playIconActive : audioConfig.assets.playIcon;
};

const setAudioPlaying = (value: boolean): void => {
  isAudioPlaying = value;
  updatePlayIcon();
  promptCard.setAttribute("aria-pressed", String(value));
};

const stopAudioPlayback = (): void => {
  if (speechSynthesisApi) {
    speechSynthesisApi.cancel();
  }
  activeUtterance = null;
  setAudioPlaying(false);
};

const playAudioPrompt = (): void => {
  if (!speechSupported || !speechSynthesisApi) {
    statusEl.hidden = false;
    statusEl.textContent = "В этом браузере нет встроенного озвучивания.";
    return;
  }

  if (isAudioPlaying) {
    stopAudioPlayback();
    statusEl.hidden = false;
    statusEl.textContent = "Воспроизведение остановлено.";
    return;
  }

  const utterance = new window.SpeechSynthesisUtterance(challenge.expected);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.onstart = () => {
    setAudioPlaying(true);
    statusEl.hidden = false;
    statusEl.textContent = "Воспроизводим аудио...";
  };
  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    setAudioPlaying(false);
    statusEl.hidden = false;
    statusEl.textContent = "Аудио воспроизведено. Введите услышанную фразу.";
  };
  utterance.onerror = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    setAudioPlaying(false);
    statusEl.hidden = false;
    statusEl.textContent = "Не удалось воспроизвести аудио.";
  };

  activeUtterance = utterance;
  speechSynthesisApi.cancel();
  speechSynthesisApi.speak(utterance);
};

const goBackToHome = (): void => {
  stopAudioPlayback();
  window.location.href = "/fifth.html";
};

closeButton.addEventListener("click", goBackToHome);

promptCard.setAttribute("role", "button");
promptCard.setAttribute("tabindex", "0");
promptCard.setAttribute("aria-label", "Слушать аудио");
promptCard.setAttribute("aria-pressed", "false");

promptCard.addEventListener("click", () => {
  playAudioPrompt();
});

promptCard.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  playAudioPrompt();
});

const updateCheckButtonState = (): void => {
  const hasText = input.value.trim().length > 0;
  checkButton.classList.toggle("audio-check--has-text", hasText);
};

checkButton.addEventListener("click", async () => {
  if (isSubmitting) return;
  const userAnswer = input.value.trim();
  if (!userAnswer) return;

  try {
    stopAudioPlayback();
    const isFinalRound = roundState.round >= TOTAL_ROUNDS;
    isSubmitting = true;
    checkButton.disabled = true;
    input.disabled = true;

    statusEl.hidden = false;
    statusEl.textContent = `Проверяем раунд ${roundState.round}/${TOTAL_ROUNDS}...`;

    const result = await exerciseApi.check("audio", {
      expected: challenge.expected,
      userAnswer,
      prompt: challenge.sourcePhrase,
      taskContext: dailyContext.taskId === "audio"
        ? {
            mode: "daily",
            taskId: "audio",
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

    if (result.dailyTask?.taskId === "audio") {
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
    statusEl.textContent = error instanceof ApiError ? error.message : "Не удалось проверить упражнение";
  }
});

input.addEventListener("input", updateCheckButtonState);
updateCheckButtonState();
updatePlayIcon();

void ensureSession();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    goBackToHome();
  }
});

window.addEventListener("beforeunload", () => {
  stopAudioPlayback();
});

