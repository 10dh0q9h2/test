const DATA_URL = "data/words.json";
const STORAGE_KEY = "english-word-progress-v1";
const DEFAULT_DAILY_GOAL = 20;

const state = {
  words: [],
  progress: { words: {}, settings: {} },
  activeView: "dashboard",
  learnQueue: [],
  learnIndex: 0,
  cardRevealed: false,
  quizMode: "choice",
  currentQuiz: null,
  reviewFilter: "due",
  wordbookStatus: "all",
  sessionReviewed: 0,
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindElements();
  bindEvents();
  state.progress = loadProgress();
  ensureProgressShape();
  await loadWords();
  populateUnitFilters();
  resetLearnQueue();
  nextQuiz();
  renderAll();
  setupInstallPrompt();
  setupConnectivity();
  registerServiceWorker();
}

function bindElements() {
  for (const element of document.querySelectorAll("[id]")) {
    els[toCamel(element.id)] = element;
  }
  els.tabs = [...document.querySelectorAll(".tab")];
  els.views = [...document.querySelectorAll(".view")];
  els.goViewButtons = [...document.querySelectorAll("[data-go-view]")];
  els.gradeButtons = [...document.querySelectorAll("[data-grade]")];
  els.quizModeButtons = [...document.querySelectorAll("[data-quiz-mode]")];
  els.wordbookStatusButtons = [...document.querySelectorAll("[data-wordbook-status]")];
}

function bindEvents() {
  els.tabs.forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  els.goViewButtons.forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.goView));
  });
  els.learnUnitFilter.addEventListener("change", () => {
    resetLearnQueue();
    renderLearn();
  });
  els.dashboardUnitFilter.addEventListener("change", renderDashboard);
  els.wordbookUnitFilter.addEventListener("change", renderWordbook);
  els.quizUnitFilter.addEventListener("change", nextQuiz);
  els.searchInput.addEventListener("input", renderWordbook);
  els.wordbookStatusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.wordbookStatus = button.dataset.wordbookStatus;
      els.wordbookStatusButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderWordbook();
    });
  });
  els.shuffleCard.addEventListener("click", () => {
    resetLearnQueue(true);
    renderLearn();
  });
  els.flashcard.addEventListener("click", flipCard);
  els.flipCard.addEventListener("click", flipCard);
  els.favoriteCard.addEventListener("click", toggleCurrentFavorite);
  els.exportProgress.addEventListener("click", exportProgress);
  els.importProgress.addEventListener("click", () => els.progressFile.click());
  els.progressFile.addEventListener("change", importProgress);
  els.dailyGoalInput.addEventListener("change", () => setDailyGoal(els.dailyGoalInput.value));
  els.dailyGoalMinus.addEventListener("click", () => setDailyGoal(getDailyGoal() - 5));
  els.dailyGoalPlus.addEventListener("click", () => setDailyGoal(getDailyGoal() + 5));
  els.gradeButtons.forEach((button) => {
    button.addEventListener("click", () => gradeCurrentCard(button.dataset.grade));
  });
  els.quizModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.quizMode = button.dataset.quizMode;
      els.quizModeButtons.forEach((item) => item.classList.toggle("active", item === button));
      nextQuiz();
    });
  });
  els.nextQuiz.addEventListener("click", nextQuiz);
  els.typingForm.addEventListener("submit", submitTypedAnswer);
  els.resetProgress.addEventListener("click", resetProgress);
  els.reviewWrongOnly.addEventListener("click", () => {
    state.reviewFilter = state.reviewFilter === "wrong" ? "due" : "wrong";
    renderReview();
  });
  els.reviewFavoritesOnly.addEventListener("click", () => {
    state.reviewFilter = state.reviewFilter === "favorites" ? "due" : "favorites";
    renderReview();
  });
}

