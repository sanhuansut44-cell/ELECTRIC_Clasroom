/**
 * Phasor Diagram Canvas Visualizer (Z = R + jX)
 */
export function drawPhasor(Zc, pDeg, mode) {
    const cv = document.getElementById('phasorCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

    const R_val = Zc.re, X_val = Zc.im, Zmag = Zc.mag();
    const maxComp = Math.max(Math.abs(R_val), Math.abs(X_val), Zmag, 1);
    const plotR = Math.min(W, H) / 2 - 50, sc = plotR / maxComp;

    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, (plotR / 4) * i, 0, 2 * Math.PI); ctx.stroke(); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - plotR - 14, cy); ctx.lineTo(cx + plotR + 14, cy);
    ctx.moveTo(cx, cy - plotR - 14); ctx.lineTo(cx, cy + plotR + 14);
    ctx.stroke();

    ctx.font = '10px Inter'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
    ctx.fillText('Re (Ω)', cx + plotR + 22, cy + 4);
    ctx.fillText('+jX', cx, cy - plotR - 20); ctx.fillText('−jX', cx, cy + plotR + 20);

    const px_R = cx + R_val * sc, py_X = cy - X_val * sc;
    const colorR = '#ef4444', colorX = X_val >= 0 ? '#3b82f6' : '#10b981', colorZ = '#8b5cf6';

    ctx.beginPath(); ctx.strokeStyle = colorR; ctx.lineWidth = 2.8; ctx.moveTo(cx, cy); ctx.lineTo(px_R, cy); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = colorX; ctx.lineWidth = 2.8; ctx.moveTo(cx, cy); ctx.lineTo(cx, py_X); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = colorZ; ctx.lineWidth = 3.0; ctx.moveTo(cx, cy); ctx.lineTo(px_R, py_X); ctx.stroke();
}
