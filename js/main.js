// js/main.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://alt-text-survey.onrender.com";

  // Participant ID per browser/session
  const PARTICIPANT_KEY = "alt_survey_participant";
  let participantId = localStorage.getItem(PARTICIPANT_KEY);
  if (!participantId) {
    participantId = window.crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    localStorage.setItem(PARTICIPANT_KEY, participantId);
  }

  let dataset = [];
  let currentRow = null;
  let currentResults = null;

  const grid = document.getElementById("imageGrid");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalImage = document.getElementById("modalImage");
  const modalAlt = document.getElementById("modalAltText");
  const cardInner = document.getElementById("cardInner");
  const flipBtn = document.getElementById("flipBtn");
  const flipBackBtn = document.getElementById("flipBackBtn");
  const altOptionsForm = document.getElementById("altOptionsForm");
  const deleteVoteBtn = document.getElementById("deleteVoteBtn");
  const closeButtons = document.querySelectorAll("[data-close]");

  /* -------------------------------------
     Load CSV dataset
  ------------------------------------- */
  async function loadDataset() {
    try {
      const res = await fetch("data/AlttextData.csv");
      const csvText = await res.text();

      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      dataset = parsed.data;
      renderGrid(dataset);
    } catch (err) {
      console.error("Error loading CSV:", err);
    }
  }

  /* -------------------------------------
     Build image grid
  ------------------------------------- */
  function renderGrid(data) {
    grid.innerHTML = "";
    data.forEach((row, index) => {
      const imageId = row.ImageId;
      const imageUrl = row.ImageUrl;
      if (!imageId || !imageUrl) return;

      const btn = document.createElement("button");
      btn.className = "grid-item";
      btn.dataset.index = index;

      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = `Image ${imageId}`;
      img.loading = "lazy";
      img.decoding = "async";

      btn.appendChild(img);
      grid.appendChild(btn);
    });
  }

  /* -------------------------------------
     Modal open
  ------------------------------------- */
  grid.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".grid-item");
    if (!btn) return;

    const index = Number(btn.dataset.index);
    const row = dataset[index];
    if (!row) return;

    currentRow = row;
    currentResults = null;

    modalImage.src = row.ImageUrl;
    modalImage.alt = row.Humantext || "";
    modalImage.dataset.imageId = row.ImageId;

    modalTitle.textContent = `Choose the best alt text for image ${row.ImageId}`;

    renderAltOptions(row);

    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    cardInner.classList.remove("is-flipped");
  });

  /* -------------------------------------
     Shuffle utility
  ------------------------------------- */
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* -------------------------------------
     Render alt options on right side
  ------------------------------------- */
  function renderAltOptions(row) {
    altOptionsForm.innerHTML = "";

    let options = [
      { id: "alt-human", label: row.Humantext },
      { id: "alt-ahrefs", label: row.AHREFS },
      { id: "alt-asu", label: row.ASU },
      { id: "alt-popupsmart", label: row.Popupsmart },
      { id: "alt-chatgpt", label: row.ChatGPT },
    ].filter((o) => o.label?.trim());

    const randomized = shuffleArray(options);

    randomized.forEach((opt, i) => {
      const wrapper = document.createElement("div");
      wrapper.className = "alt-option";

      const inputId = `${opt.id}-${row.ImageId}`;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "altChoice";
      input.id = inputId;
      input.value = opt.id;
      if (i === 0) input.checked = true;

      const label = document.createElement("label");
      label.setAttribute("for", inputId);
      label.textContent = opt.label;

      wrapper.appendChild(input);
      wrapper.appendChild(label);
      altOptionsForm.appendChild(wrapper);
    });
  }

  /* -------------------------------------
     Map optionId → real text
  ------------------------------------- */
  function labelForOptionId(row, optionId) {
    return {
      "alt-human": row.Humantext,
      "alt-ahrefs": row.AHREFS,
      "alt-asu": row.ASU,
      "alt-popupsmart": row.Popupsmart,
      "alt-chatgpt": row.ChatGPT,
    }[optionId];
  }

  /* -------------------------------------
     Render REAL charts from backend
  ------------------------------------- */
  function renderChartsFromResults() {
    if (!currentResults || !currentRow) return;

    const totals = currentResults.totals || [];

    const labels = totals.map((t) => labelForOptionId(currentRow, t.optionId));
    const counts = totals.map((t) => Number(t.count));

    /* ----- Chart.js Pie ----- */
    try {
      const ctx = document.getElementById("chartjsCanvas").getContext("2d");

      if (window._chartInstance) window._chartInstance.destroy();

      window._chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
          labels,
          datasets: [
            {
              data: counts,
              backgroundColor: [
                "#7c3aed",
                "#06b6d4",
                "#f59e0b",
                "#10b981",
                "#ef4444",
              ],
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    } catch (e) {
      console.warn("Chart.js error", e);
    }

    /* ----- Plotly Bar ----- */
    try {
      const trace = {
        x: labels,
        y: counts,
        type: "bar",
        marker: { color: "#7c3aed" },
      };
      const layout = {
        margin: { t: 10, l: 40, r: 10, b: 60 },
        height: 240,
      };
      Plotly.newPlot("plotlyDiv", [trace], layout, { displayModeBar: false });
    } catch (e) {
      console.warn("Plotly error", e);
    }
  }

  /* -------------------------------------
     Submit button → POST then GET then flip
  ------------------------------------- */
  flipBtn.addEventListener("click", async () => {
    if (!currentRow) return;

    const imageId = modalImage.dataset.imageId;
    const selected = altOptionsForm.querySelector(
      'input[name="altChoice"]:checked'
    );
    if (!selected) return alert("Please select an option.");

    const optionId = selected.value;

    try {
      await fetch(`${API_BASE}/api/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, optionId, participantId }),
      });

      const res = await fetch(
        `${API_BASE}/api/results?imageId=${encodeURIComponent(imageId)}`
      );
      currentResults = await res.json();

      renderChartsFromResults();
      cardInner.classList.add("is-flipped");
    } catch (err) {
      console.error("Vote error:", err);
      alert("Error submitting vote.");
    }
  });

  /* -------------------------------------
     Delete vote
  ------------------------------------- */
  deleteVoteBtn.addEventListener("click", async () => {
    if (!currentRow) return;
    const imageId = modalImage.dataset.imageId;

    if (!confirm("Delete your vote(s) for this image?")) return;

    await fetch(`${API_BASE}/api/vote`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId, participantId }),
    });

    const res = await fetch(
      `${API_BASE}/api/results?imageId=${encodeURIComponent(imageId)}`
    );
    currentResults = await res.json();

    renderChartsFromResults();
  });

  /* -------------------------------------
     Close modal
  ------------------------------------- */
  closeButtons.forEach((b) => b.addEventListener("click", closeModal));
  modal.querySelector(".modal-overlay").addEventListener("click", closeModal);

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  flipBackBtn.addEventListener("click", () =>
    cardInner.classList.remove("is-flipped")
  );

  /* -------------------------------------
     Start
  ------------------------------------- */
  loadDataset();
});