async function loadWords() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${DATA_URL}`);
    const payload = await response.json();
    state.words = normalizeWords(payload.words || []);
    const meta = payload.metadata || {};
    els.dataSource.textContent = `${meta.title || "Wordbook"} · ${state.words.length.toLocaleString()} words`;
  } catch (error) {
    console.error(error);
    state.words = [];
    els.dataSource.textContent = "No data";
    showToast("data/words.json을 불러오지 못했습니다.");
  }
}

function normalizeWords(words) {
  return words
    .map((word, index) => {
      const meaningKo = text(word.meaningKo || word.meaning || "");
      const meanings = Array.isArray(word.meanings) && word.meanings.length
        ? word.meanings.map(text).filter(Boolean)
        : splitMeanings(meaningKo);
      return {
        id: text(word.id) || slugify(`${word.word}-${index}`),
        word: text(word.word),
        meaningKo,
        meanings,
        partOfSpeech: text(word.partOfSpeech || word.pos || ""),
        exampleEn: text(word.exampleEn || word.example || ""),
        exampleKo: text(word.exampleKo || ""),
        unit: text(word.unit || "전체"),
        level: text(word.level || ""),
        tags: Array.isArray(word.tags) ? word.tags.map(text).filter(Boolean) : [],
      };
    })
    .filter((word) => word.word && word.meaningKo);
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { words: {}, settings: {}, daily: {} };
    const parsed = JSON.parse(raw);
    return {
      words: parsed.words || {},
      settings: parsed.settings || {},
      daily: parsed.daily || {},
    };
  } catch {
    return { words: {}, settings: {}, daily: {} };
  }
}

function ensureProgressShape() {
  state.progress.words = state.progress.words || {};
  state.progress.settings = state.progress.settings || {};
  state.progress.daily = state.progress.daily || {};
  state.progress.settings.dailyGoal = clampNumber(
    state.progress.settings.dailyGoal,
    1,
    999,
    DEFAULT_DAILY_GOAL,
  );
}

function saveProgress() {
  ensureProgressShape();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function populateUnitFilters() {
  const units = ["전체", ...unique(state.words.map((word) => word.unit)).sort(naturalSort)];
  const filters = [
    els.dashboardUnitFilter,
    els.learnUnitFilter,
    els.quizUnitFilter,
    els.wordbookUnitFilter,
  ];
  for (const filter of filters) {
    filter.innerHTML = units.map((unit) => `<option value="${escapeAttr(unit)}">${escapeHtml(unit)}</option>`).join("");
  }
}

function setView(view) {
  state.activeView = view;
  els.tabs.forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  els.views.forEach((section) => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderLearn();
  renderQuiz();
  renderWordbook();
  renderReview();
}

function renderDashboard() {
  const stats = getStats();
  els.todayLabel.textContent = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "full",
  }).format(new Date());
  els.metricGrid.innerHTML = [
    metric("전체 단어", stats.total),
    metric("학습 단어", stats.seen),
    metric("오늘 학습", `${stats.todayReviewed}/${stats.dailyGoal}`),
    metric("복습 예정", stats.due),
  ].join("");
  renderDailyGoal(stats);

  const selectedUnit = els.dashboardUnitFilter.value || "전체";
  const unitStats = getUnitStats().filter((item) => selectedUnit === "전체" || item.unit === selectedUnit);
  els.unitProgressList.innerHTML = unitStats.length
    ? unitStats.map(renderUnitProgress).join("")
    : empty("단어 데이터가 없습니다.");

  const dueWords = getDueWords().slice(0, 6);
  els.duePreview.innerHTML = dueWords.length
    ? dueWords.map((word) => compactItem(word)).join("")
    : empty("오늘 복습할 단어가 없습니다.");
}

function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function renderDailyGoal(stats = getStats()) {
  const percent = Math.min(100, Math.round((stats.todayReviewed / Math.max(stats.dailyGoal, 1)) * 100));
  els.dailyGoalInput.value = stats.dailyGoal;
  els.dailyGoalBar.style.setProperty("--value", `${percent}%`);
  els.dailyGoalDetail.textContent = `${stats.todayReviewed}개 완료 · 정답률 ${stats.todayAccuracy}% · 세션 ${state.sessionReviewed}개`;
}

function renderUnitProgress(item) {
  const percent = item.total ? Math.round((item.seen / item.total) * 100) : 0;
  return `
    <div class="progress-item">
      <strong>${escapeHtml(item.unit)}</strong>
      <div class="progress-track" aria-label="${percent}%">
        <span style="--value:${percent}%"></span>
      </div>
      <span class="subtext">${item.seen}/${item.total}</span>
    </div>
  `;
}

function compactItem(word) {
  return `
    <div class="compact-item">
      <div class="word-main">
        <strong>${escapeHtml(word.word)}</strong>
        <span>${escapeHtml(word.meaningKo)}</span>
      </div>
      <button class="ghost-button" type="button" data-jump-word="${escapeAttr(word.id)}">학습</button>
    </div>
  `;
}

function resetLearnQueue(forceShuffle = false) {
  const unit = els.learnUnitFilter?.value || "전체";
  let queue = filterByUnit(state.words, unit);
  const due = queue.filter((word) => isDue(word.id));
  if (due.length) queue = due.concat(queue.filter((word) => !isDue(word.id)));
  if (forceShuffle) queue = shuffle(queue);
  state.learnQueue = queue;
  state.learnIndex = 0;
  state.cardRevealed = false;
}

function renderLearn() {
  const word = currentCard();
  els.learnCounter.textContent = state.learnQueue.length
    ? `${state.learnIndex + 1} / ${state.learnQueue.length}`
    : "0 / 0";
  if (!word) {
    els.cardUnit.textContent = "";
    els.cardPos.textContent = "";
    els.cardWord.textContent = "";
    els.cardMeaning.textContent = "단어 데이터가 없습니다.";
    els.cardExample.textContent = "";
    return;
  }

  const progress = getWordProgress(word.id);
  els.cardUnit.textContent = word.unit;
  els.cardPos.textContent = word.partOfSpeech || word.level || "word";
  els.cardWord.textContent = word.word;
  els.cardMeaning.textContent = state.cardRevealed ? word.meaningKo : " ";
  els.cardExample.textContent = state.cardRevealed ? formatExample(word) : " ";
  els.favoriteCard.querySelector("[aria-hidden='true']").textContent = progress.favorite ? "★" : "☆";
}

function flipCard() {
  if (!currentCard()) return;
  state.cardRevealed = !state.cardRevealed;
  renderLearn();
}

function toggleCurrentFavorite() {
  const word = currentCard();
  if (!word) return;
  const progress = ensureWordProgress(word.id);
  progress.favorite = !progress.favorite;
  saveProgress();
  renderAll();
}

function gradeCurrentCard(grade) {
  const word = currentCard();
  if (!word) return;
  gradeWord(word.id, grade);
  state.sessionReviewed += 1;
  state.learnIndex = Math.min(state.learnIndex + 1, Math.max(state.learnQueue.length - 1, 0));
  if (state.learnIndex === state.learnQueue.length - 1 && state.learnQueue.length > 1) {
    const remainingDue = state.learnQueue.filter((item) => isDue(item.id));
    if (!remainingDue.length) state.learnQueue = shuffle(filterByUnit(state.words, els.learnUnitFilter.value || "전체"));
  }
  state.cardRevealed = false;
  renderAll();
}

function renderQuiz() {
  els.typingForm.hidden = state.quizMode !== "typing";
  els.quizChoices.hidden = state.quizMode !== "choice";
  if (!state.currentQuiz) {
    els.quizWord.textContent = "";
    els.quizSub.textContent = "";
    els.quizChoices.innerHTML = "";
    els.quizResult.textContent = "단어 데이터가 없습니다.";
    return;
  }
  const word = state.currentQuiz.word;
  els.quizWord.textContent = word.word;
  els.quizSub.textContent = [word.unit, word.partOfSpeech].filter(Boolean).join(" · ");
  els.quizStatus.textContent = `${filterByUnit(state.words, els.quizUnitFilter.value || "전체").length} words`;
}

function nextQuiz() {
  const pool = filterByUnit(state.words, els.quizUnitFilter?.value || "전체");
  if (!pool.length) {
    state.currentQuiz = null;
    renderQuiz();
    return;
  }
  const word = sample(pool);
  state.currentQuiz = {
    word,
    answered: false,
    choices: makeChoices(word, pool),
  };
  els.quizResult.textContent = "";
  els.quizResult.className = "quiz-result";
  els.typingAnswer.value = "";
  renderChoices();
  renderQuiz();
}

function renderChoices() {
  if (!state.currentQuiz) return;
  els.quizChoices.innerHTML = state.currentQuiz.choices
    .map((choice) => `<button class="choice" type="button" data-choice="${escapeAttr(choice)}">${escapeHtml(choice)}</button>`)
    .join("");
  els.quizChoices.querySelectorAll(".choice").forEach((button) => {
    button.addEventListener("click", () => submitChoice(button));
  });
}

function submitChoice(button) {
  if (!state.currentQuiz || state.currentQuiz.answered) return;
  const correct = normalizeAnswer(button.dataset.choice) === normalizeAnswer(state.currentQuiz.word.meaningKo);
  state.currentQuiz.answered = true;
  button.classList.add(correct ? "correct" : "wrong");
  for (const choice of els.quizChoices.querySelectorAll(".choice")) {
    const isCorrectChoice = normalizeAnswer(choice.dataset.choice) === normalizeAnswer(state.currentQuiz.word.meaningKo);
    choice.classList.toggle("correct", isCorrectChoice);
    choice.disabled = true;
  }
  handleQuizResult(correct);
}

function submitTypedAnswer(event) {
  event.preventDefault();
  if (!state.currentQuiz || state.currentQuiz.answered) return;
  const answer = normalizeAnswer(els.typingAnswer.value);
  const correctAnswers = [state.currentQuiz.word.meaningKo, ...state.currentQuiz.word.meanings].map(normalizeAnswer);
  const correct = Boolean(answer) && correctAnswers.some((item) => (
    item && (answer === item || answer.includes(item) || (answer.length >= 2 && item.includes(answer)))
  ));
  state.currentQuiz.answered = true;
  handleQuizResult(correct);
}

function handleQuizResult(correct) {
  const word = state.currentQuiz.word;
  gradeWord(word.id, correct ? "good" : "again");
  els.quizResult.textContent = correct ? "정답" : `오답 · ${word.meaningKo}`;
  els.quizResult.classList.toggle("good", correct);
  els.quizResult.classList.toggle("bad", !correct);
  renderDashboard();
  renderReview();
}

function renderWordbook() {
  const query = normalizeAnswer(els.searchInput.value);
  const unit = els.wordbookUnitFilter.value || "전체";
  const words = filterByUnit(state.words, unit).filter((word) => {
    if (!matchesWordbookStatus(word, state.wordbookStatus)) return false;
    if (!query) return true;
    return [word.word, word.meaningKo, word.partOfSpeech, word.unit, word.level, ...word.tags]
      .some((value) => normalizeAnswer(value).includes(query));
  });
  const label = getWordbookStatusLabel(state.wordbookStatus);
  els.wordbookCount.textContent = `${label} · ${words.length.toLocaleString()} words`;
  els.wordList.innerHTML = words.length ? words.map(renderWordRow).join("") : empty("검색 결과가 없습니다.");
  els.wordList.querySelectorAll("[data-toggle-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      const progress = ensureWordProgress(button.dataset.toggleFavorite);
      progress.favorite = !progress.favorite;
      saveProgress();
      renderAll();
    });
  });
}

function matchesWordbookStatus(word, status) {
  const progress = getWordProgress(word.id);
  if (status === "new") return !progress.seen;
  if (status === "due") return isDue(word.id);
  if (status === "wrong") return (progress.wrong || 0) > 0;
  if (status === "favorite") return Boolean(progress.favorite);
  if (status === "mastered") return (progress.mastery || 0) >= 80;
  return true;
}

function getWordbookStatusLabel(status) {
  const labels = {
    all: "전체",
    new: "미학습",
    due: "복습",
    wrong: "오답",
    favorite: "즐겨찾기",
    mastered: "완료",
  };
  return labels[status] || labels.all;
}

function renderWordRow(word) {
  const progress = getWordProgress(word.id);
  const badges = [word.unit, word.partOfSpeech, word.level, getWordStatusBadge(word)].filter(Boolean);
  return `
    <article class="word-row">
      <div class="word-main">
        <strong>${escapeHtml(word.word)}</strong>
        <span>${escapeHtml(formatExample(word))}</span>
      </div>
      <div>${escapeHtml(word.meaningKo)}</div>
      <div class="badge-row">${badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}</div>
      <button class="icon-button" type="button" data-toggle-favorite="${escapeAttr(word.id)}" title="즐겨찾기">
        <span aria-hidden="true">${progress.favorite ? "★" : "☆"}</span>
        <span class="sr-only">즐겨찾기</span>
      </button>
    </article>
  `;
}

function getWordStatusBadge(word) {
  const progress = getWordProgress(word.id);
  if (progress.favorite) return "즐겨찾기";
  if (!progress.seen) return "미학습";
  if ((progress.wrong || 0) > 0 && (progress.streak || 0) === 0) return "오답";
  if (isDue(word.id)) return "복습";
  if ((progress.mastery || 0) >= 80) return "완료";
  return `숙련 ${progress.mastery || 0}%`;
}

function renderReview() {
  const words = getReviewWords();
  els.reviewCount.textContent = `${words.length.toLocaleString()} words`;
  els.reviewWrongOnly.classList.toggle("secondary-button", state.reviewFilter === "wrong");
  els.reviewFavoritesOnly.classList.toggle("secondary-button", state.reviewFilter === "favorites");
  els.reviewList.innerHTML = words.length ? words.map(renderReviewItem).join("") : empty("표시할 단어가 없습니다.");
  els.reviewList.querySelectorAll("[data-review-grade]").forEach((button) => {
    button.addEventListener("click", () => {
      gradeWord(button.dataset.wordId, button.dataset.reviewGrade);
      renderAll();
    });
  });
}

function renderReviewItem(word) {
  const progress = getWordProgress(word.id);
  return `
    <article class="review-item">
      <div class="word-main">
        <strong>${escapeHtml(word.word)}</strong>
        <span>${escapeHtml(word.meaningKo)} · streak ${progress.streak || 0}</span>
      </div>
      <div class="toolbar">
        <button class="danger-button" type="button" data-word-id="${escapeAttr(word.id)}" data-review-grade="again">모름</button>
        <button class="primary-button" type="button" data-word-id="${escapeAttr(word.id)}" data-review-grade="good">맞음</button>
      </div>
    </article>
  `;
}

function getReviewWords() {
  if (state.reviewFilter === "wrong") {
    return state.words.filter((word) => (getWordProgress(word.id).wrong || 0) > 0);
  }
  if (state.reviewFilter === "favorites") {
    return state.words.filter((word) => getWordProgress(word.id).favorite);
  }
  return getDueWords();
}

function getDueWords() {
  return state.words.filter((word) => isDue(word.id));
}

function getStats() {
  const total = state.words.length;
  let seen = 0;
  let correct = 0;
  let wrong = 0;
  for (const word of state.words) {
    const progress = getWordProgress(word.id);
    if (progress.seen) seen += 1;
    correct += progress.correct || 0;
    wrong += progress.wrong || 0;
  }
  const attempts = correct + wrong;
  const today = getDailyRecord();
  return {
    total,
    seen,
    due: getDueWords().length,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    todayReviewed: today.reviewed || 0,
    todayAccuracy: today.reviewed ? Math.round(((today.correct || 0) / today.reviewed) * 100) : 0,
    dailyGoal: getDailyGoal(),
  };
}

function getUnitStats() {
  const grouped = new Map();
  for (const word of state.words) {
    const item = grouped.get(word.unit) || { unit: word.unit, total: 0, seen: 0 };
    item.total += 1;
    if (getWordProgress(word.id).seen) item.seen += 1;
    grouped.set(word.unit, item);
  }
  return [...grouped.values()].sort((a, b) => naturalSort(a.unit, b.unit));
}

function gradeWord(id, grade) {
  const progress = ensureWordProgress(id);
  const now = Date.now();
  progress.seen = true;
  progress.lastReviewed = now;
  if (grade === "again") {
    progress.wrong = (progress.wrong || 0) + 1;
    progress.streak = 0;
    progress.mastery = Math.max(0, (progress.mastery || 0) - 12);
    progress.dueAt = now + 10 * 60 * 1000;
  } else {
    const easy = grade === "easy";
    progress.correct = (progress.correct || 0) + 1;
    progress.streak = (progress.streak || 0) + (easy ? 2 : 1);
    progress.mastery = Math.min(100, (progress.mastery || 0) + (easy ? 24 : 16));
    const days = intervalDays(progress.streak, easy);
    progress.dueAt = now + days * 24 * 60 * 60 * 1000;
  }
  recordDailyAttempt(grade);
  saveProgress();
}

function recordDailyAttempt(grade) {
  const record = getDailyRecord();
  record.reviewed = (record.reviewed || 0) + 1;
  if (grade === "again") {
    record.wrong = (record.wrong || 0) + 1;
  } else {
    record.correct = (record.correct || 0) + 1;
  }
}

function getDailyRecord(dateKey = todayKey()) {
  state.progress.daily = state.progress.daily || {};
  if (!state.progress.daily[dateKey]) {
    state.progress.daily[dateKey] = { reviewed: 0, correct: 0, wrong: 0 };
  }
  return state.progress.daily[dateKey];
}

function getDailyGoal() {
  return clampNumber(state.progress.settings?.dailyGoal, 1, 999, DEFAULT_DAILY_GOAL);
}

function setDailyGoal(value) {
  ensureProgressShape();
  state.progress.settings.dailyGoal = clampNumber(value, 1, 999, DEFAULT_DAILY_GOAL);
  saveProgress();
  renderDashboard();
}

function intervalDays(streak, easy) {
  const normal = [1, 2, 4, 7, 14, 30, 60];
  const fast = [2, 4, 7, 14, 30, 60, 90];
  const table = easy ? fast : normal;
  return table[Math.min(streak - 1, table.length - 1)];
}

function isDue(id) {
  const progress = getWordProgress(id);
  if (!progress.seen) return true;
  return !progress.dueAt || progress.dueAt <= Date.now();
}

function ensureWordProgress(id) {
  if (!state.progress.words[id]) {
    state.progress.words[id] = {
      seen: false,
      correct: 0,
      wrong: 0,
      streak: 0,
      mastery: 0,
      favorite: false,
    };
  }
  return state.progress.words[id];
}

function getWordProgress(id) {
  return state.progress.words[id] || {};
}

function currentCard() {
  return state.learnQueue[state.learnIndex] || null;
}

function makeChoices(answer, pool) {
  const distractors = shuffle(pool.filter((word) => word.id !== answer.id))
    .slice(0, 3)
    .map((word) => word.meaningKo);
  return shuffle([answer.meaningKo, ...distractors]).slice(0, Math.min(4, pool.length));
}

function filterByUnit(words, unit) {
  return !unit || unit === "전체" ? words : words.filter((word) => word.unit === unit);
}

function formatExample(word) {
  return [word.exampleEn, word.exampleKo].filter(Boolean).join(" / ");
}

function splitMeanings(textValue) {
  return textValue
    .split(/\s*(?:;|,|\/|\n|·|ㆍ)\s*/)
    .map(text)
    .filter(Boolean);
}

function resetProgress() {
  const ok = window.confirm("학습 진도를 초기화할까요?");
  if (!ok) return;
  state.progress = { words: {}, settings: { dailyGoal: getDailyGoal() }, daily: {} };
  state.sessionReviewed = 0;
  saveProgress();
  resetLearnQueue();
  nextQuiz();
  renderAll();
}

function exportProgress() {
  const payload = {
    schemaVersion: 1,
    app: "English Word",
    exportedAt: new Date().toISOString(),
    wordCount: state.words.length,
    progress: state.progress,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `english-word-progress-${dateStamp()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
  showToast("진도 파일을 만들었습니다.");
}

