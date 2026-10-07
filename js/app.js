/**
 * Application Entry Point (App Initializer & Global Window Bindings)
 */
import { initChart, exportChart, toggleTrace } from './visualizers/oscilloscope.js';
import { updateWiringPanel } from './visualizers/wiring-guide.js';
import {
    ST,
    switchMainView,
    setSourceMode,
    setCircuitMode,
    syncSlider,
    syncInput,
    syncXL,
    syncXC,
    calcSD,
    toggleAnim,
    animLoop,
    updateAll,
    enhanceNumberInputs
} from './controllers/presets-controller.js';

import {
    init_builder_canvas,
    clear_builder_canvas,
    rotate_selected_component,
    duplicate_selected_component,
    delete_selected_layer,
    select_layer_item,
    run_circuit_simulation,
    build_preset_topology,
    set_app_mode,
    set_component_layout,
    set_zoom,
    zoom_level,
    update_viewbox
} from './controllers/builder-controller.js';

import {
    toggleBuilderScope,
    setProbeSelectingMode,
    setTimeDiv,
    toggleChannel,
    toggleMath,
    clearProbes
} from './instruments/builder-scope.js';

// Bind to window for HTML inline event handlers
window.switchMainView = (v) => switchMainView(v, update_viewbox);
window.setSourceMode = setSourceMode;
window.setCircuitMode = setCircuitMode;
window.syncSlider = syncSlider;
window.syncInput = syncInput;
window.syncXL = syncXL;
window.syncXC = syncXC;
window.calcSD = calcSD;
window.toggleAnim = toggleAnim;
window.exportChart = exportChart;
window.toggleTrace = (key) => { toggleTrace(key); updateAll(); };

window.clear_builder_canvas = clear_builder_canvas;
window.rotate_selected_component = rotate_selected_component;
window.duplicate_selected_component = duplicate_selected_component;
window.delete_selected_layer = delete_selected_layer;
window.select_layer_item = select_layer_item;
window.run_circuit_simulation = run_circuit_simulation;
window.build_preset_topology = build_preset_topology;
window.set_app_mode = set_app_mode;
window.set_component_layout = set_component_layout;
window.set_zoom = set_zoom;
window.toggleBuilderScope = toggleBuilderScope;
window.setProbeSelectingMode = setProbeSelectingMode;
window.setTimeDiv = setTimeDiv;
window.toggleChannel = toggleChannel;
window.toggleMath = toggleMath;
window.clearProbes = clearProbes;
Object.defineProperty(window, 'zoom_level', {
    get: () => zoom_level
});

// Global Initialization
window.addEventListener('DOMContentLoaded', () => {
    try { initChart(); } catch (e) { console.error('initChart error:', e); }
    try { init_builder_canvas(); } catch (e) { console.error('init_builder_canvas error:', e); }
    try { calcSD('delta'); } catch (e) {}
    try { setSourceMode('dc'); } catch (e) {}
    try { enhanceNumberInputs(); } catch (e) {}
    try { animLoop(); } catch (e) {}
    try { updateWiringPanel(ST); } catch (e) {}
});
