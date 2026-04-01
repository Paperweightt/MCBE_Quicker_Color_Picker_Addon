import { BlockVolume, Dimension, Player, RGB } from "@minecraft/server";
import { blockData } from "../generated/blockColors.js";
import { Vector } from "./vector.js";

export type lab = { l: number; a: number; b: number };
export type hsl = { h: number; s: number; l: number };
export type locationColor = { location: Vector; color: lab };

class Blocks {
    static typeIdMap: Record<string, string> = {
        smooth_stone_slab: "smooth_stone_double_slab",

        crimson_hyphae: "crimson_stem",
        warped_hyphae: "warped_stem",

        acacia_log: "acacia_wood",
        birch_log: "birch_wood",
        cherry_log: "cherry_wood",
        dark_oak_log: "dark_oak_wood",
        jungle_log: "jungle_wood",
        mangrove_log: "mangrove_wood",
        oak_log: "oak_wood",
        pale_oak_log: "pale_oak_wood",
        spruce_log: "spruce_wood",
        stripped_acacia_log: "stripped_acacia_wood",
        stripped_birch_log: "stripped_birch_wood",
        stripped_cherry_log: "stripped_cherry_wood",
        stripped_dark_oak_log: "stripped_dark_oak_wood",
        stripped_jungle_log: "stripped_jungle_wood",
        stripped_mangrove_log: "stripped_mangrove_wood",
        stripped_oak_log: "stripped_oak_wood",
        stripped_pale_oak_log: "stripped_pale_oak_wood",
        stripped_spruce_log: "stripped_spruce_wood",
    };

    static typeIdtoName(typeId: string): string {
        if (typeId.startsWith("minecraft:")) typeId = typeId.substring(10);

        if (this.typeIdMap[typeId]) return this.typeIdMap[typeId];

        if (typeId.startsWith("waxed")) typeId = typeId.substring(6);
        else if (typeId.startsWith("cracked")) typeId = typeId.substring(8);

        console.log(typeId);

        return typeId;
    }

    static getLab(typeId: string): lab | -1 {
        typeId = this.typeIdtoName(typeId);

        console.log(typeId);

        let low = 0;
        let high = blockData.length - 1;
        let mid;
        while (high >= low) {
            mid = low + Math.floor((high - low) / 2);

            if (blockData[mid].name == typeId) {
                const [l, a, b] = blockData[mid].lab;
                return { l, a, b };
            }

            if (blockData[mid].name > typeId) high = mid - 1;
            else low = mid + 1;
        }

        return -1;
    }

    static cubePalette(
        minLocation: Vector,
        maxLocation: Vector,
        dimension: Dimension,
        inputs: locationColor[]
    ): void {
        const iterator = new BlockVolume(minLocation, maxLocation).getBlockLocationIterator();

        outerloop: for (const location of iterator) {
            let totalWeight = 0;
            let color = { l: 0, a: 0, b: 0 };

            for (const input of inputs) {
                const dist = Vector.distance(location, input.location);
                if (dist === 0) continue outerloop;
                // let weight = 1 / Math.pow(dist, 1)
                // let weight = 1 / (dist + 0.0001)
                let weight = 1 / dist ** 2;

                if (weight === Infinity) {
                    weight = Number.MAX_SAFE_INTEGER;
                }

                color.l += input.color.l * weight;
                color.a += input.color.a * weight;
                color.b += input.color.b * weight;

                totalWeight += weight;
            }

            color.l /= totalWeight;
            color.a /= totalWeight;
            color.b /= totalWeight;

            const type = this.getClosestBlockType(color);
            dimension.setBlockType(location, type);
        }
    }

    static linePalette(startColor: lab, endColor: lab, blocks: number): string[] {
        const difference = {
            l: endColor.l - startColor.l,
            a: endColor.a - startColor.a,
            b: endColor.b - startColor.b,
        };
        const slope = {
            l: difference.l / blocks,
            a: difference.a / blocks,
            b: difference.b / blocks,
        };
        const lab = {
            l: startColor.l,
            a: startColor.a,
            b: startColor.b,
        };
        const types = [];

        for (let i = 0; i < blocks; i++) {
            lab.l += slope.l;
            lab.a += slope.a;
            lab.b += slope.b;

            types.push(this.getClosestBlockType(lab));
        }

        return types;
    }

    static getClosestBlockType(inputLab: lab): string {
        let lowestDistance = Infinity;
        let output = "bedrock";

        for (const { name, lab } of blockData) {
            const distance =
                (lab[0] - inputLab.l) ** 2 +
                (lab[1] - inputLab.a) ** 2 +
                (lab[2] - inputLab.b) ** 2;

            if (distance < lowestDistance) {
                output = name;
                lowestDistance = distance;
            }
        }
        return output;
    }
}

export class Color {
    static blocks = Blocks;

