/**
 * Virtual Digital Oscilloscope for Circuit Builder Mode
 * Supports CH1 (Red), CH2 (Blue), and Math (CH1 - CH2) probes connected to canvas nodes
 */
import { formatSI } from '../utils/si-units.js';

let scopeChart = null;
let scopeOpen = false;
let scopePaused = false;
let timeDiv = 5; // ms per div (total 10 divs = 50ms)
let ch1VoltsDiv = 5; // V per div
let ch2VoltsDiv = 5; // V per div
let ch1Enabled = true;
let ch2Enabled = true;
let mathEnabled = false;

// Probe positions (node IDs)
export const probes = {
    ch1: null, // node_id
    ch2: null, // node_id
    gnd: null  // reference node_id (defaults to ground net 0)
};

export let probeSelectingMode = null; // 'ch1' | 'ch2' | null

export function isScopeOpen() { return scopeOpen; }

export function setProbeSelectingMode(ch) {
    if (probeSelectingMode === ch) {
        probeSelectingMode = null;
    } else {
        probeSelectingMode = ch;
    }
    updateScopeUI();
}

export function setTimeDiv(ms) {
    timeDiv = ms;
    updateScopeUI();
    if (scopeOpen) updateBuilderScope(window.last_sim_result || null);
}

export function toggleChannel(ch) {
    if (ch === 'ch1') ch1Enabled = !ch1Enabled;
    if (ch === 'ch2') ch2Enabled = !ch2Enabled;
    updateScopeUI();
    if (scopeOpen) updateBuilderScope(window.last_sim_result || null);
}

export function toggleMath() {
    mathEnabled = !mathEnabled;
    updateScopeUI();
    if (scopeOpen) updateBuilderScope(window.last_sim_result || null);
}

export function clearProbes() {
    probes.ch1 = null;
    probes.ch2 = null;
    probeSelectingMode = null;
    updateProbeBadges();
    updateScopeUI();
    if (window.renderProbesOnCanvas) window.renderProbesOnCanvas();
    if (scopeOpen) updateBuilderScope(window.last_sim_result || null);
}

export function updateScopeUI() {
    const btnCh1Probe = document.getElementById('btn-scope-probe-ch1');
    const btnCh2Probe = document.getElementById('btn-scope-probe-ch2');
    if (btnCh1Probe) {
        btnCh1Probe.classList.toggle('ring-2', probeSelectingMode === 'ch1');
        btnCh1Probe.classList.toggle('ring-rose-400', probeSelectingMode === 'ch1');
        btnCh1Probe.classList.toggle('bg-rose-600', probeSelectingMode === 'ch1');
        btnCh1Probe.classList.toggle('text-white', probeSelectingMode === 'ch1');
    }
    if (btnCh2Probe) {
        btnCh2Probe.classList.toggle('ring-2', probeSelectingMode === 'ch2');
        btnCh2Probe.classList.toggle('ring-sky-400', probeSelectingMode === 'ch2');
        btnCh2Probe.classList.toggle('bg-sky-600', probeSelectingMode === 'ch2');
        btnCh2Probe.classList.toggle('text-white', probeSelectingMode === 'ch2');
    }

    const btnCh1Toggle = document.getElementById('btn-scope-toggle-ch1');
    const btnCh2Toggle = document.getElementById('btn-scope-toggle-ch2');
    const btnMathToggle = document.getElementById('btn-scope-toggle-math');
    if (btnCh1Toggle) btnCh1Toggle.classList.toggle('opacity-40', !ch1Enabled);
    if (btnCh2Toggle) btnCh2Toggle.classList.toggle('opacity-40', !ch2Enabled);
    if (btnMathToggle) btnMathToggle.classList.toggle('opacity-40', !mathEnabled);

    [1, 2, 5, 10, 20].forEach(t => {
        const tBtn = document.getElementById(`btn-scope-tdiv-${t}`);
        if (tBtn) {
            tBtn.classList.toggle('bg-slate-700', timeDiv === t);
            tBtn.classList.toggle('text-white', timeDiv === t);
            tBtn.classList.toggle('border-indigo-400', timeDiv === t);
        }
    });

    const hint = document.getElementById('scope-selecting-hint');
    if (hint) {
        if (probeSelectingMode) {
            hint.textContent = `📍 กรุณาคลิกเลือกจุดต่อ (Pin Node) บนผังวงจร สำหรับโพรบ ${probeSelectingMode.toUpperCase()}`;
            hint.classList.remove('hidden');
        } else {
            hint.classList.add('hidden');
        }
    }
}

