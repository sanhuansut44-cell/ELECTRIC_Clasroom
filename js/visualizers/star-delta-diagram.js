/**
 * Star-Delta (Wye-Delta) Conversion Schematic Visualizer
 * Draws interactive/schematic representation of Delta and Star networks on #sdCanvas
 */

export function drawStarDeltaDiagram(Ra = 10, Rb = 10, Rc = 10, R1 = 3.33, R2 = 3.33, R3 = 3.33) {
    const canvas = document.getElementById('sdCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Typography setup
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Section 1: Delta (Left)
    const deltaCenterX = 150;
    const centerY = 160;
    const r = 90;

    // Delta nodes: A(top), B(bottom-left), C(bottom-right)
    const nodeA = { x: deltaCenterX, y: centerY - r };
    const nodeB = { x: deltaCenterX - r * 0.866, y: centerY + r * 0.5 };
    const nodeC = { x: deltaCenterX + r * 0.866, y: centerY + r * 0.5 };

    // Title Delta
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('วงจรเดลตา (Delta - Δ)', deltaCenterX, 30);

    // Draw Delta triangle lines
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(nodeA.x, nodeA.y);
    ctx.lineTo(nodeB.x, nodeB.y);
    ctx.lineTo(nodeC.x, nodeC.y);
    ctx.closePath();
    ctx.stroke();

    // Helper to draw resistor badge
    function drawResistorBadge(x, y, name, val, color) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const bw = 64, bh = 26;
        ctx.beginPath();
        ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(`${name} = ${(+val).toFixed(1)}Ω`, x, y);
    }

    // Delta Resistor Badges (Ra between B and C, Rb between A and C, Rc between A and B)
    drawResistorBadge(deltaCenterX, centerY + r * 0.5 + 4, 'Ra', Ra, '#ef4444');
    drawResistorBadge((nodeA.x + nodeC.x) / 2 + 16, (nodeA.y + nodeC.y) / 2, 'Rb', Rb, '#2563eb');
    drawResistorBadge((nodeA.x + nodeB.x) / 2 - 16, (nodeA.y + nodeB.y) / 2, 'Rc', Rc, '#059669');

    // Draw Node Dots
    function drawNode(pt, label) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(label, pt.x, pt.y < centerY ? pt.y - 14 : pt.y + 14);
    }

    drawNode(nodeA, 'A');
    drawNode(nodeB, 'B');
    drawNode(nodeC, 'C');

    // Center arrow: <=>
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.fillText('⟷', 280, centerY);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('แปลงสมมูล', 280, centerY + 22);

    // Section 2: Star (Right)
    const starCenterX = 410;
    const starA = { x: starCenterX, y: centerY - r };
    const starB = { x: starCenterX - r * 0.866, y: centerY + r * 0.5 };
    const starC = { x: starCenterX + r * 0.866, y: centerY + r * 0.5 };
    const starN = { x: starCenterX, y: centerY };

    // Title Star
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('วงจรสตาร์ (Star - Y)', starCenterX, 30);

    // Star lines from Center N to A, B, C
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(starN.x, starN.y); ctx.lineTo(starA.x, starA.y);
    ctx.moveTo(starN.x, starN.y); ctx.lineTo(starB.x, starB.y);
    ctx.moveTo(starN.x, starN.y); ctx.lineTo(starC.x, starC.y);
    ctx.stroke();

    // Neutral node N
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(starN.x, starN.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('N', starN.x + 12, starN.y);

    // Star Resistor Badges (R1 connects to A, R2 connects to B, R3 connects to C)
    drawResistorBadge(starCenterX, (starN.y + starA.y) / 2, 'R1', R1, '#ef4444');
    drawResistorBadge((starN.x + starB.x) / 2 - 10, (starN.y + starB.y) / 2 + 10, 'R2', R2, '#2563eb');
    drawResistorBadge((starN.x + starC.x) / 2 + 10, (starN.y + starC.y) / 2 + 10, 'R3', R3, '#059669');

    drawNode(starA, 'A');
    drawNode(starB, 'B');
    drawNode(starC, 'C');
}
