const fs = require("fs");
const { PNG } = require("pngjs");

const width = 190;
const height = 240;
const min = 240;

const png = new PNG({ width: min, height: min });

const tl = [255, 255, 255, 255];
const tr = [255, 255, 255, 0];
const bl = [0, 0, 0, 255];
const br = [0, 0, 0, 255];

function interpolate(v1, v2, location, distance) {
    return ((v2 - v1) / distance) * location + v1;
}
function interpolateColor(v1, v2, location, distance) {
    return [
        interpolate(v1[0], v2[0], location, distance),
        interpolate(v1[1], v2[1], location, distance),
        interpolate(v1[2], v2[2], location, distance),
        interpolate(v1[3], v2[3], location, distance),
    ];
}

function bilinear(tr, tl, br, bl, x, y, xSize, ySize) {
    const top = interpolateColor(tl, tr, x, xSize);
    const bottom = interpolateColor(bl, br, x, xSize);

    return interpolateColor(top, bottom, y, ySize);
}

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        if (x > png.width) {
            let idx = (png.width * y + x) << 2;
            png.data[idx] = 1;
            png.data[idx + 1] = 1;
            png.data[idx + 2] = 1;
            png.data[idx + 3] = 1;
            continue;
        }

        const [red, green, blue, alpha] = bilinear(tr, tl, br, bl, x, y, png.width, png.height);

        let idx = (png.width * y + x) << 2;
        png.data[idx] = red; // Red
        png.data[idx + 1] = green; // Green
        png.data[idx + 2] = blue; // Blue
        png.data[idx + 3] = alpha; // Alpha
    }
}

png.pack().pipe(
    fs.createWriteStream("../resource_packs/block_palette/textures/generated/hsl_box.png")
);
