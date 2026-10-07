/**
 * Linear Matrix Solvers for Real and Complex Systems (Gaussian Elimination with Partial Pivoting)
 */
import { Complex } from '../models/complex-number.js';

/**
 * Solves real linear system A * x = b
 * @param {number[][]} A - n x n matrix of numbers
 * @param {number[]} b - n-element vector of numbers
 * @returns {number[]} solution vector x, or throws Error if singular
 */
export function solveReal(A, b) {
    const n = A.length;
    if (n === 0) return [];

    // Clone augmented matrix [A | b]
    const M = [];
    for (let i = 0; i < n; i++) {
        M[i] = new Float64Array(n + 1);
        for (let j = 0; j < n; j++) M[i][j] = A[i][j];
        M[i][n] = b[i];
    }

    // Forward elimination with partial pivoting
    for (let col = 0; col < n; col++) {
        let maxRow = col;
        let maxVal = Math.abs(M[col][col]);
        for (let row = col + 1; row < n; row++) {
            const val = Math.abs(M[row][col]);
            if (val > maxVal) {
                maxVal = val;
                maxRow = row;
            }
        }

        if (maxVal < 1e-12) {
            throw new Error(`Matrix is singular or ill-conditioned at column ${col}`);
        }

        // Swap pivot row
        if (maxRow !== col) {
            const temp = M[col];
            M[col] = M[maxRow];
            M[maxRow] = temp;
        }

        // Eliminate rows below
        const pivot = M[col][col];
        for (let row = col + 1; row < n; row++) {
            const factor = M[row][col] / pivot;
            if (Math.abs(factor) > 1e-15) {
                M[row][col] = 0;
                for (let j = col + 1; j <= n; j++) {
                    M[row][j] -= factor * M[col][j];
                }
            }
        }
    }

    // Back-substitution
    const x = new Array(n);
    for (let row = n - 1; row >= 0; row--) {
        let sum = M[row][n];
        for (let j = row + 1; j < n; j++) {
            sum -= M[row][j] * x[j];
        }
        x[row] = sum / M[row][row];
    }

    return x;
}

/**
 * Solves complex linear system A * x = b
 * @param {Complex[][]} A - n x n matrix of Complex
 * @param {Complex[]} b - n-element vector of Complex
 * @returns {Complex[]} solution vector x, or throws Error if singular
 */
export function solveComplex(A, b) {
    const n = A.length;
    if (n === 0) return [];

    // Clone augmented matrix [A | b]
    const M = [];
    for (let i = 0; i < n; i++) {
        M[i] = new Array(n + 1);
        for (let j = 0; j < n; j++) {
            const c = A[i][j];
            M[i][j] = new Complex(c ? c.re : 0, c ? c.im : 0);
        }
        const cb = b[i];
        M[i][n] = new Complex(cb ? cb.re : 0, cb ? cb.im : 0);
    }

    // Forward elimination with partial pivoting
    for (let col = 0; col < n; col++) {
        let maxRow = col;
        let maxMag = M[col][col].mag();
        for (let row = col + 1; row < n; row++) {
            const mag = M[row][col].mag();
            if (mag > maxMag) {
                maxMag = mag;
                maxRow = row;
            }
        }

        if (maxMag < 1e-12) {
            throw new Error(`Complex matrix is singular or ill-conditioned at column ${col}`);
        }

        if (maxRow !== col) {
            const temp = M[col];
            M[col] = M[maxRow];
            M[maxRow] = temp;
        }

        const pivot = M[col][col];
        for (let row = col + 1; row < n; row++) {
            const factor = M[row][col].div(pivot);
            if (factor.mag() > 1e-15) {
                M[row][col] = new Complex(0, 0);
                for (let j = col + 1; j <= n; j++) {
                    M[row][j] = M[row][j].sub(factor.mul(M[col][j]));
                }
            }
        }
    }

    // Back-substitution
    const x = new Array(n);
    for (let row = n - 1; row >= 0; row--) {
        let sum = M[row][n];
        for (let j = row + 1; j < n; j++) {
            sum = sum.sub(M[row][j].mul(x[j]));
        }
        x[row] = sum.div(M[row][row]);
    }

    return x;
}
