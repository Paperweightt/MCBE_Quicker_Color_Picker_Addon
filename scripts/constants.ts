export const PACK_ID = "qbp";

export const items = {
    colorWheel: {
        typeId: PACK_ID + ":palette",
        useDuration: 2_000_000_000,
    },
};

export const entities = {
    colorWheel: PACK_ID + ":color_picker",
};

export const particles = {
    block: {
        x: PACK_ID + ":face_x",
        y: PACK_ID + ":face_y",
        z: PACK_ID + ":face_z",
    },
    line: PACK_ID + ":line",
};

export const config = {
    MAX_SELECTION_DISTANCE: 30,
};
