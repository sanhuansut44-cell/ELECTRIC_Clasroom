/**
 * Component Specifications — ข้อกำหนดอุปกรณ์ทุกชนิด (แหล่งข้อมูลเดียวของ Editor)
 *
 * kind ที่ Solver รู้จัก:
 *   R   ตัวต้านทานค่าคงที่ (resistor, lamp, voltmeter, ammeter)
 *   SW  สวิตช์ (ปิด = ต้านทานต่ำมาก, เปิด = วงจรเปิด)
 *   L   ตัวเหนี่ยวนำ        C   ตัวเก็บประจุ
 *   VDC แหล่งจ่าย DC         VAC แหล่งจ่าย AC (ค่า rms)
 *   GND จุดอ้างอิง 0 V
 */
import { formatSI } from '../utils/si-units.js';

export const COMPONENT_SPECS = {
    resistor_iec: {
        thai: 'ตัวต้านทาน (IEC)', prefix: 'R', kind: 'R', symbol: 'R',
        props: [
            { key: 'resistance', label: 'ความต้านทาน (R)', unit: 'Ω', min: 1, max: 1e6, scale: 'log', default: 100 },
            { key: 'powerRating', label: 'กำลังที่ทนได้', unit: 'W', min: 0.125, max: 25, scale: 'log', default: 0.25 }
        ]
    },
    resistor_us: {
        thai: 'ตัวต้านทาน (US)', prefix: 'R', kind: 'R', symbol: 'R',
        props: [
            { key: 'resistance', label: 'ความต้านทาน (R)', unit: 'Ω', min: 1, max: 1e6, scale: 'log', default: 100 },
            { key: 'powerRating', label: 'กำลังที่ทนได้', unit: 'W', min: 0.125, max: 25, scale: 'log', default: 0.25 }
        ]
    },
    battery: {
        thai: 'แบตเตอรี่ (แหล่งจ่าย DC)', prefix: 'E', kind: 'VDC', symbol: 'E',
        props: [
            { key: 'voltage', label: 'แรงดัน (E)', unit: 'V', min: 0, max: 48, scale: 'lin', default: 12 }
        ]
    },
    ac_power: {
        thai: 'แหล่งจ่าย AC', prefix: 'AC', kind: 'VAC', symbol: 'AC',
        props: [
            { key: 'voltage', label: 'แรงดัน (rms)', unit: 'V', min: 1, max: 250, scale: 'lin', default: 12 },
            { key: 'frequency', label: 'ความถี่ (f)', unit: 'Hz', min: 1, max: 10000, scale: 'log', default: 50 }
        ]
    },
    switch: {
        thai: 'สวิตช์', prefix: 'SW', kind: 'SW', symbol: 'SW',
        props: []
    },
    lamp: {
        thai: 'หลอดไฟ', prefix: 'LP', kind: 'R', symbol: 'LP',
        props: [
            { key: 'ratedVoltage', label: 'แรงดันพิกัด', unit: 'V', min: 1, max: 250, scale: 'log', default: 12 },
            { key: 'ratedPower', label: 'กำลังพิกัด', unit: 'W', min: 0.1, max: 100, scale: 'log', default: 6 }
        ]
    },
    inductor: {
        thai: 'ตัวเหนี่ยวนำ (ขดลวด)', prefix: 'L', kind: 'L', symbol: 'L',
        props: [
            { key: 'inductance', label: 'ค่าเหนี่ยวนำ (L)', unit: 'H', min: 1e-6, max: 10, scale: 'log', default: 0.1 }
        ]
    },
    capacitor: {
        thai: 'ตัวเก็บประจุ', prefix: 'C', kind: 'C', symbol: 'C',
        props: [
            { key: 'capacitance', label: 'ความจุ (C)', unit: 'F', min: 1e-9, max: 1e-2, scale: 'log', default: 100e-6 }
        ]
    },
    voltmeter: {
        thai: 'โวลต์มิเตอร์', prefix: 'VM', kind: 'R', symbol: 'V', meter: 'voltmeter',
        props: []
    },
    ammeter: {
        thai: 'แอมมิเตอร์', prefix: 'AM', kind: 'R', symbol: 'A', meter: 'ammeter',
        props: []
    },
    junction: {
        thai: 'จุดรวมสาย (Junction)', prefix: 'J', kind: 'J', symbol: '•',
        props: []
    },
    ground: { thai: 'กราวด์ (0 V)', prefix: 'GND', kind: 'GND', symbol: 'GND', props: [] },
    earth: { thai: 'ดิน (Earth)', prefix: 'PE', kind: 'GND', symbol: 'PE', props: [] }
};

export function spec_of(type) {
    return COMPONENT_SPECS[type] || null;
}

/** ค่าเริ่มต้นของคุณสมบัติ (ไม่รวม label) */
export function default_props(type) {
    const spec = COMPONENT_SPECS[type];
    const props = {};
    if (!spec) return props;
    for (const p of spec.props) props[p.key] = p.default;
    if (spec.kind === 'SW') props.state = 'closed';
    return props;
}

/** ตั้งชื่ออัตโนมัติ R1, R2, ... โดยเลือกเลขที่ยังว่างน้อยที่สุด */
export function next_label(prefix, components) {
    if (prefix === 'GND' || prefix === 'PE') return prefix;
    const used = new Set(components.map(c => c.properties && c.properties.label));
    let n = 1;
    while (used.has(prefix + n)) n++;
    return prefix + n;
}

/** ข้อความค่าหลักของอุปกรณ์ที่แสดงบนผืนงาน เช่น "100 Ω", "12 V" */
export function component_value_text(comp) {
    const p = comp.properties || {};
    switch (comp.name) {
        case 'resistor_iec':
        case 'resistor_us': return formatSI(p.resistance, 'Ω');
        case 'battery': return formatSI(p.voltage, 'V');
        case 'ac_power': return `${formatSI(p.voltage, 'V')} ${formatSI(p.frequency, 'Hz')}`;
        case 'lamp': return `${formatSI(p.ratedVoltage, 'V')}/${formatSI(p.ratedPower, 'W')}`;
        case 'inductor': return formatSI(p.inductance, 'H');
        case 'capacitor': return formatSI(p.capacitance, 'F');
        case 'switch': return p.state === 'open' ? '(เปิด)' : '(ปิด)';
        default: return '';
    }
}

/** ความต้านทานไส้หลอด R = V²/P */
export function lamp_resistance(props) {
    const v = props.ratedVoltage || 12, w = props.ratedPower || 6;
    return (v * v) / w;
}
