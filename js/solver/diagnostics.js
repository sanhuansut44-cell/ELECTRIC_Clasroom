/**
 * Circuit Diagnostics — Checks for circuit errors with pedagogical explanations in Thai
 */

export function diagnoseCircuit(netlist, component_list, connection_list) {
    const issues = [];
    const { elements, hasSource, nodeToNet, isAC, hasGround } = netlist;

    // Check 1: Empty circuit
    if (elements.length === 0) {
        return {
            status: 'empty',
            summary: 'กระดานว่างเปล่า',
            issues: [{ level: 'info', message: 'ลากอุปกรณ์จากแถบด้านซ้ายมาวางบนผืนงานเพื่อเริ่มต่อวงจร' }]
        };
    }

    // Check 2: No power supply
    if (!hasSource) {
        issues.push({
            level: 'warning',
            type: 'no_source',
            message: 'วงจรนี้ยังไม่มีแหล่งจ่ายไฟ — เพิ่ม Battery (DC) หรือ AC Source เพื่อให้มีกระแสไหล'
        });
    }

    // Check 3: Missing ground
    if (!hasGround && hasSource) {
        issues.push({
            level: 'info',
            type: 'no_ground',
            message: 'แนะนำ: วางสัญลักษณ์กราวด์ (Ground) เพื่อกำหนดจุดศักย์อ้างอิง 0 V ชัดเจน (ระบบใช้ขั้วลบของแหล่งจ่ายเป็น 0V ชั่วคราว)'
        });
    }

    // Check 4: Unconnected terminals (floating pins)
    const connectedNodeIds = new Set();
    for (const c of connection_list) {
        if (c.node_1_id) connectedNodeIds.add(c.node_1_id);
        if (c.node_2_id) connectedNodeIds.add(c.node_2_id);
    }

    const floatingComps = [];
    for (const comp of component_list) {
        if (comp.name === 'ground' || comp.name === 'earth') continue;
        const unconnected = comp.nodes.filter(n => !connectedNodeIds.has(n.node_id));
        if (unconnected.length > 0) {
            floatingComps.push({ compId: comp.id, label: comp.properties?.label || comp.name, count: unconnected.length });
        }
    }

    if (floatingComps.length > 0) {
        const names = floatingComps.map(f => f.label).join(', ');
        issues.push({
            level: 'warning',
            type: 'floating_pins',
            compIds: floatingComps.map(f => f.compId),
            message: `มีขาอุปกรณ์ที่ยังไม่ได้ต่อสายไฟ: ${names} (ขาเปิดอยู่ กระแสจะไม่สามารถไหลผ่านได้)`
        });
    }

    // Check 5: Direct Short Circuit across Voltage Sources
    for (const elem of elements) {
        if (elem.type === 'VDC' || elem.type === 'VAC') {
            if (elem.n1 === elem.n2) {
                issues.push({
                    level: 'error',
                    type: 'short_circuit',
                    compId: elem.id,
                    message: `⚠ ลัดวงจรโดยตรงที่แหล่งจ่าย ${elem.label}! ขั้วบวกและขั้วลบต่อถึงกันโดยไม่มีโหลดต้านทาน`
                });
            }
        }
    }

    // Check 6: Ammeter connected directly in parallel with voltage source
    for (const elem of elements) {
        if (elem.type === 'AM') {
            const connectedSource = elements.find(s => (s.type === 'VDC' || s.type === 'VAC') &&
                ((s.n1 === elem.n1 && s.n2 === elem.n2) || (s.n1 === elem.n2 && s.n2 === elem.n1))
            );
            if (connectedSource) {
                issues.push({
                    level: 'error',
                    type: 'ammeter_parallel',
                    compId: elem.id,
                    message: `⚠ อันตราย: แอมมิเตอร์ ${elem.label} ต่อขนานคร่อมแหล่งจ่าย ${connectedSource.label}! แอมมิเตอร์มีความต้านทานภายในต่ำมาก การต่อขนานจะทำให้เกิดการลัดวงจร (ควรต่ออนุกรมกับโหลด)`
                });
            }
        }
    }

    // Check 7: Switch is open
    const openSwitches = elements.filter(e => e.type === 'SW' && !e.closed);
    if (openSwitches.length > 0) {
        issues.push({
            level: 'info',
            type: 'switch_open',
            compIds: openSwitches.map(s => s.id),
            message: `สวิตช์ ${openSwitches.map(s => s.label).join(', ')} อยู่ในสถานะ "เปิดวงจร" (Open) วงจรถูกตัดตอน คลิกที่สวิตช์เพื่อสับให้ปิดวงจร`
        });
    }

    const hasError = issues.some(i => i.level === 'error');
    const hasWarn = issues.some(i => i.level === 'warning');

    return {
        status: hasError ? 'error' : hasWarn ? 'warning' : 'ok',
        summary: hasError ? 'พบข้อผิดพลาดในวงจร' : hasWarn ? 'มีข้อควรระวัง' : 'วงจรพร้อมจำลอง',
        issues
    };
}
