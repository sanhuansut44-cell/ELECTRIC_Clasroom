/**
 * Presets View Controller (Sliders, Calculation Engine & Parameter Handlers)
 */
import { CE } from '../models/math-engine.js';
import { updateOscilloscope } from '../visualizers/oscilloscope.js';
import { drawPhasor } from '../visualizers/phasor-diagram.js';
import { drawACCircuit } from '../visualizers/ac-schematic.js';
import { updateWiringPanel } from '../visualizers/wiring-guide.js';
import { drawResonanceChart } from '../visualizers/resonance-chart.js';
import { drawStarDeltaDiagram } from '../visualizers/star-delta-diagram.js';

export const ST = {
    mainView: 'builder', // 'presets' | 'builder'
    src: 'dc',
    cir: 'ohm',
    anim: true,
    phase: 0
};

const PM = {
    v_dc: ['sl_v_dc', 'in_v_dc'], r1: ['sl_r1', 'in_r1'], r2: ['sl_r2', 'in_r2'], r3: ['sl_r3', 'in_r3'],
    v_ac: ['sl_v_ac', 'in_v_ac'], freq: ['sl_freq', 'in_freq'], r_ac: ['sl_r_ac', 'in_r_ac'],
    l: ['sl_l', 'in_l'], c: ['sl_c', 'in_c']
};

export function gv(k) {
    const el = document.getElementById(PM[k][1]);
    let val = parseFloat(el.value);
    if (isNaN(val) || val === 0) val = parseFloat(document.getElementById(PM[k][0]).value);
    return val;
}

export function syncSlider(k) {
    document.getElementById(PM[k][1]).value = document.getElementById(PM[k][0]).value;
    if (['l','c','freq'].includes(k)) syncXfromLC();
    updateAll();
}

export function syncInput(k) {
    const inp = document.getElementById(PM[k][1]);
    let v = parseFloat(inp.value);
    if (!isNaN(v)) {
        const s = document.getElementById(PM[k][0]);
        s.value = Math.min(Math.max(v, +s.min), +s.max);
        const inMin = parseFloat(inp.min), inMax = parseFloat(inp.max);
        if (!isNaN(inMin) && v < inMin) { v = inMin; inp.value = v; }
        if (!isNaN(inMax) && v > inMax) { v = inMax; inp.value = v; }
    }
    if (['l','c','freq'].includes(k)) syncXfromLC();
    updateAll();
}

let _syncing = false;
export function syncXfromLC() {
    if (_syncing) return;
    _syncing = true;
    const f = gv('freq') || 1, L = gv('l') / 1000, C = gv('c') / 1e6;
    const xl = CE.XL(f, L), xc = CE.XC(f, C);
    document.getElementById('in_xl').value = xl.toFixed(2);
    document.getElementById('in_xc').value = isFinite(xc) ? xc.toFixed(2) : '0';
    _syncing = false;
}

export function syncXL() {
    if (_syncing) return;
    _syncing = true;
    const f = gv('freq') || 1, xl = parseFloat(document.getElementById('in_xl').value) || 0;
    const L_mH = isFinite(CE.LfromXL(f, xl)) ? CE.LfromXL(f, xl) * 1000 : 0;
    document.getElementById('in_l').value = L_mH.toFixed(2);
    const s = document.getElementById('sl_l');
    s.value = Math.min(Math.max(L_mH, +s.min), +s.max);
    _syncing = false; updateAll();
}

export function syncXC() {
    if (_syncing) return;
    _syncing = true;
    const f = gv('freq') || 1, xc = parseFloat(document.getElementById('in_xc').value) || 0.01;
    const C_uF = isFinite(CE.CfromXC(f, xc)) ? CE.CfromXC(f, xc) * 1e6 : 0;
    document.getElementById('in_c').value = C_uF.toFixed(2);
    const s = document.getElementById('sl_c');
    s.value = Math.min(Math.max(C_uF, +s.min), +s.max);
    _syncing = false; updateAll();
}

export function switchMainView(v, update_viewbox_fn) {
    ST.mainView = v;
    document.getElementById('presets-view').classList.toggle('hidden', v !== 'presets');
    document.getElementById('builder-view').classList.toggle('hidden', v !== 'builder');
    document.getElementById('btn_view_presets').className = `main-tab-btn px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${v === 'presets' ? 'active bg-white text-[#2d2e8b] shadow-sm' : 'text-white/80 hover:text-white'}`;
    document.getElementById('btn_view_builder').className = `main-tab-btn px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${v === 'builder' ? 'active bg-white text-[#2d2e8b] shadow-sm' : 'text-white/80 hover:text-white'}`;
    document.getElementById('source-toggle').classList.toggle('hidden', v !== 'presets');
    if (v === 'builder' && typeof update_viewbox_fn === 'function') {
        setTimeout(() => { update_viewbox_fn(); }, 100);
    }
}

