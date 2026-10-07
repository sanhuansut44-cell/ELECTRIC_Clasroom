/**
 * Circuit Data Models & SVG Symbol Generators
 */
export class Coordinate {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}

export class Dimension {
    constructor(width = 0, height = 0) {
        this.width = width;
        this.height = height;
    }
}

export class ConnectionNode {
    constructor(node_id, base_component_id, direction = 'output') {
        this.node_id = node_id;
        this.base_component_id = base_component_id;
        this.direction = direction;
    }
}

export class Node {
    constructor(id, position, base_component_id) {
        this.id = id;
        this.position = position;
        this.base_component_id = base_component_id;
    }
}

export class Component {
    constructor(name, base_point, dimension, counters = { component_counter: 0, node_counter: 0 }) {
        this.id = 'comp_' + (++counters.component_counter);
        this.name = name;
        this.base_point = base_point;
        this.dimension = dimension;
        this.rotation = 0;
        this.nodes = [];
        this.properties = {};
    }
}

export class Connection {
    constructor(node_1_id, component_1_id, node_2_id, component_2_id, counter = 0) {
        this.id = 'conn_' + counter;
        this.node_1_id = node_1_id;
        this.component_1_id = component_1_id;
        this.node_2_id = node_2_id;
        this.component_2_id = component_2_id;
        this.connector_colour = '#1e293b';
        this.altRoute = false;
    }
}

const PIN_L = `<circle cx="3" cy="50" r="4" class="node" data-node-index="0"/>`;
const PIN_R = `<circle cx="97" cy="50" r="4" class="node" data-node-index="1"/>`;
const PINS = PIN_L + PIN_R;

/**
 * สัญลักษณ์อุปกรณ์ (viewBox 100×100, ขาซ้ายที่ (3,50) ขาขวาที่ (97,50))
 * props ใช้กำหนดสถานะภาพ เช่น สวิตช์เปิด/ปิด
 */
