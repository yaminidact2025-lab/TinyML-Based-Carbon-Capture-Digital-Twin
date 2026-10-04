// ============================================================
// CONTROL PANEL PAGE  (Step 7)
// ============================================================

(function () {

    const root = document.getElementById("controlRoot");
    if (!root) return;

    const URL_CONTROL = "http://127.0.0.1:5000/api/control";

    let state = { mode: "auto", manualFan: 50, simTarget: null };


    // ========================================================
    // BUILD PAGE
    // ========================================================

    root.innerHTML = `
        <div class="analytics-toolbar">
            <div class="panel-title">CONTROL PANEL</div>
            <div id="ctlMsg" class="ctl-msg"></div>
        </div>

        <div class="model-grid">

            <div class="panel-card ctl-card">
                <div class="panel-title">EXHAUST FAN CONTROL</div>

                <div class="seg">
                    <button id="modeAuto" class="seg-btn active">Auto (TinyML)</button>
                    <button id="modeManual" class="seg-btn">Manual</button>
                </div>

                <div class="ctl-hint" id="fanHint">
                    Auto: the fan follows the TinyML prediction.
                </div>

                <div class="ctl-value" id="fanVal">-- %</div>

                <input type="range" id="fanSlider" min="0" max="100" step="5" value="50" disabled>

                <div class="ctl-hint">
                    In manual mode, running the fan below the recommended speed lowers capture efficiency.
                </div>
            </div>

            <div class="panel-card ctl-card">
                <div class="panel-title">WHAT-IF SIMULATION</div>

                <div class="ctl-hint">
                    Push CO₂ toward a target and watch the model, alerts and charts react.
                </div>

                <div class="ctl-value" id="simVal">600 ppm</div>

                <input type="range" id="simSlider" min="300" max="900" step="10" value="600">

                <div class="preset-row">
                    <button class="tool-btn" data-sim="420">Normal 420</button>
                    <button class="tool-btn" data-sim="580">Medium 580</button>
                    <button class="tool-btn" data-sim="780">High 780</button>
                    <button class="tool-btn danger" id="simStop">Stop simulation</button>
                </div>
            </div>

            <div class="panel-card ctl-card ctl-wide">
                <div class="panel-title">LIVE STATUS</div>

                <div class="ctl-status">
                    <div><span>CO₂</span><b id="lv-co2">--</b></div>
                    <div><span>Prediction</span><b id="lv-pred">--</b></div>
                    <div><span>Fan</span><b id="lv-fan">--</b></div>
                    <div><span>Capture efficiency</span><b id="lv-eff">--</b></div>
                    <div><span>Simulation</span><b id="lv-sim">Off</b></div>
                </div>
            </div>

        </div>
    `;

    const $ = id => document.getElementById(id);

    const fanSlider = $("fanSlider");
    const simSlider = $("simSlider");


    // ========================================================
    // API
    // ========================================================

    function flash(text, ok) {
        const el = $("ctlMsg");
        el.innerText = text;
        el.style.color = ok ? "#00ff88" : "#ff5252";
        setTimeout(() => { el.innerText = ""; }, 3000);
    }

    async function send(payload) {

        try {

            const res = await fetch(URL_CONTROL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            state = await res.json();

            applyState();
            flash("Applied", true);

        }

        catch (err) {

            console.error("Control update failed:", err);
            flash("Backend offline or /api/control missing", false);

        }

    }

    async function loadState() {

        try {

            const res = await fetch(URL_CONTROL, { cache: "no-store" });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            state = await res.json();

            applyState();

        }

        catch (err) {

            console.error("Control state load failed:", err);

        }

    }


    // ========================================================
    // UI STATE
    // ========================================================

    function applyState() {

        const manual = state.mode === "manual";

        $("modeAuto").classList.toggle("active", !manual);
        $("modeManual").classList.toggle("active", manual);

        fanSlider.disabled = !manual;

        if (manual) {
            fanSlider.value = state.manualFan;
            $("fanVal").innerText = `${Math.round(state.manualFan)} %`;
            $("fanHint").innerText = "Manual: you set the fan speed. The model keeps predicting.";
        } else {
            $("fanHint").innerText = "Auto: the fan follows the TinyML prediction.";
        }

        if (state.simTarget !== null && state.simTarget !== undefined) {
            simSlider.value = state.simTarget;
            $("simVal").innerText = `${Math.round(state.simTarget)} ppm`;
        }

    }


    // ========================================================
    // EVENTS
    // ========================================================

    $("modeAuto").addEventListener("click", () => send({ mode: "auto" }));

    $("modeManual").addEventListener("click", () =>
        send({ mode: "manual", manualFan: Number(fanSlider.value) })
    );

    fanSlider.addEventListener("input", () => {
        $("fanVal").innerText = `${fanSlider.value} %`;
    });

    fanSlider.addEventListener("change", () =>
        send({ manualFan: Number(fanSlider.value) })
    );

    simSlider.addEventListener("input", () => {
        $("simVal").innerText = `${simSlider.value} ppm`;
    });

    simSlider.addEventListener("change", () =>
        send({ simTarget: Number(simSlider.value) })
    );

    root.querySelectorAll("[data-sim]").forEach(btn => {
        btn.addEventListener("click", () => {
            simSlider.value = btn.dataset.sim;
            $("simVal").innerText = `${btn.dataset.sim} ppm`;
            send({ simTarget: Number(btn.dataset.sim) });
        });
    });

    $("simStop").addEventListener("click", () => send({ simTarget: null }));


    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.page === "control") loadState();
        });
    });


    // ========================================================
    // LIVE STATUS
    // ========================================================

    window.addEventListener("sensorUpdate", e => {

        const d = e.detail;

        $("lv-co2").innerText = `${Number(d.co2).toFixed(0)} ppm`;
        $("lv-pred").innerText = d.prediction;
        $("lv-fan").innerText = `${Number(d.fan).toFixed(0)} % (${d.fanMode || "AUTO"})`;
        $("lv-eff").innerText = `${Number(d.captureEfficiency).toFixed(0)} %`;
        $("lv-sim").innerText = d.simulating ? "Running" : "Off";

        // in auto mode the slider just mirrors the fan speed
        if (state.mode === "auto") {
            fanSlider.value = d.fan;
            $("fanVal").innerText = `${Number(d.fan).toFixed(0)} %`;
        }

    });


    loadState();

})();