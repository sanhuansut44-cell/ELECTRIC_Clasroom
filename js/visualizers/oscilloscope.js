/**
 * Enhanced Oscilloscope Visualizer with Multi-trace RLC & Resonance Waveforms
 * Plots individual v_R(t), v_L(t), v_C(t), branch currents, and resonance cancellation
 */
import { CE } from '../models/math-engine.js';

let oscChart = null;

export const traceVisibility = {
    v: true,
    i: true,
    vR: true,
    vL: true,
    vC: true,
    vLC: false,
    iR: true,
    iL: true,
    iC: true,
    iLC: false
};

export function toggleTrace(key) {
    if (key in traceVisibility) {
        traceVisibility[key] = !traceVisibility[key];
        const btn = document.getElementById(`btn-trace-${key}`);
        if (btn) {
            btn.classList.toggle('active', traceVisibility[key]);
            btn.classList.toggle('opacity-40', !traceVisibility[key]);
        }
    }
}

export function initChart() {
    const cv = document.getElementById('oscChart');
    if (!cv || typeof Chart === 'undefined') return;
    const ctx = cv.getContext('2d');

    oscChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    display: true,
                    grid: { color: '#f1f5f9' },
                    title: { display: true, text: 'เวลา Time (ms)', font: { size: 11 } }
                },
                yV: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'แรงดัน Voltage (V)', font: { size: 11 }, color: '#f59e0b' },
                    grid: { color: '#cbd5e1' }
                },
                yI: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'กระแส Current (A)', font: { size: 11 }, color: '#0284c7' },
                    grid: { drawOnChartArea: false }
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

