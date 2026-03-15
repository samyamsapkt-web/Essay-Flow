/* ── State ── */
let currentMode   = "outline";
let selectedGrade = null;

/* ── DOM refs ── */
const modeOutline    = document.getElementById("modeOutline");
const modeGrade      = document.getElementById("modeGrade");
const heroTag        = document.getElementById("heroTag");
const heroTitle      = document.getElementById("heroTitle");
const heroDesc       = document.getElementById("heroDesc");
const essayRow       = document.getElementById("essayRow");
const promptInput    = document.getElementById("promptInput");
const essayInput     = document.getElementById("essayInput");
const analyzeBtn     = document.getElementById("analyzeBtn");
const analyzeBtnText = document.getElementById("analyzeBtnText");
const charCount      = document.getElementById("charCount");
const statusWrap     = document.getElementById("statusWrap");
const statusText     = document.getElementById("statusText");
const errorWrap      = document.getElementById("errorWrap");
const errorText      = document.getElementById("errorText");
const results        = document.getElementById("results");
const tryAgainBtn    = document.getElementById("tryAgainBtn");

/* ── Mode switching ── */
function setMode(mode) {
  currentMode = mode;

  if (mode === "outline") {
    modeOutline.classList.add("active");
    modeGrade.classList.remove("active");
    essayRow.classList.add("hidden");
    heroTag.textContent   = "Stage 1 — Before You Write";
    heroTitle.innerHTML   = "Turn your prompt into<br/><em>a perfect outline.</em>";
    heroDesc.textContent  = "Paste your assignment prompt and get thesis options, a full outline, and exactly what your teacher is looking for — in seconds.";
    analyzeBtnText.textContent = "Generate Outline";
  } else {
    modeGrade.classList.add("active");
    modeOutline.classList.remove("active");
    essayRow.classList.remove("hidden");
    heroTag.textContent   = "Stage 2 — Before You Submit";
    heroTitle.innerHTML   = "Know your grade<br/><em>before your teacher does.</em>";
    heroDesc.textContent  = "Paste your assignment prompt and your essay draft. Get a predicted grade, what's holding you back, and exactly what to fix.";
    analyzeBtnText.textContent = "Check My Grade";
  }
  updateBtn();
}

modeOutline.addEventListener("click", () => setMode("outline"));
modeGrade.addEventListener("click",   () => setMode("grade"));

/* ── Grade chips ── */
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
    chip.classList.add("selected");
    selectedGrade = chip.dataset.grade;
  });
});

/* ── Character count + button state ── */
function updateBtn() {
  const hasPrompt = promptInput.value.trim().length > 0;
  const hasEssay  = essayInput.value.trim().length > 0;
  const ready = currentMode === "outline" ? hasPrompt : (hasPrompt && hasEssay);
  analyzeBtn.disabled = !ready;

  const total = promptInput.value.length + (currentMode === "grade" ? essayInput.value.length : 0);
  charCount.textContent = total.toLocaleString() + " characters";
}

promptInput.addEventListener("input", updateBtn);
essayInput.addEventListener("input",  updateBtn);

/* ── Helpers ── */
function showError(msg) {
  errorText.textContent = msg;
  errorWrap.classList.remove("hidden");
}
function hideError() { errorWrap.classList.add("hidden"); }
function showStatus(msg) { statusText.textContent = msg; statusWrap.classList.remove("hidden"); }
function hideStatus() { statusWrap.classList.add("hidden"); }