async function importProgress(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const nextProgress = sanitizeProgress(parsed.progress || parsed);
    const existingCount = Object.keys(state.progress.words || {}).length;
    const nextCount = Object.keys(nextProgress.words || {}).length;
    if (!nextCount) {
      showToast("가져올 수 있는 진도가 없습니다.");
      return;
    }
    if (existingCount && !window.confirm("기존 진도를 가져온 파일로 바꿀까요?")) {
      return;
    }
    state.progress = nextProgress;
    saveProgress();
    resetLearnQueue();
    nextQuiz();
    renderAll();
    showToast(`${nextCount}개 단어의 진도를 가져왔습니다.`);
  } catch (error) {
    console.error(error);
    showToast("진도 파일을 읽지 못했습니다.");
  }
}

function sanitizeProgress(progress) {
  const knownIds = new Set(state.words.map((word) => word.id));
  const sourceWords = progress && typeof progress === "object" ? progress.words || {} : {};
  const words = {};
  for (const [id, item] of Object.entries(sourceWords)) {
    if (!knownIds.has(id) || !item || typeof item !== "object") continue;
    words[id] = {
      seen: Boolean(item.seen),
      correct: toNumber(item.correct),
      wrong: toNumber(item.wrong),
      streak: toNumber(item.streak),
      mastery: Math.min(100, Math.max(0, toNumber(item.mastery))),
      favorite: Boolean(item.favorite),
      lastReviewed: toNumber(item.lastReviewed),
      dueAt: toNumber(item.dueAt),
    };
  }
  return {
    words,
    settings: progress && typeof progress.settings === "object" ? progress.settings : {},
    daily: progress && typeof progress.daily === "object" ? sanitizeDaily(progress.daily) : {},
  };
}

