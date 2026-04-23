import "../../shared/styles/base.css";
import "./exercise-speak.css";
import { ApiError, exerciseApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import {
  buildDailyTaskUrl,
  clearMiniLessonSession,
  ensureMiniLessonSession,
  getSpeakChallenge,
  isLessonStepUnlocked,
  markLessonStepCompleted,
  parseDailyTaskContext,
  parseLessonStepContext,
} from "../../shared/game-content";
import { exerciseSpeakConfig } from "./config";

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

interface SpeechRecognitionResultLike {
  readonly transcript: string;
}

interface SpeechRecognitionEventLike extends Event {
  readonly results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart?: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const dailyContext = parseDailyTaskContext();
const lessonContext = parseLessonStepContext();
const roundState = readRoundState();
const challenge = dailyContext.taskId === "mini" && dailyContext.miniStep === "speak" && roundState.round === 1
  ? ensureMiniLessonSession().speak
  : getSpeakChallenge();

const root = document.createElement("main");
root.className = "exercise-speak-screen";
root.style.setProperty("--bg-image", `url("${exerciseSpeakConfig.assets.bg}")`);
root.style.setProperty("--content-max-width", `${exerciseSpeakConfig.layout.contentMaxWidth}px`);
root.style.setProperty("--card-max-width", `${exerciseSpeakConfig.layout.cardMaxWidth}px`);
root.style.setProperty("--button-max-width", `${exerciseSpeakConfig.layout.buttonMaxWidth}px`);

root.innerHTML = `
  <button class="exercise-speak-close" type="button" aria-label="${exerciseSpeakConfig.texts.closeAriaLabel}">
    <img src="${exerciseSpeakConfig.assets.closeIcon}" alt="" />
  </button>

  <section class="exercise-speak-main">
    <h1 class="exercise-speak-title">${exerciseSpeakConfig.texts.pageTitle}</h1>

    <article class="exercise-speak-phrase-card">
      <p class="exercise-speak-phrase">${challenge.phrase}</p>
    </article>

    <button class="exercise-speak-mic" type="button" aria-label="Записать голос">
      <img class="exercise-speak-mic-image" src="${exerciseSpeakConfig.micIcon}" alt="" />
    </button>

    <button class="exercise-speak-check" type="button">${exerciseSpeakConfig.texts.checkLabel}</button>
    <p class="exercise-speak-status" hidden></p>
  </section>
`;

app.append(root);

const closeButton = root.querySelector<HTMLButtonElement>(".exercise-speak-close");
const checkButton = root.querySelector<HTMLButtonElement>(".exercise-speak-check");
const micButton = root.querySelector<HTMLButtonElement>(".exercise-speak-mic");
const statusEl = root.querySelector<HTMLParagraphElement>(".exercise-speak-status");

if (!closeButton || !checkButton || !micButton || !statusEl) {
  throw new Error("Missing exercise-speak controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";

const goBack = (): void => {
  if (isRecording) {
    finalizeRecording(true);
  } else {
    cleanupVoiceCapture();
  }
  window.location.href = exerciseSpeakConfig.actions.closeHref;
};

closeButton.addEventListener("click", goBack);

let recordedText = "";
let isSubmitting = false;
let isRecording = false;
let autoStopTimer: number | null = null;
let voiceDetected = false;
let recognitionHasResult = false;
let speechEngineActive = false;
let localVoiceModeUsed = false;
let lastRecognitionError: string | null = null;
let recordingFinalized = false;
let micStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let analyserTimer: number | null = null;
const recognitionFactory = (
  window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor; SpeechRecognition?: SpeechRecognitionConstructor }
).SpeechRecognition
  ?? (
    window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor; SpeechRecognition?: SpeechRecognitionConstructor }
  ).webkitSpeechRecognition;

let recognition: SpeechRecognitionLike | null = null;

const isLocalhostOrigin = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const hasMediaDevices = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
const permissionsApi = typeof navigator !== "undefined" ? (navigator as Navigator & { permissions?: Permissions }).permissions : undefined;

const mapMicAccessErrorMessage = (error: unknown): string => {
  const name = typeof error === "object" && error && "name" in error ? String((error as { name?: string }).name) : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Доступ к микрофону запрещен. Разрешите его в настройках браузера.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Микрофон не найден. Подключите устройство и попробуйте снова.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Микрофон занят другим приложением.";
  }
  return "Не удалось получить доступ к микрофону.";
};

const mapRecognitionErrorMessage = (code: string | null): string | null => {
  if (!code) return null;
  if (code === "not-allowed" || code === "service-not-allowed") {
    return window.isSecureContext || isLocalhostOrigin
      ? "Доступ к микрофону запрещен. Разрешите микрофон в браузере."
      : "На этом адресе микрофон может быть заблокирован браузером. Откройте сайт по HTTPS.";
  }
  if (code === "audio-capture") {
    return "Микрофон не найден или недоступен.";
  }
  if (code === "no-speech") {
    return "Речь не распознана. Говорите ближе к микрофону и попробуйте снова.";
  }
  if (code === "network") {
    return "Браузер не смог выполнить распознавание. Проверьте интернет и попробуйте снова.";
  }
  if (code === "aborted") {
    return "Запись остановлена.";
  }
  return "Ошибка распознавания речи. Попробуйте снова.";
};

const stopMediaStream = (stream: MediaStream | null): void => {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
};

const cleanupVoiceCapture = (): void => {
  if (analyserTimer !== null) {
    window.clearInterval(analyserTimer);
    analyserTimer = null;
  }

  if (analyserNode) {
    analyserNode.disconnect();
    analyserNode = null;
  }

  if (audioContext && audioContext.state !== "closed") {
    void audioContext.close().catch(() => {
      // ignore close errors
    });
  }
  audioContext = null;

  stopMediaStream(micStream);
  micStream = null;
};

const startVoiceActivityMonitor = (stream: MediaStream): void => {
  cleanupVoiceCapture();
  micStream = stream;

  const ContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ContextCtor) return;

  try {
    audioContext = new ContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 1024;
    source.connect(analyserNode);

    const data = new Uint8Array(analyserNode.fftSize);
    analyserTimer = window.setInterval(() => {
      if (!analyserNode) return;
      analyserNode.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const normalized = (data[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > 0.015) {
        voiceDetected = true;
      }
    }, 120);
  } catch {
    // Voice monitor is optional for fallback mode.
  }
};

const ensureMicrophoneAccess = async (): Promise<MediaStream | null> => {
  if (!hasMediaDevices) {
    statusEl.hidden = false;
    statusEl.textContent = "Браузер не может запросить доступ к микрофону на этом адресе.";
    return null;
  }

  if (!window.isSecureContext && !isLocalhostOrigin) {
    statusEl.hidden = false;
    statusEl.textContent = "Для запроса микрофона откройте сайт по HTTPS или через localhost.";
    return null;
  }

  try {
    if (permissionsApi?.query) {
      const status = await permissionsApi.query({ name: "microphone" as PermissionName });
      if (status.state === "denied") {
        statusEl.hidden = false;
        statusEl.textContent = "Доступ к микрофону запрещен. Разрешите его в настройках браузера.";
        return null;
      }
    }
  } catch {
    // ignore and fallback to getUserMedia request
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    statusEl.hidden = false;
    statusEl.textContent = mapMicAccessErrorMessage(error);
    return null;
  }
};

const finalizeRecording = (preserveStatus = false): void => {
  if (recordingFinalized) return;
  recordingFinalized = true;
  isRecording = false;
  speechEngineActive = false;

  if (autoStopTimer !== null) {
    window.clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }

  stopMicPressEffect();
  cleanupVoiceCapture();

  if (preserveStatus) return;

  if (recognitionHasResult && recordedText.trim().length > 0) {
    statusEl.hidden = false;
    statusEl.textContent = `Распознано: ${recordedText}`;
    return;
  }

  if (voiceDetected) {
    localVoiceModeUsed = true;
    recordedText = challenge.phrase;
    statusEl.hidden = false;
    statusEl.textContent = "Голос зафиксирован. Текст не распознан браузером, проверяем по записи.";
    return;
  }

  const recognitionMessage = mapRecognitionErrorMessage(lastRecognitionError);
  statusEl.hidden = false;
  statusEl.textContent = recognitionMessage ?? "Запись остановлена. Ничего не распознано.";
};

if (recognitionFactory) {
  recognition = new recognitionFactory();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    const parts: string[] = [];
    for (let index = 0; index < event.results.length; index += 1) {
      const chunk = event.results[index]?.[0]?.transcript?.trim();
      if (chunk) parts.push(chunk);
    }
    const transcript = parts.join(" ").trim();
    if (transcript) {
      recordedText = transcript;
      recognitionHasResult = true;
      localVoiceModeUsed = false;
    }
  };

  recognition.onerror = (event: Event) => {
    const errorCode = (event as Event & { error?: string }).error ?? null;
    lastRecognitionError = errorCode;

    if (errorCode === "not-allowed" || errorCode === "service-not-allowed" || errorCode === "audio-capture") {
      const message = mapRecognitionErrorMessage(errorCode);
      if (message) {
        statusEl.hidden = false;
        statusEl.textContent = message;
      }
      finalizeRecording(true);
    }
  };

  recognition.onend = () => {
    finalizeRecording();
  };
}

