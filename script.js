// ============================================================
// CARBON CAPTURE DIGITAL TWIN
// FRONTEND CONTROLLER
// ============================================================

const API_URL = "http://127.0.0.1:5000/api/sensor";


// ============================================================
// SENSOR STATE
// ============================================================

window.sensorData = {
    co2: 0,
    temperature: 0,
    humidity: 0,
    airQuality: 0,
    fan: 0,
    prediction: "WAITING",
    confidence: 0,
    captureEfficiency: 0,
    systemHealth: "Waiting",
    plantStatus: "Offline"
};


// ============================================================
// HELPERS
// ============================================================

const $ = id => document.getElementById(id);


// ============================================================
// CLOCK
// ============================================================

function updateClock() {

    const now = new Date();

    $("time").innerText = now.toLocaleTimeString();

    $("date").innerText = now.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

}

setInterval(updateClock, 1000);
updateClock();


// ============================================================
// PAGE NAVIGATION
// ============================================================

document.querySelectorAll(".nav-btn").forEach(btn => {

    btn.addEventListener("click", () => {

        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        $("page-" + btn.dataset.page).classList.add("active");

        // lets the 3D scene and charts resize after being hidden
        window.dispatchEvent(new Event("resize"));

    });

});


// ============================================================
// CHARTS
// ============================================================

const commonOptions = {

    responsive: true,
    maintainAspectRatio: false,
    animation: false,

    plugins: {
        legend: { display: false }
    },

    scales: {

        x: {
            ticks: {
                color: "#71869a",
                maxTicksLimit: 6,
                font: { size: 9 }
            },
            grid: { color: "rgba(255,255,255,0.04)" }
        },

        y: {
            ticks: {
                color: "#71869a",
                font: { size: 9 }
            },
            grid: { color: "rgba(255,255,255,0.04)" }
        }

    }

};


function makeLineChart(canvasId, color, options) {

    return new Chart($(canvasId), {

        type: "line",

        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: color,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.35,
                fill: false
            }]
        },

        options: options

    });

}


const co2Chart = makeLineChart("co2Chart", "#10bfff", commonOptions);

const fanChart = makeLineChart("fanChart", "#43e95a", {

    ...commonOptions,

    scales: {
        ...commonOptions.scales,
        y: {
            ...commonOptions.scales.y,
            min: 0,
            max: 100
        }
    }

});


// ============================================================
// UPDATE CHARTS
// ============================================================

function pushPoint(chart, label, value) {

    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(value);

    if (chart.data.labels.length > 30) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update();

}


function updateCharts() {

    const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    pushPoint(co2Chart, now, Number(window.sensorData.co2));
    pushPoint(fanChart, now, Number(window.sensorData.fan));

}


// ============================================================
// UPDATE SENSOR UI
// ============================================================

function updateSensorUI() {

    const d = window.sensorData;

    $("co2").innerText = `${Number(d.co2).toFixed(0)} ppm`;
    $("temp").innerText = `${Number(d.temperature).toFixed(1)} °C`;
    $("humidity").innerText = `${Number(d.humidity).toFixed(1)} %`;
    $("airQuality").innerText = `${Number(d.airQuality).toFixed(2)} AQI`;
    $("fan").innerText = `${Number(d.fan).toFixed(0)} %`;

    $("prediction").innerText = d.prediction;
    $("confidence").innerText = `${Number(d.confidence || 0).toFixed(1)} %`;

    $("capture").innerText = `${Number(d.captureEfficiency).toFixed(0)} %`;

    $("efficiencyBar").style.width =
        `${Math.max(0, Math.min(100, Number(d.captureEfficiency)))}%`;

    $("health").innerText = `● ${d.systemHealth}`;
    $("esp").innerText = "Backend API";


    // ========================================================
    // PROCESS STATUS
    // ========================================================

    $("fanStatus").innerText = `${Number(d.fan).toFixed(0)} %`;

    if (d.prediction === "HIGH") {
        $("absorberStatus").innerText = "High Load";
        $("storageStatus").innerText = "High";
    }
    else {
        $("absorberStatus").innerText = "Active";
        $("storageStatus").innerText = "Normal";
    }

    $("reboilerStatus").innerText = Number(d.temperature) > 35 ? "HIGH" : "ON";

}


// ============================================================
// PREDICTION COLOR
// ============================================================

