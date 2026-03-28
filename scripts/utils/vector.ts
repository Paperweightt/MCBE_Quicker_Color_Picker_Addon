import { Direction, Vector3 } from "@minecraft/server";

type VectorOperand = number | mVector;
type mVector = Vector | Vector3;
type rotation = {
    y: number;
    p: number;
    r: number;
};
type rotation2 = {
    y: number;
    p: number;
};
type formats = "xyz" | "xzy" | "yxz" | "yzx" | "zxy" | "zyx";

export class Vector {
    x: number;
    y: number;
    z: number;

    constructor(
        x: number | Vector3 | number[] = 0,
        y: number | undefined = undefined,
        z: number | undefined = undefined
    ) {
        if (Array.isArray(x)) {
            this.x = x[0];
            this.y = x[1];
            this.z = x[2];
        } else if (typeof x === "object" && "x" in x) {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
        } else if (y === undefined) {
            this.x = x;
            this.y = x;
            this.z = x;
        } else {
            this.x = x;
            this.y = y;
            this.z = z!;
        }
    }

    static stringToVector(string: Direction): Vector {
        switch (string.toLowerCase()) {
            case "up":
                return new Vector(0, 1, 0);
            case "above":
                return new Vector(0, 1, 0);
            case "down":
                return new Vector(0, -1, 0);
            case "below":
                return new Vector(0, -1, 0);
            case "east":
                return new Vector(1, 0, 0);
            case "west":
                return new Vector(-1, 0, 0);
            case "north":
                return new Vector(0, 0, -1);
            case "south":
                return new Vector(0, 0, 1);
            default:
                return new Vector(0, 0, 0);
        }
    }

    static max(a: mVector, b: mVector): Vector {
        return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
    }

    static min(a: mVector, b: mVector): Vector {
        return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
    }

    static abs(a: mVector): Vector {
        return new Vector(Math.abs(a.x), Math.abs(a.y), Math.abs(a.z));
    }

    static removeDuplicates(a: mVector[]) {
        const b: Record<string, boolean> = {};
        return a.filter(({ x, y, z }) => (b[`${x} ${y} ${z}`] ? false : (b[`${x} ${y} ${z}`] = true)));
    }

    static normalize(a: mVector) {
        const distance = Math.hypot(a.x, a.y, a.z);
        return new Vector(a.x / distance, a.y / distance, a.z / distance);
    }

    static crossProduct(a: mVector, b: mVector): Vector {
        return new Vector(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    }

    static dotProduct(a: mVector, b: mVector): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    static floor(a: mVector): Vector {
        return new Vector(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z));
    }

    static ceil(a: mVector): Vector {
        return new Vector(Math.ceil(a.x), Math.ceil(a.y), Math.ceil(a.z));
    }

    static round(a: mVector): Vector {
        return new Vector(Math.round(a.x), Math.round(a.y), Math.round(a.z));
    }

    static trunc(a: mVector): Vector {
        return new Vector(Math.trunc(a.x), Math.trunc(a.y), Math.trunc(a.z));
    }

    static equals(a: mVector, b: mVector): boolean {
        if (a.x !== b.x) return false;
        if (a.y !== b.y) return false;
        if (a.z !== b.z) return false;
        return true;
    }

    static isBetween({ x, y, z }: mVector, a: mVector, b: mVector): boolean {
        if (!((a.x < x && x < b.x) || (a.x > x && x > b.x))) return false;
        if (!((a.y < y && y < b.y) || (a.y > y && y > b.y))) return false;
        if (!((a.z < z && z < b.z) || (a.z > z && z > b.z))) return false;
        return true;
    }

    static multiply(a: mVector, b: mVector): Vector {
        if (typeof b === "number") return new Vector(a.x * b, a.y * b, a.z * b);
        return new Vector(a.x * b.x, a.y * b.y, a.z * b.z);
    }

    static average(vectors: mVector[]): Vector {
        let sum = new Vector(0, 0, 0);

        for (const vector of vectors) {
            sum.add(vector);
        }

        return sum.divide(vectors.length);
    }

    static divide(a: mVector, b: VectorOperand): Vector {
        if (typeof b === "number") {
            return new Vector(a.x / b, a.y / b, a.z / b);
        }

        return new Vector(a.x / b.x, a.y / b.y, a.z / b.z);
    }