export function setSourceMode(m) {
    ST.src = m;
    document.getElementById('btn_dc').className = `mode-btn px-3 py-1.5 rounded-md text-xs font-semibold ${m === 'dc' ? 'bg-white text-[#2d2e8b] shadow' : 'text-white/80 hover:text-white'}`;
    document.getElementById('btn_ac').className = `mode-btn px-3 py-1.5 rounded-md text-xs font-semibold ${m === 'ac' ? 'bg-white text-[#2d2e8b] shadow' : 'text-white/80 hover:text-white'}`;
    document.getElementById('dc-tabs').classList.toggle('hidden', m !== 'dc');
    document.getElementById('ac-tabs').classList.toggle('hidden', m !== 'ac');
    document.getElementById('dc-params').classList.toggle('hidden', m !== 'dc');
    document.getElementById('ac-params').classList.toggle('hidden', m !== 'ac');
    document.getElementById('dc-out').classList.toggle('hidden', m !== 'dc');
    document.getElementById('ac-out').classList.toggle('hidden', m !== 'ac');
    setCircuitMode(m === 'dc' ? 'ohm' : 'series_ac');
    updateWiringPanel(ST);
}

export function setCircuitMode(c) {
    ST.cir = c;
    const isAC = ST.src === 'ac';
    const tabContainer = isAC ? document.getElementById('ac-tabs') : document.getElementById('dc-tabs');
    tabContainer.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-mode') === c);
    });

    document.getElementById('r2-group').classList.toggle('hidden', !['series_dc','parallel_dc'].includes(c));
    document.getElementById('r3-group').classList.toggle('hidden', !['series_dc','parallel_dc'].includes(c));
    document.getElementById('dc-params').classList.toggle('hidden', c === 'star_delta' || isAC);
    document.getElementById('sd-params').classList.toggle('hidden', c !== 'star_delta');
    document.getElementById('sd-diagram').classList.toggle('hidden', c !== 'star_delta');
    document.getElementById('dc-grid').classList.toggle('hidden', c === 'star_delta');

    document.getElementById('res-out').classList.toggle('hidden', c !== 'resonance');
    document.getElementById('ac-circuit-diagram-panel').classList.toggle('hidden', c === 'resonance');

    updateAll();
    updateWiringPanel(ST);
}

export function calcSD(source) {
    if (source === 'delta') {
        const Ra = parseFloat(document.getElementById('sd_ra').value) || 0;
        const Rb = parseFloat(document.getElementById('sd_rb').value) || 0;
        const Rc = parseFloat(document.getElementById('sd_rc').value) || 0;
        const res = CE.d2s(Ra, Rb, Rc);
        document.getElementById('sd_r1').value = res.R1.toFixed(2);
        document.getElementById('sd_r2').value = res.R2.toFixed(2);
        document.getElementById('sd_r3').value = res.R3.toFixed(2);
        drawStarDeltaDiagram(Ra, Rb, Rc, res.R1, res.R2, res.R3);
    } else {
        const R1 = parseFloat(document.getElementById('sd_r1').value) || 0;
        const R2 = parseFloat(document.getElementById('sd_r2').value) || 0;
        const R3 = parseFloat(document.getElementById('sd_r3').value) || 0;
        const res = CE.s2d(R1, R2, R3);
        document.getElementById('sd_ra').value = res.Ra.toFixed(2);
        document.getElementById('sd_rb').value = res.Rb.toFixed(2);
        document.getElementById('sd_rc').value = res.Rc.toFixed(2);
        drawStarDeltaDiagram(res.Ra, res.Rb, res.Rc, R1, R2, R3);
    }
}

export function updateAll() {
    if (ST.src === 'dc') updateDC();
    else updateAC();
}

