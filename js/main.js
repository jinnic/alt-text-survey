// js/main.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://alt-text-survey.onrender.com";

  // Participant ID per browser/sessionurl
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
  let userCurrentChoice = null;
  initializeStatisticsModal();

  const grid = document.getElementById("imageGrid");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalImage = document.getElementById("modalImage");
  const imageTitle = document.getElementById("imageTitle");
  const modalAlt = document.getElementById("modalAltText");
  const cardInner = document.getElementById("cardInner");
  const flipBtn = document.getElementById("flipBtn");
  const flipBackBtn = document.getElementById("flipBackBtn");
  const altOptionsForm = document.getElementById("altOptionsForm");
  const deleteVoteBtn = document.getElementById("deleteVoteBtn");
  const closeButtons = document.querySelectorAll("[data-close]");

  const labelMap = {
    "alt-human": "Human",
    "alt-ahrefs": "AHREFS",
    "alt-asu": "ASU Image Accessibility Creator",
    "alt-popupsmart": "Popupsmart",
    "alt-chatgpt": "ChatGPT",
  };

  const url = "https://jinnic.github.io/alt-text-survey/";

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
      img.src = url + "/img/" + imageId + ".jpg";
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

    modalTitle.textContent = `Choose alt text that best describes the image to the visually impaired: \n${row.ImageTitle}`;

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
    if (!currentResults || !currentRow) {
      console.warn("No results available to render");
      return;
    }

    console.log("Current results:", currentResults);
    console.log("User's choice:", userCurrentChoice);

    // Small summary text
    const imgTitle = document.querySelector("#image-title");
    if (imgTitle) {
      imgTitle.textContent = `Image: ${currentRow.ImageTitle}`;
    }

    const totals = currentResults.totals || [];
    if (!totals.length) {
      console.warn("No totals in currentResults");
      return;
    }

    const labels = totals.map((t) => labelMap[t.optionId] || t.optionId);
    const counts = totals.map((t) => Number(t.count));

    // Default colors for slices
    const defaultColors = [
      "#7c3aed",
      "#06b6d4",
      "#f59e0b",
      "#10b981",
      "#ef4444",
    ];

    // Find the color for user's choice
    let userChoiceColor = null;
    if (userCurrentChoice) {
      const userChoiceIndex = totals.findIndex(
        (t) => t.optionId === userCurrentChoice
      );
      if (userChoiceIndex !== -1) {
        userChoiceColor = defaultColors[userChoiceIndex % defaultColors.length];
      }
    }

    const selectedEl = document.querySelector(".alt-selected");
    if (selectedEl) {
      if (userCurrentChoice && userChoiceColor) {
        const labelText = labelMap[userCurrentChoice];
        // Apply background color only to the label text
        selectedEl.innerHTML = `You chose: <span style="background-color: ${userChoiceColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 500;">${labelText}</span> generated text for this image.`;
        // Clear any previous background styles on the parent element
        selectedEl.style.backgroundColor = "";
        selectedEl.style.color = "";
        selectedEl.style.padding = "";
        selectedEl.style.borderRadius = "";
      } else {
        selectedEl.textContent = userCurrentChoice
          ? `You chose: ${labelMap[userCurrentChoice]} generated text for this image.`
          : "";
        selectedEl.style.backgroundColor = "";
        selectedEl.style.color = "";
        selectedEl.style.padding = "";
        selectedEl.style.borderRadius = "";
      }
    }

    try {
      const ctx = document.getElementById("chartjsCanvas").getContext("2d");
      if (window._chartInstance) window._chartInstance.destroy();

      // Build color + border arrays
      const backgroundColors = [];
      const borderColors = [];
      const borderWidths = [];

      totals.forEach((t, index) => {
        const isUserChoice =
          userCurrentChoice && t.optionId === userCurrentChoice;

        backgroundColors.push(defaultColors[index % defaultColors.length]);
        borderColors.push(
          isUserChoice ? "rgba(255, 255, 255, 0)" : "rgba(255, 255, 255, 0)" //"rgba(164, 1, 234, 0.8)" :
        );
        borderWidths.push(isUserChoice ? 0 : 0);
      });

      // ----- Chart.js pie with built-in legend (circle chips) -----
      window._chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
          labels,
          datasets: [
            {
              data: counts,
              backgroundColor: backgroundColors,
              borderColor: borderColors,
              borderWidth: borderWidths,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                padding: 16,
                generateLabels: function (chart) {
                  const data = chart.data;
                  if (!data.labels.length || !data.datasets.length) return [];

                  return data.labels.map((label, i) => {
                    const optionId = totals[i].optionId;
                    const isUserChoice =
                      userCurrentChoice && optionId === userCurrentChoice;

                    return {
                      text: labelMap[optionId],
                      fillStyle: data.datasets[0].backgroundColor[i],
                      strokeStyle: data.datasets[0].borderColor[i],
                      lineWidth: 2,
                      hidden: false,
                      index: i,
                      pointStyle: "circle",
                    };
                  });
                },
                font: function (context) {
                  const optionId = totals[context.index]?.optionId;
                  const isUserChoice =
                    userCurrentChoice && optionId === userCurrentChoice;
                  return {
                    weight: isUserChoice ? "bold" : "normal",
                    size: isUserChoice ? 14 : 12,
                  };
                },
              },
            },
            tooltip: {
              displayColors: true,
              usePointStyle: true,
              callbacks: {
                // Line 2: source label
                label: function (context) {
                  const optionId = totals[context.dataIndex].optionId;
                  return labelMap[optionId];
                },
                // Line 3: vote count
                afterLabel: function (context) {
                  const value = context.parsed || 0;
                  return `${value} votes`;
                },
                labelFont: function () {
                  return { weight: "bold" };
                },
              },
            },
          },
        },
      });

      console.log("✓ Pie chart rendered with user choice highlighted");

      // ----- Custom hover/click-based alt text viewer -----
      const legendTextContainer = document.getElementById("altText");
      const isMobile = window.innerWidth <= 700;
      const placeholderText = isMobile
        ? `<p class="legend-placeholder">Tap a slice to see its alt text</p>`
        : `<p class="legend-placeholder">Hover a slice to see its alt text</p>`;
      legendTextContainer.innerHTML = placeholderText;

      // Helper function to update alt text display
      function updateAltTextDisplay(elements) {
        if (!elements || !elements.length) {
          legendTextContainer.innerHTML = placeholderText;
          return;
        }

        const index = elements[0].index;
        const optionId = totals[index].optionId;

        const fullAlt = labelForOptionId(currentRow, optionId) || "";
        const color = backgroundColors[index];

        legendTextContainer.innerHTML = `
      <div class="legend-text-item">
        <p class="legend-text">${fullAlt}</p>
      </div>
  `;
      }

      // Attach hover handler for desktop
      window._chartInstance.options.onHover = function (evt, elements) {
        updateAltTextDisplay(elements);
      };

      // Attach click handler for mobile
      window._chartInstance.options.onClick = function (evt, elements) {
        updateAltTextDisplay(elements);
      };

      // Must update chart for handlers to take effect
      window._chartInstance.update();

      // Automatically display user's choice on load
      if (userCurrentChoice) {
        const userChoiceIndex = totals.findIndex(
          (t) => t.optionId === userCurrentChoice
        );
        if (userChoiceIndex !== -1) {
          // Create mock elements array to simulate selection
          const mockElements = [
            {
              index: userChoiceIndex,
            },
          ];
          updateAltTextDisplay(mockElements);
        }
      }
    } catch (e) {
      console.error("Chart.js error:", e);
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

    userCurrentChoice = optionId;

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

  // Clear user choice when modal closes
  userCurrentChoice = null;

  /* -------------------------------------
     Floating Menu
  ------------------------------------- */
  const floatingMenuBtn = document.getElementById("floatingMenuBtn");
  const floatingMenu = document.getElementById("floatingMenu");
  const closeMenuBtn = document.getElementById("closeMenuBtn");
  const resetDataBtn = document.getElementById("resetDataBtn");
  const statsBtn = document.getElementById("statsBtn");

  function openFloatingMenu() {
    floatingMenu.setAttribute("aria-hidden", "false");
  }

  function closeFloatingMenu() {
    floatingMenu.setAttribute("aria-hidden", "true");
  }

  floatingMenuBtn.addEventListener("click", openFloatingMenu);
  closeMenuBtn.addEventListener("click", closeFloatingMenu);

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !floatingMenu.contains(e.target) &&
      !floatingMenuBtn.contains(e.target) &&
      floatingMenu.getAttribute("aria-hidden") === "false"
    ) {
      closeFloatingMenu();
    }
  });

  /* -------------------------------------
     About Modal
  ------------------------------------- */
  const aboutModal = document.getElementById("aboutModal");
  const aboutBtn = document.getElementById("aboutBtn");
  const closeAboutBtn = document.getElementById("closeAboutBtn");
  const closeAboutButtons = document.querySelectorAll("[data-close-about]");

  function openAboutModal() {
    aboutModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeFloatingMenu();
  }

  function closeAboutModal() {
    aboutModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  aboutBtn.addEventListener("click", openAboutModal);
  closeAboutBtn.addEventListener("click", closeAboutModal);
  closeAboutButtons.forEach((b) =>
    b.addEventListener("click", closeAboutModal)
  );

  // Close about modal when clicking overlay
  aboutModal
    .querySelector(".modal-overlay")
    .addEventListener("click", closeAboutModal);

  // Statistics functionality

  /* =====================================================
   COMPLETE CODE CHANGES FOR "VIEW STATISTICS" FEATURE
   Add this to your main.js
===================================================== */

  // Add these variables at the top with your other declarations
  let allImageResults = {};

  /* -------------------------------------
   Fetch all results from API for all images
------------------------------------- */
  async function fetchAllResults() {
    try {
      console.log("Fetching results for all images...");

      const promises = dataset.map(async (row) => {
        try {
          const res = await fetch(
            `${API_BASE}/api/results?imageId=${encodeURIComponent(row.ImageId)}`
          );
          const data = await res.json();
          return { imageId: row.ImageId, data: data };
        } catch (err) {
          console.error(`Error fetching image ${row.ImageId}:`, err);
          return { imageId: row.ImageId, data: null };
        }
      });

      const results = await Promise.all(promises);

      // Store results by imageId
      results.forEach((result) => {
        if (result.data) {
          allImageResults[result.imageId] = result.data;
        }
      });

      console.log(
        "✓ Fetched results for",
        Object.keys(allImageResults).length,
        "images"
      );
      return allImageResults;
    } catch (err) {
      console.error("Error fetching all results:", err);
      return {};
    }
  }

  /* -------------------------------------
   Aggregate vote totals across all images
------------------------------------- */
  function aggregateVoteTotals(allResults) {
    const aggregated = {
      "alt-human": 0,
      "alt-ahrefs": 0,
      "alt-asu": 0,
      "alt-popupsmart": 0,
      "alt-chatgpt": 0,
    };

    Object.values(allResults).forEach((result) => {
      if (result && result.totals) {
        result.totals.forEach((item) => {
          if (aggregated.hasOwnProperty(item.optionId)) {
            aggregated[item.optionId] += Number(item.count);
          }
        });
      }
    });

    return aggregated;
  }

  /* -------------------------------------
   Render Plotly chart in statistics modal
------------------------------------- */
  function renderStatisticsChart(aggregated) {
    const labelMap = {
      "alt-human": "Human",
      "alt-ahrefs": "AHREFS",
      "alt-asu": "ASU",
      "alt-popupsmart": "Popupsmart",
      "alt-chatgpt": "ChatGPT",
    };

    const labels = Object.keys(aggregated).map((key) => labelMap[key]);
    const counts = Object.values(aggregated);

    // Create Plotly bar chart
    const data = [
      {
        x: labels,
        y: counts,
        type: "bar",
        marker: {
          color: ["#7c3aed", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"],
          opacity: 0.8,
          line: {
            color: "rgba(0,0,0,0.3)",
            width: 1.5,
          },
        },
        text: counts.map((c) => c.toString()),
        textposition: "outside",
        textfont: {
          size: 14,
          color: "#111827",
          weight: "bold",
        },
        hovertemplate: "<b>%{x}</b><br>Total Votes: %{y}<extra></extra>",
      },
    ];

    const layout = {
      title: {
        text: "Total Votes Across All Images",
        font: { size: 20, color: "#7a3cff", weight: "bold" },
      },
      xaxis: {
        title: "Alt Text Source",
        titlefont: { size: 14 },
        tickfont: { size: 12 },
        tickangle: -45,
      },
      yaxis: {
        title: "Number of Votes",
        titlefont: { size: 14 },
        tickfont: { size: 12 },
        range: [0, Math.max(...counts) * 1.2],
      },
      height: 400,
      margin: { t: 80, b: 100, l: 70, r: 40 },
      plot_bgcolor: "#fafafa",
      paper_bgcolor: "#ffffff",
      showlegend: false,
    };

    const config = {
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["pan2d", "lasso2d", "select2d"],
      responsive: true,
    };

    try {
      Plotly.newPlot("statsPlotlyDiv", data, layout, config);
      console.log("✓ Statistics chart rendered");
    } catch (e) {
      console.error("Plotly error:", e);
    }
  }

  /* -------------------------------------
   Open Statistics Modal
------------------------------------- */
  async function openStatisticsModal() {
    const statsModal = document.getElementById("statsModal");
    const statsContent = document.getElementById("statsContent");

    if (!statsModal) {
      console.error("Statistics modal not found");
      return;
    }

    // Show modal
    statsModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Show loading message
    statsContent.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <p style="font-size: 1.2rem; color: #7a3cff;">Loading statistics...</p>
      <div style="margin-top: 1rem;">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;

    try {
      // Fetch all results
      await fetchAllResults();

      // Aggregate totals
      const aggregated = aggregateVoteTotals(allImageResults);

      // Calculate statistics
      const totalVotes = Object.values(aggregated).reduce(
        (sum, val) => sum + val,
        0
      );
      const imagesWithVotes = Object.values(allImageResults).filter(
        (result) => {
          if (!result || !result.totals) return false;
          const total = result.totals.reduce(
            (sum, item) => sum + Number(item.count),
            0
          );
          return total > 0;
        }
      ).length;

      // Render content
      statsContent.innerHTML = `
      <div class="stats-summary">
        <div class="stat-card">
          <h3>Total Votes</h3>
          <p class="stat-number">${totalVotes}</p>
        </div>
        <div class="stat-card">
          <h3>Total Images</h3>
          <p class="stat-number">${dataset.length}</p>
        </div>
        <div class="stat-card">
          <h3>Images Voted</h3>
          <p class="stat-number">${imagesWithVotes}</p>
        </div>
        <div class="stat-card">
          <h3>Completion</h3>
          <p class="stat-number">${Math.round(
            (imagesWithVotes / dataset.length) * 100
          )}%</p>
        </div>
      </div>
      
      <div class="chart-container">
        <div id="statsPlotlyDiv" style="width: 100%; height: 400px;"></div>
      </div>
      
      <div class="stats-breakdown">
        <h3>Vote Breakdown by Source</h3>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Votes</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Human</td>
              <td>${aggregated["alt-human"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-human"] / totalVotes) * 100).toFixed(1)
                  : 0
              }%</td>
            </tr>
            <tr>
              <td>AHREFS</td>
              <td>${aggregated["alt-ahrefs"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-ahrefs"] / totalVotes) * 100).toFixed(1)
                  : 0
              }%</td>
            </tr>
            <tr>
              <td>ASU</td>
              <td>${aggregated["alt-asu"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-asu"] / totalVotes) * 100).toFixed(1)
                  : 0
              }%</td>
            </tr>
            <tr>
              <td>Popupsmart</td>
              <td>${aggregated["alt-popupsmart"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-popupsmart"] / totalVotes) * 100).toFixed(
                      1
                    )
                  : 0
              }%</td>
            </tr>
            <tr>
              <td>ChatGPT</td>
              <td>${aggregated["alt-chatgpt"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-chatgpt"] / totalVotes) * 100).toFixed(1)
                  : 0
              }%</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

      // Render chart
      renderStatisticsChart(aggregated);
    } catch (err) {
      console.error("Error loading statistics:", err);
      statsContent.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color: #ef4444;">Error loading statistics. Please try again.</p>
      </div>
    `;
    }
  }

  /* -------------------------------------
   Close Statistics Modal
------------------------------------- */
  function closeStatisticsModal() {
    const statsModal = document.getElementById("statsModal");
    if (statsModal) {
      statsModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  /* -------------------------------------
   Open Statistics Modal
------------------------------------- */
  async function openStatisticsModal() {
    const statsModal = document.getElementById("statsModal");
    const statsContent = document.getElementById("statsContent");

    if (!statsModal) {
      console.error("Statistics modal not found");
      return;
    }

    // Show modal
    statsModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Show loading message
    statsContent.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <p style="font-size: 1.2rem; color: #7a3cff;">Loading statistics...</p>
      <div style="margin-top: 1rem;">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;

    try {
      // Fetch all results
      await fetchAllResults();

      // Aggregate totals
      const aggregated = aggregateVoteTotals(allImageResults);

      // Calculate statistics
      const totalVotes = Object.values(aggregated).reduce(
        (sum, val) => sum + val,
        0
      );
      const imagesWithVotes = Object.values(allImageResults).filter(
        (result) => {
          if (!result || !result.totals) return false;
          const total = result.totals.reduce(
            (sum, item) => sum + Number(item.count),
            0
          );
          return total > 0;
        }
      ).length;

      // Render content
      statsContent.innerHTML = `
      <div class="stats-summary">
        <div class="stat-card">
          <h3>Total Votes</h3>
          <p class="stat-number">${totalVotes}</p>
        </div>
        <div class="stat-card">
          <h3>Total Images</h3>
          <p class="stat-number">${dataset.length}</p>
        </div>
        <div class="stat-card">
          <h3>Images Voted</h3>
          <p class="stat-number">${imagesWithVotes}</p>
        </div>
        <div class="stat-card">
          <h3>Completion</h3>
          <p class="stat-number">${Math.round(
            (imagesWithVotes / dataset.length) * 100
          )}%</p>
        </div>
      </div>
      
      <div class="chart-container">
        <div id="statsPlotlyDiv" style="width: 100%; height: 400px;"></div>
      </div>
      
      <div class="stats-breakdown">
        <h3>Vote Breakdown by Source</h3>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Votes</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Human</td>
              <td>${aggregated["alt-human"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-human"] / totalVotes) * 100).toFixed(1)
                  : 0
              }%</td>
            </tr>
            <tr>
              <td>AHREFS</td>
              <td>${aggregated["alt-ahrefs"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-ahrefs"] / totalVotes) * 100).toFixed(1)
                  : 0
              }%</td>
            </tr>
            <tr>
              <td>ASU</td>
              <td>${aggregated["alt-asu"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-asu"] / totalVotes) * 100).toFixed(1)
                  : 0
              }%</td>
            </tr>
            <tr>
              <td>Popupsmart</td>
              <td>${aggregated["alt-popupsmart"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-popupsmart"] / totalVotes) * 100).toFixed(
                      1
                    )
                  : 0
              }%</td>
            </tr>
            <tr>
              <td>ChatGPT</td>
              <td>${aggregated["alt-chatgpt"]}</td>
              <td>${
                totalVotes > 0
                  ? ((aggregated["alt-chatgpt"] / totalVotes) * 100).toFixed(1)
                  : 0
              }%</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

      // Render chart
      renderStatisticsChart(aggregated);

      // Re-attach close button event listener after content is rendered
      const closeStatsBtn = document.getElementById("closeStatsBtn");
      if (closeStatsBtn) {
        closeStatsBtn.addEventListener("click", closeStatisticsModal);
      }
    } catch (err) {
      console.error("Error loading statistics:", err);
      statsContent.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color: #ef4444;">Error loading statistics. Please try again.</p>
      </div>
    `;
    }
  }

  /* -------------------------------------
   Initialize Statistics Modal Event Listeners
   Call this in DOMContentLoaded
------------------------------------- */
  function initializeStatisticsModal() {
    const statsModal = document.getElementById("statsModal");

    // Close button in modal header (×)
    const closeStatsButtons = document.querySelectorAll("[data-close-stats]");
    closeStatsButtons.forEach((btn) => {
      btn.addEventListener("click", closeStatisticsModal);
    });

    // Close button at bottom (this one is added dynamically, so we handle it in openStatisticsModal)
    const closeStatsBtn = document.getElementById("closeStatsBtn");
    if (closeStatsBtn) {
      closeStatsBtn.addEventListener("click", closeStatisticsModal);
    }

    // Close when clicking overlay
    if (statsModal) {
      const overlay = statsModal.querySelector(".modal-overlay");
      if (overlay) {
        overlay.addEventListener("click", closeStatisticsModal);
      }
    }

    console.log("✓ Statistics modal initialized");
  }

  statsBtn.addEventListener("click", async () => {
    closeFloatingMenu();
    await openStatisticsModal();
  });

  // statsBtn.addEventListener("click", async () => {
  //   try {
  //     const res = await fetch(`${API_BASE}/api/stats`);
  //     const stats = await res.json();
  //     alert(`Total votes: ${stats.totalVotes || 0}\nTotal images: ${dataset.length}`);
  //   } catch (err) {
  //     alert("Unable to fetch statistics at this time.");
  //   }
  //   closeFloatingMenu();
  // });

  // Smooth scroll for menu links
  floatingMenu.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      // Close any open modals first
      if (modal.getAttribute("aria-hidden") === "false") {
        closeModal();
      }
      if (aboutModal && aboutModal.getAttribute("aria-hidden") === "false") {
        closeAboutModal();
      }

      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        closeFloatingMenu();
      }
    });
  });
  /* -------------------------------------
     Start
  ------------------------------------- */
  loadDataset();
});
