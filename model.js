// ============================================================
// MODEL INFO PAGE  (Step 5)
// ============================================================

(function () {

    const root = document.getElementById("modelRoot");
    if (!root) return;

    const BASE = "http://127.0.0.1:5000";

    let loaded = false;
    let importanceChart = null;


    // ========================================================
    // HELPERS
    // ========================================================

    function esc(text) {
        return String(text ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    function statCard(label, value, sub, color) {
        return `
            <div class="panel-card stat-card">
                <div class="stat-label" style="color:${color}">${label}</div>
                <div class="stat-main">${value}</div>
                <div class="stat-sub">${sub}</div>
            </div>`;
    }


    // ========================================================
    // CONFUSION MATRIX
    // ========================================================

    function matrixHTML(ev) {

        const max = Math.max(1, ...ev.matrix.flat());

        const head = ev.labels.map(l => `<th>${esc(l)}</th>`).join("");

        const rows = ev.matrix.map((row, i) => `
            <tr>
                <th>${esc(ev.labels[i])}</th>
                ${row.map((v, j) => {
                    const a = (0.12 + 0.75 * v / max).toFixed(2);
                    const bg = i === j
                        ? `rgba(0, 255, 136, ${a})`
                        : (v ? `rgba(255, 82, 82, ${a})` : "rgba(255,255,255,0.03)");
                    return `<td style="background:${bg}">${v}</td>`;
                }).join("")}
            </tr>`).join("");

        return `
            <table class="cm-table">
                <thead>
                    <tr><th class="cm-corner">Actual ↓ / Predicted →</th>${head}</tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;

    }


    // ========================================================
    // RENDER
    // ========================================================

    function render(info) {

        if (!info.available) {
            root.innerHTML = `
                <div class="panel-card empty-card">
                    Model not loaded on the backend.<br>
                    Put <b>decision_tree_model.pkl</b> in the project folder and restart Flask.
                </div>`;
            return;
        }

        const ev = info.evaluation && !info.evaluation.error ? info.evaluation : null;
        const tflite = info.files_kb && info.files_kb["carbon_capture_model.tflite"];

        const cards = [
            statCard("ALGORITHM", esc(info.algorithm), `${info.classes.length} classes: ${esc(info.classes.join(", "))}`, "#12bfff"),
            statCard("ACCURACY", ev ? ev.accuracy + " %" : "n/a", ev ? `on ${ev.samples} dataset samples` : "dataset not evaluated", "#00ff88"),
            statCard("TREE SIZE", info.depth !== undefined ? "Depth " + info.depth : "n/a", info.leaves !== undefined ? info.leaves + " leaf nodes" : "", "#ffb400"),
            statCard("EDGE MODEL", tflite ? tflite + " KB" : "n/a", "carbon_capture_model.tflite", "#28da8a")
        ].join("");

        const evalBlock = ev
            ? matrixHTML(ev)
            : `<div class="empty-note">${
                info.evaluation && info.evaluation.error
                    ? esc(info.evaluation.error)
                    : "Place carbon_datasetori.csv next to the model to see the confusion matrix."
              }</div>`;

        const files = Object.entries(info.files_kb || {}).map(([name, kb]) => `
            <tr><td>${esc(name)}</td><td>${kb} KB</td></tr>`).join("");

        root.innerHTML = `
            <div class="analytics-toolbar">
                <div class="panel-title">MODEL INFORMATION</div>
            </div>

            <div class="stat-grid">${cards}</div>

            <div class="model-grid">

                <div class="bottom-card an-card">
                    <div class="chart-title">FEATURE IMPORTANCE (%)</div>
                    <div class="an-chart"><canvas id="importanceChart"></canvas></div>
                </div>

                <div class="bottom-card an-card">
                    <div class="chart-title">CONFUSION MATRIX${ev ? " · label column: " + esc(ev.label_column) : ""}</div>
                    ${evalBlock}
                </div>

                <div class="bottom-card an-card">
                    <div class="chart-title">DEPLOYMENT FILES</div>
                    <table class="alert-table">
                        <tbody>${files || `<tr><td class="empty-row">No model files found</td></tr>`}</tbody>
                    </table>
                </div>

                <div class="bottom-card an-card">
                    <div class="chart-title">MODEL NOTES (model_info.txt)</div>
                    <pre class="notes-box">${esc(info.notes || "model_info.txt not found")}</pre>
                </div>

            </div>
        `;

        drawImportance(info.features || []);

    }


    function drawImportance(features) {

        if (importanceChart) importanceChart.destroy();

        const sorted = [...features].sort((a, b) => b.importance - a.importance);

        importanceChart = new Chart(document.getElementById("importanceChart"), {

            type: "bar",

            data: {
                labels: sorted.map(f => f.name),
                datasets: [{
                    data: sorted.map(f => f.importance),
                    backgroundColor: "#10bfff",
                    borderRadius: 4
                }]
            },

            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        min: 0,
                        ticks: { color: "#71869a", font: { size: 9 } },
                        grid: { color: "rgba(255,255,255,0.04)" }
                    },
                    y: {
                        ticks: { color: "#dce8f3", font: { size: 11 } },
                        grid: { display: false }
                    }
                }
            }

        });

    }


    // ========================================================
    // LOAD
    // ========================================================

    async function load() {

        try {

            const res = await fetch(`${BASE}/api/model`, { cache: "no-store" });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            render(await res.json());

            loaded = true;

        }

        catch (err) {

            console.error("Model info load failed:", err);

            root.innerHTML = `<div class="panel-card empty-card">Backend offline or /api/model missing. Restart Flask with the new app.py.</div>`;

        }

    }


    root.innerHTML = `<div class="panel-card empty-card">Loading model information...</div>`;


    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.page === "model" && !loaded) load();
        });
    });

})();