/* ── Render results ── */
function renderResults(data) {
  results.classList.remove("hidden");

  const isFullMode = data.mode === "full";

  /* Grade prediction */
  const predBox = document.getElementById("gradePrediction");
  if (isFullMode && data.predicted_grade) {
    predBox.classList.remove("hidden");
    document.getElementById("predGrade").textContent    = data.predicted_grade;
    document.getElementById("predPct").textContent      = data.predicted_percent ? `${data.predicted_percent}%` : "";
    document.getElementById("predPotential").textContent = data.potential_grade || "—";
    document.getElementById("predPotentialPct").textContent = data.potential_percent ? `${data.potential_percent}%` : "";
  } else {
    predBox.classList.add("hidden");
  }

  /* Thesis options */
  const thesisList = document.getElementById("thesisList");
  thesisList.innerHTML = "";
  if (Array.isArray(data.thesis_options)) {
    data.thesis_options.forEach((t, i) => {
      const div = document.createElement("div");
      div.className = "thesis-item";
      div.innerHTML = `<div class="thesis-num">Option ${i + 1}</div>${t}`;
      thesisList.appendChild(div);
    });
  }

  /* Outline */
  if (data.outline) {
    document.getElementById("outlineIntro").textContent      = data.outline.introduction || "";
    document.getElementById("outlineConclusion").textContent = data.outline.conclusion    || "";

    const bodyWrap = document.getElementById("outlineBodyWrap");
    bodyWrap.innerHTML = "";
    if (Array.isArray(data.outline.body_paragraphs)) {
      data.outline.body_paragraphs.forEach((bp, i) => {
        const sec = document.createElement("div");
        sec.className = "outline-section";
        sec.innerHTML = `<div class="outline-tag body-tag">Body ${i + 1}</div><p class="outline-text">${bp}</p>`;
        bodyWrap.appendChild(sec);
      });
    }
  }

  /* What teacher wants */
  const teacherList = document.getElementById("teacherList");
  teacherList.innerHTML = "";
  if (Array.isArray(data.what_teacher_wants)) {
    data.what_teacher_wants.forEach(item => {
      const div = document.createElement("div");
      div.className = "checklist-item";
      div.innerHTML = `<div class="check-icon">✓</div><span>${item}</span>`;
      teacherList.appendChild(div);
    });
  }

  /* Strengths */
  const strengthsBlock = document.getElementById("strengthsBlock");
  if (isFullMode && data.strengths) {
    strengthsBlock.classList.remove("hidden");
    document.getElementById("strengthsText").textContent = data.strengths;
  } else {
    strengthsBlock.classList.add("hidden");
  }

  /* Weaknesses */
  const weaknessesBlock = document.getElementById("weaknessesBlock");
  if (isFullMode && data.weaknesses) {
    weaknessesBlock.classList.remove("hidden");
    document.getElementById("weaknessesText").textContent = data.weaknesses;
  } else {
    weaknessesBlock.classList.add("hidden");
  }

  /* Specific fixes */
  const fixesBlock = document.getElementById("fixesBlock");
  const fixesList  = document.getElementById("fixesList");
  fixesList.innerHTML = "";
  if (isFullMode && Array.isArray(data.specific_fixes) && data.specific_fixes.length) {
    fixesBlock.classList.remove("hidden");
    data.specific_fixes.forEach((fix, i) => {
      const div = document.createElement("div");
      div.className = "fix-item";
      div.innerHTML = `<div class="fix-num">Fix ${i + 1}</div><span>${fix}</span>`;
      fixesList.appendChild(div);
    });
  } else {
    fixesBlock.classList.add("hidden");
  }

  /* Tips */
  const tipsList = document.getElementById("tipsList");
  tipsList.innerHTML = "";
  if (Array.isArray(data.tips)) {
    data.tips.forEach(tip => {
      const div = document.createElement("div");
      div.className = "tip-item";
      div.innerHTML = `<span class="tip-icon">✦</span><span>${tip}</span>`;
      tipsList.appendChild(div);
    });
  }

  /* Tips number */
  document.getElementById("tipsNum").textContent = isFullMode ? "07" : "04";

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── Analyze ── */
analyzeBtn.addEventListener("click", async () => {
  hideError();
  analyzeBtn.disabled = true;
  results.classList.add("hidden");
  showStatus(currentMode === "outline" ? "Generating your outline..." : "Analyzing your essay...");

  try {
    const body = {
      prompt:      promptInput.value.trim(),
      essay:       currentMode === "grade" ? essayInput.value.trim() : "",
      grade_level: selectedGrade || "",
    };

    const resp = await fetch("/analyze", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    const json = await resp.json();
    if (!resp.ok || json.error) throw new Error(json.error || `Server error ${resp.status}`);

    const raw    = json.result.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);

    hideStatus();
    renderResults(parsed);

  } catch (err) {
    hideStatus();
    showError("Analysis failed: " + (err.message || "Unknown error"));
  } finally {
    analyzeBtn.disabled = false;
    updateBtn();
  }
});

/* ── Try again ── */
tryAgainBtn.addEventListener("click", () => {
  results.classList.add("hidden");
  promptInput.value = "";
  essayInput.value  = "";
  selectedGrade     = null;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
  updateBtn();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
