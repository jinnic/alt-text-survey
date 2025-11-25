// js/main.js
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("imageGrid");
  const modal = document.getElementById("modal");
  const modalImage = document.getElementById("modalImage");
  const modalAlt = document.getElementById("modalAltText");
  const cardInner = document.getElementById("cardInner");
  const flipBtn = document.getElementById("flipBtn");
  const flipBackBtn = document.getElementById("flipBackBtn");
  const closeButtons = document.querySelectorAll("[data-close]");
  const altOptionsForm = document.getElementById("altOptionsForm");

  let dataset = []; // parsed CSV rows

  // -------------------------------
  // 1. Load and parse CSV
  // -------------------------------
  async function loadDataset() {
    try {
      const res = await fetch("data/AlttextData.csv");
      const csvText = await res.text();

      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      dataset = parsed.data;
      console.log("Loaded dataset:", dataset);
      renderGrid(dataset);
    } catch (err) {
      console.error("Error loading CSV:", err);
    }
  }

  // -------------------------------
  // 2. Build image grid from CSV
  // -------------------------------
  function renderGrid(data) {
    grid.innerHTML = "";

    data.forEach((row, index) => {
      // Adjust property names here to match your CSV headers
      const imageId = row.ImageId; // e.g. "PANORAMA1"
      const imageUrl = row.ImageUrl; // e.g. "https://...." or a path in your repo
      console.log("Processing row:", row, imageId, imageUrl);
      if (!imageId || !imageUrl) return;

      const btn = document.createElement("button");
      btn.className = "grid-item";
      btn.dataset.imageId = imageId;
      btn.dataset.index = index;

      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = `Image ${imageId}`;

      btn.appendChild(img);
      grid.appendChild(btn);
    });
  }

  // -------------------------------
  // 3. Open modal when image clicked
  // -------------------------------
  grid.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".grid-item");
    if (!btn) return;

    const index = Number(btn.dataset.index);
    const row = dataset[index];
    if (!row) return;

    const imageId = row.ImageId;
    const imageUrl = row.ImageUrl;

    modalImage.src = imageUrl;
    modalImage.alt = row.Humantext || `Image ${imageId}`;
    modalImage.dataset.imageId = imageId;

    modalAlt.textContent = `Choose the best alt text for image ${imageId}`;

    // Inject alt options from CSV
    renderAltOptions(row);

    // Show modal
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Reset flip
    cardInner.classList.remove("is-flipped");

    // Optional: render charts (still sample for now)
    renderChartJS();
    renderPlotly();
  });

  function renderAltOptions(row) {
    altOptionsForm.innerHTML = "";

    const options = [
      { id: "alt-human", label: row.Humantext },
      { id: "alt-ahrefs", label: row.AHREFS },
      { id: "alt-asu", label: row.ASU },
      { id: "alt-popupsmart", label: row.Popupsmart },
      { id: "alt-chatgpt", label: row.ChatGPT },
    ];

    options.forEach((opt, i) => {
      if (!opt.label) return; // skip empty ones

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

  // -------------------------------
  // 4. Close modal & flip behavior
  // -------------------------------
  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  closeButtons.forEach((b) => b.addEventListener("click", closeModal));

  modal.querySelector(".modal-overlay").addEventListener("click", closeModal);

  flipBtn.addEventListener("click", () =>
    cardInner.classList.add("is-flipped")
  );
  flipBackBtn.addEventListener("click", () =>
    cardInner.classList.remove("is-flipped")
  );

  // -------------------------------
  // 5. Sample charts (unchanged)
  // -------------------------------
  let chartInstance = null;
  function renderChartJS() {
    try {
      const ctx = document.getElementById("chartjsCanvas").getContext("2d");
      if (chartInstance) {
        chartInstance.destroy();
      }
      chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
          labels: ["A", "B", "C", "D"],
          datasets: [
            {
              label: "Sample",
              data: [12, 19, 7, 14],
              backgroundColor: ["#60a5fa", "#34d399", "#f59e0b", "#f87171"],
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    } catch (e) {
      console.warn("Chart.js not available", e);
    }
  }

  function renderPlotly() {
    try {
      const d = [
        {
          x: [1, 2, 3, 4],
          y: [2, 6, 3, 5],
          type: "scatter",
          mode: "lines+markers",
          marker: { color: "#4f46e5" },
        },
      ];
      const layout = { margin: { t: 10, l: 30, r: 10, b: 30 }, height: 240 };
      Plotly.newPlot("plotlyDiv", d, layout, { displayModeBar: false });
    } catch (e) {
      console.warn("Plotly not available", e);
    }
  }

  // optional: keep these helpers for later API work
  async function fetchData(url) {
    const res = await fetch(url).catch(() => null);
    if (!res) return null;
    return res.json();
  }
  async function patchData(url, body) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res) return null;
    return res.json();
  }
  window._altSurvey = { fetchData, patchData };

  // Kick things off
  loadDataset();
});
