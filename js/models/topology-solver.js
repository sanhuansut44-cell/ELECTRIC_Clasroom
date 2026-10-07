/**
 * Circuit Topology Detector (Graph & Disjoint Set Union)
 */
export function detect_circuit_type(component_list, node_list, connection_list) {
    const badge = document.getElementById('circuit-type-badge');
    const icon  = document.getElementById('circuit-type-icon');
    const label = document.getElementById('circuit-type-label');
    const sub   = document.getElementById('circuit-type-sub');
    if (!badge || !icon || !label || !sub) return;

    const passives = component_list.filter(c => c.name !== 'ground' && c.name !== 'earth');
    if (passives.length === 0) { badge.classList.add('hidden'); return; }

    const parent = {};
    for (const n of node_list) parent[n.id] = n.id;
    function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
    function unite(a, b) { parent[find(a)] = find(b); }
    for (const conn of connection_list) unite(conn.node_1_id, conn.node_2_id);

    const nets = passives.map(c => {
        const n0 = c.nodes[0] ? find(c.nodes[0].node_id) : null;
        const n1 = c.nodes[1] ? find(c.nodes[1].node_id) : null;
        return { id: c.id, net0: n0, net1: n1 };
    });

    const connected = nets.filter(n => n.net0 && n.net1 && n.net0 !== n.net1);
    if (connected.length === 0) { badge.classList.add('hidden'); return; }

    if (connected.length === 1) {
        _show_badge(badge, icon, label, sub, '🔌', '#6366f1', 'bg-indigo-50', 'Single Element', '1 component connected');
        return;
    }

    const pairCounts = {};
    for (const c of connected) {
        const key = [c.net0, c.net1].sort().join('|');
        pairCounts[key] = (pairCounts[key] || []);
        pairCounts[key].push(c.id);
    }

    const uniquePairs = Object.keys(pairCounts);
    const allSamePair = uniquePairs.length === 1 && pairCounts[uniquePairs[0]].length === connected.length;
    const allDifferentPairs = uniquePairs.length === connected.length;

    let type, ico, col, bg, labelTxt, subTxt;
    if (allSamePair) {
        type = 'parallel'; ico = '⣿'; col = '#7c3aed'; bg = 'bg-purple-50';
        labelTxt = 'Parallel Circuit'; subTxt = `${connected.length} branches — วงจรขนาน`;
    } else if (allDifferentPairs) {
        const netOcc = {};
        for (const c of connected) {
            netOcc[c.net0] = (netOcc[c.net0] || 0) + 1;
            netOcc[c.net1] = (netOcc[c.net1] || 0) + 1;
        }
        const endpoints = Object.values(netOcc).filter(v => v === 1).length;
        if (endpoints === 2) {
            type = 'series'; ico = '▶'; col = '#2563eb'; bg = 'bg-blue-50';
            labelTxt = 'Series Circuit'; subTxt = `${connected.length} elements — วงจรอนุกรม`;
        } else {
            type = 'mixed'; ico = '⊞'; col = '#d97706'; bg = 'bg-amber-50';
            labelTxt = 'Combination Circuit'; subTxt = 'Series + Parallel — วงจรผสม';
        }
    } else {
        type = 'mixed'; ico = '⊞'; col = '#d97706'; bg = 'bg-amber-50';
        labelTxt = 'Combination Circuit'; subTxt = 'Series + Parallel — วงจรผสม';
    }

    _show_badge(badge, icon, label, sub, ico, col, bg, labelTxt, subTxt);
}

function _show_badge(badge, icon, label, sub, ico, col, bg, labelTxt, subTxt) {
    badge.classList.remove('hidden');
    icon.textContent = ico;
    icon.className = `w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0 ${bg}`;
    icon.style.color = col;
    label.textContent = labelTxt;
    label.style.color = col;
    sub.textContent = subTxt;
}
