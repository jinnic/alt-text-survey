// Basic interaction scaffold for modal, flip, and sample charts
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("imageGrid");
  const modal = document.getElementById("modal");
  const modalImage = document.getElementById("modalImage");
  const modalAlt = document.getElementById("modalAltText");
  const cardInner = document.getElementById("cardInner");
  const flipBtn = document.getElementById("flipBtn");
  const flipBackBtn = document.getElementById("flipBackBtn");
  const closeButtons = document.querySelectorAll("[data-close]");

  // Open modal with selected image
  grid.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".grid-item");
    if (!btn) return;
    const img = btn.querySelector("img");
    modalImage.src = img.src;
    modalImage.alt = img.alt;
    modalAlt.textContent = img.alt;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    // Reset flip
    cardInner.classList.remove("is-flipped");
    // Render sample charts
    renderChartJS();
    renderPlotly();
  });

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  closeButtons.forEach((b) => b.addEventListener("click", closeModal));

  // Close when clicking overlay
  modal.querySelector(".modal-overlay").addEventListener("click", closeModal);

  flipBtn.addEventListener("click", () =>
    cardInner.classList.add("is-flipped")
  );
  flipBackBtn.addEventListener("click", () =>
    cardInner.classList.remove("is-flipped")
  );

  // Sample Chart.js render (simple bar)
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

  // Sample Plotly render
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

  // Placeholder for GET and PATCH requests
  async function fetchData(url) {
    // Example GET
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

  // Expose for debugging in dev console
  window._altSurvey = { fetchData, patchData };
});
