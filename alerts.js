// ============================================================
// ALERTS LOG PAGE  (Step 4)
// ============================================================

(function () {

    const root = document.getElementById("alertsRoot");
    if (!root) return;

    const BASE = "http://127.0.0.1:5000";

    let lastRows = [];


    // ========================================================
    // BUILD PAGE
    // ========================================================

    root.innerHTML = `
        <div class="analytics-toolbar">
            <div class="panel-title">ALERTS &amp; EVENTS LOG</div>

            <div class="toolbar-right">
                <select id="alertFilter" class="range-select">
                    <option value="ALL">All severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="WARNING">Warning</option>
                    <option value="INFO">Info</option>
                </select>

                <button id="exportAlerts" class="tool-btn"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
                <button id="clearAlerts" class="tool-btn danger"><i class="fa-solid fa-trash"></i> Clear</button>
            </div>
        </div>

        <div class="stat-grid">
            <div class="panel-card stat-card">
                <div class="stat-label" style="color:#12bfff">TOTAL EVENTS</div>
                <div class="stat-main" id="cnt-total">0</div>
            </div>
            <div class="panel-card stat-card">
                <div class="stat-label" style="color:#ff5252">CRITICAL</div>
                <div class="stat-main" id="cnt-critical">0</div>
            </div>
            <div class="panel-card stat-card">
                <div class="stat-label" style="color:#ffb400">WARNING</div>
                <div class="stat-main" id="cnt-warning">0</div>
            </div>
            <div class="panel-card stat-card">
                <div class="stat-label" style="color:#00ff88">INFO / RECOVERED</div>
                <div class="stat-main" id="cnt-info">0</div>
            </div>
        </div>

        <div class="panel-card table-card">
            <table class="alert-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Severity</th>
                        <th>State</th>
                        <th>CO₂</th>
                        <th>Temp</th>
                        <th>Confidence</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody id="alertBody">
                    <tr><td colspan="7" class="empty-row">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    const body = document.getElementById("alertBody");
    const filter = document.getElementById("alertFilter");


    // ========================================================
    // HELPERS
    // ========================================================

    function esc(text) {
        return String(text ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }


    // ========================================================
    // DRAW
    // ========================================================

    function draw(data) {

        const c = data.counts;

        document.getElementById("cnt-total").innerText = c.CRITICAL + c.WARNING + c.INFO;
        document.getElementById("cnt-critical").innerText = c.CRITICAL;
        document.getElementById("cnt-warning").innerText = c.WARNING;
        document.getElementById("cnt-info").innerText = c.INFO;

        if (!data.alerts.length) {
            body.innerHTML = `<tr><td colspan="7" class="empty-row">No events logged yet. Events appear when the plant state changes.</td></tr>`;
            return;
        }

        body.innerHTML = data.alerts.map(a => `
            <tr>
                <td>${new Date(a.ts * 1000).toLocaleString()}</td>
                <td><span class="sev sev-${esc(a.severity)}">${esc(a.severity)}</span></td>
                <td>${esc(a.prediction)}</td>
                <td>${Number(a.co2).toFixed(0)} ppm</td>
                <td>${Number(a.temperature).toFixed(1)} °C</td>
                <td>${Number(a.confidence).toFixed(1)} %</td>
                <td class="msg">${esc(a.message)}</td>
            </tr>
        `).join("");

    }


    // ========================================================
    // LOAD
    // ========================================================

    async function load() {

        try {

            const res = await fetch(
                `${BASE}/api/alerts?limit=200&severity=${filter.value}`,
                { cache: "no-store" }
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();

            lastRows = data.alerts;
            draw(data);

        }

        catch (err) {

            console.error("Alerts load failed:", err);

            body.innerHTML = `<tr><td colspan="7" class="empty-row">Backend offline</td></tr>`;

        }

    }


    // ========================================================
    // ACTIONS
    // ========================================================

    document.getElementById("exportAlerts").addEventListener("click", () => {

        const header = ["time", "severity", "state", "co2_ppm", "temp_c", "confidence_pct", "message"];

        const lines = lastRows.map(a => [
            new Date(a.ts * 1000).toISOString(),
            a.severity,
            a.prediction,
            Number(a.co2).toFixed(0),
            Number(a.temperature).toFixed(1),
            Number(a.confidence).toFixed(1),
            `"${String(a.message).replace(/"/g, '""')}"`
        ].join(","));

        const csv = [header.join(","), ...lines].join("\n");

        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        link.download = "alerts_log.csv";
        link.click();

    });


    document.getElementById("clearAlerts").addEventListener("click", async () => {

        if (!confirm("Clear the entire alerts log?")) return;

        await fetch(`${BASE}/api/alerts/clear`, { method: "POST" });

        load();

    });


    filter.addEventListener("change", load);


    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.page === "alerts") load();
        });
    });


    // auto refresh while the Alerts page is open
    setInterval(() => {
        if (document.getElementById("page-alerts").classList.contains("active")) load();
    }, 5000);

})();