    static playerHSL(player: Player, saturation: number, lightness: number): RGB {
        const hue = Color.hashPlayerName(player) * 360;

        return this.hslToRgb(hue, saturation, lightness);
    }

    static playerOklab(player: Player, chroma: number, lightness: number): RGB {
        const angle = Color.hashPlayerName(player) * 360;

        return this.oklchToRgb(lightness, chroma, angle);
    }

    static hslToRgb(h: number, s: number, l: number): RGB {
        h = h / 360;
        s = s / 100;
        l = l / 100;

        function f(n: number): number {
            const k = (n + h * 12) % 12;
            const a = s * Math.min(l, 1 - l);
            return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
        }

        const red = f(0);
        const green = f(8);
        const blue = f(4);

        return { red, green, blue };
    }

    static oklabToHsl(l: number, a: number, b: number): hsl {
        const { red, green, blue } = this.oklabToRgb(l, a, b);
        return this.rgbToHsl(red, green, blue);
    }

    static rgbToHsl(r: number, g: number, b: number): hsl {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (delta !== 0) {
            s = delta / (1 - Math.abs(2 * l - 1));

            switch (max) {
                case r:
                    h = ((g - b) / delta) % 6;
                    break;
                case g:
                    h = (b - r) / delta + 2;
                    break;
                case b:
                    h = (r - g) / delta + 4;
                    break;
            }

            h *= 60;
            if (h < 0) h += 360;
        }

        return {
            h,
            s: s * 100,
            l: l * 100,
        };
    }

    static hashPlayerName(player: Player): number {
        const str = player.name;
        let seed = 0;

        for (let i = 0; i < str.length; i++) {
            seed += str.charCodeAt(i) * (i + 1) ** 2;
        }

        let state = seed % 2147483647;

        state = (state * 16807) % 2147483647;
        state = (state * 16807) % 2147483647;
        state = (state * 16807) % 2147483647;
        state = (state * 16807) % 2147483647;
        state = (state * 16807) % 2147483647;

        return (state - 1) / 2147483646;
    }

    /**
     * @param {number} L - lightness [[0 - 1]]
     * @param {number} C - chroma | saturation [[0- ~0.3]]
     * @param {number} h - hue angle [[0-360]]
     */
    static oklchToRgb(L: number, C: number, h: number): RGB {
        const rad = (h * Math.PI) / 180;

        const a = C * Math.cos(rad);
        const b = C * Math.sin(rad);

        return this.oklabToRgb(L, a, b);
    }

    static oklabToRgb(L: number, a: number, b: number): RGB {
        // 1) Convert OKLab → LMS (nonlinear)
        const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        const s_ = L - 0.0894841775 * a - 1.291485548 * b;

        // 2) Cube
        const l = l_ * l_ * l_;
        const m = m_ * m_ * m_;
        const s = s_ * s_ * s_;

        // 3) Convert LMS → linear RGB
        let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        let b2 = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

        // 4) Linear RGB → sRGB
        r = this.linearToSrgb(r);
        g = this.linearToSrgb(g);
        b2 = this.linearToSrgb(b2);

        function clamp(x: number, min: number, max: number): number {
            return Math.min(Math.max(x, min), max);
        }

        return { red: clamp(r, 0, 1), green: clamp(g, 0, 1), blue: clamp(b2, 0, 1) };
    }

    static linearToSrgb(c: number): number {
        return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }

    static srgbToLinear(c: number): number {
        c /= 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }

    static oklabToLinearRGB(L: number, a: number, b: number): RGB {
        const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        const s_ = L - 0.0894841775 * a - 1.291485548 * b;

        const l = l_ * l_ * l_;
        const m = m_ * m_ * m_;
        const s = s_ * s_ * s_;

        return {
            red: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            green: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            blue: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
        };
    }

    static oklabToRGB(L: number, a: number, b: number): RGB {
        const lin = this.oklabToLinearRGB(L, a, b);

        const r = Math.min(1, Math.max(0, this.linearToSrgb(lin.red)));
        const g = Math.min(1, Math.max(0, this.linearToSrgb(lin.green)));
        const b_ = Math.min(1, Math.max(0, this.linearToSrgb(lin.blue)));

        return { red: r, green: g, blue: b_ };
    }

    static rgbToOklab(red: number, green: number, blue: number): lab {
        // 1. Convert sRGB → linear RGB
        const lr = this.srgbToLinear(red);
        const lg = this.srgbToLinear(green);
        const lb = this.srgbToLinear(blue);

        // 2. Linear RGB → LMS
        const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
        const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
        const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

        // 3. Nonlinear transform
        const l_ = Math.cbrt(l);
        const m_ = Math.cbrt(m);
        const s_ = Math.cbrt(s);

        // 4. LMS → OKLab
        return {
            l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
            a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
            b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
        };
    }
}
