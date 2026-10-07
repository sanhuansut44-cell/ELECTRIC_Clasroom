/**
 * SI Unit Helpers — จัดรูปแบบและแปลงค่าที่มีคำนำหน้าหน่วย (k, M, m, µ, n, p)
 *
 * หมายเหตุสัญลักษณ์ (ตามแนวปฏิบัติของวงการอิเล็กทรอนิกส์ไทย):
 *   "M" = เมกะ (10^6)    "m" = มิลลิ (10^-3)    "u" หรือ "µ" = ไมโคร (10^-6)
 */

const PREFIXES = [
    [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'],
    [1, ''],
    [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']
];

const PARSE_PREFIX = {
    Meg: 1e6, meg: 1e6, MEG: 1e6,
    T: 1e12, G: 1e9, M: 1e6, k: 1e3, K: 1e3,
    m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12
};

/**
 * จัดรูปแบบตัวเลขพร้อมคำนำหน้าหน่วย เช่น 0.04 → "40 mA", 4700 → "4.7 kΩ"
 */
export function formatSI(value, unit = '', digits = 3) {
    if (value === null || value === undefined || Number.isNaN(value)) return `– ${unit}`.trim();
    if (!Number.isFinite(value)) return `∞ ${unit}`.trim();
    if (Math.abs(value) < 1e-15) return `0 ${unit}`.trim();

    const abs = Math.abs(value);
    let chosen = PREFIXES[PREFIXES.length - 1];
    for (const cand of PREFIXES) {
        if (abs >= cand[0] * 0.9995) { chosen = cand; break; }
    }
    const scaled = value / chosen[0];
    const text = Number(scaled.toPrecision(digits)).toString();
    return `${text} ${chosen[1]}${unit}`.trim();
}

/**
 * แปลงข้อความเป็นตัวเลข รองรับ "4.7k", "100u", "2.2mH", "10Meg", "1e3", "47 kΩ"
 * คืนค่า NaN ถ้าอ่านไม่ได้
 */
export function parseSI(input) {
    if (typeof input === 'number') return input;
    if (input === null || input === undefined) return NaN;

    let s = String(input).trim().replace(/\s+/g, '').replace(/[µμ]/g, 'u').replace(',', '.');
    s = s.replace(/(ohms?|Ohms?|Ω|Hz|V|A|H|F|W)$/, '');

    const m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(Meg|meg|MEG|T|G|M|k|K|m|u|n|p)?$/);
    if (!m) return NaN;
    const base = parseFloat(m[1]);
    const mult = m[2] ? PARSE_PREFIX[m[2]] : 1;
    return base * mult;
}

/** จำกัดค่าให้อยู่ในช่วง */
export function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
}