export function updateDC() {
    const V = gv('v_dc'), R1 = gv('r1') || .1, R2 = gv('r2') || .1, R3 = gv('r3') || .1;
    const m = ST.cir; let res = [];

    if (m === 'ohm') {
        const I = CE.current(V, R1), P = CE.power_VI(V, I);
        res = [
            { l: 'Voltage (V)', v: V.toFixed(2), u: 'V', c: 'amber', f: 'V = I × R' },
            { l: 'Current (I)', v: I.toFixed(4), u: 'A', c: 'blue', f: 'I = V / R' },
            { l: 'Resistance (R)', v: R1.toFixed(2), u: 'Ω', c: 'red', f: 'R = V / I' },
            { l: 'Power (P=VI)', v: P.toFixed(4), u: 'W', c: 'green', f: 'P = V × I' },
            { l: 'P = I²R', v: CE.power_I2R(I, R1).toFixed(4), u: 'W', c: 'green', f: 'P = I² × R' },
            { l: 'P = V²/R', v: CE.power_V2R(V, R1).toFixed(4), u: 'W', c: 'green', f: 'P = V² / R' },
            { l: 'Conductance G', v: (R1 > 0 ? (1 / R1).toFixed(6) : '0'), u: 'S', c: 'purple', f: 'G = 1 / R' },
            { l: 'Energy (1s)', v: P.toFixed(4), u: 'J', c: 'indigo', f: 'W = P × t' }
        ];
    } else if (m === 'series_dc') {
        const Req = CE.seriesR([R1, R2, R3]), I = CE.current(V, Req), P = CE.power_VI(V, I);
        const V1 = CE.voltage(I, R1), V2 = CE.voltage(I, R2), V3 = CE.voltage(I, R3);
        res = [
            { l: 'R_eq (Series)', v: Req.toFixed(2), u: 'Ω', c: 'red', f: 'R_eq = R₁ + R₂ + R₃' },
            { l: 'I_total', v: I.toFixed(4), u: 'A', c: 'blue', f: 'I_t = V / R_eq' },
            { l: 'V₁ = IR₁', v: V1.toFixed(2), u: 'V', c: 'amber', f: 'V₁ = I_t × R₁' },
            { l: 'V₂ = IR₂', v: V2.toFixed(2), u: 'V', c: 'amber', f: 'V₂ = I_t × R₂' },
            { l: 'V₃ = IR₃', v: V3.toFixed(2), u: 'V', c: 'amber', f: 'V₃ = I_t × R₃' },
            { l: 'P_total', v: P.toFixed(4), u: 'W', c: 'green', f: 'P_t = V × I_t' },
            { l: 'P₁ = I²R₁', v: CE.power_I2R(I, R1).toFixed(4), u: 'W', c: 'green', f: 'P₁ = I_t² × R₁' },
            { l: 'P₂ = I²R₂', v: CE.power_I2R(I, R2).toFixed(4), u: 'W', c: 'green', f: 'P₂ = I_t² × R₂' }
        ];
    } else if (m === 'parallel_dc') {
        const Req = CE.parallelR([R1, R2, R3]), I = CE.current(V, Req), P = CE.power_VI(V, I);
        const I1 = CE.current(V, R1), I2 = CE.current(V, R2), I3 = CE.current(V, R3);
        res = [
            { l: 'R_eq (Parallel)', v: Req.toFixed(2), u: 'Ω', c: 'red', f: '1/R_eq = 1/R₁ + 1/R₂ + 1/R₃' },
            { l: 'I_total', v: I.toFixed(4), u: 'A', c: 'blue', f: 'I_t = V / R_eq' },
            { l: 'I₁ = V/R₁', v: I1.toFixed(4), u: 'A', c: 'blue', f: 'I₁ = V / R₁' },
            { l: 'I₂ = V/R₂', v: I2.toFixed(4), u: 'A', c: 'blue', f: 'I₂ = V / R₂' },
            { l: 'I₃ = V/R₃', v: I3.toFixed(4), u: 'A', c: 'blue', f: 'I₃ = V / R₃' },
            { l: 'P_total', v: P.toFixed(4), u: 'W', c: 'green', f: 'P_t = V × I_t' },
            { l: 'Thevenin V_th', v: V.toFixed(2), u: 'V', c: 'purple', f: 'V_th = V_open' },
            { l: 'Thevenin R_th', v: Req.toFixed(2), u: 'Ω', c: 'purple', f: 'R_th = R_eq' }
        ];
    }
    renderGrid('dc-grid', res);
    renderQuickRes(res.slice(0, 4));
}