export function get_component_svg_data(name, props = {}) {
    const svgs = {
        'resistor_iec': `<line x1="3" y1="50" x2="25" y2="50" stroke="#1e293b" stroke-width="3"/><rect x="25" y="36" width="50" height="28" fill="#ffffff" stroke="#1e293b" stroke-width="3.5" rx="2"/><line x1="75" y1="50" x2="97" y2="50" stroke="#1e293b" stroke-width="3"/>${PINS}`,
        'resistor_us': `<polyline points="3,50 25,50 30,35 40,65 50,35 60,65 70,35 75,50 97,50" fill="none" stroke="#1e293b" stroke-width="3.5"/>${PINS}`,
        'ground': `<line x1="50" y1="3" x2="50" y2="50" stroke="#1e293b" stroke-width="3"/><line x1="15" y1="50" x2="85" y2="50" stroke="#1e293b" stroke-width="4"/><line x1="25" y1="62" x2="75" y2="62" stroke="#1e293b" stroke-width="3"/><line x1="35" y1="74" x2="65" y2="74" stroke="#1e293b" stroke-width="2"/><circle cx="50" cy="3" r="4" class="node" data-node-index="0"/>`,
        'earth': `<line x1="50" y1="3" x2="50" y2="40" stroke="#1e293b" stroke-width="3"/><line x1="20" y1="40" x2="80" y2="40" stroke="#1e293b" stroke-width="3"/><line x1="30" y1="52" x2="70" y2="52" stroke="#1e293b" stroke-width="2.5"/><line x1="40" y1="64" x2="60" y2="64" stroke="#1e293b" stroke-width="2"/><circle cx="50" cy="50" r="34" fill="none" stroke="#1e293b" stroke-width="2.5"/><circle cx="50" cy="3" r="4" class="node" data-node-index="0"/>`,
        'battery': `<line x1="3" y1="50" x2="30" y2="50" stroke="#1e293b" stroke-width="3"/><line x1="30" y1="20" x2="30" y2="80" stroke="#ef4444" stroke-width="4.5"/><line x1="42" y1="35" x2="42" y2="65" stroke="#1e293b" stroke-width="3"/><line x1="55" y1="20" x2="55" y2="80" stroke="#1e293b" stroke-width="4.5"/><line x1="68" y1="35" x2="68" y2="65" stroke="#3b82f6" stroke-width="3"/><line x1="68" y1="50" x2="97" y2="50" stroke="#1e293b" stroke-width="3"/><text x="24" y="16" font-size="16" font-weight="bold" fill="#ef4444">+</text><text x="70" y="16" font-size="16" font-weight="bold" fill="#3b82f6">−</text>${PINS}`,
        'ac_power': `<line x1="3" y1="50" x2="20" y2="50" stroke="#1e293b" stroke-width="3"/><circle cx="50" cy="50" r="30" stroke="#1e293b" stroke-width="3.5" fill="#ffffff"/><path d="M 32,50 q 9,-18 18,0 t 18,0" stroke="#4f46e5" stroke-width="3.5" fill="none"/><line x1="80" y1="50" x2="97" y2="50" stroke="#1e293b" stroke-width="3"/>${PINS}`,
        'lamp': `<line x1="3" y1="50" x2="20" y2="50" stroke="#1e293b" stroke-width="3"/><circle class="lamp-bulb" cx="50" cy="50" r="30" fill="#ffffff" stroke="#1e293b" stroke-width="3.5"/><line x1="28" y1="28" x2="72" y2="72" stroke="#f59e0b" stroke-width="3.5"/><line x1="72" y1="28" x2="28" y2="72" stroke="#f59e0b" stroke-width="3.5"/><line x1="80" y1="50" x2="97" y2="50" stroke="#1e293b" stroke-width="3"/>${PINS}`,
        'inductor': `<line x1="3" y1="50" x2="20" y2="50" stroke="#1e293b" stroke-width="3"/><path d="M 20 50 A 7.5 11 0 0 1 35 50 A 7.5 11 0 0 1 50 50 A 7.5 11 0 0 1 65 50 A 7.5 11 0 0 1 80 50" fill="none" stroke="#2563eb" stroke-width="3.5"/><line x1="80" y1="50" x2="97" y2="50" stroke="#1e293b" stroke-width="3"/>${PINS}`,
        'capacitor': `<line x1="3" y1="50" x2="44" y2="50" stroke="#1e293b" stroke-width="3"/><line x1="44" y1="24" x2="44" y2="76" stroke="#059669" stroke-width="4.5"/><line x1="56" y1="24" x2="56" y2="76" stroke="#059669" stroke-width="4.5"/><line x1="56" y1="50" x2="97" y2="50" stroke="#1e293b" stroke-width="3"/>${PINS}`,
        'voltmeter': `<line x1="3" y1="50" x2="22" y2="50" stroke="#1e293b" stroke-width="3"/><circle cx="50" cy="50" r="28" fill="#eff6ff" stroke="#2563eb" stroke-width="3.5"/><text x="50" y="60" text-anchor="middle" font-size="30" font-weight="800" fill="#2563eb">V</text><line x1="78" y1="50" x2="97" y2="50" stroke="#1e293b" stroke-width="3"/><text x="8" y="40" font-size="14" font-weight="bold" fill="#ef4444">+</text><text x="86" y="40" font-size="14" font-weight="bold" fill="#3b82f6">−</text>${PINS}`,
        'ammeter': `<line x1="3" y1="50" x2="22" y2="50" stroke="#1e293b" stroke-width="3"/><circle cx="50" cy="50" r="28" fill="#fff7ed" stroke="#ea580c" stroke-width="3.5"/><text x="50" y="60" text-anchor="middle" font-size="30" font-weight="800" fill="#ea580c">A</text><line x1="78" y1="50" x2="97" y2="50" stroke="#1e293b" stroke-width="3"/><text x="8" y="40" font-size="14" font-weight="bold" fill="#ef4444">+</text><text x="86" y="40" font-size="14" font-weight="bold" fill="#3b82f6">−</text>${PINS}`,
        'junction': `<line x1="15" y1="50" x2="85" y2="50" stroke="#1e293b" stroke-width="3.5"/><line x1="50" y1="15" x2="50" y2="85" stroke="#1e293b" stroke-width="3.5"/><circle cx="50" cy="50" r="7" fill="#1e293b"/><circle cx="50" cy="50" r="4" class="node" data-node-index="0"/>`
    };

    if (name === 'switch') {
        const closed = props.state !== 'open';
        const bladeY = closed ? 50 : 22;
        return `<line x1="3" y1="50" x2="30" y2="50" stroke="#1e293b" stroke-width="3"/><circle cx="30" cy="50" r="4.5" fill="#1e293b"/><line class="switch-blade" x1="30" y1="50" x2="70" y2="${bladeY}" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/><circle cx="70" cy="50" r="4.5" fill="#1e293b"/><line x1="70" y1="50" x2="97" y2="50" stroke="#1e293b" stroke-width="3"/>${PINS}`;
    }

    return svgs[name] || svgs['resistor_iec'];
}