export function updateOscilloscope(Vm, f, R, xl, xc, mode, ST) {
    if (!oscChart) return;
    if (!f || f <= 0) f = 50;

    const omega = 2 * Math.PI * f;
    const T = 1 / f;
    const pts = 140;
    const dt = (2 * T) / pts; // 2 complete cycles

    const labels = [];
    const datasets = [];
    const legendItems = [];

    const isParallel = mode === 'parallel_ac';

    if (!isParallel) {
        // Series AC & Resonance
        const Zc = CE.Zseries(R, xl, xc);
        const Zmag = Zc.mag();
        const phi = Zc.phase(); // impedance phase angle: v leads i by phi
        const Im = Zmag > 0 ? Vm / Zmag : 0;

        // Peak voltages across components
        const VRm = Im * R;
        const VLm = Im * xl;
        const VCm = Im * xc;

        const vData = [];
        const iData = [];
        const vRData = [];
        const vLData = [];
        const vCData = [];
        const vLCData = [];

        for (let idx = 0; idx <= pts; idx++) {
            const t = idx * dt;
            const wt = omega * t + (ST.phase || 0);

            labels.push((t * 1000).toFixed(1));

            // Source voltage v(t) = Vm * sin(wt)
            vData.push(+(Vm * Math.sin(wt)).toFixed(2));

            // Total current i(t) = Im * sin(wt - phi)
            const currentAngle = wt - phi;
            iData.push(+(Im * Math.sin(currentAngle)).toFixed(4));

            // VR(t) is in phase with i(t)
            vRData.push(+(VRm * Math.sin(currentAngle)).toFixed(2));

            // VL(t) leads i(t) by 90° (+pi/2)
            const vlVal = VLm * Math.sin(currentAngle + Math.PI / 2);
            vLData.push(+vlVal.toFixed(2));

            // VC(t) lags i(t) by 90° (-pi/2)
            const vcVal = VCm * Math.sin(currentAngle - Math.PI / 2);
            vCData.push(+vcVal.toFixed(2));

            // vL(t) + vC(t) cancelation trace (at resonance this sum is exactly 0!)
            vLCData.push(+(vlVal + vcVal).toFixed(2));
        }

        if (traceVisibility.v) {
            datasets.push({ label: 'v(t) แหล่งจ่าย', data: vData, borderColor: '#f59e0b', borderWidth: 2.5, pointRadius: 0, yAxisID: 'yV' });
            legendItems.push(`<span class="text-amber-600 font-bold">● v(t) Peak: ${Vm.toFixed(1)}V</span>`);
        }
        if (traceVisibility.i) {
            datasets.push({ label: 'i(t) กระแสรวม', data: iData, borderColor: '#0284c7', borderWidth: 2.5, borderDash: [4, 4], pointRadius: 0, yAxisID: 'yI' });
            legendItems.push(`<span class="text-sky-600 font-bold">● i(t) Peak: ${(Im * 1000).toFixed(1)}mA</span>`);
        }
        if (traceVisibility.vR) {
            datasets.push({ label: 'v_R(t) คร่อม R (เฟสเดียวกับ i)', data: vRData, borderColor: '#ef4444', borderWidth: 2, pointRadius: 0, yAxisID: 'yV' });
            legendItems.push(`<span class="text-rose-600 font-semibold">● v_R Peak: ${VRm.toFixed(1)}V</span>`);
        }
        if (traceVisibility.vL) {
            datasets.push({ label: 'v_L(t) คร่อม L (นำหน้า 90°)', data: vLData, borderColor: '#6366f1', borderWidth: 2, pointRadius: 0, yAxisID: 'yV' });
            legendItems.push(`<span class="text-indigo-600 font-semibold">● v_L Peak: ${VLm.toFixed(1)}V</span>`);
        }
        if (traceVisibility.vC) {
            datasets.push({ label: 'v_C(t) คร่อม C (ล้าหลัง 90°)', data: vCData, borderColor: '#10b981', borderWidth: 2, pointRadius: 0, yAxisID: 'yV' });
            legendItems.push(`<span class="text-emerald-600 font-semibold">● v_C Peak: ${VCm.toFixed(1)}V</span>`);
        }
        if (traceVisibility.vLC) {
            datasets.push({ label: 'v_L + v_C (หักล้างรีโซแนนซ์)', data: vLCData, borderColor: '#a855f7', borderWidth: 3, borderDash: [6, 3], pointRadius: 0, yAxisID: 'yV' });
            const vlcPeak = Math.abs(VLm - VCm);
            legendItems.push(`<span class="text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">● (v_L + v_C) = ${vlcPeak < 0.1 ? '0.0 V (หักล้างสมบูรณ์!)' : vlcPeak.toFixed(1) + ' V'}</span>`);
        }

    } else {
        // Parallel AC Circuit: voltages across all branches are identical v(t), branch currents have different phases
        const IRm = R > 0 ? Vm / R : 0;
        const ILm = xl > 0 ? Vm / xl : 0;
        const ICm = xc > 0 ? Vm / xc : 0;

        const { Z: Zc } = CE.Zparallel(R, xl, xc);
        const Zmag = Zc.mag();
        const phi = Zc.phase();
        const Itotm = Zmag > 0 ? Vm / Zmag : 0;

        const vData = [];
        const itotData = [];
        const iRData = [];
        const iLData = [];
        const iCData = [];
        const iLCData = [];

        for (let idx = 0; idx <= pts; idx++) {
            const t = idx * dt;
            const wt = omega * t + (ST.phase || 0);

            labels.push((t * 1000).toFixed(1));

            // Parallel voltage v(t) is equal on all branches
            vData.push(+(Vm * Math.sin(wt)).toFixed(2));

            // Total current i_total(t)
            itotData.push(+(Itotm * Math.sin(wt - phi)).toFixed(4));

            // i_R(t) in phase with v(t)
            iRData.push(+(IRm * Math.sin(wt)).toFixed(4));

            // i_L(t) lags v(t) by 90°
            const ilVal = ILm * Math.sin(wt - Math.PI / 2);
            iLData.push(+ilVal.toFixed(4));

            // i_C(t) leads v(t) by 90°
            const icVal = ICm * Math.sin(wt + Math.PI / 2);
            iCData.push(+icVal.toFixed(4));

            // Reactive branch current cancelation (i_L + i_C)
            iLCData.push(+(ilVal + icVal).toFixed(4));
        }

        if (traceVisibility.v) {
            datasets.push({ label: 'v(t) แรงดันร่วม', data: vData, borderColor: '#f59e0b', borderWidth: 2.5, pointRadius: 0, yAxisID: 'yV' });
            legendItems.push(`<span class="text-amber-600 font-bold">● v(t) Peak: ${Vm.toFixed(1)}V</span>`);
        }
        if (traceVisibility.i) {
            datasets.push({ label: 'i_total(t) กระแสรวม', data: itotData, borderColor: '#0284c7', borderWidth: 2.5, pointRadius: 0, yAxisID: 'yI' });
            legendItems.push(`<span class="text-sky-600 font-bold">● i_รวม: ${(Itotm * 1000).toFixed(1)}mA</span>`);
        }
        if (traceVisibility.iR) {
            datasets.push({ label: 'i_R(t) กิ่ง R (เฟสเดียวกับ v)', data: iRData, borderColor: '#ef4444', borderWidth: 2, pointRadius: 0, yAxisID: 'yI' });
            legendItems.push(`<span class="text-rose-600 font-semibold">● i_R: ${(IRm * 1000).toFixed(1)}mA</span>`);
        }
        if (traceVisibility.iL) {
            datasets.push({ label: 'i_L(t) กิ่ง L (ล้าหลัง 90°)', data: iLData, borderColor: '#6366f1', borderWidth: 2, pointRadius: 0, yAxisID: 'yI' });
            legendItems.push(`<span class="text-indigo-600 font-semibold">● i_L: ${(ILm * 1000).toFixed(1)}mA</span>`);
        }
        if (traceVisibility.iC) {
            datasets.push({ label: 'i_C(t) กิ่ง C (นำหน้า 90°)', data: iCData, borderColor: '#10b981', borderWidth: 2, pointRadius: 0, yAxisID: 'yI' });
            legendItems.push(`<span class="text-emerald-600 font-semibold">● i_C: ${(ICm * 1000).toFixed(1)}mA</span>`);
        }
        if (traceVisibility.iLC) {
            datasets.push({ label: 'i_L + i_C (หักล้างรีแอกทีฟ)', data: iLCData, borderColor: '#a855f7', borderWidth: 3, borderDash: [6, 3], pointRadius: 0, yAxisID: 'yI' });
            const ilcPeak = Math.abs(ILm - ICm);
            legendItems.push(`<span class="text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">● (i_L + i_C) = ${(ilcPeak * 1000).toFixed(1)}mA</span>`);
        }
    }

    oscChart.data.labels = labels;
    oscChart.data.datasets = datasets;
    oscChart.update();

    const leg = document.getElementById('chart-legend');
    if (leg) {
        legendItems.push(`<span class="text-gray-500 font-mono ml-auto">f: ${f}Hz</span>`);
        leg.innerHTML = legendItems.join(' ');
    }
}

export function exportChart() {
    if (!oscChart) return;
    const link = document.createElement('a');
    link.download = 'oscilloscope.png';
    link.href = oscChart.toBase64Image();
    link.click();
}
