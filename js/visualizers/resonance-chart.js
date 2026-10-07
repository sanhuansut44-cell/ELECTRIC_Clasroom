/**
 * Resonance Frequency Response Visualizer using Chart.js
 * Plots Current I(f) and Impedance |Z|(f) curves with resonant peak
 */
let resChartInstance = null;

export function drawResonanceChart(L_H, C_F, R_ohm, Vrms = 12) {
    const canvas = document.getElementById('resChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (!L_H || L_H <= 0 || !C_F || C_F <= 0) return;
    if (!R_ohm || R_ohm <= 0) R_ohm = 1;

    // Resonant frequency f0 = 1 / (2 * pi * sqrt(L * C))
    const f0 = 1 / (2 * Math.PI * Math.sqrt(L_H * C_F));
    const Q = (1 / R_ohm) * Math.sqrt(L_H / C_F);
    const BW = f0 / Q;

    // Frequency sweep range: from 0.1*f0 to 3.0*f0 with dense points around f0
    const pointsCount = 70;
    const fMin = Math.max(1, f0 * 0.15);
    const fMax = f0 * 2.5;

    const labels = [];
    const currentData = [];
    const impedanceData = [];

    for (let i = 0; i <= pointsCount; i++) {
        // Non-linear spacing to get more sample points near f0
        const t = i / pointsCount;
        let f;
        if (t < 0.5) {
            const u = t * 2;
            f = fMin + (f0 - fMin) * Math.pow(u, 1.8);
        } else {
            const u = (t - 0.5) * 2;
            f = f0 + (fMax - f0) * Math.pow(u, 1.8);
        }

        const xl = 2 * Math.PI * f * L_H;
        const xc = 1 / (2 * Math.PI * f * C_F);
        const z = Math.sqrt(R_ohm * R_ohm + (xl - xc) * (xl - xc));
        const I = Vrms / z;

        labels.push(f < 100 ? f.toFixed(1) : Math.round(f));
        currentData.push(+(I * 1000).toFixed(2)); // in mA
        impedanceData.push(+z.toFixed(2));
    }

    if (resChartInstance) {
        resChartInstance.data.labels = labels;
        resChartInstance.data.datasets[0].data = currentData;
        resChartInstance.data.datasets[1].data = impedanceData;
        resChartInstance.options.plugins.title.text = `กราฟตอบสนองความถี่ (Resonance f₀ = ${f0.toFixed(1)} Hz | Q = ${Q.toFixed(2)} | BW = ${BW.toFixed(1)} Hz)`;
        resChartInstance.update();
        return;
    }

    const ctx = canvas.getContext('2d');
    resChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'กระแส I (mA)',
                    data: currentData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    yAxisID: 'yI'
                },
                {
                    label: 'อิมพีแดนซ์ |Z| (Ω)',
                    data: impedanceData,
                    borderColor: '#f59e0b',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'yZ'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: `กราฟตอบสนองความถี่ (Resonance f₀ = ${f0.toFixed(1)} Hz | Q = ${Q.toFixed(2)} | BW = ${BW.toFixed(1)} Hz)`,
                    font: { size: 13, weight: 'bold' },
                    color: '#1e293b'
                },
                legend: {
                    position: 'top',
                    labels: { font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        title: (items) => `ความถี่: ${items[0].label} Hz`
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'ความถี่ Frequency (Hz)', font: { size: 11 } },
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: { maxTicksLimit: 10 }
                },
                yI: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'กระแส I (mA)', color: '#2563eb', font: { size: 11 } },
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    beginAtZero: true
                },
                yZ: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'อิมพีแดนซ์ |Z| (Ω)', color: '#f59e0b', font: { size: 11 } },
                    grid: { drawOnChartArea: false },
                    beginAtZero: true
                }
            }
        }
    });
}
