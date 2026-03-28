import { Block, BlockPermutation, Dimension, Direction, Player, system, Vector3 } from "@minecraft/server";
import { config, particles } from "../../constants";
import { Vector } from "../../utils/vector.js";
import { Particle } from "../../utils/particles.js";
import { Events } from "./events.js";
import { PlayerUtils } from "../../utils/player";

Events.startUse.subscribe({
    priority: (data) => {
        const { blockRaycast, player } = data;

        if (!blockRaycast) return Infinity;

        return Vector.distance(blockRaycast.block, player.location) + 100;
    },
    callback: (data) => {
        const { blockRaycast, player } = data;

        if (!blockRaycast) return;

        const { block, face, faceLocation } = blockRaycast;
        const location = Vector.add(block.location, faceLocation);

        new SelectionCreator(player, blockRaycast.block, location, face);
    },
});

Events.releaseUse.subscribe((data) => {
    const { player } = data;
    const creator = SelectionCreator.get(player.id);

    if (!creator) return;

    creator.apply();
});

class SelectionCreator {
    static list: Record<string, SelectionCreator> = {};

    static faceToAxisRotation = {
        Up: { axis: "y", rotation: { x: 0, y: 90 } },
        Down: { axis: "y", rotation: { x: 0, y: 90 } },
        East: { axis: "x", rotation: { x: 0, y: 0 } },
        West: { axis: "x", rotation: { x: 0, y: 0 } },
        South: { axis: "z", rotation: { x: 270, y: 0 } },
        North: { axis: "z", rotation: { x: 270, y: 0 } },
    };

    static get(ownerId: string): SelectionCreator | undefined {
        return this.list[ownerId];
    }

    static add(id: string, instance: SelectionCreator) {
        this.list[id] = instance;
    }

    static getAll(): SelectionCreator[] {
        return Object.values(this.list);
    }

    static remove(id: string) {
        this.get(id)?.remove();
    }

    static runInterval() {
        system.runInterval(() => {
            for (const instance of this.getAll()) {
                instance.display();
            }
        });
    }

    player: Player;
    block: Block;
    id: string;
    permutation: BlockPermutation;
    dimension: Dimension;
    location: Vector3;
    rotation = { x: 0, y: 0 };
    editLocation: Vector3;
    axis: "x" | "y" | "z";
    _minLocation: Vector3;
    _maxLocation: Vector3;

    constructor(player: Player, block: Block, location: Vector3, face: Direction) {
        this.player = player;
        this.block = block;
        this.id = player.id;
        this.permutation = block.permutation;
        this.dimension = block.dimension;
        this.location = block.location;

        this._minLocation = block.location;
        this._maxLocation = block.location;

        const { axis, rotation } = SelectionCreator.faceToAxisRotation[face] as {
            axis: "x" | "y" | "z";
            rotation: { x: number; y: number };
        };

        this.editLocation = location;

        if (face === "Up" || face === "East" || face === "South") {
            const r = this.editLocation[axis] % 1;
            if (r === 0) this.editLocation[axis] += 1;
        }

        this.axis = axis;
        this.rotation = rotation;

        SelectionCreator.add(this.id, this);
    }

    display() {
        const { minLocation, maxLocation } = this.getStartEnd();
        const size = Vector.subtract(maxLocation, minLocation);

        if (system.currentTick % 4 === 0) {
            Particle.boxFaces(particles.block, minLocation, size, this.dimension);
        }

        Particle.boxEdges(particles.line, minLocation, size, this.dimension, 0.1);

        this.player.onScreenDisplay.setActionBar("§l" + size.getString());
    }

    apply() {}

    getPointer(): Vector | undefined {
        const inverseRotation = {
            y: (-this.rotation.y * Math.PI) / 180,
            p: (-this.rotation.x * Math.PI) / 180,
            r: 0,
        };
        const relPlayerLocation = Vector.subtract(PlayerUtils.getEyeLocation(this.player), this.editLocation);
        const nPlayerLocation = Vector.rotate(relPlayerLocation, inverseRotation);
        const nViewDirection = Vector.rotate(this.player.getViewDirection(), inverseRotation);

        const dir = nViewDirection.normalize();
        const t = -nPlayerLocation.x / dir.x;

        if (t < 0) return;

        const hitY = nPlayerLocation.y + t * dir.y;
        const hitZ = nPlayerLocation.z + t * dir.z;

        switch (this.axis) {
            case "x":
                return new Vector(0, hitY, hitZ);
            case "y":
                return new Vector(hitY, 0, hitZ);
            case "z":
                return new Vector(hitZ, hitY, 0);
        }
    }

    remove() {
        delete SelectionCreator.list[this.id];
    }

    getStartEnd(): { minLocation: Vector3; maxLocation: Vector3 } {
        const { min, max } = this.dimension.heightRange;
        const distance = config.MAX_SELECTION_DISTANCE;

        let pointer = this.getPointer();

        if (!pointer) {
            return {
                minLocation: this._minLocation,
                maxLocation: this._maxLocation,
            };
        }

        pointer.add(this.editLocation);
        const location = new Vector(0.5, 0.5, 0.5).add(this.location);

        pointer.y = Math.min(Math.max(pointer.y, min), max);

        pointer = Vector.min(new Vector(distance, distance, distance).add(this.player.location), pointer);
        pointer = Vector.max(new Vector(-distance, -distance, -distance).add(this.player.location), pointer);

        this._minLocation = Vector.min(location, pointer).floor();
        this._maxLocation = Vector.max(location, pointer).ceil();

        return {
            minLocation: this._minLocation,
            maxLocation: this._maxLocation,
        };
    }
}

SelectionCreator.runInterval();