export function updateAC() {
    const Vm = gv('v_ac'), f = gv('freq') || 1, R = gv('r_ac');
    const L = gv('l') / 1000, C = gv('c') / 1e6;
    const xl = CE.XL(f, L), xc = CE.XC(f, C);
    const Vrms = CE.vrms(Vm), m = ST.cir;

    if (m === 'series_ac') {
        const Zc = CE.Zseries(R, xl, xc), Zmag = Zc.mag(), pDeg = Zc.phaseDeg();
        const Irms = Zmag > 0 ? Vrms / Zmag : 0;
        const VR = Irms * R, VL = Irms * xl, VC = Irms * xc;
        const P = Irms * Irms * R, S = Vrms * Irms, Q = Irms * Irms * (xl - xc);
        const pf = Math.cos(Zc.phase());

        const res = [
            { l: 'V_rms Source', v: Vrms.toFixed(2), u: 'V', c: 'amber', f: 'V_rms = V_m / √2' },
            { l: 'I_rms Current', v: Irms.toFixed(4), u: 'A', c: 'blue', f: 'I_rms = V_rms / |Z|' },
            { l: '|Z| Impedance', v: Zmag.toFixed(2), u: 'Ω', c: 'purple', f: '|Z| = √(R² + (X_L−X_C)²)' },
            { l: 'Phase θ', v: pDeg.toFixed(2), u: '°', c: 'purple', f: 'θ = tan⁻¹((X_L−X_C)/R)' },
            { l: 'V_R (Resistor)', v: VR.toFixed(2), u: 'V', c: 'red', f: 'V_R = I_rms × R' },
            { l: 'V_L (Inductor)', v: VL.toFixed(2), u: 'V', c: 'blue', f: 'V_L = I_rms × X_L' },
            { l: 'V_C (Capacitor)', v: VC.toFixed(2), u: 'V', c: 'green', f: 'V_C = I_rms × X_C' },
            { l: 'Power Factor', v: pf.toFixed(4), u: (pDeg > 0.1 ? 'Lag' : pDeg < -0.1 ? 'Lead' : 'Unity'), c: 'amber', f: 'pf = cos(θ)' },
            { l: 'Real Power (P)', v: P.toFixed(2), u: 'W', c: 'green', f: 'P = I_rms² × R' },
            { l: 'Reactive (Q)', v: Q.toFixed(2), u: 'VAR', c: 'purple', f: 'Q = I_rms² × (X_L−X_C)' },
            { l: 'Apparent (S)', v: S.toFixed(2), u: 'VA', c: 'indigo', f: 'S = V_rms × I_rms' }
        ];
        renderGrid('ac-grid', res); renderQuickRes(res.slice(0, 4));
        drawPhasor(Zc, pDeg, 'series');
        drawACCircuit(R, xl, xc, Vrms, f, Irms, 'series', gv);
    } else if (m === 'parallel_ac') {
        const { Z: Zc } = CE.Zparallel(R, xl, xc);
        const Zmag = Zc.mag(), pDeg = Zc.phaseDeg();
        const Irms = Zmag > 0 ? Vrms / Zmag : 0;
        const IR = R > 0 ? Vrms / R : 0, IL = xl > 0 ? Vrms / xl : 0, IC = xc > 0 ? Vrms / xc : 0;
        const P = Vrms * IR, pf = Math.cos(Zc.phase());

        const res = [
            { l: 'V_rms Source', v: Vrms.toFixed(2), u: 'V', c: 'amber', f: 'Parallel: V equal' },
            { l: 'I_total (rms)', v: Irms.toFixed(4), u: 'A', c: 'blue', f: 'I_t = V_rms / |Z|' },
            { l: 'I_R (Branch)', v: IR.toFixed(4), u: 'A', c: 'red', f: 'I_R = V_rms / R' },
            { l: 'I_L (Branch)', v: IL.toFixed(4), u: 'A', c: 'blue', f: 'I_L = V_rms / X_L' },
            { l: 'I_C (Branch)', v: IC.toFixed(4), u: 'A', c: 'green', f: 'I_C = V_rms / X_C' },
            { l: '|Z_eq| Total', v: Zmag.toFixed(2), u: 'Ω', c: 'purple', f: '1/Z_eq = 1/R + 1/jX_L + jωC' },
            { l: 'Phase θ', v: pDeg.toFixed(2), u: '°', c: 'purple', f: 'θ = angle(Z_eq)' },
            { l: 'Power Factor', v: pf.toFixed(4), u: (pDeg > 0.1 ? 'Lag' : pDeg < -0.1 ? 'Lead' : 'Unity'), c: 'amber', f: 'pf = cos(θ)' },
            { l: 'Real Power (P)', v: P.toFixed(2), u: 'W', c: 'green', f: 'P = V_rms × I_R' }
        ];
        renderGrid('ac-grid', res); renderQuickRes(res.slice(0, 4));
        drawPhasor(Zc, pDeg, 'parallel');
        drawACCircuit(R, xl, xc, Vrms, f, Irms, 'parallel', gv);
    } else if (m === 'resonance') {
        const fr = 1 / (2 * Math.PI * Math.sqrt((gv('l')/1000) * (gv('c')/1e6)));
        const Q_factor = (1 / R) * Math.sqrt((gv('l')/1000) / (gv('c')/1e6));
        const BW = f > 0 ? fr / Q_factor : 0;
        const res = [
            { l: 'Resonance (f_r)', v: isFinite(fr) ? fr.toFixed(2) : '0', u: 'Hz', c: 'amber', f: 'f_r = 1 / (2π√(LC))' },
            { l: 'Quality Factor Q', v: isFinite(Q_factor) ? Q_factor.toFixed(2) : '0', u: '', c: 'purple', f: 'Q = (1/R)√(L/C)' },
            { l: 'Bandwidth (BW)', v: isFinite(BW) ? BW.toFixed(2) : '0', u: 'Hz', c: 'blue', f: 'BW = f_r / Q' },
            { l: 'Characteristic Z_0', v: (Math.sqrt((gv('l')/1000) / (gv('c')/1e6))).toFixed(2), u: 'Ω', c: 'green', f: 'Z_0 = √(L/C)' }
        ];
        renderGrid('res-grid', res); renderQuickRes(res);
        drawResonanceChart(gv('l') / 1000, gv('c') / 1e6, R, Vrms);
    }

    updateOscilloscope(Vm, f, R, xl, xc, m, ST);
}

