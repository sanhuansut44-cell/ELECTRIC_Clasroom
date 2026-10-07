/**
 * Circuit Electrical Equations Engine (CE)
 */
import { Complex } from './complex-number.js';

export const CE = {
    voltage: (I, R) => I * R,
    current: (V, R) => R !== 0 ? V / R : 0,
    resistance: (V, I) => I !== 0 ? V / I : Infinity,
    power_VI: (V, I) => V * I,
    power_I2R: (I, R) => I * I * R,
    power_V2R: (V, R) => R > 0 ? (V * V) / R : 0,
    seriesR: (rs) => rs.reduce((s, r) => s + r, 0),
    parallelR: (rs) => { const s = rs.reduce((a, r) => a + (r > 0 ? 1 / r : 0), 0); return s > 0 ? 1 / s : 0; },
    omega: (f) => 2 * Math.PI * f,
    vrms: (Vm) => Vm / Math.SQRT2,
    irms: (Im) => Im / Math.SQRT2,
    XL: (f, L) => 2 * Math.PI * f * L,
    XC: (f, C) => C > 0 ? 1 / (2 * Math.PI * f * C) : Infinity,
    LfromXL: (f, xl) => xl / (2 * Math.PI * f),
    CfromXC: (f, xc) => 1 / (2 * Math.PI * f * xc),
    Zseries: (R, xl, xc) => new Complex(R, xl - xc),
    Zparallel: (R, xl, xc) => {
        const Yr = new Complex(R > 0 ? 1 / R : 0, 0);
        const Yl = xl > 1e-9 ? new Complex(0, -1 / xl) : new Complex(0, -1e9);
        const Yc = xc > 1e-9 ? new Complex(0, 1 / xc) : new Complex(0, 0);
        const Y = Yr.add(Yl).add(Yc);
        return { Z: new Complex(1, 0).div(Y), Y };
    },
    d2s: (Ra, Rb, Rc) => {
        const s = Ra + Rb + Rc;
        return s > 0 ? { R1: (Rb * Rc) / s, R2: (Rc * Ra) / s, R3: (Ra * Rb) / s } : { R1: 0, R2: 0, R3: 0 };
    },
    s2d: (R1, R2, R3) => {
        const sp = R1 * R2 + R2 * R3 + R3 * R1;
        return { Ra: R1 > 0 ? sp / R1 : 0, Rb: R2 > 0 ? sp / R2 : 0, Rc: R3 > 0 ? sp / R3 : 0 };
    }
};
