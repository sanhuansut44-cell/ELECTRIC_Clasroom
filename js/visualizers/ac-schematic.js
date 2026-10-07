/**
 * Dynamic AC Circuit Schematic Canvas Renderer & Primitives
 */
export function drawWire(ctx, x1, y1, x2, y2, color = '#facc15', width = 2.5) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
}

export function drawNode(ctx, x, y, r = 4, color = '#facc15') {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color; ctx.fill(); ctx.restore();
}

export function drawResistor(ctx, x, y, w, h, color, label) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(30,27,75,0.9)';
    ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, 3);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y); ctx.restore();
}

export function drawInductor(ctx, x, y, len, color, label) {
    const cx = x + len/2, h = 12, loops = 4;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y);
    const loopW = (len - 16) / loops;
    for (let i = 0; i < loops; i++) {
        const sx = x + 8 + i * loopW;
        ctx.beginPath(); ctx.arc(sx + loopW/2, y, loopW/2, Math.PI, 0); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x + len - 8, y); ctx.lineTo(x + len, y); ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center';
    ctx.fillText(label, cx, y - h - 4); ctx.restore();
}

export function drawInductorVert(ctx, x, y, len = 56, color = '#3b82f6', label = 'L') {
    const loops = 4, topY = y - len / 2, botY = y + len / 2;
    const loopH = (len - 16) / loops;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, topY + 8); ctx.stroke();
    for (let i = 0; i < loops; i++) {
        const sy = topY + 8 + i * loopH;
        ctx.beginPath(); ctx.arc(x, sy + loopH / 2, loopH / 2, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x, botY - 8); ctx.lineTo(x, botY); ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x - 12, y); ctx.restore();
}

export function drawCapacitor(ctx, x, y, color, label) {
    const h = 18, gap = 5;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - gap, y - h/2); ctx.lineTo(x - gap, y + h/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + gap, y - h/2); ctx.lineTo(x + gap, y + h/2); ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(label, x, y - h/2 - 16); ctx.restore();
}

export function drawCapacitorVert(ctx, x, y, color = '#10b981', label = 'C') {
    const w = 24, gap = 4;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    // Top plate (horizontal)
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - gap); ctx.lineTo(x + w / 2, y - gap); ctx.stroke();
    // Bottom plate (horizontal)
    ctx.beginPath(); ctx.moveTo(x - w / 2, y + gap); ctx.lineTo(x + w / 2, y + gap); ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x - 16, y); ctx.restore();
}

export function drawBattery(ctx, x, y, color = '#facc15', label = 'V') {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 14, y - 20); ctx.lineTo(x - 14, y + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 4, y - 10); ctx.lineTo(x - 4, y + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, y - 20); ctx.lineTo(x + 4, y + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 14, y - 10); ctx.lineTo(x + 14, y + 10); ctx.stroke();
    ctx.font = 'bold 12px Inter'; ctx.fillStyle = color; ctx.textAlign = 'center';
    ctx.fillText('+', x - 22, y - 12); ctx.fillText('−', x + 22, y - 12);
    ctx.fillText(label, x, y + 32); ctx.restore();
}

export function drawACSource(ctx, x, y, r = 22, color = '#facc15', label = '~V') {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(15,23,42,0.9)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r/3, y, r/3, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r/3, y, r/3, 0, Math.PI); ctx.stroke();
    ctx.font = 'bold 11px Inter'; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(label, x, y + r + 6); ctx.restore();
}

