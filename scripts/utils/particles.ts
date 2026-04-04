import { Dimension, MolangVariableMap, RGBA, Vector3 } from "@minecraft/server";
import { Vector } from "./vector";

export class Particle {
    static defaultRGBA = {
        red: 1,
        green: 1,
        blue: 1,
        alpha: 0.2,
    };

    static line(
        particle: string,
        start: Vector,
        end: Vector,
        dimension: Dimension,
        lifetime: number = 0.11,
        width: number = 0.05,
        rgb: RGBA = Particle.defaultRGBA
    ): void {
        const diff = Vector.subtract(start, end);
        const middle = Vector.divide(diff, 2).add(end);
        const direction = Vector.normalize(diff);
        const length = Math.hypot(diff.x / 2, diff.y / 2, diff.z / 2);
        const molang = new MolangVariableMap();

        molang.setColorRGB("color", rgb);

        molang.setFloat("dir_x", direction.x);
        molang.setFloat("dir_y", direction.y);
        molang.setFloat("dir_z", direction.z);
        molang.setFloat("width", width);
        molang.setFloat("length", length);
        molang.setFloat("lifetime", lifetime);

        dimension.spawnParticle(particle, middle, molang);
    }

    static boxEdges(
        particle: string,
        location: Vector3,
        size: Vector3,
        dimension: Dimension,
        lifetime: number = 0.11,
        width: number = 0.05,
        rgba: RGBA = this.defaultRGBA,
        rotation = { y: 0, p: 0, r: 0 },
        pivot = new Vector(0, 0, 0)
    ): void {
        const line = (start: Vector, offset: Vector): void => {
            start.add(location);
            offset.add(start);
            // try {
            // this.line(particle, start, offset, dimension, lifetime, width, rgba, rotation, pivot);
            this.line(particle, start, offset, dimension, lifetime, width, rgba);
            // } catch (error) {}
        };

        line(new Vector(0, 0, 0), new Vector(0, size.y, 0));
        line(new Vector(size.x, 0, 0), new Vector(0, size.y, 0));
        line(new Vector(0, 0, size.z), new Vector(0, size.y, 0));
        line(new Vector(size.x, 0, size.z), new Vector(0, size.y, 0));

        line(new Vector(0, 0, 0), new Vector(0, 0, size.z));
        line(new Vector(size.x, 0, 0), new Vector(0, 0, size.z));
        line(new Vector(0, size.y, 0), new Vector(0, 0, size.z));
        line(new Vector(size.x, size.y, 0), new Vector(0, 0, size.z));

        line(new Vector(0, 0, 0), new Vector(size.x, 0, 0));
        line(new Vector(0, size.y, 0), new Vector(size.x, 0, 0));
        line(new Vector(0, 0, size.z), new Vector(size.x, 0, 0));
        line(new Vector(0, size.y, size.z), new Vector(size.x, 0, 0));
    }

    /**
     * @param {{x:string,y:string,z:string}} particleVector
     * @param {Vector} start
     * @param {Vector} end
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {import("@minecraft/server").RGBA} [rgba]
     */
    static face(
        particleVector: { x: string; y: string; z: string },
        start: Vector,
        end: Vector,
        dimension: Dimension,
        rgba: RGBA = this.defaultRGBA
    ): void {
        const diff = Vector.subtract(start, end);
        const absDiff = Vector.abs(diff).divide(2);
        const middle = Vector.divide(diff, 2).add(end);
        const molang = new MolangVariableMap();
        const mainAxis = Object.entries(diff).find((v) => v[1] === 0)![0] as "x" | "y" | "z";

        if (!mainAxis) {
            throw new Error("invalid start and end, start and end must have one common value");
        }

        const particle = particleVector[mainAxis];

        molang.setColorRGBA("color", rgba);
        molang.setFloat("dir_x", mainAxis === "x" ? 1 : 0);
        molang.setFloat("dir_y", mainAxis === "y" ? 1 : 0);
        molang.setFloat("dir_z", mainAxis === "z" ? 1 : 0);

        switch (mainAxis) {
            case "x":
                molang.setFloat("length", absDiff.z);
                molang.setFloat("height", absDiff.y);
                break;
            case "y":
                molang.setFloat("length", absDiff.x);
                molang.setFloat("height", absDiff.z);

                break;
            case "z":
                molang.setFloat("length", absDiff.x);
                molang.setFloat("height", absDiff.y);
                break;
            default:
                break;
        }

        dimension.spawnParticle(particle, middle, molang);
    }

    static boxFaces(
        particleVector: { x: string; y: string; z: string },
        location: Vector3,
        size: Vector3,
        dimension: Dimension,
        rgba: RGBA = this.defaultRGBA
    ): void {
        const face = (start: Vector, offset: Vector): void => {
            start.add(location);
            offset.add(start);

            try {
                this.face(particleVector, start, offset, dimension, rgba);
            } catch (error) {}
        };
        const zFight = 0.0625;

        face(new Vector(-zFight, 0, 0), new Vector(0, size.y, size.z));
        face(new Vector(size.x + zFight, 0, 0), new Vector(0, size.y, size.z));

        face(new Vector(0, -zFight, 0), new Vector(size.x, 0, size.z));
        face(new Vector(0, size.y + zFight, 0), new Vector(size.x, 0, size.z));

        face(new Vector(0, 0, -zFight), new Vector(size.x, size.y, 0));
        face(new Vector(0, 0, size.z + zFight), new Vector(size.x, size.y, 0));
    }
}
