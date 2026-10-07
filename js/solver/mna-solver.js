/**
 * Modified Nodal Analysis (MNA) Circuit Simulation Engine
 * Handles DC, AC (Phasor), and Transient (RC/RL Step Response)
 */
import { Complex } from '../models/complex-number.js';
import { solveReal, solveComplex } from './complex-matrix.js';
import { buildNetlist } from './netlist-builder.js';
import { diagnoseCircuit } from './diagnostics.js';

export class CircuitSolver {
    /**
     * Solves circuit on canvas
     * @returns {Object} Simulation results including node voltages, branch currents, powers, meters, and diagnostics
     */
    static solve(component_list, node_list, connection_list) {
        const netlist = buildNetlist(component_list, node_list, connection_list);
        const diagnostics = diagnoseCircuit(netlist, component_list, connection_list);

        if (diagnostics.status === 'error' || netlist.elements.length === 0) {
            return {
                success: false,
                diagnostics,
                netlist,
                nodeVoltages: {},
                elementResults: {},
                meterReadings: {}
            };
        }

        try {
            if (netlist.isAC) {
                return this.solveAC(netlist, diagnostics);
            } else {
                return this.solveDC(netlist, diagnostics);
            }
        } catch (err) {
            console.error('MNA solver error:', err);
            diagnostics.status = 'error';
            diagnostics.issues.push({
                level: 'error',
                message: `การจำลองขัดข้อง: ${err.message || 'โครงข่ายวงจรไม่สามารถแก้สมการได้ (อาจมีลัดวงจรหรือโหนดลอย)'}`
            });
            return {
                success: false,
                diagnostics,
                netlist,
                nodeVoltages: {},
                elementResults: {},
                meterReadings: {}
            };
        }
    }

    /**
     * Solves DC MNA System
     */
    static solveDC(netlist, diagnostics) {
        const { netCount, elements } = netlist;
        // Non-ground nodes: 1 to (netCount - 1)
        const numNodes = Math.max(0, netCount - 1);

        // Independent voltage sources
        const vSources = elements.filter(e => e.type === 'VDC');
        const numVs = vSources.length;
        const totalSize = numNodes + numVs;

        if (totalSize === 0) {
            return { success: true, diagnostics, netlist, nodeVoltages: { 0: 0 }, elementResults: {}, meterReadings: {} };
        }

        // Allocate matrix A and vector b
        const A = Array.from({ length: totalSize }, () => new Array(totalSize).fill(0));
        const b = new Array(totalSize).fill(0);

        // Helper to get index for node (net 0 is ground, net k is index k-1)
        const nodeIdx = (net) => (net === 0 ? -1 : net - 1);

        // 1. Stamp Passive Conductances into G block
        for (const elem of elements) {
            let g = 0;
            if (elem.type === 'R' || elem.type === 'SW' || elem.type === 'VM' || elem.type === 'AM') {
                const r = Math.max(1e-6, elem.value || 100);
                g = 1 / r;
            } else if (elem.type === 'L') {
                // DC steady state: inductor acts as short circuit (tiny resistance)
                g = 1 / 1e-5;
            } else if (elem.type === 'C') {
                // DC steady state: capacitor acts as open circuit (tiny leakage conductance)
                g = 1e-12;
            } else {
                continue;
            }

            const i = nodeIdx(elem.n1);
            const j = nodeIdx(elem.n2);

            if (i >= 0) A[i][i] += g;
            if (j >= 0) A[j][j] += g;
            if (i >= 0 && j >= 0) {
                A[i][j] -= g;
                A[j][i] -= g;
            }
        }

        // 2. Stamp Voltage Sources into B and B^T blocks
        for (let s = 0; s < numVs; s++) {
            const vSrc = vSources[s];
            const vRow = numNodes + s;
            const i = nodeIdx(vSrc.n1); // positive terminal
            const j = nodeIdx(vSrc.n2); // negative terminal

            if (i >= 0) {
                A[i][vRow] += 1;
                A[vRow][i] += 1;
            }
            if (j >= 0) {
                A[j][vRow] -= 1;
                A[vRow][j] -= 1;
            }
            b[vRow] = vSrc.value;
        }

        // Solve A * x = b
        const x = solveReal(A, b);

        // Extract Node Voltages
        const nodeVoltages = { 0: 0 };
        for (let k = 1; k < netCount; k++) {
            nodeVoltages[k] = x[k - 1];
        }

        // Extract Element Currents and Powers
        const elementResults = {};
        const meterReadings = {};

        for (let s = 0; s < numVs; s++) {
            const vSrc = vSources[s];
            const iSrc = -x[numNodes + s]; // current leaving positive terminal
            const vDrop = vSrc.value;
            elementResults[vSrc.id] = {
                voltage: vDrop,
                current: iSrc,
                power: Math.abs(vDrop * iSrc)
            };
        }

        for (const elem of elements) {
            if (elem.type === 'VDC') continue;
            const v1 = nodeVoltages[elem.n1] ?? 0;
            const v2 = nodeVoltages[elem.n2] ?? 0;
            const vDrop = v1 - v2;

            let current = 0;
            if (elem.type === 'R' || elem.type === 'SW' || elem.type === 'VM' || elem.type === 'AM') {
                const r = Math.max(1e-6, elem.value);
                current = vDrop / r;
            } else if (elem.type === 'L') {
                current = vDrop / 1e-5;
            } else if (elem.type === 'C') {
                current = 0;
            }

            const power = Math.abs(vDrop * current);
            elementResults[elem.id] = {
                voltage: vDrop,
                current: current,
                power: power
            };

            if (elem.type === 'VM') {
                meterReadings[elem.id] = { type: 'voltmeter', value: vDrop, unit: 'V' };
            } else if (elem.type === 'AM') {
                meterReadings[elem.id] = { type: 'ammeter', value: current, unit: 'A' };
            }
        }

        return {
            success: true,
            isAC: false,
            diagnostics,
            netlist,
            nodeVoltages,
            elementResults,
            meterReadings
        };
    }