export function toggleBuilderScope(show = null) {
    scopeOpen = show !== null ? show : !scopeOpen;
    const panel = document.getElementById('builder-scope-panel');
    const btn = document.getElementById('btn-toggle-builder-scope');
    if (panel) {
        panel.classList.toggle('hidden', !scopeOpen);
    }
    if (btn) {
        btn.classList.toggle('bg-indigo-600', scopeOpen);
        btn.classList.toggle('text-white', scopeOpen);
        btn.classList.toggle('bg-indigo-50', !scopeOpen);
    }
    if (scopeOpen) {
        if (!scopeChart) initBuilderScopeChart();
        updateScopeUI();
        updateProbeBadges();
        updateBuilderScope(window.last_sim_result || null);
    }
}

export function initBuilderScopeChart() {
    const cv = document.getElementById('builderScopeCanvas');
    if (!cv || typeof Chart === 'undefined') return;
    const ctx = cv.getContext('2d');

    scopeChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    display: true,
                    grid: { color: 'rgba(51, 65, 85, 0.6)', lineWidth: 1 },
                    ticks: { color: '#94a3b8', font: { size: 10 } },
                    title: { display: true, text: 'เวลา Time (ms)', color: '#94a3b8', font: { size: 11 } }
                },
                y: {
                    display: true,
                    grid: { color: 'rgba(51, 65, 85, 0.6)', lineWidth: 1 },
                    ticks: { color: '#94a3b8', font: { size: 10 } },
                    title: { display: true, text: 'แรงดัน Voltage (V)', color: '#94a3b8', font: { size: 11 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => `t = ${items[0].label} ms`
                    }
                }
            }
        }
    });
}

export function setProbeNode(channel, nodeId) {
    probes[channel] = nodeId;
    updateProbeBadges();
    if (scopeOpen) updateBuilderScope(window.last_sim_result || null);
}

export function updateProbeBadges() {
    const b1 = document.getElementById('scope-ch1-badge');
    const b2 = document.getElementById('scope-ch2-badge');
    if (b1) b1.textContent = probes.ch1 ? `CH1: ${probes.ch1}` : 'CH1: ไม่ได้ต่อ';
    if (b2) b2.textContent = probes.ch2 ? `CH2: ${probes.ch2}` : 'CH2: ไม่ได้ต่อ';
}