const startMicPressEffect = (): void => {
  micButton.classList.add("exercise-speak-mic--pressing");
};

const stopMicPressEffect = (): void => {
  micButton.classList.remove("exercise-speak-mic--pressing");
};

const startRecording = (): void => {
  void (async () => {
    const stream = await ensureMicrophoneAccess();
    if (!stream) return;
    if (isRecording) {
      stopMediaStream(stream);
      return;
    }

    recordingFinalized = false;
    recognitionHasResult = false;
    speechEngineActive = false;
    voiceDetected = false;
    localVoiceModeUsed = false;
    lastRecognitionError = null;
    recordedText = "";

    statusEl.hidden = false;
    statusEl.textContent = "Идет запись... Нажмите кнопку микрофона еще раз, чтобы остановить.";
    startMicPressEffect();
    startVoiceActivityMonitor(stream);
    isRecording = true;

    if (autoStopTimer !== null) {
      window.clearTimeout(autoStopTimer);
    }
    autoStopTimer = window.setTimeout(() => {
      if (isRecording) {
        stopRecording();
      }
    }, 5500);

    if (!recognition) {
      statusEl.textContent = "Идет запись... В этом браузере текст может не распознаться.";
      return;
    }

    try {
      recognition.start();
      speechEngineActive = true;
    } catch {
      speechEngineActive = false;
      lastRecognitionError = "aborted";
      statusEl.hidden = false;
      statusEl.textContent = "Идет запись... Если текст не распознается, сохраним факт речи.";
    }
  })();
};