    static add(a: mVector, b: VectorOperand): Vector {
        if (typeof b === "number") return new Vector(a.x + b, a.y + b, a.z + b);
        return new Vector(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    static subtract(a: mVector, b: VectorOperand): Vector {
        if (typeof b === "number") return new Vector(a.x - b, a.y - b, a.z - b);
        return new Vector(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    static modulus(a: mVector, b: VectorOperand): Vector {
        if (typeof b === "number") return new Vector(a.x % b, a.y % b, a.z % b);
        return new Vector(a.x % b.x, a.y % b.y, a.z % b.z);
    }

    static distance(a: mVector, b: mVector): number {
        return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
    }

    static map(a: mVector, callback: (param1: number) => number): Vector {
        return new Vector(callback(a.x), callback(a.y), callback(a.z));
    }

    static rotate(location: mVector, { y: ya, p, r }: rotation, pivot: Vector = new Vector(0, 0, 0)) {
        const cos = Math.cos;
        const sin = Math.sin;

        let { x, y, z } = Vector.subtract(location, pivot);

        return new Vector(
            x * (cos(ya) * cos(p)) + y * (sin(ya) * cos(p)) + z * -sin(p),

            x * (cos(ya) * sin(p) * sin(r) - sin(ya) * cos(r)) +
                y * (sin(ya) * sin(p) * sin(r) + cos(ya) * cos(r)) +
                z * (cos(p) * sin(r)),

            x * (cos(ya) * sin(p) * cos(r) + sin(ya) * sin(r)) +
                y * (sin(ya) * sin(p) * cos(r) - cos(ya) * sin(r)) +
                z * (cos(p) * cos(r))
        ).add(pivot);
    }

    setFormat(order: formats) {
        const temp = this.copy();
        this.x = temp[order[0] as "x" | "y" | "z"];
        this.y = temp[order[1] as "x" | "y" | "z"];
        this.z = temp[order[2] as "x" | "y" | "z"];

        return this;
    }

    rotateYP({ y, p }: rotation2) {
        const cy = Math.cos(y),
            sy = Math.sin(y);
        const cp = Math.cos(p),
            sp = Math.sin(p);

        const x = this.x * (cy * cp) + this.y * (sy * cp) - this.z * sp;
        const z = this.x * sy + this.y * cy;
        const y_ = this.x * (cy * sp) + this.y * (sy * sp) + this.z * cp;

        this.x = x;
        this.y = y_;
        this.z = z;
        return this;
    }

    equals(a: mVector): boolean {
        if (a.x !== this.x) return false;
        if (a.y !== this.y) return false;
        if (a.z !== this.z) return false;
        return true;
    }

    isBetween(a: mVector, b: mVector): boolean {
        if (!((a.x < this.x && this.x < b.x) || (a.x > this.x && this.x > b.x))) return false;
        if (!((a.y < this.y && this.y < b.y) || (a.y > this.y && this.y > b.y))) return false;
        if (!((a.z < this.z && this.z < b.z) || (a.z > this.z && this.z > b.z))) return false;
        return true;
    }

    normalize(): Vector {
        const distance = Math.hypot(this.x, this.y, this.z);
        return this.divide(distance);
    }

    multiply(b: mVector | number): Vector {
        if (typeof b === "number") {
            this.x *= b;
            this.y *= b;
            this.z *= b;
        } else {
            this.x *= b.x;
            this.y *= b.y;
            this.z *= b.z;
        }

        return this;
    }

    divide(b: mVector | number): Vector {
        if (typeof b === "number") {
            this.x /= b;
            this.y /= b;
            this.z /= b;
        } else {
            this.x /= b.x;
            this.y /= b.y;
            this.z /= b.z;
        }

        return this;
    }

    add(b: mVector | number): Vector {
        if (typeof b === "number") {
            this.x += b;
            this.y += b;
            this.z += b;
        } else {
            this.x += b.x;
            this.y += b.y;
            this.z += b.z;
        }

        return this;
    }

    subtract(b: mVector | number): Vector {
        if (typeof b === "number") {
            this.x -= b;
            this.y -= b;
            this.z -= b;
        } else {
            this.x -= b.x;
            this.y -= b.y;
            this.z -= b.z;
        }

        return this;
    }

    modulus(b: mVector | number): Vector {
        if (typeof b === "number") {
            this.x %= b;
            this.y %= b;
            this.z %= b;
        } else {
            this.x %= b.x;
            this.y %= b.y;
            this.z %= b.z;
        }

        return this;
    }

    distance(b: mVector): number {
        return Math.sqrt((b.x - this.x) ** 2 + (b.y - this.y) ** 2 + (b.z - this.z) ** 2);
    }

    map(callback: (param1: number) => number): Vector {
        this.x = callback(this.x);
        this.y = callback(this.y);
        this.z = callback(this.z);

        return this;
    }

    rotate({ y, p, r }: rotation): Vector {
        const cos = Math.cos;
        const sin = Math.sin;

        const x = this.x * (cos(y) * cos(p)) + this.y * (sin(y) * cos(p)) + this.z * -sin(p);

        const _y =
            this.x * (cos(y) * sin(p) * sin(r) - sin(y) * cos(r)) +
            this.y * (sin(y) * sin(p) * sin(r) + cos(y) * cos(r)) +
            this.z * (cos(p) * sin(r));

        const z =
            this.x * (cos(y) * sin(p) * cos(r) + sin(y) * sin(r)) +
            this.y * (sin(y) * sin(p) * cos(r) - cos(y) * sin(r)) +
            this.z * (cos(p) * cos(r));

        this.x = x;
        this.y = _y;
        this.z = z;

        return this;
    }

    abs(): Vector {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);

        return this;
    }

    coordinateSum(): number {
        return this.x + this.y + this.z;
    }

    floor(): Vector {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.z = Math.floor(this.z);

        return this;
    }

    ceil(): Vector {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        this.z = Math.ceil(this.z);

        return this;
    }

    round(decimalPlaces: number = 0): Vector {
        return this.map((v) => Math.round(v * 10 ** decimalPlaces) / 10 ** decimalPlaces);
    }

    copy(): Vector {
        return new Vector(this.x, this.y, this.z);
    }

    setX(x: number): Vector {
        this.x = x;
        return this;
    }

    setY(y: number): Vector {
        this.y = y;
        return this;
    }

    setZ(z: number): Vector {
        this.z = z;
        return this;
    }

    getList(): number[] {
        return [this.x, this.y, this.z];
    }

    getString(): string {
        return `${this.x} ${this.y} ${this.z}`;
    }
}
