// ============================================================
// ANALYTICS PAGE  (Step 3)
// ============================================================

(function () {

    const root = document.getElementById("analyticsRoot");
    if (!root) return;

    const MAX_POINTS = 1000;
    const history = [];

    const METRICS = [
        { key: "co2",         label: "CO₂",         unit: "ppm", color: "#10bfff", dec: 0 },
        { key: "temperature", label: "Temperature", unit: "°C",  color: "#ff5353", dec: 1 },
        { key: "humidity",    label: "Humidity",    unit: "%",   color: "#25d7ff", dec: 1 },
        { key: "airQuality",  label: "Air Quality", unit: "AQI", color: "#28da8a", dec: 2 }
    ];


    // ========================================================
    // BUILD PAGE
    // ========================================================

    root.innerHTML = `
        <div class="analytics-toolbar">
            <div class="panel-title">LIVE ANALYTICS</div>
            <select id="rangeSelect" class="range-select">
                <option value="60000">Last 1 min</option>
                <option value="300000" selected>Last 5 min</option>
                <option value="900000">Last 15 min</option>
                <option value="1800000">Last 30 min</option>
            </select>
        </div>

        <div class="stat-grid">
            ${METRICS.map(m => `
                <div class="panel-card stat-card">
                    <div class="stat-label" style="color:${m.color}">${m.label} · AVERAGE</div>
                    <div class="stat-main" id="avg-${m.key}">--</div>
                    <div class="stat-sub" id="mm-${m.key}">min -- · max --</div>
                </div>
            `).join("")}
        </div>

        <div class="analytics-grid">
            ${METRICS.map(m => `
                <div class="bottom-card an-card">
                    <div class="chart-title">${m.label.toUpperCase()} (${m.unit})</div>
                    <div class="an-chart"><canvas id="an-${m.key}"></canvas></div>
                </div>
            `).join("")}
        </div>
    `;


    // ========================================================
    // CHARTS
    // ========================================================

    const charts = {};

    METRICS.forEach(m => {

        charts[m.key] = new Chart(document.getElementById("an-" + m.key), {

            type: "line",

            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: m.color,
                    backgroundColor: m.color + "22",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.35,
                    fill: true
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        ticks: { color: "#71869a", maxTicksLimit: 6, font: { size: 9 } },
                        grid: { color: "rgba(255,255,255,0.04)" }
                    },
                    y: {
                        ticks: { color: "#71869a", font: { size: 9 } },
                        grid: { color: "rgba(255,255,255,0.04)" }
                    }
                }
            }

        });

    });


    // ========================================================
    // RENDER
    // ========================================================

    function render() {

        const range = Number(document.getElementById("rangeSelect").value);
        const cutoff = Date.now() - range;

        const rows = history.filter(h => h.t >= cutoff);

        const labels = rows.map(r =>
            new Date(r.t).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            })
        );

        METRICS.forEach(m => {

            const vals = rows.map(r => r[m.key]);
            const chart = charts[m.key];

            chart.data.labels = labels;
            chart.data.datasets[0].data = vals;
            chart.update("none");

            if (vals.length) {

                const avg = vals.reduce((a, b) => a + b, 0) / vals.length;

                document.getElementById("avg-" + m.key).innerText =
                    `${avg.toFixed(m.dec)} ${m.unit}`;

                document.getElementById("mm-" + m.key).innerText =
                    `min ${Math.min(...vals).toFixed(m.dec)} · max ${Math.max(...vals).toFixed(m.dec)}`;

            }

        });

    }


    // ========================================================
    // EVENTS
    // ========================================================

    window.addEventListener("sensorUpdate", e => {

        const d = e.detail;

        history.push({
            t: Date.now(),
            co2: Number(d.co2),
            temperature: Number(d.temperature),
            humidity: Number(d.humidity),
            airQuality: Number(d.airQuality)
        });

        if (history.length > MAX_POINTS) history.shift();

        if (document.getElementById("page-analytics").classList.contains("active")) {
            render();
        }

    });

    document.getElementById("rangeSelect").addEventListener("change", render);

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.page === "analytics") setTimeout(render, 50);
        });
    });

    // ========================================================
    // PRELOAD SAVED HISTORY FROM BACKEND (Step 4)
    // ========================================================

    fetch("http://127.0.0.1:5000/api/history?minutes=30")
        .then(r => r.json())
        .then(rows => {

            const firstLive = history.length ? history[0].t : Infinity;

            const saved = rows
                .filter(r => r.t < firstLive - 500)
                .map(r => ({
                    t: r.t,
                    co2: r.co2,
                    temperature: r.temperature,
                    humidity: r.humidity,
                    airQuality: r.airQuality
                }));

            history.unshift(...saved);

            if (history.length > MAX_POINTS) {
                history.splice(0, history.length - MAX_POINTS);
            }

        })
        .catch(() => {});

})();