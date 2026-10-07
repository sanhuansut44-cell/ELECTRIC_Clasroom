/**
 * Complex Number Class for AC Circuit Phasor & Impedance Calculations
 */
export class Complex {
    constructor(re, im = 0) {
        this.re = re;
        this.im = im;
    }

    add(c) {
        return new Complex(this.re + c.re, this.im + c.im);
    }

    sub(c) {
        return new Complex(this.re - c.re, this.im - c.im);
    }

    mul(c) {
        return new Complex(
            this.re * c.re - this.im * c.im,
            this.re * c.im + this.im * c.re
        );
    }

    div(c) {
        const d = c.re * c.re + c.im * c.im;
        if (d === 0) return new Complex(0, 0);
        return new Complex(
            (this.re * c.re + this.im * c.im) / d,
            (this.im * c.re - this.re * c.im) / d
        );
    }

    mag() {
        return Math.sqrt(this.re * this.re + this.im * this.im);
    }

    phase() {
        return Math.atan2(this.im, this.re);
    }

    phaseDeg() {
        return this.phase() * 180 / Math.PI;
    }
}