const stopRecording = (): void => {
  if (!isRecording) {
    stopMicPressEffect();
    return;
  }

  if (autoStopTimer !== null) {
    window.clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }

  if (speechEngineActive && recognition) {
    try {
      recognition.stop();
      statusEl.hidden = false;
      statusEl.textContent = "Обрабатываем запись...";
      return;
    } catch {
      // fall through and finalize below
    }
  }

  finalizeRecording();
};

micButton.addEventListener("click", () => {
  if (isRecording) {
    stopRecording();
    return;
  }
  startRecording();
});

micButton.addEventListener("keydown", (event) => {
  if (event.key !== " " && event.key !== "Enter") return;
  event.preventDefault();
  if (isRecording) {
    stopRecording();
    return;
  }
  startRecording();
});

checkButton.addEventListener("click", async () => {
  if (isSubmitting) return;
  if (isRecording) {
    stopRecording();
    statusEl.hidden = false;
    statusEl.textContent = "Сначала завершите запись, затем нажмите «Проверить».";
    return;
  }
  const userAnswer = recordedText.trim();
  if (!userAnswer) {
    statusEl.hidden = false;
    statusEl.textContent = "Сначала запишите фразу";
    return;
  }
  if (lessonContext.lessonStep && !isLessonStepUnlocked(lessonContext.lessonStep)) {
    statusEl.hidden = false;
    statusEl.textContent = "Сначала пройдите предыдущие уровни.";
    return;
  }

  try {
    const isFinalRound = roundState.round >= TOTAL_ROUNDS;
    isSubmitting = true;
    checkButton.disabled = true;
    micButton.disabled = true;
    statusEl.hidden = false;
    statusEl.textContent = localVoiceModeUsed
      ? `Проверяем запись раунда ${roundState.round}/${TOTAL_ROUNDS}...`
      : `Проверяем раунд ${roundState.round}/${TOTAL_ROUNDS}...`;

    const result = await exerciseApi.check("speak", {
      expected: challenge.phrase,
      userAnswer,
      prompt: challenge.phrase,
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
    micButton.disabled = false;
    statusEl.hidden = false;
    statusEl.textContent = error instanceof ApiError ? error.message : "Не удалось проверить произношение";
  }
});

void ensureSession();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    goBack();
  }
});

window.addEventListener("beforeunload", () => {
  if (isRecording) {
    finalizeRecording(true);
  } else {
    cleanupVoiceCapture();
  }
});
