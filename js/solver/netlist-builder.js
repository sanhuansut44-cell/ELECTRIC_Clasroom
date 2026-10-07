/**
 * Netlist Builder — Extracts electrical circuit netlist from Canvas components and connections
 * Uses Disjoint-Set Union (DSU) to group connected pins into electrical nets
 */
import { lamp_resistance } from '../models/component-specs.js';

class DSU {
    constructor() {
        this.parent = new Map();
    }
    find(x) {
        if (!this.parent.has(x)) this.parent.set(x, x);
        if (this.parent.get(x) !== x) {
            this.parent.set(x, this.find(this.parent.get(x)));
        }
        return this.parent.get(x);
    }
    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX !== rootY) {
            this.parent.set(rootX, rootY);
        }
    }
}

export function buildNetlist(component_list, node_list, connection_list) {
    const dsu = new DSU();

    // Initialize all canvas nodes in DSU
    for (const node of node_list) {
        dsu.find(node.id);
    }

    // Merge nodes joined by connections
    for (const conn of connection_list) {
        if (conn.node_1_id && conn.node_2_id) {
            dsu.union(conn.node_1_id, conn.node_2_id);
        }
    }

    // Identify Ground nodes
    const groundRoots = new Set();
    for (const comp of component_list) {
        if (comp.name === 'ground' || comp.name === 'earth') {
            for (const n of comp.nodes) {
                groundRoots.add(dsu.find(n.node_id));
            }
        }
    }

    // If multiple ground nodes exist, union them
    let primaryGroundRoot = null;
    if (groundRoots.size > 0) {
        const arr = Array.from(groundRoots);
        primaryGroundRoot = arr[0];
        for (let i = 1; i < arr.length; i++) {
            dsu.union(arr[i], primaryGroundRoot);
        }
        primaryGroundRoot = dsu.find(primaryGroundRoot);
    }

    // If no ground symbol on canvas, check for negative terminal of sources to use as reference
    if (primaryGroundRoot === null) {
        for (const comp of component_list) {
            if (comp.name === 'battery' || comp.name === 'ac_power') {
                if (comp.nodes.length >= 2) {
                    // Terminal 1 is negative/reference
                    primaryGroundRoot = dsu.find(comp.nodes[1].node_id);
                    break;
                }
            }
        }
    }

    // If still null, pick the root of the first node
    if (primaryGroundRoot === null && node_list.length > 0) {
        primaryGroundRoot = dsu.find(node_list[0].id);
    }

    // Assign net numbers: Ground = 0, others = 1, 2, ...
    const rootToNet = new Map();
    if (primaryGroundRoot !== null) {
        rootToNet.set(primaryGroundRoot, 0);
    }

    let nextNet = 1;
    for (const node of node_list) {
        const root = dsu.find(node.id);
        if (!rootToNet.has(root)) {
            rootToNet.set(root, nextNet++);
        }
    }

    const nodeToNet = new Map();
    for (const node of node_list) {
        const root = dsu.find(node.id);
        nodeToNet.set(node.id, rootToNet.get(root) ?? 0);
    }

    // Build elements list
    const elements = [];
    let hasSource = false;
    let isAC = false;

    for (const comp of component_list) {
        if (comp.name === 'ground' || comp.name === 'earth') continue;
        if (comp.nodes.length < 2) continue;

        const n1 = nodeToNet.get(comp.nodes[0].node_id);
        const n2 = nodeToNet.get(comp.nodes[1].node_id);
        const p = comp.properties || {};

        if (comp.name === 'resistor_iec' || comp.name === 'resistor_us') {
            elements.push({
                id: comp.id,
                name: comp.name,
                label: p.label || 'R',
                type: 'R',
                n1, n2,
                node1Id: comp.nodes[0].node_id,
                node2Id: comp.nodes[1].node_id,
                value: Math.max(1e-4, parseFloat(p.resistance) || 100),
                powerRating: parseFloat(p.powerRating) || 0.25
            });
        } else if (comp.name === 'lamp') {
            const rVal = Math.max(0.1, lamp_resistance(p));
            elements.push({
                id: comp.id,
                name: comp.name,
                label: p.label || 'LP',
                type: 'R',
                n1, n2,
                node1Id: comp.nodes[0].node_id,
                node2Id: comp.nodes[1].node_id,
                value: rVal,
                ratedVoltage: parseFloat(p.ratedVoltage) || 12,
                ratedPower: parseFloat(p.ratedPower) || 6
            });
        } else if (comp.name === 'switch') {
            const isClosed = p.state !== 'open';
            elements.push({
                id: comp.id,
                name: comp.name,
                label: p.label || 'SW',
                type: 'SW',
                n1, n2,
                node1Id: comp.nodes[0].node_id,
                node2Id: comp.nodes[1].node_id,
                closed: isClosed,
                // Closed switch = 1 µΩ, Open switch = 100 GΩ
                value: isClosed ? 1e-6 : 1e11
            });
        } else if (comp.name === 'battery') {
            hasSource = true;
            elements.push({
                id: comp.id,
                name: comp.name,
                label: p.label || 'E',
                type: 'VDC',
                n1, n2, // n1 is (+), n2 is (-)
                node1Id: comp.nodes[0].node_id,
                node2Id: comp.nodes[1].node_id,
                value: parseFloat(p.voltage) || 12
            });
        } else if (comp.name === 'ac_power') {
            hasSource = true;
            isAC = true;
            elements.push({
                id: comp.id,
                name: comp.name,
                label: p.label || 'AC',
                type: 'VAC',
                n1, n2,
                node1Id: comp.nodes[0].node_id,
                node2Id: comp.nodes[1].node_id,
                value: parseFloat(p.voltage) || 12,
                freq: parseFloat(p.frequency) || 50
            });
        } else if (comp.name === 'inductor') {
            elements.push({
                id: comp.id,
                name: comp.name,
                label: p.label || 'L',
                type: 'L',
                n1, n2,
                node1Id: comp.nodes[0].node_id,
                node2Id: comp.nodes[1].node_id,
                value: Math.max(1e-9, parseFloat(p.inductance) || 0.1)
            });
        } else if (comp.name === 'capacitor') {
            elements.push({
                id: comp.id,
                name: comp.name,
                label: p.label || 'C',
                type: 'C',
                n1, n2,
                node1Id: comp.nodes[0].node_id,
                node2Id: comp.nodes[1].node_id,
                value: Math.max(1e-12, parseFloat(p.capacitance) || 100e-6)
            });
        } else if (comp.name === 'voltmeter') {
            elements.push({
                id: comp.id,
                name: comp.name,
                label: p.label || 'VM',
                type: 'VM',
                n1, n2,
                node1Id: comp.nodes[0].node_id,
                node2Id: comp.nodes[1].node_id,
                value: 1e7 // 10 MΩ internal resistance
            });
        } else if (comp.name === 'ammeter') {
            elements.push({
                id: comp.id,
                name: comp.name,
                label: p.label || 'AM',
                type: 'AM',
                n1, n2,
                node1Id: comp.nodes[0].node_id,
                node2Id: comp.nodes[1].node_id,
                value: 1e-4 // 0.1 mΩ internal resistance
            });
        }
    }

    return {
        netCount: rootToNet.size,
        groundNet: 0,
        elements,
        nodeToNet,
        hasSource,
        hasGround: groundRoots.size > 0,
        isAC
    };
}
