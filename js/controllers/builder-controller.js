/**
 * Interactive Circuit Builder Editor Controller
 * Complete overhaul with:
 * - Textbook-aesthetic Presets (Series, Parallel, Mixed)
 * - Click-to-Corner 90° Waypoint Routing
 * - Wire-to-Wire T-Junction & 4-way Junction Node Creation
 * - Integrated Virtual Oscilloscope Probes & Live Waveform Bridge
 * - Live MNA Simulation & Visual Diagnostics
 */
import { Coordinate, Dimension, ConnectionNode, Node, Component, Connection, get_component_svg_data } from '../models/circuit-models.js';
import { spec_of, default_props, next_label, component_value_text } from '../models/component-specs.js';
import { formatSI } from '../utils/si-units.js';
import { CircuitSolver } from '../solver/mna-solver.js';
import { initInspector, showInspector, hideInspector } from '../editor/inspector.js';
import { startCurrentAnimation, stopCurrentAnimation } from '../render/current-flow.js';
import { colorWiresByVoltage, resetWireColors } from '../render/voltage-colors.js';
import { detect_circuit_type } from '../models/topology-solver.js';
import { switchMainView } from './presets-controller.js';
import { toggleBuilderScope, setProbeNode, updateBuilderScope, probes, probeSelectingMode, setProbeSelectingMode } from '../instruments/builder-scope.js';

export let component_counter = 0, node_counter = 0, connection_counter = 0;
export let component_list = [], node_list = [], connection_list = [];
export let mouse_x = 0, mouse_y = 0;
export let selected_component_tool = null;
export let is_dragging_from_sidebar = false, dragged_tool_name = null;
export let app_mode = "select", zoom_level = 1.4, pan_offset_x = 0, pan_offset_y = 0;
export let active_drag = null, pending_drag = null, active_connect = null;
export let circuit_moving = false;
export let selected_component_id = null;
export let selected_connection_id = null;
export let last_sim_result = null;
export let canvas_initial_pos = new Coordinate(0, 0);
export const circuit_default_dimension = new Dimension(2000, 1500);

export function get_component_by_id(id) { return component_list.find(c => c.id === id); }
export function get_node_by_id(id) { return node_list.find(n => n.id === id); }

export function mouse_to_svg(e) {
    const svg = document.getElementById("circuit");
    const pt = svg.createSVGPoint();
    pt.x = e.touches ? e.touches[0].clientX : e.clientX;
    pt.y = e.touches ? e.touches[0].clientY : e.clientY;
    const ctm = svg.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : pt;
}

export function set_app_mode(mode) {
    app_mode = mode;
    document.getElementById("btn-mode-select").className = `p-2 border border-gray-300 rounded hover:bg-gray-100 ${mode==='select'?'bg-indigo-600 text-white shadow':'text-gray-700'}`;
    document.getElementById("btn-mode-wire").className = `p-2 border border-gray-300 rounded hover:bg-gray-100 ${mode==='wire'?'bg-indigo-600 text-white shadow':'text-gray-700'}`;
    document.getElementById("btn-mode-pan").className = `p-2 border border-gray-300 rounded hover:bg-gray-100 ${mode==='pan'?'bg-indigo-600 text-white shadow':'text-gray-700'}`;
    document.getElementById("circuit-map").style.cursor = mode === "pan" ? "grab" : mode === "wire" ? "crosshair" : "default";
}

export function set_zoom(level) {
    zoom_level = Math.max(0.3, Math.min(level, 4.0));
    document.querySelector("#btn-zoom-reset .btn-text").textContent = Math.round(zoom_level * 100) + "%";
    update_viewbox();
}

export function update_viewbox() {
    const svg = document.getElementById("circuit");
    if (!svg) return;
    const w = circuit_default_dimension.width / zoom_level;
    const h = circuit_default_dimension.height / zoom_level;
    svg.setAttribute("viewBox", `${pan_offset_x} ${pan_offset_y} ${w} ${h}`);
}

export function set_active_tool(img, name, titleText) {
    selected_component_tool = img;
    const ghost = document.getElementById("drag-ghost");
    const ghostSvg = document.getElementById("drag-ghost-svg");
    const ghostLabel = document.getElementById("drag-ghost-label");
    if (img && name && ghost && ghostSvg) {
        ghostSvg.innerHTML = `<svg width="60" height="60" viewBox="0 0 100 100">${get_component_svg_data(name)}</svg>`;
        if (ghostLabel) ghostLabel.textContent = titleText || name;
        ghost.style.display = ""; ghost.classList.remove("hidden");
    } else if (ghost) {
        ghost.classList.add("hidden"); ghost.style.display = "none";
    }
}

export function clear_active_tool() {
    selected_component_tool = null; dragged_tool_name = null; is_dragging_from_sidebar = false;
    const ghost = document.getElementById("drag-ghost");
    if (ghost) { ghost.classList.add("hidden"); ghost.style.display = "none"; }
    const circuitMap = document.getElementById("circuit-map");
    if (circuitMap) circuitMap.classList.remove("drag-over");
}

export function snap_to_grid(val, grid_size = 20) { return Math.round(val / grid_size) * grid_size; }

export function get_nearest_node(pt, radius = 25, excludeId = null) {
    let closest = null, minDist = radius;
    for (const n of node_list) {
        if (n.id === excludeId) continue;
        const dist = Math.hypot(n.position.x - pt.x, n.position.y - pt.y);
        if (dist < minDist) { minDist = dist; closest = n; }
    }
    return closest;
}

export function get_node_direction(node_id) {
    const node = get_node_by_id(node_id);
    if (!node) return 'H';
    const comp = get_component_by_id(node.base_component_id);
    if (!comp) return 'H';

    const cx = comp.base_point.x + 50;
    const cy = comp.base_point.y + 50;
    const dx = Math.abs(node.position.x - cx);
    const dy = Math.abs(node.position.y - cy);

    return dy >= dx ? 'V' : 'H';
}

/**
 * Generates an orthogonal 90-degree path connecting points sequence
 */
