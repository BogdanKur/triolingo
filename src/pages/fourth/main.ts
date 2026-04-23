import "../../shared/styles/base.css";
import "./fourth.css";
import { questions } from "./config";
import { ApiError, learningApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const answers = new Map<string, string>();

const root = document.createElement("main");
root.className = "questions-screen";

root.innerHTML = `
  <img class="questions-bg" src="/assets/images/fourth/background-clouds.png" alt="Небо с облаками" />
  <header class="questions-header">
    <img class="questions-mascot" src="/assets/images/fourth/mascot.png" alt="Персонаж Triolingo" />
    <div class="questions-progress-wrap">
      <p class="questions-progress-label"></p>
      <div class="questions-progress-track">
        <div class="questions-progress-fill"></div>
      </div>
    </div>
  </header>
  <section class="questions-scroll">
    <div class="questions-list"></div>
    <button class="questions-start" type="button" disabled>Start</button>
    <p class="questions-status" hidden></p>
  </section>
`;

const labelEl = root.querySelector<HTMLParagraphElement>(".questions-progress-label")!;
const fillEl = root.querySelector<HTMLDivElement>(".questions-progress-fill")!;
const listEl = root.querySelector<HTMLDivElement>(".questions-list")!;
const startBtn = root.querySelector<HTMLButtonElement>(".questions-start")!;
const statusEl = root.querySelector<HTMLParagraphElement>(".questions-status")!;

statusEl.style.textAlign = "center";
statusEl.style.padding = "10px";
statusEl.style.color = "#1f275a";
statusEl.style.fontWeight = "600";

const updateProgress = (): void => {
  const total = questions.length;
  const answered = answers.size;
  labelEl.textContent = `Вопрос ${answered} из ${total}`;
  fillEl.style.width = `${(answered / total) * 100}%`;
  fillEl.classList.toggle("is-active", answered > 0);
  startBtn.disabled = answered !== total;
};

questions.forEach((step) => {
  const block = document.createElement("section");
  block.className = "question-block";

  const title = document.createElement("h2");
  title.className = "question-block__title";
  title.textContent = step.title;

  const options = document.createElement("div");
  options.className = "question-block__options";

  step.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "question-option";
    btn.textContent = option;
    btn.addEventListener("click", () => {
      answers.set(step.id, option);
      options.querySelectorAll(".question-option").forEach((item) => item.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      statusEl.hidden = true;
      updateProgress();
    });
    options.append(btn);
  });

  block.append(title, options);
  listEl.append(block);
});

startBtn.addEventListener("click", async () => {
  if (answers.size !== questions.length) return;

  try {
    startBtn.disabled = true;
    statusEl.hidden = false;
    statusEl.textContent = "Формируем индивидуальный план...";

    const payload = questions.map((question) => ({
      id: question.id,
      value: answers.get(question.id) ?? "",
    }));

    const result = await learningApi.submitAssessment(payload);
    localStorage.setItem("triolingo.assessment.result", JSON.stringify(result));

    statusEl.textContent = "План готов. Переходим на главную...";
    window.location.href = "/fifth.html";
  } catch (error) {
    startBtn.disabled = false;
    statusEl.hidden = false;
    statusEl.textContent = error instanceof ApiError ? error.message : "Не удалось отправить анкету";
  }
});

updateProgress();
app.append(root);

void ensureSession();
