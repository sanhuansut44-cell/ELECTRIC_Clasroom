/**
 * Interactive Circuit Wiring Guide Panel Visualizer
 */
import { drawWire, drawNode, drawResistor, drawBattery } from './ac-schematic.js';

export const WIRING_CONFIGS = {
    ohm: {
        label: "Ohm's Law",
        steps: [
            { text: 'Connect <strong>DC Source (+) → Resistor → DC Source (−)</strong>.' },
            { text: 'Current flows in a single closed loop.' }
        ],
        draw: (ctx, W, H) => {
            const topY = 60, botY = H - 60, retX = 80, srcX = W - 80;
            drawWire(ctx, retX, topY, srcX, topY, '#fbbf24', 3);
            drawWire(ctx, retX, botY, srcX, botY, '#3b82f6', 2.5);
            drawWire(ctx, retX, topY, retX, botY, '#94a3b8', 2);
            drawWire(ctx, srcX, topY, srcX, H/2 - 20, '#fbbf24', 2.5);
            drawWire(ctx, srcX, H/2 + 20, srcX, botY, '#3b82f6', 2.5);
            drawBattery(ctx, srcX, H/2, '#fbbf24', 'V');
            drawResistor(ctx, (retX + srcX) / 2, topY, 60, 26, '#ef4444', 'R');
            drawNode(ctx, retX, topY, 5, '#fbbf24'); drawNode(ctx, retX, botY, 5, '#3b82f6');
        }
    },
    series_dc: {
        label: "Series DC",
        steps: [
            { text: 'Same current flows through all resistors — single loop.' },
            { text: 'Wire <strong>DC(+) → R₁ → R₂ → R₃ → DC(−)</strong>.' }
        ],
        draw: (ctx, W, H) => {
            const topY = 60, botY = H - 60, retX = 70, srcX = W - 70;
            drawWire(ctx, retX, topY, srcX, topY, '#fbbf24', 3);
            drawWire(ctx, retX, botY, srcX, botY, '#3b82f6', 2.5);
            drawWire(ctx, retX, topY, retX, botY, '#94a3b8', 2);
            drawWire(ctx, srcX, topY, srcX, H/2 - 20, '#fbbf24', 2.5);
            drawWire(ctx, srcX, H/2 + 20, srcX, botY, '#3b82f6', 2.5);
            drawBattery(ctx, srcX, H/2, '#fbbf24', 'V');
            const r1X = retX + (srcX - retX) * 0.25;
            const r2X = retX + (srcX - retX) * 0.50;
            const r3X = retX + (srcX - retX) * 0.75;
            drawResistor(ctx, r1X, topY, 48, 22, '#ef4444', 'R₁');
            drawResistor(ctx, r2X, topY, 48, 22, '#f97316', 'R₂');
            drawResistor(ctx, r3X, topY, 48, 22, '#fbbf24', 'R₃');
            drawNode(ctx, retX, topY, 5, '#fbbf24'); drawNode(ctx, retX, botY, 5, '#3b82f6');
        }
    },
    parallel_dc: {
        label: "Parallel DC",
        steps: [
            { text: 'All resistors share the same voltage across two bus rails.' },
            { text: 'Connect top pins to <strong>Positive Bus</strong> and bottom to <strong>Negative Bus</strong>.' }
        ],
        draw: (ctx, W, H) => {
            const topY = 60, botY = H - 60, retX = 70, srcX = W - 70;
            drawWire(ctx, retX, topY, srcX, topY, '#fbbf24', 3);
            drawWire(ctx, retX, botY, srcX, botY, '#3b82f6', 2.5);
            drawWire(ctx, retX, topY, retX, botY, '#94a3b8', 2);
            drawWire(ctx, srcX, topY, srcX, H/2 - 20, '#fbbf24', 2.5);
            drawWire(ctx, srcX, H/2 + 20, srcX, botY, '#3b82f6', 2.5);
            drawBattery(ctx, srcX, H/2, '#fbbf24', 'V');
            const bxs = [retX + (srcX - retX) * 0.25, retX + (srcX - retX) * 0.50, retX + (srcX - retX) * 0.75];
            const rCols = ['#ef4444', '#f97316', '#a3e635'];
            bxs.forEach((bx, i) => {
                drawWire(ctx, bx, topY, bx, H/2 - 18, rCols[i], 2.5);
                drawWire(ctx, bx, H/2 + 18, bx, botY, rCols[i], 2.5);
                drawResistor(ctx, bx, H/2, 22, 36, rCols[i], `R${i+1}`);
                drawNode(ctx, bx, topY, 4, '#fbbf24'); drawNode(ctx, bx, botY, 4, '#3b82f6');
            });
        }
    }
};

export function updateWiringPanel(ST) {
    const mode = ST.cir;
    const cfg = WIRING_CONFIGS[mode];
    if (!cfg) return;
    const badge = document.getElementById('wiring-mode-label');
    if (badge) badge.textContent = cfg.label;
    const cv = document.getElementById('wiring-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    cfg.draw(ctx, W, H);
    const stepsEl = document.getElementById('wiring-steps');
    if (stepsEl) {
        stepsEl.innerHTML = `<h3>🔧 Wiring Steps</h3>` + cfg.steps.map((s, i) => `
            <div class="wiring-step">
                <div class="wiring-step-num">${i+1}</div>
                <div class="wiring-step-text">${s.text}</div>
            </div>
        `).join('');
    }
}