    /**
     * Solves AC Phasor MNA System at fundamental source frequency
     */
    static solveAC(netlist, diagnostics) {
        const { netCount, elements } = netlist;
        const numNodes = Math.max(0, netCount - 1);

        const acSources = elements.filter(e => e.type === 'VAC');
        const numVs = acSources.length;
        const totalSize = numNodes + numVs;

        // Fundamental frequency f
        const f = acSources.length > 0 ? (acSources[0].freq || 50) : 50;
        const omega = 2 * Math.PI * f;

        const A = Array.from({ length: totalSize }, () =>
            Array.from({ length: totalSize }, () => new Complex(0, 0))
        );
        const b = Array.from({ length: totalSize }, () => new Complex(0, 0));

        const nodeIdx = (net) => (net === 0 ? -1 : net - 1);

        // 1. Stamp Complex Admittances Y
        for (const elem of elements) {
            let Y = new Complex(0, 0);

            if (elem.type === 'R' || elem.type === 'SW' || elem.type === 'VM' || elem.type === 'AM') {
                const r = Math.max(1e-6, elem.value || 100);
                Y = new Complex(1 / r, 0);
            } else if (elem.type === 'L') {
                const xl = omega * Math.max(1e-9, elem.value);
                // Y_L = 1 / (j * xl) = -j / xl
                Y = new Complex(0, -1 / xl);
            } else if (elem.type === 'C') {
                const xc = 1 / (omega * Math.max(1e-12, elem.value));
                // Y_C = j * omega * C = j / xc
                Y = new Complex(0, 1 / xc);
            } else {
                continue;
            }

            const i = nodeIdx(elem.n1);
            const j = nodeIdx(elem.n2);

            if (i >= 0) A[i][i] = A[i][i].add(Y);
            if (j >= 0) A[j][j] = A[j][j].add(Y);
            if (i >= 0 && j >= 0) {
                A[i][j] = A[i][j].sub(Y);
                A[j][i] = A[j][i].sub(Y);
            }
        }

        // 2. Stamp AC Voltage Sources
        for (let s = 0; s < numVs; s++) {
            const vSrc = acSources[s];
            const vRow = numNodes + s;
            const i = nodeIdx(vSrc.n1);
            const j = nodeIdx(vSrc.n2);

            if (i >= 0) {
                A[i][vRow] = A[i][vRow].add(new Complex(1, 0));
                A[vRow][i] = A[vRow][i].add(new Complex(1, 0));
            }
            if (j >= 0) {
                A[j][vRow] = A[j][vRow].sub(new Complex(1, 0));
                A[vRow][j] = A[vRow][j].sub(new Complex(1, 0));
            }
            b[vRow] = new Complex(vSrc.value, 0); // rms phasor at angle 0°
        }

        const x = solveComplex(A, b);

        // Node complex voltages
        const nodeVoltages = { 0: new Complex(0, 0) };
        for (let k = 1; k < netCount; k++) {
            nodeVoltages[k] = x[k - 1];
        }

        const elementResults = {};
        const meterReadings = {};

        for (let s = 0; s < numVs; s++) {
            const vSrc = acSources[s];
            const iPhasor = x[numNodes + s].mul(new Complex(-1, 0));
            const vPhasor = new Complex(vSrc.value, 0);
            elementResults[vSrc.id] = {
                voltage: vPhasor.mag(),
                voltagePhasor: vPhasor,
                current: iPhasor.mag(),
                currentPhasor: iPhasor,
                power: vPhasor.mag() * iPhasor.mag() * Math.cos(vPhasor.phase() - iPhasor.phase())
            };
        }

        for (const elem of elements) {
            if (elem.type === 'VAC') continue;
            const v1 = nodeVoltages[elem.n1] ?? new Complex(0, 0);
            const v2 = nodeVoltages[elem.n2] ?? new Complex(0, 0);
            const vDrop = v1.sub(v2);

            let Y = new Complex(0, 0);
            if (elem.type === 'R' || elem.type === 'SW' || elem.type === 'VM' || elem.type === 'AM') {
                Y = new Complex(1 / Math.max(1e-6, elem.value), 0);
            } else if (elem.type === 'L') {
                const xl = omega * elem.value;
                Y = new Complex(0, -1 / xl);
            } else if (elem.type === 'C') {
                const xc = 1 / (omega * elem.value);
                Y = new Complex(0, 1 / xc);
            }

            const iPhasor = vDrop.mul(Y);
            const pReal = vDrop.mag() * iPhasor.mag() * Math.cos(vDrop.phase() - iPhasor.phase());

            elementResults[elem.id] = {
                voltage: vDrop.mag(),
                voltagePhasor: vDrop,
                current: iPhasor.mag(),
                currentPhasor: iPhasor,
                power: Math.max(0, pReal)
            };

            if (elem.type === 'VM') {
                meterReadings[elem.id] = { type: 'voltmeter', value: vDrop.mag(), unit: 'V' };
            } else if (elem.type === 'AM') {
                meterReadings[elem.id] = { type: 'ammeter', value: iPhasor.mag(), unit: 'A' };
            }
        }

        return {
            success: true,
            isAC: true,
            frequency: f,
            diagnostics,
            netlist,
            nodeVoltages,
            elementResults,
            meterReadings
        };
    }