export function renderGrid(id, items) {
    const el = document.getElementById(id);
    if (!el) return;
    const cMap = { amber: 'border-amber-200 bg-amber-50/50 text-amber-900', blue: 'border-blue-200 bg-blue-50/50 text-blue-900', red: 'border-red-200 bg-red-50/50 text-red-900', green: 'border-green-200 bg-green-50/50 text-green-900', purple: 'border-purple-200 bg-purple-50/50 text-purple-900', indigo: 'border-indigo-200 bg-indigo-50/50 text-indigo-900' };
    el.innerHTML = items.map(it => `
        <div class="p-3 rounded-xl border ${cMap[it.c] || 'border-gray-200 bg-gray-50'} flex flex-col justify-between">
            <span class="text-xs font-semibold opacity-75">${it.l}</span>
            <div class="mt-1 flex items-baseline gap-1">
                <span class="text-lg md:text-xl font-bold mono">${it.v}</span>
                <span class="text-xs font-semibold">${it.u}</span>
            </div>
            <span class="text-[10px] opacity-60 mt-1 block font-mono">${it.f}</span>
        </div>
    `).join('');
}

export function renderQuickRes(items) {
    const el = document.getElementById('quick-res');
    if (!el) return;
    el.innerHTML = items.map(it => `
        <div class="flex justify-between items-center py-1 border-b border-gray-50">
            <span class="text-gray-500 font-medium text-xs">${it.l}</span>
            <span class="font-bold mono text-xs">${it.v} ${it.u}</span>
        </div>
    `).join('');
}

export function toggleAnim() {
    ST.anim = !ST.anim;
    const b = document.getElementById('btn_anim');
    if (b) b.textContent = ST.anim ? '⏸ Pause' : '▶ Play';
}

export function animLoop() {
    if (ST.anim && ST.src === 'ac') {
        ST.phase += 0.08;
        if (ST.phase > 2 * Math.PI) ST.phase -= 2 * Math.PI;
        updateAll();
    }
    requestAnimationFrame(animLoop);
}

export function enhanceNumberInputs() {
    document.querySelectorAll('input[type="number"]').forEach(el => {
        let startX = 0, startVal = 0, didDrag = false;
        const onMove = (e) => {
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 3) didDrag = true;
            if (!didDrag) return;
            let step = parseFloat(el.step) || 1;
            let val = startVal + dx * step * 0.5;
            const min = parseFloat(el.min), max = parseFloat(el.max);
            if (!isNaN(min)) val = Math.max(val, min);
            if (!isNaN(max)) val = Math.min(val, max);
            el.value = step < 1 ? val.toFixed(1) : Math.round(val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.classList.remove('num-dragging');
        };
        el.addEventListener('mousedown', (e) => {
            startX = e.clientX; startVal = parseFloat(el.value) || 0; didDrag = false;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    });
}