export function drawACCircuit(R, xl, xc, Vrms, f, Irms, mode, gv) {
    const cv = document.getElementById('ac-circuit-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

    const topY = 48, botY = H - 56, srcX = 65;
    const fmt = (v, d=1) => isNaN(v) ? '0' : v.toFixed(d);
    const L_mH = gv('l'), C_uF = gv('c');

    if (mode === 'series') {
        const retX = W - 45;
        drawWire(ctx, srcX, topY, retX, topY, '#fbbf24', 3);
        drawWire(ctx, srcX, botY, retX, botY, '#94a3b8', 2.5);
        drawWire(ctx, srcX, topY, srcX, H/2 - 22, '#fbbf24', 2.5);
        drawWire(ctx, srcX, H/2 + 22, srcX, botY, '#94a3b8', 2);
        drawACSource(ctx, srcX, H/2, 22, '#fbbf24', '~V');

        drawWire(ctx, retX, topY, retX, botY, '#94a3b8', 2.5);
        drawNode(ctx, retX, topY, 4, '#fbbf24'); drawNode(ctx, retX, botY, 4, '#94a3b8');

        const rX = srcX + (retX - srcX) * 0.22;
        const lX = srcX + (retX - srcX) * 0.54;
        const cX = srcX + (retX - srcX) * 0.84;

        drawResistor(ctx, rX, topY, 44, 20, '#ef4444', 'R');
        drawInductor(ctx, lX - 28, topY, 56, '#3b82f6', 'L');
        drawCapacitor(ctx, cX, topY, '#10b981', 'C');

        ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
        ctx.fillStyle = '#ef4444'; ctx.fillText(`R=${fmt(R)}Ω`, rX, topY + 26);
        ctx.fillStyle = '#3b82f6'; ctx.fillText(`L=${fmt(L_mH)}mH`, lX, topY + 26);
        ctx.fillStyle = '#10b981'; ctx.fillText(`C=${fmt(C_uF)}µF`, cX, topY + 26);
    } else {
        // Parallel AC circuit: clean busbars connecting R, L, C branches to AC Source
        const bxs = [W * 0.18, W * 0.42, W * 0.66];
        const srcX_p = W - 75;
        const leftX = bxs[0];

        // Top busbar (from first branch to AC source)
        drawWire(ctx, leftX, topY, srcX_p, topY, '#fbbf24', 3);
        // Bottom busbar (from first branch to AC source)
        drawWire(ctx, leftX, botY, srcX_p, botY, '#94a3b8', 2.5);

        // AC Source (on the right)
        drawWire(ctx, srcX_p, topY, srcX_p, H/2 - 22, '#fbbf24', 2.5);
        drawWire(ctx, srcX_p, H/2 + 22, srcX_p, botY, '#94a3b8', 2.5);
        drawACSource(ctx, srcX_p, H/2, 22, '#fbbf24', '~V');
        drawNode(ctx, srcX_p, topY, 4, '#fbbf24');
        drawNode(ctx, srcX_p, botY, 4, '#94a3b8');

        // Branch 1: Resistor (R)
        drawWire(ctx, bxs[0], topY, bxs[0], H/2 - 18, '#ef4444', 2.5);
        drawWire(ctx, bxs[0], H/2 + 18, bxs[0], botY, '#ef4444', 2.5);
        drawResistor(ctx, bxs[0], H/2, 22, 36, '#ef4444', 'R');
        drawNode(ctx, bxs[0], topY, 4, '#fbbf24');
        drawNode(ctx, bxs[0], botY, 4, '#94a3b8');

        // Branch 2: Inductor (L)
        drawWire(ctx, bxs[1], topY, bxs[1], H/2 - 28, '#3b82f6', 2.5);
        drawWire(ctx, bxs[1], H/2 + 28, bxs[1], botY, '#3b82f6', 2.5);
        drawInductorVert(ctx, bxs[1], H/2, 56, '#3b82f6', 'L');
        drawNode(ctx, bxs[1], topY, 4, '#fbbf24');
        drawNode(ctx, bxs[1], botY, 4, '#94a3b8');

        // Branch 3: Capacitor (C)
        drawWire(ctx, bxs[2], topY, bxs[2], H/2 - 4, '#10b981', 2.5);
        drawWire(ctx, bxs[2], H/2 + 4, bxs[2], botY, '#10b981', 2.5);
        drawCapacitorVert(ctx, bxs[2], H/2, '#10b981', 'C');
        drawNode(ctx, bxs[2], topY, 4, '#fbbf24');
        drawNode(ctx, bxs[2], botY, 4, '#94a3b8');

        // Labels & Branch Currents below each component
        ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
        const IR = R > 0 ? Vrms / R : 0;
        const IL = xl > 0 ? Vrms / xl : 0;
        const IC = xc > 0 ? Vrms / xc : 0;

        ctx.fillStyle = '#ef4444';
        ctx.fillText(`R=${fmt(R)}Ω`, bxs[0], botY + 16);
        ctx.fillText(`I_R=${fmt(IR, 2)}A`, bxs[0], botY + 28);

        ctx.fillStyle = '#3b82f6';
        ctx.fillText(`L=${fmt(L_mH)}mH`, bxs[1], botY + 16);
        ctx.fillText(`I_L=${fmt(IL, 2)}A`, bxs[1], botY + 28);

        ctx.fillStyle = '#10b981';
        ctx.fillText(`C=${fmt(C_uF)}µF`, bxs[2], botY + 16);
        ctx.fillText(`I_C=${fmt(IC, 2)}A`, bxs[2], botY + 28);

        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`V=${fmt(Vrms)}V, f=${fmt(f, 0)}Hz`, srcX_p, botY + 16);
        ctx.fillText(`I_total=${fmt(Irms, 2)}A`, srcX_p, botY + 28);
    }
}
