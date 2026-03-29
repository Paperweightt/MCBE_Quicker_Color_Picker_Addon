import { Dimension, Entity, Player, system, Vector2, Vector3, world } from "@minecraft/server";
import { PlayerUtils } from "../../utils/player.js";
import { Vector } from "../../utils/vector.js";
import { Events } from "./events.js";
import { entities } from "../../constants.js";
import { DeathOnReload } from "../../utils/deathOnReload.js";
import { Color } from "../../utils/color.js";

// select block to edit
Events.click.subscribe({
    priority: (data) => {
        const { blockRaycast, player } = data;

        if (!blockRaycast) return Infinity;

        return Vector.distance(player.location, blockRaycast.block);
    },
    callback: (data) => {
        const { blockRaycast, player } = data;

        if (!blockRaycast) return;

        const location = blockRaycast.block.location;
        const rotation = player.getRotation().y + 180;

        location.y++;

        new ColorPicker(player, new Vector(location), player.dimension, rotation);
    },
});

// drag on markers
Events.startUse.subscribe({
    priority: (data) => {
        const { player } = data;
        let picker: ColorPicker | undefined;

        for (const colorPicker of ColorPicker.getAll()) {
            const pointer = colorPicker.getPointer(player);

            console.log(JSON.stringify(pointer));

            if (!pointer) continue;
            if (pointer.x < -16 || pointer.x > 13) continue;
            if (pointer.y < -1 || pointer.y > 29) continue;

            picker = colorPicker;
        }

        if (picker) {
            return Vector.distance(player.location, picker.location);
        } else {
            return Infinity;
        }
    },
    callback: (data) => {
        const { player } = data;

        let picker: ColorPicker | undefined;
        let pointer: { x: number; y: number } | undefined;

        for (const colorPicker of ColorPicker.getAll()) {
            const p = colorPicker.getPointer(player);

            picker = colorPicker;
            pointer = p;
        }

        if (!picker || !pointer) return;

        const y = picker.hueMarker.location;

        if (y - 5 < pointer.y - 3 && pointer.y - 3 < y + 5) {
            picker.hueMarker.owner = player;
        }
    },
});

Events.releaseUse.subscribe((data) => {
    const { player } = data;

    for (const picker of ColorPicker.getAll()) {
        picker.removeOwner(player);
    }
});

// click on menu
Events.click.subscribe({
    priority: (data) => {
        const { player } = data;
        let picker: ColorPicker | undefined;

        for (const colorPicker of ColorPicker.getAll()) {
            const pointer = colorPicker.getPointer(player);

            if (!pointer) continue;
            console.log(JSON.stringify(pointer));

            if (pointer.x < -16 || pointer.x > 13) continue;
            if (pointer.y < -1 || pointer.y > 29) continue;

            picker = colorPicker;
        }

        if (picker) {
            return Vector.distance(player.location, picker.location) - 10;
        } else {
            return Infinity;
        }
    },
    callback: (data) => {
        const { player } = data;
        const pickers: ColorPicker[] = [];

        for (const colorPicker of ColorPicker.getAll()) {
            const pointer = colorPicker.getPointer(player);

            if (!pointer) continue;

            if (pointer.x < -16 || pointer.x > -10) continue;
            if (pointer.y < 23 || pointer.y > 29) continue;

            pickers.push(colorPicker);
        }

        for (const picker of pickers) {
            picker.remove();
        }
    },
});

class ColorPicker {
    static list: Record<string, ColorPicker> = {};

    static get(id: string): ColorPicker | undefined {
        return this.list[id];
    }

    static add(instance: ColorPicker) {
        this.remove(instance.id);
        this.list[instance.id] = instance;
    }

    static getAll(): ColorPicker[] {
        return Object.values(this.list);
    }

    static remove(id: string): void {
        const colorPicker = this.get(id);

        if (colorPicker) colorPicker.remove();
    }

    static runInterval(): void {
        system.runInterval(() => {
            for (const instance of this.getAll()) {
                instance.updateDisplay();
            }
        });
    }

    static rotatePitch(v: Vector | Vector3, pitch: number): Vector {
        const cos = Math.cos(pitch);
        const sin = Math.sin(pitch);

        return new Vector(v.x, v.y * cos - v.z * sin, v.y * sin + v.z * cos);
    }