function sanitizeDaily(daily) {
  const result = {};
  for (const [key, item] of Object.entries(daily)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !item || typeof item !== "object") continue;
    result[key] = {
      reviewed: toNumber(item.reviewed),
      correct: toNumber(item.correct),
      wrong: toNumber(item.wrong),
    };
  }
  return result;
}

function setupInstallPrompt() {
  let promptEvent = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptEvent = event;
    els.installButton.hidden = false;
  });
  els.installButton.addEventListener("click", async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    promptEvent = null;
    els.installButton.hidden = true;
  });
}

function setupConnectivity() {
  window.addEventListener("online", () => showToast("온라인 상태입니다."));
  window.addEventListener("offline", () => showToast("오프라인 상태입니다."));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            showToast("새 버전이 준비됐습니다. 새로고침하면 반영됩니다.");
          }
        });
      });
    } catch (error) {
      console.warn("Service worker registration failed", error);
    }
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function empty(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeAnswer(value) {
  return text(value).toLowerCase().replace(/[.,;:!?()[\]{}'"`]/g, "");
}

function slugify(value) {
  return normalizeAnswer(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "word";
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function dateStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function naturalSort(a, b) {
  return a.localeCompare(b, "ko-KR", { numeric: true, sensitivity: "base" });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

document.addEventListener("click", (event) => {
  const jump = event.target.closest("[data-jump-word]");
  if (!jump) return;
  const id = jump.dataset.jumpWord;
  const index = state.learnQueue.findIndex((word) => word.id === id);
  if (index >= 0) state.learnIndex = index;
  setView("learn");
});
