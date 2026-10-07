/**
 * Property Inspector Panel
 * Displays and edits properties of the selected component with SI unit support and live simulation update
 */
import { spec_of, component_value_text } from '../models/component-specs.js';
import { formatSI, parseSI } from '../utils/si-units.js';

let inspectorContainer = null;
let currentSelectedComp = null;
let onUpdateCallback = null;
let onDeleteCallback = null;
let onRotateCallback = null;
let onDuplicateCallback = null;

export function initInspector({ onUpdate, onDelete, onRotate, onDuplicate }) {
    onUpdateCallback = onUpdate;
    onDeleteCallback = onDelete;
    onRotateCallback = onRotate;
    onDuplicateCallback = onDuplicate;

    // Check if inspector element already exists or create it
    let el = document.getElementById('property-inspector');
    if (!el) {
        el = document.createElement('div');
        el.id = 'property-inspector';
        el.className = 'absolute top-2 right-2 left-2 sm:left-auto sm:right-3 sm:top-3 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-indigo-200 w-auto sm:w-72 max-w-[calc(100vw-16px)] overflow-hidden z-40 transition-all duration-200 hidden font-sans';
        const mapContainer = document.getElementById('circuit-map');
        if (mapContainer) mapContainer.appendChild(el);
    }
    inspectorContainer = el;
}

export function showInspector(comp, simResult = null) {
    if (!inspectorContainer) return;
    currentSelectedComp = comp;
    if (!comp) {
        hideInspector();
        return;
    }

    const spec = spec_of(comp.name);
    const p = comp.properties || {};
    const elemRes = simResult?.elementResults?.[comp.id];

    let propsHtml = '';
    if (spec && spec.props && spec.props.length > 0) {
        propsHtml = spec.props.map(propSpec => {
            const currentVal = p[propSpec.key] ?? propSpec.default;
            const displayVal = formatSI(currentVal, propSpec.unit);
            return `
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                        <label class="font-medium text-gray-700">${propSpec.label}</label>
                        <span class="font-mono text-indigo-600 font-bold text-[11px]">${displayVal}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <input type="text" 
                               data-prop-key="${propSpec.key}"
                               data-prop-unit="${propSpec.unit}"
                               value="${currentVal}" 
                               class="inspector-input w-full px-2.5 py-1 text-xs border border-gray-300 rounded font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                               placeholder="เช่น 100, 4.7k, 100u">
                    </div>
                </div>
            `;
        }).join('');
    } else if (comp.name === 'switch') {
        const isOpen = p.state === 'open';
        propsHtml = `
            <div class="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                <span class="text-xs font-medium text-gray-700">สถานะสวิตช์:</span>
                <button id="inspector-btn-toggle-switch" class="px-3 py-1 rounded text-xs font-bold ${isOpen ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}">
                    ${isOpen ? '⚡ เปิด (Open)' : '🔌 ปิด (Closed)'}
                </button>
            </div>
        `;
    }

    // Results Box (if simulated)
    let resultsHtml = '';
    if (elemRes) {
        resultsHtml = `
            <div class="mt-2.5 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-1 text-xs font-mono">
                <div class="text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1">ผลการวัดจริง (Simulated)</div>
                <div class="flex justify-between text-gray-700">
                    <span>แรงดันตกคร่อม (V):</span>
                    <span class="font-bold text-indigo-700">${formatSI(elemRes.voltage, 'V')}</span>
                </div>
                <div class="flex justify-between text-gray-700">
                    <span>กระแสไหลผ่าน (I):</span>
                    <span class="font-bold text-blue-700">${formatSI(elemRes.current, 'A')}</span>
                </div>
                <div class="flex justify-between text-gray-700">
                    <span>กำลังไฟฟ้า (P):</span>
                    <span class="font-bold text-emerald-700">${formatSI(elemRes.power, 'W')}</span>
                </div>
            </div>
        `;
    }

    inspectorContainer.innerHTML = `
        <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 px-3.5 py-2.5 text-white flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold">${spec ? spec.thai : comp.name}</span>
                <span class="bg-indigo-800/80 px-2 py-0.5 rounded text-[11px] font-mono font-bold">${p.label || comp.name}</span>
            </div>
            <button id="inspector-btn-close" class="text-white/80 hover:text-white text-base leading-none">✕</button>
        </div>

        <div class="p-3 space-y-3 max-h-[420px] overflow-y-auto">
            <!-- Label rename -->
            <div class="space-y-1">
                <label class="block text-xs font-medium text-gray-700">ชื่ออุปกรณ์ (Label)</label>
                <input type="text" id="inspector-input-label" value="${p.label || ''}" 
                       class="w-full px-2.5 py-1 text-xs border border-gray-300 rounded font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                       placeholder="เช่น R1, E1">
            </div>

            ${propsHtml}
            ${resultsHtml}

            <!-- Action buttons -->
            <div class="pt-2 border-t border-gray-200 flex items-center justify-between gap-1 text-xs">
                <button id="inspector-btn-rotate" title="หมุน 90° (R)" class="flex-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold flex items-center justify-center gap-1">
                    <span>↻</span><span>หมุน 90°</span>
                </button>
                <button id="inspector-btn-dup" title="ทำสำเนา" class="flex-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold flex items-center justify-center gap-1">
                    <span>⎘</span><span>สำเนา</span>
                </button>
                <button id="inspector-btn-del" title="ลบอุปกรณ์ (Delete)" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold">
                    <span>🗑</span>
                </button>
            </div>
        </div>
    `;

    inspectorContainer.classList.remove('hidden');

    // Attach event listeners
    const closeBtn = inspectorContainer.querySelector('#inspector-btn-close');
    if (closeBtn) closeBtn.onclick = hideInspector;

    const labelInput = inspectorContainer.querySelector('#inspector-input-label');
    if (labelInput) {
        labelInput.onchange = (e) => {
            comp.properties.label = e.target.value.trim() || comp.properties.label;
            if (onUpdateCallback) onUpdateCallback(comp);
        };
    }

    const propInputs = inspectorContainer.querySelectorAll('.inspector-input');
    propInputs.forEach(input => {
        input.onchange = (e) => {
            const key = input.getAttribute('data-prop-key');
            const parsed = parseSI(e.target.value);
            if (!isNaN(parsed)) {
                comp.properties[key] = parsed;
                if (onUpdateCallback) onUpdateCallback(comp);
                showInspector(comp, simResult); // re-render display value
            } else {
                input.value = comp.properties[key];
            }
        };
    });

    const toggleSwitchBtn = inspectorContainer.querySelector('#inspector-btn-toggle-switch');
    if (toggleSwitchBtn) {
        toggleSwitchBtn.onclick = () => {
            comp.properties.state = comp.properties.state === 'open' ? 'closed' : 'open';
            if (onUpdateCallback) onUpdateCallback(comp);
            showInspector(comp, simResult);
        };
    }

    const rotBtn = inspectorContainer.querySelector('#inspector-btn-rotate');
    if (rotBtn) rotBtn.onclick = () => { if (onRotateCallback) onRotateCallback(comp); };

    const dupBtn = inspectorContainer.querySelector('#inspector-btn-dup');
    if (dupBtn) dupBtn.onclick = () => { if (onDuplicateCallback) onDuplicateCallback(comp); };

    const delBtn = inspectorContainer.querySelector('#inspector-btn-del');
    if (delBtn) delBtn.onclick = () => {
        if (onDeleteCallback) onDeleteCallback(comp);
        hideInspector();
    };
}

export function hideInspector() {
    if (inspectorContainer) inspectorContainer.classList.add('hidden');
    currentSelectedComp = null;
}