export function get_path_from_points(pts) {
    if (!pts || pts.length < 2) return "";
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x},${pts[i].y}`;
    }
    return d;
}

/**
 * Computes a 90-degree orthogonal path between two points
 */
export function get_orthogonal_path(x1, y1, x2, y2, altRoute = false, n1_id = null, n2_id = null) {
    if (Math.abs(x1 - x2) < 2) return `M ${x1},${y1} L ${x1},${y2}`;
    if (Math.abs(y1 - y2) < 2) return `M ${x1},${y1} L ${x2},${y1}`;

    const dir1 = n1_id ? get_node_direction(n1_id) : 'H';
    const dir2 = n2_id ? get_node_direction(n2_id) : 'H';

    if (!altRoute) {
        if (dir1 === 'V' && dir2 === 'V') {
            const yMid = Math.round((y1 + y2) / 2);
            return `M ${x1},${y1} L ${x1},${yMid} L ${x2},${yMid} L ${x2},${y2}`;
        } else if (dir1 === 'H' && dir2 === 'H') {
            const xMid = Math.round((x1 + x2) / 2);
            return `M ${x1},${y1} L ${xMid},${y1} L ${xMid},${y2} L ${x2},${y2}`;
        } else if (dir1 === 'V') {
            return `M ${x1},${y1} L ${x1},${y2} L ${x2},${y2}`;
        } else {
            return `M ${x1},${y1} L ${x2},${y1} L ${x2},${y2}`;
        }
    } else {
        if (dir1 === 'V' && dir2 === 'V') {
            return `M ${x1},${y1} L ${x1},${y2} L ${x2},${y2}`;
        } else if (dir1 === 'H' && dir2 === 'H') {
            return `M ${x1},${y1} L ${x2},${y1} L ${x2},${y2}`;
        } else if (dir1 === 'V') {
            return `M ${x1},${y1} L ${x2},${y1} L ${x2},${y2}`;
        } else {
            return `M ${x1},${y1} L ${x1},${y2} L ${x2},${y2}`;
        }
    }
}

/**
 * Checks if a point is close to any line segment of an existing connection (for T-Junctions)
 */
export function find_nearest_wire_point(pt, threshold = 16) {
    for (const conn of connection_list) {
        const wireGroup = document.getElementById(conn.id);
        if (!wireGroup) continue;
        const pathLine = wireGroup.querySelector('.wire-line');
        if (!pathLine) continue;
        const d = pathLine.getAttribute('d') || '';

        // Extract coordinates from SVG path
        const coords = d.match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(Number) || [];
        for (let i = 0; i < coords.length - 2; i += 2) {
            const x1 = coords[i], y1 = coords[i+1];
            const x2 = coords[i+2], y2 = coords[i+3];

            // Distance from point to line segment
            const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
            if (l2 === 0) continue;
            let t = ((pt.x - x1) * (x2 - x1) + (pt.y - y1) * (y2 - y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = x1 + t * (x2 - x1);
            const projY = y1 + t * (y2 - y1);
            const dist = Math.hypot(pt.x - projX, pt.y - projY);

            if (dist <= threshold) {
                return {
                    conn,
                    point: { x: snap_to_grid(projX), y: snap_to_grid(projY) }
                };
            }
        }
    }
    return null;
}

export function set_component_values(comp, comp_g) {
    comp.nodes.forEach((cn, index) => {
        const node_obj = get_node_by_id(cn.node_id);
        let localX = 3, localY = 50;
        if (comp.name === 'ground' || comp.name === 'earth') { localX = 50; localY = 3; }
        else if (comp.name === 'junction') { localX = 50; localY = 50; }
        else if (index === 1) { localX = 97; localY = 50; }

        if (node_obj) {
            node_obj.position.x = comp.base_point.x + localX;
            node_obj.position.y = comp.base_point.y + localY;
        }
        const nCircle = comp_g.querySelectorAll('.node')[index];
        if (nCircle) {
            nCircle.setAttribute('id', cn.node_id);
            nCircle.setAttribute('cx', localX);
            nCircle.setAttribute('cy', localY);
            if (comp.name === 'junction') {
                nCircle.setAttribute('fill', 'transparent');
            }

            const parent = nCircle.parentNode;
            const hb = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hb.setAttribute("id", "hb_" + cn.node_id);
            hb.setAttribute("cx", localX);
            hb.setAttribute("cy", localY);
            hb.setAttribute("r", "16");
            hb.setAttribute("class", "node-hitbox");
            hb.setAttribute("data-node-id", cn.node_id);
            parent.insertBefore(hb, nCircle);
        }
    });
}

export function update_component_label(comp_id, simRes = null) {
    const comp = get_component_by_id(comp_id);
    if (!comp || comp.name === 'junction') return;
    let lbl = document.getElementById("lbl_" + comp_id);
    if (!lbl) {
        lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        lbl.setAttribute("id", "lbl_" + comp_id);
        lbl.setAttribute("class", "sim-voltage-label");
        lbl.setAttribute("text-anchor", "middle");
        lbl.setAttribute("font-size", "11");
        lbl.setAttribute("font-weight", "600");
        lbl.setAttribute("fill", "#1e293b");
        lbl.setAttribute("pointer-events", "none");
        document.getElementById("component-labels").appendChild(lbl);
    }
    lbl.setAttribute("x", comp.base_point.x + 50);
    lbl.setAttribute("y", comp.base_point.y - 10);

    const valTxt = component_value_text(comp);
    let fullTxt = comp.properties.label || comp.name;
    if (valTxt) fullTxt += ` (${valTxt})`;

    const r = simRes?.elementResults?.[comp.id] || last_sim_result?.elementResults?.[comp.id];
    if (r && (comp.name.startsWith('resistor') || comp.name === 'lamp')) {
        fullTxt += ` | ${formatSI(r.voltage, 'V', 2)}, ${formatSI(r.current, 'A', 2)}`;
    }
    lbl.textContent = fullTxt;
}

export function update_switch_visual(comp) {
    const comp_g = document.getElementById(comp.id);
    if (!comp_g) return;
    const blade = comp_g.querySelector(".switch-blade");
    if (blade) {
        const isOpen = comp.properties.state === 'open';
        blade.setAttribute("y2", isOpen ? "22" : "50");
    }
}

export function update_lamp_visual(comp, power = 0) {
    const comp_g = document.getElementById(comp.id);
    if (!comp_g) return;
    const bulb = comp_g.querySelector(".lamp-bulb");
    if (!bulb) return;
    const ratedP = comp.properties.ratedPower || 6;
    const ratio = Math.min(1.5, Math.max(0, power / ratedP));
    if (ratio > 0.05) {
        const glowOpacity = Math.min(0.9, ratio * 0.8 + 0.2);
        bulb.setAttribute("fill", `rgba(251, 191, 36, ${glowOpacity})`);
        bulb.setAttribute("filter", "drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))");
    } else {
        bulb.setAttribute("fill", "#ffffff");
        bulb.removeAttribute("filter");
    }
}

export function update_meter_visual(comp, value, unit) {
    const comp_g = document.getElementById(comp.id);
    if (!comp_g) return;
    let readout = comp_g.querySelector(".meter-readout");
    if (!readout) {
        readout = document.createElementNS("http://www.w3.org/2000/svg", "text");
        readout.setAttribute("class", "meter-readout");
        readout.setAttribute("x", "50");
        readout.setAttribute("y", "86");
        readout.setAttribute("text-anchor", "middle");
        readout.setAttribute("font-size", "11");
        readout.setAttribute("font-weight", "bold");
        readout.setAttribute("font-family", "monospace");
        readout.setAttribute("fill", comp.name === 'voltmeter' ? '#1d4ed8' : '#c2410c');
        comp_g.appendChild(readout);
    }
    readout.textContent = formatSI(value, unit);
}

export function create_component_on_canvas(name, x, y) {
    const comp = new Component(name, new Coordinate(x, y), new Dimension(100, 100), { component_counter, node_counter });
    component_counter++;

    const spec = spec_of(name);
    comp.properties = default_props(name);
    comp.properties.label = next_label(spec ? spec.prefix : 'C', component_list);

    if (comp.name === 'ground' || comp.name === 'earth') {
        const nid = 'node_' + (++node_counter);
        const n = new Node(nid, new Coordinate(comp.base_point.x + 50, comp.base_point.y + 3), comp.id);
        node_list.push(n);
        comp.nodes.push(new ConnectionNode(nid, comp.id, 'input'));
    } else if (comp.name === 'junction') {
        const nid = 'node_' + (++node_counter);
        const n = new Node(nid, new Coordinate(comp.base_point.x + 50, comp.base_point.y + 50), comp.id);
        node_list.push(n);
        comp.nodes.push(new ConnectionNode(nid, comp.id, 'input'));
    } else {
        const nid1 = 'node_' + (++node_counter);
        const n1 = new Node(nid1, new Coordinate(comp.base_point.x + 3, comp.base_point.y + 50), comp.id);
        node_list.push(n1);
        comp.nodes.push(new ConnectionNode(nid1, comp.id, 'input'));

        const nid2 = 'node_' + (++node_counter);
        const n2 = new Node(nid2, new Coordinate(comp.base_point.x + 97, comp.base_point.y + 50), comp.id);
        node_list.push(n2);
        comp.nodes.push(new ConnectionNode(nid2, comp.id, 'output'));
    }

    const comp_g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    comp_g.setAttribute("id", comp.id);
    comp_g.setAttribute("class", "component");
    comp_g.innerHTML = get_component_svg_data(name, comp.properties);

    set_component_values(comp, comp_g);
    component_list.push(comp);
    document.getElementById("circuit").appendChild(comp_g);
    const rotStr = comp.rotation ? ` rotate(${comp.rotation}, 50, 50)` : '';
    comp_g.setAttribute("transform", `translate(${comp.base_point.x},${comp.base_point.y})${rotStr}`);
    register_component_events(comp_g);
    update_component_label(comp.id);
    update_layers_panel();

    if (last_sim_result) run_circuit_simulation();
    return comp;
}

export function clear_builder_canvas() {
    component_list = []; node_list = []; connection_list = [];
    document.getElementById("connections").innerHTML = "";
    document.getElementById("component-labels").innerHTML = "";
    const snapIndicator = document.getElementById("snap-indicator");
    if (snapIndicator) snapIndicator.classList.add("hidden");
    const circuit = document.getElementById("circuit");
    const comps = Array.from(circuit.querySelectorAll(".component"));
    comps.forEach(c => circuit.removeChild(c));
    stopCurrentAnimation();
    hideInspector();
    hideDiagnosticBanner();
    last_sim_result = null;
    probes.ch1 = null; probes.ch2 = null;
    const statusTxt = document.getElementById("status-text");
    if (statusTxt) statusTxt.textContent = "Ready";
    const statusDot = document.getElementById("status-indicator");
    if (statusDot) statusDot.className = "status-dot";
    update_layers_panel(); update_junction_dots(); renderProbesOnCanvas();
}

export function renderProbesOnCanvas() {
    let layer = document.getElementById("multimeter-probes");
    if (!layer) {
        layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        layer.setAttribute("id", "multimeter-probes");
        document.getElementById("circuit").appendChild(layer);
    }
    layer.innerHTML = "";

    const drawProbeBadge = (nodeId, color, label, isTop = true) => {
        if (!nodeId) return;
        const node = get_node_by_id(nodeId);
        if (!node) return;
        const x = node.position.x;
        const y = node.position.y;
        const dy = isTop ? -28 : 28;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "scope-probe-marker");
        g.setAttribute("transform", `translate(${x}, ${y})`);
        g.style.pointerEvents = "none";
        g.innerHTML = `
            <line x1="0" y1="0" x2="0" y2="${dy}" stroke="${color}" stroke-width="2.5" stroke-dasharray="3,2"/>
            <circle cx="0" cy="0" r="5.5" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
            <rect x="-24" y="${dy > 0 ? dy : dy - 18}" width="48" height="20" rx="5" fill="${color}" stroke="#ffffff" stroke-width="1.5" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.3))"/>
            <text x="0" y="${dy > 0 ? dy + 14 : dy - 4}" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="'JetBrains Mono', monospace">${label}</text>
        `;
        layer.appendChild(g);
    };

    drawProbeBadge(probes.ch1, "#ef4444", "CH1", true);
    drawProbeBadge(probes.ch2, "#0284c7", "CH2", false);
}
window.renderProbesOnCanvas = renderProbesOnCanvas;

export function update_junction_dots() {
    let layer = document.getElementById("wire-junctions");
    if (!layer) {
        layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        layer.setAttribute("id", "wire-junctions");
        document.getElementById("connections").appendChild(layer);
    }
    layer.innerHTML = "";

    const posCounts = {};
    const nodeConnCounts = {};
    connection_list.forEach(conn => {
        const n1 = get_node_by_id(conn.node_1_id);
        const n2 = get_node_by_id(conn.node_2_id);
        if (n1) {
            const k = `${n1.position.x},${n1.position.y}`;
            posCounts[k] = (posCounts[k] || 0) + 1;
            nodeConnCounts[n1.id] = (nodeConnCounts[n1.id] || 0) + 1;
        }
        if (n2) {
            const k = `${n2.position.x},${n2.position.y}`;
            posCounts[k] = (posCounts[k] || 0) + 1;
            nodeConnCounts[n2.id] = (nodeConnCounts[n2.id] || 0) + 1;
        }
    });

    // Only render a junction dot when MORE THAN 2 wires meet at this point
    for (const k in posCounts) {
        if (posCounts[k] > 2) {
            const [x, y] = k.split(",").map(Number);
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", "5");
            dot.setAttribute("fill", "#1e293b"); dot.setAttribute("pointer-events", "none");
            layer.appendChild(dot);
        }
    }

    // Update junction component indicators: show placeholder only when unconnected
    component_list.forEach(comp => {
        if (comp.name === 'junction') {
            const jNode = comp.nodes[0];
            const cnt = jNode ? (nodeConnCounts[jNode.node_id] || 0) : 0;
            const compEl = document.getElementById(comp.id);
            if (compEl) {
                const base = compEl.querySelector(".junction-base");
                if (base) {
                    base.style.display = cnt === 0 ? "block" : "none";
                }
            }
        }
    });
}

export function connect_nodes_by_ids(n1_id, n2_id, waypoints = null) {
    const n1 = get_node_by_id(n1_id), n2 = get_node_by_id(n2_id);
    if (!n1 || !n2) return;
    const conn = new Connection(n1_id, n1.base_component_id, n2_id, n2.base_component_id, ++connection_counter);
    if (waypoints && waypoints.length >= 2) conn.waypoints = waypoints;
    create_connection_element(conn);
}

/**
 * Creates or splits connection for T-Junction on an existing wire
 */
export function branch_to_existing_wire(targetConn, branchPt, sourceNodeId) {
    // 1. Create a Junction Node at branchPt
    const jComp = create_component_on_canvas("junction", branchPt.x - 50, branchPt.y - 50);
    const jNode = jComp.nodes[0];

    // 2. Split existing targetConn: delete it and create two segments
    const origN1Id = targetConn.node_1_id;
    const origN2Id = targetConn.node_2_id;
    delete_connection(targetConn.id);

    connect_nodes_by_ids(origN1Id, jNode.node_id);
    connect_nodes_by_ids(origN2Id, jNode.node_id);

    // 3. Connect the new wire into jNode
    connect_nodes_by_ids(sourceNodeId, jNode.node_id);
}

export function create_connection_element(conn) {
    const n1 = get_node_by_id(conn.node_1_id), n2 = get_node_by_id(conn.node_2_id);
    if (!n1 || !n2) return;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", conn.id); g.setAttribute("class", "wire-group");
    g.setAttribute("title", "คลิกเพื่อเลือกสายไฟ (กด Delete เพื่อลบ) หรือดับเบิลคลิกเพื่อสลับมุมฉาก");

    let pathD = "";
    if (conn.waypoints && conn.waypoints.length >= 2) {
        pathD = get_path_from_points(conn.waypoints);
    } else {
        pathD = get_orthogonal_path(n1.position.x, n1.position.y, n2.position.x, n2.position.y, conn.altRoute, conn.node_1_id, conn.node_2_id);
    }

    const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitbox.setAttribute("class", "wire-hitbox"); hitbox.setAttribute("d", pathD);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "wire-line"); path.setAttribute("stroke", conn.connector_colour || "#1e293b"); path.setAttribute("d", pathD);
    g.appendChild(hitbox); g.appendChild(path);

    // Click to select connection
    g.addEventListener("click", (e) => {
        e.stopPropagation();
        select_connection(conn.id);
    });

    // Double-click to toggle orthogonal route
    g.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        conn.altRoute = !conn.altRoute;
        conn.waypoints = null; // reset custom waypoints
        const newD = get_orthogonal_path(n1.position.x, n1.position.y, n2.position.x, n2.position.y, conn.altRoute, conn.node_1_id, conn.node_2_id);
        hitbox.setAttribute("d", newD);
        path.setAttribute("d", newD);
    });

    document.getElementById("connections").appendChild(g);
    connection_list.push(conn);
    update_layers_panel(); update_junction_dots();
    if (last_sim_result) run_circuit_simulation();
}

export function select_connection(conn_id) {
    deselect_connection();
    deselect_component();
    selected_connection_id = conn_id;
    const g = document.getElementById(conn_id);
    if (g) {
        const line = g.querySelector(".wire-line");
        if (line) {
            line.setAttribute("stroke", "#6366f1");
            line.setAttribute("stroke-width", "5");
            line.setAttribute("filter", "drop-shadow(0 0 4px #6366f1)");
        }
    }
}

export function deselect_connection() {
    if (selected_connection_id) {
        const g = document.getElementById(selected_connection_id);
        if (g) {
            const line = g.querySelector(".wire-line");
            if (line) {
                line.setAttribute("stroke", "#475569");
                line.setAttribute("stroke-width", "3");
                line.removeAttribute("filter");
            }
        }
    }
    selected_connection_id = null;
}

export function delete_connection(conn_id) {
    const idx = connection_list.findIndex(c => c.id === conn_id);
    if (idx !== -1) connection_list.splice(idx, 1);
    const el = document.getElementById(conn_id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (selected_connection_id === conn_id) selected_connection_id = null;
    update_layers_panel(); update_junction_dots();
    if (last_sim_result) run_circuit_simulation();
}

export function finish_active_connection(target_node_param = null) {
    if (!active_connect) return;
    const snapIndicator = document.getElementById("snap-indicator");
    if (snapIndicator) snapIndicator.classList.add("hidden");

    const target_node = target_node_param || active_connect.target_node;
    const tempWire = active_connect.path || active_connect.line;
    if (tempWire && tempWire.parentNode) tempWire.parentNode.removeChild(tempWire);

    if (active_connect.branchTarget) {
        // T-Junction connection to wire
        branch_to_existing_wire(active_connect.branchTarget.conn, active_connect.branchTarget.point, active_connect.connection.node_1_id);
    } else if (target_node && target_node.id !== active_connect.connection.node_1_id) {
        active_connect.connection.node_2_id = target_node.id;
        active_connect.connection.component_2_id = target_node.base_component_id;

        // Save waypoints if user made corners
        if (active_connect.waypoints && active_connect.waypoints.length >= 2) {
            active_connect.connection.waypoints = [
                ...active_connect.waypoints,
                { x: target_node.position.x, y: target_node.position.y }
            ];
        }
        create_connection_element(active_connect.connection);
    }
    active_connect = null;
}

/**
 * Redesigned Textbook-Aesthetic Presets
 */
export function build_preset_topology(type) {
    switchMainView('builder', update_viewbox);
    pan_offset_x = 40; pan_offset_y = 60; zoom_level = 1.35;
    update_viewbox();
    clear_builder_canvas();

    if (type === 'parallel') {
        // 1. DC Battery on Left (Vertical: + at Top 140, - at Bottom 360)
        const bat = create_component_on_canvas("battery", 160, 200);
        if (bat) rotate_selected_component(bat.id);
        const gnd = create_component_on_canvas("ground", 160, 400);

        // 2. Switch on Top Busbar
        const sw = create_component_on_canvas("switch", 300, 90);

        // 3. Parallel Resistor Branches (Vertical)
        const r1 = create_component_on_canvas("resistor_iec", 500, 200);
        if (r1) rotate_selected_component(r1.id);
        const r2 = create_component_on_canvas("resistor_iec", 700, 200);
        if (r2) rotate_selected_component(r2.id);

        if (r1) { r1.properties.resistance = 100; r1.properties.label = "R1"; update_component_label(r1.id); }
        if (r2) { r2.properties.resistance = 200; r2.properties.label = "R2"; update_component_label(r2.id); }

        // Top busbar junction nodes
        const jTop1 = create_component_on_canvas("junction", 500, 90);
        const jTop2 = create_component_on_canvas("junction", 700, 90);

        // Bottom busbar junction nodes
        const jBot1 = create_component_on_canvas("junction", 500, 350);
        const jBot2 = create_component_on_canvas("junction", 700, 350);

        // Straight connections
        if (bat && sw && r1 && r2 && gnd) {
            // Battery (+) -> Switch (Left)
            connect_nodes_by_ids(bat.nodes[0].node_id, sw.nodes[0].node_id);
            // Switch (Right) -> Junction Top 1
            connect_nodes_by_ids(sw.nodes[1].node_id, jTop1.nodes[0].node_id);
            // Junction Top 1 -> Junction Top 2
            connect_nodes_by_ids(jTop1.nodes[0].node_id, jTop2.nodes[0].node_id);
            // Junction Top 1 -> R1 (Top)
            connect_nodes_by_ids(jTop1.nodes[0].node_id, r1.nodes[0].node_id);
            // Junction Top 2 -> R2 (Top)
            connect_nodes_by_ids(jTop2.nodes[0].node_id, r2.nodes[0].node_id);

            // R1 (Bottom) -> Junction Bot 1
            connect_nodes_by_ids(r1.nodes[1].node_id, jBot1.nodes[0].node_id);
            // R2 (Bottom) -> Junction Bot 2
            connect_nodes_by_ids(r2.nodes[1].node_id, jBot2.nodes[0].node_id);
            // Junction Bot 2 -> Junction Bot 1
            connect_nodes_by_ids(jBot2.nodes[0].node_id, jBot1.nodes[0].node_id);
            // Junction Bot 1 -> Battery (-)
            connect_nodes_by_ids(jBot1.nodes[0].node_id, bat.nodes[1].node_id);
            // Battery (-) -> Ground
            connect_nodes_by_ids(bat.nodes[1].node_id, gnd.nodes[0].node_id);
        }

        // Set default probes: CH1 on R1 Top, CH2 on R2 Top
        if (r1) probes.ch1 = r1.nodes[0].node_id;
        if (r2) probes.ch2 = r2.nodes[0].node_id;

    } else if (type === 'series') {
        const bat = create_component_on_canvas("battery", 160, 200);
        if (bat) rotate_selected_component(bat.id);
        const gnd = create_component_on_canvas("ground", 160, 400);

        const sw = create_component_on_canvas("switch", 300, 90);
        const r1 = create_component_on_canvas("resistor_iec", 470, 90);
        const r2 = create_component_on_canvas("resistor_iec", 640, 90);
        const am = create_component_on_canvas("ammeter", 810, 90);

        if (r1) { r1.properties.resistance = 100; r1.properties.label = "R1"; update_component_label(r1.id); }
        if (r2) { r2.properties.resistance = 200; r2.properties.label = "R2"; update_component_label(r2.id); }

        const jCorner = create_component_on_canvas("junction", 900, 350);

        if (bat && sw && r1 && r2 && am && gnd) {
            connect_nodes_by_ids(bat.nodes[0].node_id, sw.nodes[0].node_id);
            connect_nodes_by_ids(sw.nodes[1].node_id, r1.nodes[0].node_id);
            connect_nodes_by_ids(r1.nodes[1].node_id, r2.nodes[0].node_id);
            connect_nodes_by_ids(r2.nodes[1].node_id, am.nodes[0].node_id);
            connect_nodes_by_ids(am.nodes[1].node_id, jCorner.nodes[0].node_id);
            connect_nodes_by_ids(jCorner.nodes[0].node_id, bat.nodes[1].node_id);
            connect_nodes_by_ids(bat.nodes[1].node_id, gnd.nodes[0].node_id);
        }

        if (r1) probes.ch1 = r1.nodes[0].node_id;
        if (r2) probes.ch2 = r2.nodes[0].node_id;

    } else if (type === 'mixed') {
        const bat = create_component_on_canvas("battery", 160, 200);
        if (bat) rotate_selected_component(bat.id);
        const gnd = create_component_on_canvas("ground", 160, 400);

        const r1 = create_component_on_canvas("resistor_iec", 320, 90);
        const jTop1 = create_component_on_canvas("junction", 520, 90);
        const jTop2 = create_component_on_canvas("junction", 720, 90);

        const r2 = create_component_on_canvas("resistor_iec", 520, 200);
        if (r2) rotate_selected_component(r2.id);
        const r3 = create_component_on_canvas("resistor_iec", 720, 200);
        if (r3) rotate_selected_component(r3.id);

        const jBot1 = create_component_on_canvas("junction", 520, 350);
        const jBot2 = create_component_on_canvas("junction", 720, 350);

        if (r1) { r1.properties.resistance = 100; r1.properties.label = "R1"; update_component_label(r1.id); }
        if (r2) { r2.properties.resistance = 200; r2.properties.label = "R2"; update_component_label(r2.id); }
        if (r3) { r3.properties.resistance = 300; r3.properties.label = "R3"; update_component_label(r3.id); }

        if (bat && r1 && r2 && r3 && gnd) {
            connect_nodes_by_ids(bat.nodes[0].node_id, r1.nodes[0].node_id);
            connect_nodes_by_ids(r1.nodes[1].node_id, jTop1.nodes[0].node_id);
            connect_nodes_by_ids(jTop1.nodes[0].node_id, jTop2.nodes[0].node_id);
            connect_nodes_by_ids(jTop1.nodes[0].node_id, r2.nodes[0].node_id);
            connect_nodes_by_ids(jTop2.nodes[0].node_id, r3.nodes[0].node_id);

            connect_nodes_by_ids(r2.nodes[1].node_id, jBot1.nodes[0].node_id);
            connect_nodes_by_ids(r3.nodes[1].node_id, jBot2.nodes[0].node_id);
            connect_nodes_by_ids(jBot2.nodes[0].node_id, jBot1.nodes[0].node_id);
            connect_nodes_by_ids(jBot1.nodes[0].node_id, bat.nodes[1].node_id);
            connect_nodes_by_ids(bat.nodes[1].node_id, gnd.nodes[0].node_id);
        }

        if (r1) probes.ch1 = r1.nodes[0].node_id;
        if (r2) probes.ch2 = r2.nodes[0].node_id;
    }

    update_layers_panel(); update_junction_dots(); renderProbesOnCanvas();
    run_circuit_simulation();
}

export function select_component(comp_id) {
    deselect_connection();
    deselect_component();
    selected_component_id = comp_id;
    const g = document.getElementById(comp_id);
    if (g) g.classList.add("component-selected");
    const comp = get_component_by_id(comp_id);
    if (comp) showInspector(comp, last_sim_result);
    update_layers_panel();
}

export function deselect_component() {
    if (selected_component_id) {
        const g = document.getElementById(selected_component_id);
        if (g) g.classList.remove("component-selected");
    }
    selected_component_id = null;
    hideInspector();
    update_layers_panel();
}

export function delete_component(comp_id) {
    const connIds = connection_list
        .filter(c => c.component_1_id === comp_id || c.component_2_id === comp_id)
        .map(c => c.id);
    connIds.forEach(cid => delete_connection(cid));

    const comp = get_component_by_id(comp_id);
    if (comp) {
        comp.nodes.forEach(n => {
            const idx = node_list.findIndex(nd => nd.id === n.node_id);
            if (idx !== -1) node_list.splice(idx, 1);
        });
    }

    const cidx = component_list.findIndex(c => c.id === comp_id);
    if (cidx !== -1) component_list.splice(cidx, 1);

    const g = document.getElementById(comp_id);
    if (g && g.parentNode) g.parentNode.removeChild(g);

    const lbl = document.getElementById("lbl_" + comp_id);
    if (lbl && lbl.parentNode) lbl.parentNode.removeChild(lbl);

    deselect_component(); update_layers_panel();
    if (last_sim_result) run_circuit_simulation();
}

export function rotate_selected_component(comp_id_param = null) {
    const compId = comp_id_param || selected_component_id;
    if (!compId) return;
    const comp = get_component_by_id(compId);
    if (!comp || comp.name === 'junction') return;

    comp.rotation = ((comp.rotation || 0) + 90) % 360;
    const comp_g = document.getElementById(compId);
    if (comp_g) comp_g.setAttribute("transform", `translate(${comp.base_point.x},${comp.base_point.y}) rotate(${comp.rotation}, 50, 50)`);

    const rad = comp.rotation * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);

    comp.nodes.forEach((cn, i) => {
        const node_obj = get_node_by_id(cn.node_id);
        if (!node_obj) return;
        let localX = (i === 1) ? 97 : 3, localY = 50;
        if (comp.name === 'ground' || comp.name === 'earth') { localX = 50; localY = 3; }

        const relX = localX - 50, relY = localY - 50;
        const rotX = relX * cos - relY * sin, rotY = relX * sin + relY * cos;
        node_obj.position.x = Math.round(comp.base_point.x + 50 + rotX);
        node_obj.position.y = Math.round(comp.base_point.y + 50 + rotY);
    });

    move_component_connections(compId);
    update_component_label(compId);
    update_layers_panel();
    if (last_sim_result) run_circuit_simulation();
}

export function duplicate_selected_component() {
    if (!selected_component_id) return;
    const comp = get_component_by_id(selected_component_id);
    if (!comp) return;
    const newComp = create_component_on_canvas(comp.name, comp.base_point.x + 30, comp.base_point.y + 30);
    if (newComp) {
        newComp.properties = JSON.parse(JSON.stringify(comp.properties));
        select_component(newComp.id);
    }
}

export function move_component(comp_id, targetX, targetY) {
    const comp = get_component_by_id(comp_id);
    if (!comp) return;

    const newX = snap_to_grid(targetX);
    const newY = snap_to_grid(targetY);
    const dx = newX - comp.base_point.x;
    const dy = newY - comp.base_point.y;

    comp.base_point.x = newX; comp.base_point.y = newY;
    const g = document.getElementById(comp_id);
    if (g) {
        const rotStr = comp.rotation ? ` rotate(${comp.rotation}, 50, 50)` : '';
        g.setAttribute("transform", `translate(${comp.base_point.x},${comp.base_point.y})${rotStr}`);
    }
    if (dx === 0 && dy === 0) return;

    for (const n of comp.nodes) {
        const node_obj = get_node_by_id(n.node_id);
        if (node_obj) { node_obj.position.x += dx; node_obj.position.y += dy; }
    }
    move_component_connections(comp_id);
    update_component_label(comp_id);
    renderProbesOnCanvas();
}

export function move_component_connections(comp_id) {
    for (const conn of connection_list) {
        if (conn.component_1_id === comp_id || conn.component_2_id === comp_id) {
            const wireGroup = document.getElementById(conn.id);
            if (!wireGroup) continue;
            const n1 = get_node_by_id(conn.node_1_id);
            const n2 = get_node_by_id(conn.node_2_id);
            if (!n1 || !n2) continue;

            let newD = "";
            if (conn.waypoints && conn.waypoints.length >= 2) {
                // Update terminal points
                if (conn.component_1_id === comp_id) conn.waypoints[0] = { x: n1.position.x, y: n1.position.y };
                if (conn.component_2_id === comp_id) conn.waypoints[conn.waypoints.length - 1] = { x: n2.position.x, y: n2.position.y };
                newD = get_path_from_points(conn.waypoints);
            } else {
                newD = get_orthogonal_path(n1.position.x, n1.position.y, n2.position.x, n2.position.y, conn.altRoute, conn.node_1_id, conn.node_2_id);
            }

            const hitbox = wireGroup.querySelector(".wire-hitbox");
            const pathLine = wireGroup.querySelector(".wire-line");
            if (hitbox) hitbox.setAttribute("d", newD);
            if (pathLine) pathLine.setAttribute("d", newD);
        }
    }
    update_junction_dots();
}

export function register_component_events(comp_g) {
    const comp_id = comp_g.getAttribute("id");

    comp_g.addEventListener("contextmenu", (e) => {
        e.preventDefault(); e.stopPropagation(); delete_component(comp_id);
    });

    comp_g.addEventListener("mousedown", (e) => {
        if (is_dragging_from_sidebar && (selected_component_tool || dragged_tool_name)) {
            const pt = mouse_to_svg(e);
            const name = dragged_tool_name || (selected_component_tool ? selected_component_tool.getAttribute("alt") : null);
            if (name) create_component_on_canvas(name, snap_to_grid(pt.x - 50), snap_to_grid(pt.y - 50));
            clear_active_tool(); e.stopPropagation(); return;
        }

        const pt = mouse_to_svg(e);
        mouse_x = pt.x; mouse_y = pt.y;
        const nodeEl = e.target.closest(".node, .node-hitbox");

        if (nodeEl && app_mode !== "pan") {
            let nodeId = nodeEl.getAttribute("data-node-id") || nodeEl.getAttribute("id");
            if (nodeId && nodeId.startsWith("hb_")) nodeId = nodeId.replace("hb_", "");

            if (probeSelectingMode) {
                setProbeNode(probeSelectingMode, nodeId);
                setProbeSelectingMode(null);
                renderProbesOnCanvas();
                e.stopPropagation();
                return;
            }

            if (active_connect) {
                const targetNode = get_node_by_id(nodeId);
                finish_active_connection(targetNode);
            } else {
                const conn = new Connection("", comp_id, "", "", ++connection_counter);
                conn.node_1_id = nodeId;
                const n1 = get_node_by_id(conn.node_1_id);
                const startX = n1 ? n1.position.x : mouse_x;
                const startY = n1 ? n1.position.y : mouse_y;

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("fill", "none"); path.setAttribute("stroke", "#1e293b");
                path.setAttribute("stroke-width", "2.5"); path.setAttribute("stroke-dasharray", "5,3");
                path.setAttribute("stroke-linejoin", "round"); path.setAttribute("stroke-linecap", "round");
                path.setAttribute("d", get_orthogonal_path(startX, startY, mouse_x, mouse_y));
                document.getElementById("connections").appendChild(path);

                active_connect = {
                    connection: conn,
                    path: path,
                    waypoints: [{ x: startX, y: startY }],
                    start_time: Date.now(),
                    target_node: null,
                    branchTarget: null
                };
            }
            e.stopPropagation();
        } else if (app_mode !== "pan" && e.button === 0) {
            if (active_connect) finish_active_connection(null);

            const comp = get_component_by_id(comp_id);
            // Interactive toggle for switch on click
            if (comp && comp.name === 'switch') {
                comp.properties.state = comp.properties.state === 'open' ? 'closed' : 'open';
                update_switch_visual(comp);
                update_component_label(comp_id);
                if (last_sim_result) run_circuit_simulation();
            }

            select_component(comp_id);
            const drag_comp = get_component_by_id(comp_id);
            pending_drag = {
                component_id: comp_id, down_svg_x: pt.x, down_svg_y: pt.y,
                click_offset_x: pt.x - drag_comp.base_point.x, click_offset_y: pt.y - drag_comp.base_point.y
            };
            e.stopPropagation();
        }
    });
}

export function showDiagnosticBanner(diagnostics) {
    const banner = document.getElementById("diagnostic-banner");
    const bannerText = document.getElementById("diagnostic-banner-text");
    const bannerIcon = document.getElementById("diagnostic-banner-icon");
    if (!banner || !bannerText) return;

    if (!diagnostics || diagnostics.issues.length === 0) {
        banner.classList.add("hidden");
        return;
    }

    const firstIssue = diagnostics.issues[0];
    bannerText.textContent = firstIssue.message;
    bannerIcon.textContent = firstIssue.level === 'error' ? '❌' : firstIssue.level === 'warning' ? '⚠' : 'ℹ';
    banner.className = `absolute top-3 left-1/2 -translate-x-1/2 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg border flex items-center gap-2 z-30 transition-all duration-200 ${
        firstIssue.level === 'error' ? 'bg-rose-600/95 border-rose-400' : 'bg-amber-600/95 border-amber-400'
    }`;
    banner.classList.remove("hidden");
}

export function hideDiagnosticBanner() {
    const banner = document.getElementById("diagnostic-banner");
    if (banner) banner.classList.add("hidden");
}

export function run_circuit_simulation() {
    detect_circuit_type(component_list, node_list, connection_list);
    const res = CircuitSolver.solve(component_list, node_list, connection_list);
    last_sim_result = res;
    window.last_sim_result = res;

    const statusTxt = document.getElementById("status-text");
    const statusDot = document.getElementById("status-indicator");

    if (!res.success) {
        if (statusTxt) statusTxt.textContent = res.diagnostics.summary;
        if (statusDot) statusDot.className = "status-dot error";
        stopCurrentAnimation();
        resetWireColors(connection_list);
        showDiagnosticBanner(res.diagnostics);
        updateBuilderScope(res);
        return;
    }

    // Success
    hideDiagnosticBanner();
    const modeDesc = res.isAC ? `AC (${res.frequency} Hz)` : 'DC';
    if (statusTxt) statusTxt.textContent = `Running (${modeDesc})`;
    if (statusDot) statusDot.className = "status-dot running";

    // Visual feedback: Wire potential coloring and Current flow dots
    colorWiresByVoltage(res, connection_list, get_node_by_id);
    startCurrentAnimation(res, connection_list, get_node_by_id);

    // Update canvas components: labels, lamps, switches, meters
    for (const comp of component_list) {
        update_component_label(comp.id, res);
        const elemRes = res.elementResults[comp.id];
        if (comp.name === 'lamp' && elemRes) {
            update_lamp_visual(comp, elemRes.power);
        } else if (comp.name === 'switch') {
            update_switch_visual(comp);
        } else if (comp.name === 'voltmeter' && elemRes) {
            update_meter_visual(comp, elemRes.voltage, 'V');
        } else if (comp.name === 'ammeter' && elemRes) {
            update_meter_visual(comp, elemRes.current, 'A');
        }
    }

    // Update Digital Oscilloscope
    updateBuilderScope(res);

    // If Property Inspector is open, refresh values
    if (selected_component_id) {
        const comp = get_component_by_id(selected_component_id);
        if (comp) showInspector(comp, res);
    }
}

export function update_layers_panel() {
    detect_circuit_type(component_list, node_list, connection_list);
    const listContainer = document.getElementById("layers-list");
    if (!listContainer) return;

    const items = [];
    component_list.forEach(c => {
        const label = c.properties.label || c.name;
        items.push({ id: c.id, label: label, type: 'component', isSelected: selected_component_id === c.id });
    });
    connection_list.forEach(conn => {
        items.push({ id: conn.id, label: "Wire", type: 'connection', isSelected: selected_connection_id === conn.id });
    });

    if (items.length === 0) {
        listContainer.innerHTML = `<li class="px-3 py-2 text-center italic text-gray-400">No elements on canvas</li>`;
        return;
    }

    let html = "";
    items.reverse().forEach(item => {
        const selClass = item.isSelected ? "bg-blue-50 text-blue-800 font-semibold" : "hover:bg-gray-50 text-gray-700";
        html += `
            <li class="px-3 py-1.5 flex items-center justify-between cursor-pointer ${selClass}" onclick="window.select_layer_item('${item.id}', '${item.type}')">
                <div class="flex items-center gap-2 overflow-hidden">
                    <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <span class="truncate">${item.label}</span>
                </div>
                <div class="w-3 h-3 rounded-full border border-gray-300 ${item.isSelected ? 'bg-blue-600 border-blue-600' : ''}"></div>
            </li>
        `;
    });
    listContainer.innerHTML = html;
}

export function select_layer_item(id, type) {
    if (type === 'component') select_component(id);
    else if (type === 'connection') select_connection(id);
}

export function delete_selected_layer() {
    if (selected_component_id) delete_component(selected_component_id);
    else if (selected_connection_id) delete_connection(selected_connection_id);
}

export function set_component_layout(mode) {
    const list = document.getElementById("component-tool-list");
    const btnList = document.getElementById("btn-layout-list");
    const btnGrid = document.getElementById("btn-layout-grid");
    if (mode === "grid") {
        list.classList.add("grid-view");
        btnGrid.classList.add("active", "text-gray-700");
        btnList.classList.remove("active", "text-gray-700");
    } else {
        list.classList.remove("grid-view");
        btnList.classList.add("active", "text-gray-700");
        btnGrid.classList.remove("active", "text-gray-700");
    }
}

export function init_builder_canvas() {
    set_zoom(1.4);
    initInspector({
        onUpdate: (comp) => {
            update_component_label(comp.id);
            if (last_sim_result) run_circuit_simulation();
        },
        onDelete: (comp) => delete_component(comp.id),
        onRotate: (comp) => rotate_selected_component(comp.id),
        onDuplicate: (comp) => duplicate_selected_component()
    });

    const circuit = document.getElementById("circuit");
    const circuitMap = document.getElementById("circuit-map");
    const tools = document.getElementsByClassName("component-box");

    for (let i = 0; i < tools.length; i++) {
        const box = tools[i];
        const img = box.querySelector(".component-tool");
        const titleEl = box.querySelector("h4");
        const name = img ? img.getAttribute("alt") : null;
        if (!name) continue;

        box.addEventListener("dragstart", (e) => e.preventDefault());
        const handleDragStart = (e) => {
            if (e.cancelable) e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            is_dragging_from_sidebar = true; dragged_tool_name = name;
            set_active_tool(img, name, titleEl ? titleEl.textContent : name);
            const ghost = document.getElementById("drag-ghost");
            if (ghost) { ghost.style.left = clientX + "px"; ghost.style.top = clientY + "px"; }
        };
        box.addEventListener("mousedown", handleDragStart);
        box.addEventListener("touchstart", handleDragStart, { passive: false });
    }

    if (circuitMap) {
        circuitMap.addEventListener("contextmenu", (e) => {
            if (selected_component_tool || dragged_tool_name || is_dragging_from_sidebar) {
                e.preventDefault(); clear_active_tool();
            }
        });
        circuitMap.addEventListener("wheel", (e) => {
            e.preventDefault();
            set_zoom(zoom_level + (e.deltaY > 0 ? -0.1 : 0.1));
        }, { passive: false });
    }

    const searchBox = document.getElementById("component-search-text-box");
    if (searchBox) {
        searchBox.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            document.querySelectorAll(".component-box").forEach(b => {
                b.classList.toggle("absent", q !== "" && !b.textContent.toLowerCase().includes(q));
            });
        });
    }

    const handleGlobalMove = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const ghost = document.getElementById("drag-ghost");

        if ((is_dragging_from_sidebar || selected_component_tool) && ghost) {
            ghost.style.left = clientX + "px"; ghost.style.top = clientY + "px";
            ghost.style.display = ""; ghost.classList.remove("hidden");
            if (circuitMap) {
                const rect = circuitMap.getBoundingClientRect();
                circuitMap.classList.toggle("drag-over", clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom);
            }
        } else if (ghost) {
            ghost.classList.add("hidden"); ghost.style.display = "none";
            if (circuitMap) circuitMap.classList.remove("drag-over");
        }

        if (pending_drag && !active_drag) {
            const svg = document.getElementById("circuit");
            const pt2 = svg.createSVGPoint(); pt2.x = clientX; pt2.y = clientY;
            const ctm2 = svg.getScreenCTM();
            const svgPt2 = ctm2 ? pt2.matrixTransform(ctm2.inverse()) : pt2;
            if (Math.hypot(svgPt2.x - pending_drag.down_svg_x, svgPt2.y - pending_drag.down_svg_y) > 6) {
                active_drag = { component_id: pending_drag.component_id, click_offset_x: pending_drag.click_offset_x, click_offset_y: pending_drag.click_offset_y, use_offset: true };
                const comp_g2 = document.getElementById(pending_drag.component_id);
                if (comp_g2) comp_g2.classList.add("component-dragging");
                pending_drag = null;
            }
        }

        if (active_drag) {
            const svg = document.getElementById("circuit");
            const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
            const ctm = svg.getScreenCTM();
            const svgPt = ctm ? pt.matrixTransform(ctm.inverse()) : pt;
            move_component(active_drag.component_id, svgPt.x - active_drag.click_offset_x, svgPt.y - active_drag.click_offset_y);
        }

        if (active_connect) {
            const pt = mouse_to_svg(e);
            const snapNode = get_nearest_node(pt, 25, active_connect.connection.node_1_id);
            const snapIndicator = document.getElementById("snap-indicator");
            const lastWp = active_connect.waypoints[active_connect.waypoints.length - 1];

            // Check wire-to-wire T-Junction snap
            let wireBranch = null;
            if (!snapNode) {
                wireBranch = find_nearest_wire_point(pt, 16);
            }

            const targetX = snapNode ? snapNode.position.x : (wireBranch ? wireBranch.point.x : pt.x);
            const targetY = snapNode ? snapNode.position.y : (wireBranch ? wireBranch.point.y : pt.y);

            // Draw dynamic multi-segment preview path
            const previewPathStr = get_path_from_points([...active_connect.waypoints, { x: targetX, y: targetY }]);
            const activeWire = active_connect.path || active_connect.line;
            if (activeWire) activeWire.setAttribute("d", previewPathStr);

            if (snapNode) {
                active_connect.target_node = snapNode;
                active_connect.branchTarget = null;
                if (snapIndicator) {
                    snapIndicator.setAttribute("cx", snapNode.position.x);
                    snapIndicator.setAttribute("cy", snapNode.position.y);
                    snapIndicator.classList.remove("hidden");
                }
            } else if (wireBranch) {
                active_connect.target_node = null;
                active_connect.branchTarget = wireBranch;
                if (snapIndicator) {
                    snapIndicator.setAttribute("cx", wireBranch.point.x);
                    snapIndicator.setAttribute("cy", wireBranch.point.y);
                    snapIndicator.classList.remove("hidden");
                }
            } else {
                active_connect.target_node = null;
                active_connect.branchTarget = null;
                if (snapIndicator) snapIndicator.classList.add("hidden");
            }
        }

        if (circuit_moving) {
            pan_offset_x -= (clientX - canvas_initial_pos.x) / zoom_level;
            pan_offset_y -= (clientY - canvas_initial_pos.y) / zoom_level;
            canvas_initial_pos.x = clientX; canvas_initial_pos.y = clientY;
            update_viewbox();
        }
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("touchmove", handleGlobalMove, { passive: true });

    const handleGlobalUp = (e) => {
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        if (circuitMap) circuitMap.classList.remove("drag-over");

        if (is_dragging_from_sidebar && dragged_tool_name) {
            if (circuitMap) {
                const rect = circuitMap.getBoundingClientRect();
                if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                    const svg = document.getElementById("circuit");
                    const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
                    const ctm = svg.getScreenCTM();
                    const svgPt = ctm ? pt.matrixTransform(ctm.inverse()) : pt;
                    create_component_on_canvas(dragged_tool_name, snap_to_grid(svgPt.x - 50), snap_to_grid(svgPt.y - 50));
                }
            }
            clear_active_tool();
        }

        if (active_drag) {
            const g = document.getElementById(active_drag.component_id);
            if (g) g.classList.remove("component-dragging");
            active_drag = null;
        }
        pending_drag = null;

        if (circuit_moving) circuit_moving = false;
    };

    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchend", handleGlobalUp, { passive: true });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (active_connect) finish_active_connection(null);
            clear_active_tool(); deselect_component(); deselect_connection();
        }
        if (e.key === "Delete" || e.key === "Backspace") {
            if (document.activeElement && ["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
            if (selected_component_id) {
                e.preventDefault(); delete_component(selected_component_id);
            } else if (selected_connection_id) {
                e.preventDefault(); delete_connection(selected_connection_id);
            }
        }
        if ((e.key === "r" || e.key === "R") && selected_component_id) {
            if (document.activeElement && ["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
            e.preventDefault(); rotate_selected_component();
        }
    });

    circuit.addEventListener("mousedown", (e) => {
        if (e.cancelable) e.preventDefault();
        const pt = mouse_to_svg(e);
        mouse_x = pt.x; mouse_y = pt.y;

        // If currently in active wiring: Click-to-Corner Waypoint Feature!
        if (active_connect) {
            if (active_connect.target_node || active_connect.branchTarget) {
                // Clicked on a destination terminal or wire: finalize!
                finish_active_connection();
            } else {
                // Clicked on empty space: Add a 90° corner waypoint!
                const lastPt = active_connect.waypoints[active_connect.waypoints.length - 1];
                const cornerPt = { x: snap_to_grid(pt.x), y: snap_to_grid(pt.y) };

                // Ensure orthogonal alignment with previous point
                const dx = Math.abs(cornerPt.x - lastPt.x);
                const dy = Math.abs(cornerPt.y - lastPt.y);
                if (dx >= dy) {
                    active_connect.waypoints.push({ x: cornerPt.x, y: lastPt.y });
                } else {
                    active_connect.waypoints.push({ x: lastPt.x, y: cornerPt.y });
                }
                active_connect.waypoints.push(cornerPt);
            }
            e.stopPropagation();
            return;
        }

        if (selected_component_tool || dragged_tool_name) {
            const name = dragged_tool_name || (selected_component_tool ? selected_component_tool.getAttribute("alt") : null);
            if (name) create_component_on_canvas(name, snap_to_grid(mouse_x - 50), snap_to_grid(mouse_y - 50));
            clear_active_tool(); return;
        }

        if (e.target.getAttribute("id") === "circuit") {
            deselect_component();
            deselect_connection();
            canvas_initial_pos.x = e.clientX; canvas_initial_pos.y = e.clientY;
            if (app_mode === "pan" || e.button === 2 || e.button === 1) circuit_moving = true;
        }
    });
}
