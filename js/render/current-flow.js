/**
 * Current Flow Particle / Dash Animation Visualizer
 * Animates moving current along connection wires with speed proportional to current magnitude
 */

let animRunning = false;
let animOffset = 0;
let animRafId = null;

export function startCurrentAnimation(simResult, connection_list, get_node_by_id) {
    stopCurrentAnimation();
    if (!simResult || !simResult.success) return;

    const overlayGroup = document.getElementById('simulation-overlay');
    if (!overlayGroup) return;
    overlayGroup.innerHTML = '';

    const { netlist, elementResults } = simResult;
    const { nodeToNet } = netlist;

    // Create animated dash lines on top of connections
    const flowLines = [];

    for (const conn of connection_list) {
        const wireGroup = document.getElementById(conn.id);
        if (!wireGroup) continue;

        const n1 = get_node_by_id(conn.node_1_id);
        const n2 = get_node_by_id(conn.node_2_id);
        if (!n1 || !n2) continue;

        // Estimate current along this wire from adjacent components
        let branchI = 0;
        const elem1 = elementResults[n1.base_component_id];
        const elem2 = elementResults[n2.base_component_id];
        if (elem1 && elem2) {
            branchI = Math.min(elem1.current, elem2.current);
        } else if (elem1) {
            branchI = elem1.current;
        } else if (elem2) {
            branchI = elem2.current;
        }

        if (Math.abs(branchI) < 1e-6) continue; // No significant current

        // Speed scaled from current
        const speed = Math.min(8, Math.max(0.5, Math.log10(Math.abs(branchI) * 1000 + 1) * 2));
        const dir = branchI >= 0 ? 1 : -1;

        // Collect existing line segments in wire
        const baseLines = wireGroup.querySelectorAll('line');
        baseLines.forEach(bl => {
            const flowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            flowLine.setAttribute('x1', bl.getAttribute('x1'));
            flowLine.setAttribute('y1', bl.getAttribute('y1'));
            flowLine.setAttribute('x2', bl.getAttribute('x2'));
            flowLine.setAttribute('y2', bl.getAttribute('y2'));
            flowLine.setAttribute('stroke', '#fbbf24'); // Bright amber/gold current dots
            flowLine.setAttribute('stroke-width', '4');
            flowLine.setAttribute('stroke-linecap', 'round');
            flowLine.setAttribute('stroke-dasharray', '5 15');
            flowLine.setAttribute('opacity', '0.9');
            flowLine.setAttribute('pointer-events', 'none');

            overlayGroup.appendChild(flowLine);
            flowLines.push({ element: flowLine, speed: speed * dir });
        });
    }

    if (flowLines.length === 0) return;

    animRunning = true;
    function loop() {
        if (!animRunning) return;
        animOffset += 0.8;
        for (const fl of flowLines) {
            fl.element.style.strokeDashoffset = (animOffset * fl.speed);
        }
        animRafId = requestAnimationFrame(loop);
    }
    loop();
}

export function stopCurrentAnimation() {
    animRunning = false;
    if (animRafId) cancelAnimationFrame(animRafId);
    animRafId = null;
    const overlayGroup = document.getElementById('simulation-overlay');
    if (overlayGroup) overlayGroup.innerHTML = '';
}