    hueMarker: { location: number; owner: Player | undefined } = {
        location: 0,
        owner: undefined,
    };

    satLightMarker: { location: Vector2; owner: Player | undefined } = {
        location: { x: 0, y: 0 },
        owner: undefined,
    };

    location: Vector;
    dimension: Dimension;
    entity: Entity;
    owner: Player;
    id: string;
    rotation: number;

    constructor(owner: Player, location: Vector, dimension: Dimension, rotation: number) {
        this.location = location;
        this.dimension = dimension;
        this.owner = owner;
        this.id = owner.id;
        this.rotation = rotation;

        const { min, max } = this.dimension.heightRange;
        const spawnOffset = new Vector(0.5, 0, 0.5);

        if (this.location.y < min || this.location.y > max) {
            const spawnLocation = this.location.copy();

            spawnLocation.y = Math.min(this.location.y, max);
            spawnLocation.y = Math.max(this.location.y, min);

            this.entity = this.dimension.spawnEntity(
                entities.colorWheel,
                spawnOffset.add(spawnLocation)
            );
            this.entity.teleport(this.location);
        } else {
            this.entity = this.dimension.spawnEntity(
                entities.colorWheel,
                spawnOffset.add(this.location)
            );
        }

        this.setRotation(rotation);

        DeathOnReload.addEntity(this.entity);
        ColorPicker.add(this);
    }

    setRotation(yRotation: number): void {
        this.entity.setProperty("qbp:rotatey", yRotation);
    }

    updateDisplay(): void {
        if (this.hueMarker.owner) {
            const pointer = this.getPointer(this.hueMarker.owner);

            if (!pointer) return;

            pointer.y -= 3;
            pointer.y = Math.max(pointer.y, 0);
            pointer.y = Math.min(pointer.y, 16);

            this.setHue(pointer.y * 22.5);
            this.entity.setProperty("qbp:hue", pointer.y);
            this.hueMarker.location = pointer.y;
        } else if (this.satLightMarker.owner) {
            const pointer = this.getPointer(this.satLightMarker.owner);

            if (!pointer) return;

            pointer.y -= 3;
            pointer.y = Math.max(pointer.y, 0);
            pointer.y = Math.min(pointer.y, 16);

            this.entity.setProperty("qbp:saturation", pointer.y);
            this.entity.setProperty("qbp:lightness", pointer.x);

            this.satLightMarker.location = {
                x: pointer.x,
                y: pointer.y,
            };
        }
    }

    setHue(hue: number): void {
        const rgb = Color.hslToRgb(hue, 100, 50);

        this.entity.setProperty("qbp:rcolor", rgb.red);
        this.entity.setProperty("qbp:gcolor", rgb.green);
        this.entity.setProperty("qbp:bcolor", rgb.blue);
    }

    removeOwner(owner: Player): boolean {
        if (this.hueMarker.owner === owner) {
            this.hueMarker.owner = undefined;
            return true;
        } else if (this.satLightMarker.owner === owner) {
            this.hueMarker.owner = undefined;
            return true;
        }
        return false;
    }

    getPointer(player: Player): { x: number; y: number } | undefined {
        const inverseRotation = {
            y: 0,
            p: (-(this.rotation - 90) * Math.PI) / 180,
            r: 0,
        };

        const relPlayerLocation = Vector.subtract(
            PlayerUtils.getEyeLocation(player),
            this.entity.location
        );

        const nPlayerLocation = Vector.rotate(relPlayerLocation, inverseRotation);
        const nViewDirection = Vector.rotate(player.getViewDirection(), inverseRotation);

        if (nViewDirection.x < 0) return;

        const dir = nViewDirection.normalize();

        const t = -nPlayerLocation.x / dir.x;
        if (t < 0) return;

        const hitY = nPlayerLocation.y + t * dir.y;
        const hitZ = nPlayerLocation.z + t * dir.z;

        return {
            x: hitZ * 16 - 0.5,
            y: hitY * 16 - 0.5,
        };
    }

    remove(): void {
        this.entity.remove();
        delete ColorPicker.list[this.id];
    }
}

ColorPicker.runInterval();