export function updateBuilderScope(simResult) {
    if (!scopeOpen || !scopeChart || scopePaused) return;

    const totalTimeMs = timeDiv * 10; // 10 horizontal divisions
    const totalTimeS = totalTimeMs / 1000;
    const pts = 120;
    const dt = totalTimeS / pts;

    const labels = [];
    const ch1Data = [];
    const ch2Data = [];
    const mathData = [];

    // Check simulation type and values
    const isAC = simResult?.isAC || false;
    const freq = isAC ? (simResult?.frequency || 50) : 0;
    const omega = 2 * Math.PI * freq;
    const phaseOffset = window.ST?.phase || 0;

    // Node mapping
    const nodeToNet = simResult?.netlist?.nodeToNet;
    const nodeVoltages = simResult?.nodeVoltages || {};

    let v1Complex = null;
    let v2Complex = null;
    let v1Real = 0;
    let v2Real = 0;

    if (simResult && simResult.success && nodeToNet) {
        if (probes.ch1) {
            const net1 = nodeToNet.get(probes.ch1);
            const val1 = nodeVoltages[net1] ?? 0;
            if (isAC) v1Complex = val1;
            else v1Real = typeof val1 === 'number' ? val1 : 0;
        }
        if (probes.ch2) {
            const net2 = nodeToNet.get(probes.ch2);
            const val2 = nodeVoltages[net2] ?? 0;
            if (isAC) v2Complex = val2;
            else v2Real = typeof val2 === 'number' ? val2 : 0;
        }
    }

    for (let i = 0; i <= pts; i++) {
        const t = i * dt;
        labels.push((t * 1000).toFixed(1));

        let y1 = 0;
        let y2 = 0;

        if (isAC) {
            const wt = omega * t + phaseOffset;
            if (v1Complex) {
                const mag = v1Complex.mag ? v1Complex.mag() * Math.SQRT2 : 0; // peak
                const phi = v1Complex.phase ? v1Complex.phase() : 0;
                y1 = mag * Math.sin(wt + phi);
            }
            if (v2Complex) {
                const mag = v2Complex.mag ? v2Complex.mag() * Math.SQRT2 : 0;
                const phi = v2Complex.phase ? v2Complex.phase() : 0;
                y2 = mag * Math.sin(wt + phi);
            }
        } else {
            // DC steady level
            y1 = v1Real;
            y2 = v2Real;
        }

        ch1Data.push(+y1.toFixed(2));
        ch2Data.push(+y2.toFixed(2));
        mathData.push(+(y1 - y2).toFixed(2));
    }

    const datasets = [];
    if (ch1Enabled && probes.ch1) {
        datasets.push({
            label: 'CH1 (V)',
            data: ch1Data,
            borderColor: '#ef4444',
            borderWidth: 2.5,
            pointRadius: 0
        });
    }
    if (ch2Enabled && probes.ch2) {
        datasets.push({
            label: 'CH2 (V)',
            data: ch2Data,
            borderColor: '#38bdf8',
            borderWidth: 2.5,
            pointRadius: 0
        });
    }
    if (mathEnabled && probes.ch1 && probes.ch2) {
        datasets.push({
            label: 'CH1 - CH2 (V)',
            data: mathData,
            borderColor: '#a855f7',
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 0
        });
    }

    scopeChart.data.labels = labels;
    scopeChart.data.datasets = datasets;
    scopeChart.update();

    // Update measurements panel
    const measEl = document.getElementById('scope-measurements');
    if (measEl) {
        let h1 = '--', h2 = '--', vdiff = '--';
        if (probes.ch1) {
            const p1 = Math.max(...ch1Data.map(Math.abs));
            h1 = isAC ? `Pk: ${p1.toFixed(1)}V (rms: ${(p1/Math.SQRT2).toFixed(1)}V)` : `${v1Real.toFixed(2)}V`;
        }
        if (probes.ch2) {
            const p2 = Math.max(...ch2Data.map(Math.abs));
            h2 = isAC ? `Pk: ${p2.toFixed(1)}V (rms: ${(p2/Math.SQRT2).toFixed(1)}V)` : `${v2Real.toFixed(2)}V`;
        }
        if (probes.ch1 && probes.ch2) {
            const pDiff = Math.max(...mathData.map(Math.abs));
            vdiff = isAC ? `Pk: ${pDiff.toFixed(1)}V` : `${(v1Real - v2Real).toFixed(2)}V`;
        }
        measEl.innerHTML = `
            <span class="text-rose-400 font-mono text-xs">CH1: ${h1}</span>
            <span class="text-sky-400 font-mono text-xs ml-4">CH2: ${h2}</span>
            <span class="text-purple-400 font-mono text-xs ml-4">ΔV: ${vdiff}</span>
            ${isAC ? `<span class="text-amber-400 font-mono text-xs ml-4">f: ${freq}Hz</span>` : ''}
        `;
    }
}
