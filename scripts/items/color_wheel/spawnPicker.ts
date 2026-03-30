import {
    Block,
    Dimension,
    Entity,
    Player,
    system,
    Vector2,
    Vector3,
    world,
} from "@minecraft/server";
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

        if (picker.pointerIsHoveringHueMarker(pointer)) {
            picker.hueMarker.owner = player;
        } else if (picker.pointerIsHoveringBoxMarker(pointer)) {
            picker.satLightMarker.owner = player;
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

    hueMarker: { location: number; owner: Player | undefined } = {
        location: 3,
        owner: undefined,
    };

    satLightMarker: { location: Vector2; owner: Player | undefined } = {
        location: { x: -6.8, y: 3.1 },
        owner: undefined,
    };

    location: Vector;
    dimension: Dimension;
    entity: Entity;
    owner: Player;
    id: string;
    rotation: number;
    block: Block;

    constructor(owner: Player, location: Vector, dimension: Dimension, rotation: number) {
        this.location = location;
        this.dimension = dimension;
        this.owner = owner;
        this.id = owner.id;
        this.rotation = rotation;
        this.block = this.dimension.getBlock(new Vector(0, -1, 0).add(location))!;

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

    pointerIsHoveringHueMarker(pointer: { x: number; y: number }): boolean {
        const y = this.hueMarker.location;

        if (pointer.y > y + 5) return false;
        if (pointer.y < y - 5) return false;
        if (pointer.x > -10) return false;
        if (pointer.x < -15) return false;

        return true;
    }

    pointerIsHoveringBoxMarker(pointer: { x: number; y: number }): boolean {
        const { x, y } = this.satLightMarker.location;

        if (pointer.y > y + 5) return false;
        if (pointer.y < y - 5) return false;
        if (pointer.x > x + 5) return false;
        if (pointer.x < x - 5) return false;

        return true;
    }

    setRotation(yRotation: number): void {
        this.entity.setProperty("qbp:rotatey", yRotation);
    }

    updateDisplay(): void {
        if (this.hueMarker.owner) {
            const pointer = this.getPointer(this.hueMarker.owner);

            if (!pointer) return;

            pointer.y = Math.max(pointer.y, 3);
            pointer.y = Math.min(pointer.y, 19);

            this.hueMarker.location = pointer.y;
            this.entity.setProperty("qbp:hue", pointer.y - 3);
            this.setDisplayBlock();
            this.updateBlock();
        } else if (this.satLightMarker.owner) {
            const pointer = this.getPointer(this.satLightMarker.owner);

            if (!pointer) return;

            pointer.y = Math.max(pointer.y, 0 + 3.1);
            pointer.y = Math.min(pointer.y, 22.9 + 3.1);
            pointer.x = Math.max(pointer.x, 0 - 6.8);
            pointer.x = Math.min(pointer.x, 17.8 - 6.8);

            this.entity.setProperty("qbp:blocky", pointer.y - 3.1);
            this.entity.setProperty("qbp:blockx", pointer.x + 6.8);

            this.satLightMarker.location = { x: pointer.x, y: pointer.y };
            this.updateBlock();
        }
    }

    updateBlock(): void {
        const hue = this.getHue();
        const { s, l } = this.getSatLightness();

        const { red, green, blue } = Color.hslToRgb(hue, s, l);
        const lab = Color.rgbToOklab(red * 255, green * 255, blue * 255);
        const type = Color.blocks.getClosestBlockType(lab);

        this.block.setType(type);
    }

    getHue(): number {
        return (this.hueMarker.location - 3) * 22.5;
    }

    getSatLightness(): { s: number; l: number } {
        let y = (this.satLightMarker.location.y - 3.1) / 22.9;
        let x = (this.satLightMarker.location.x + 6.8) / 17.8;

        return {
            s: x * y * 100,
            l: y * (100 - 50 * x),
        };
    }

    setDisplayBlock(hue: number = this.getHue()): void {
        const rgb = Color.hslToRgb(hue, 100, 50);

        this.entity.setProperty("qbp:rcolor", rgb.red);
        this.entity.setProperty("qbp:gcolor", rgb.green);
        this.entity.setProperty("qbp:bcolor", rgb.blue);
    }

    removeOwner(owner: Player): boolean {
        if (this.hueMarker.owner === owner) {
            this.hueMarker.owner = undefined;
            return true;
        }
        if (this.satLightMarker.owner === owner) {
            this.satLightMarker.owner = undefined;
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
