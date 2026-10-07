/**
 * Voltage Coloring Visualizer
 * Colors connection wires according to their node electric potential
 */

export function colorWiresByVoltage(simResult, connection_list, get_node_by_id) {
    if (!simResult || !simResult.success) {
        resetWireColors(connection_list);
        return;
    }

    const { nodeVoltages, netlist } = simResult;
    const { nodeToNet } = netlist;

    // Find max positive voltage for normalization
    let maxV = 1;
    for (const v of Object.values(nodeVoltages)) {
        const mag = typeof v === 'number' ? Math.abs(v) : (v?.mag ? v.mag() : 0);
        if (mag > maxV) maxV = mag;
    }

    for (const conn of connection_list) {
        const wireGroup = document.getElementById(conn.id);
        if (!wireGroup) continue;

        const n1 = get_node_by_id(conn.node_1_id);
        if (!n1) continue;

        const net = nodeToNet.get(n1.id);
        const vRaw = nodeVoltages[net] ?? 0;
        const v = typeof vRaw === 'number' ? vRaw : (vRaw?.mag ? vRaw.mag() : 0);

        const color = getVoltageColor(v, maxV);
        const lines = wireGroup.querySelectorAll('line');
        lines.forEach(line => {
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', '3.5');
        });
    }
}

export function resetWireColors(connection_list) {
    for (const conn of connection_list) {
        const wireGroup = document.getElementById(conn.id);
        if (!wireGroup) continue;
        const lines = wireGroup.querySelectorAll('line');
        lines.forEach(line => {
            line.setAttribute('stroke', '#475569');
            line.setAttribute('stroke-width', '3');
        });
    }
}

function getVoltageColor(v, maxV) {
    if (Math.abs(v) < 1e-4) return '#3b82f6'; // Ground / 0V: Cool Blue
    const ratio = Math.min(1, Math.max(0, v / maxV));

    if (ratio > 0.75) return '#ef4444'; // High voltage: Red
    if (ratio > 0.4) return '#f59e0b';  // Mid voltage: Amber
    if (ratio > 0.1) return '#10b981';  // Low voltage: Emerald
    return '#3b82f6';                  // Near zero: Blue
}