function updatePredictionColor() {

    const prediction = $("prediction");
    const twinPrediction = $("twinPrediction");

    const state = String(window.sensorData.prediction).toUpperCase();

    let color = "#00ff88";

    if (state === "HIGH") color = "#ff3b3b";
    else if (state === "MEDIUM") color = "#ffb400";

    prediction.style.color = color;
    twinPrediction.style.color = color;

    twinPrediction.innerText = state;

}


// ============================================================
// RECOMMENDATION
// ============================================================

let lastRecommendationState = null;

function updateRecommendation() {

    const d = window.sensorData;

    // only rewrite the panels when the state actually changes (avoids flicker)
    if (d.prediction === lastRecommendationState) return;

    lastRecommendationState = d.prediction;

    const recommendation = $("recommendation");
    const bottomRecommendation = $("bottomRecommendation");
    const alertBox = $("alertBox");
    const bottomAlert = $("bottomAlert");


    if (d.prediction === "HIGH") {

        recommendation.innerHTML = `
            Increase absorber airflow.<br>
            Fan operating at high load.<br>
            Monitor CO₂ capture performance.
        `;

        bottomRecommendation.innerHTML = `
            Increase fan speed and monitor the
            carbon-capture unit closely.
            <br><br>
            CO₂ level requires attention.
        `;

        alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> HIGH CO₂ CONDITION`;
        bottomAlert.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> WARNING`;

        alertBox.style.color = "#ff5252";
        bottomAlert.style.color = "#ff5252";

        alertBox.style.background = "rgba(120,20,20,0.25)";
        bottomAlert.style.background = "rgba(120,20,20,0.25)";

    }

    else if (d.prediction === "MEDIUM") {

        recommendation.innerHTML = `
            Maintain current operation.<br>
            CO₂ level is moderately elevated.<br>
            Monitor absorber efficiency.
        `;

        bottomRecommendation.innerHTML = `
            Maintain current operation.
            <br><br>
            Monitor absorber efficiency.
        `;

        alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> MODERATE CO₂`;
        bottomAlert.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> MONITOR`;

        alertBox.style.color = "#ffb400";
        bottomAlert.style.color = "#ffb400";

        alertBox.style.background = "rgba(120,78,0,0.2)";
        bottomAlert.style.background = "rgba(120,78,0,0.2)";

    }

    else {

        recommendation.innerHTML = `
            Maintain current operation.<br>
            CO₂ level is in an acceptable range.<br>
            Monitor absorber efficiency.
        `;

        bottomRecommendation.innerHTML = `
            Maintain current operation.
            <br><br>
            CO₂ level is in an acceptable range.
            <br><br>
            Monitor absorber efficiency.
        `;

        alertBox.innerHTML = `<i class="fa-solid fa-check"></i> NORMAL OPERATION`;
        bottomAlert.innerHTML = `<i class="fa-solid fa-check"></i> NORMAL OPERATION`;

        alertBox.style.color = "#00ff88";
        bottomAlert.style.color = "#00ff88";

        alertBox.style.background = "#102f25";
        bottomAlert.style.background = "#102f25";

    }

}


// ============================================================
// FETCH FLASK
// ============================================================

let failCount = 0;

async function fetchSensorData() {

    try {

        const response = await fetch(API_URL, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        failCount = 0;

        window.sensorData = data;

        updateSensorUI();
        updatePredictionColor();
        updateRecommendation();
        updateCharts();

        window.dispatchEvent(
            new CustomEvent("sensorUpdate", { detail: data })
        );

    }

    catch (error) {

        console.error("Backend connection failed:", error);

        failCount++;

        // show OFFLINE only after 2 failed requests in a row
        if (failCount >= 2) {

            $("health").innerText = "● Backend Offline";
            $("prediction").innerText = "OFFLINE";
            $("prediction").style.color = "#71869a";
            $("confidence").innerText = "0.0 %";

            lastRecommendationState = null;

        }

    }

}


// ============================================================
// START
// ============================================================

fetchSensorData();

setInterval(fetchSensorData, 2000);


// ============================================================
// CAMERA BUTTONS
// ============================================================

window.setCameraView = function (view) {

    const buttons = document.querySelectorAll(".camera-btn");

    buttons.forEach(b => b.classList.remove("active"));

    const index = { plant: 0, capture: 1, storage: 2, top: 3 }[view];

    if (index !== undefined) {
        buttons[index].classList.add("active");
    }

    window.dispatchEvent(
        new CustomEvent("cameraChange", { detail: view })
    );

};