    /**
     * Transient Step Response (RC / RL Charge and Discharge)
     * Useful for oscilloscope graphs and teaching time constants tau = RC or L/R
     */
    static solveTransient(netlist, totalTime = 0.05, numSteps = 100) {
        const dt = totalTime / numSteps;
        const timePoints = [];
        const trace = { time: [], vc: [], vr: [], i: [] };

        const cElem = netlist.elements.find(e => e.type === 'C');
        const rElem = netlist.elements.find(e => e.type === 'R');
        const vElem = netlist.elements.find(e => e.type === 'VDC');

        if (!cElem && !netlist.elements.find(e => e.type === 'L')) {
            return null; // Not an energy storage circuit
        }

        const V0 = vElem ? vElem.value : 12;
        const R = rElem ? rElem.value : 100;
        const C = cElem ? cElem.value : 100e-6;
        const tau = R * C;

        for (let step = 0; step <= numSteps; step++) {
            const t = step * dt;
            // Analytical step response for RC: Vc(t) = V0 * (1 - e^(-t/tau))
            const vc = V0 * (1 - Math.exp(-t / tau));
            const vr = V0 * Math.exp(-t / tau);
            const i = (vr / R) * 1000; // in mA

            trace.time.push(t);
            trace.vc.push(vc);
            trace.vr.push(vr);
            trace.i.push(i);
        }

        return { tau, trace, totalTime };
    }
}
