import { world, system, Player } from "@minecraft/server";
import { items } from "../../constants.js";
import { MinPriorityEvent, Event } from "../../utils/events.js";
import { Vector } from "../../utils/vector.js";
import { PlayerUtils } from "../../utils/player.js";
import { ItemEvents } from "./types.js";

const colorWheel = items.colorWheel;

world.afterEvents.itemUse.subscribe((data) => {
    const { source, itemStack } = data;

    if (itemStack.typeId !== colorWheel.typeId) return;

    const blockRaycast = source.getBlockFromViewDirection();
    const initialViewDirection = source.getViewDirection();
    const viewStart = PlayerUtils.getEyeLocation(source);
    const container = source.getComponent("inventory")!.container;
    source.onRelease = "click";

    const e = 0.02;

    let ticks = 0;
    const dragId = system.runInterval(() => {
        if (!source.isValid) {
            system.clearRun(dragId);
            return;
        }

        const viewDirection = source.getViewDirection();
        const diff = Vector.distance(viewDirection, initialViewDirection);

        const velocity = Vector.abs(source.getVelocity()).coordinateSum();
        const item = container.getItem(source.selectedSlotIndex);

        if (item?.typeId !== colorWheel.typeId) {
            system.clearRun(dragId);
            return;
        }

        if (diff > e || (velocity > e && ticks > 4)) {
            Events.startUse.emit({
                player: source,
                initialViewDirection: initialViewDirection,
                initialViewLocation: viewStart,
                itemStack,
                blockRaycast,
            });
            system.clearRun(source.dragId);
            source.onRelease = "release";
        }

        if (ticks++ > 30) {
            system.clearRun(source.dragId);
        }
    });

    source.dragId = dragId;
});

world.afterEvents.itemReleaseUse.subscribe((data) => {
    const { source, itemStack, useDuration } = data;

    if (itemStack?.typeId !== colorWheel.typeId) return;

    const ticks = colorWheel.useDuration - useDuration;

    if (source.onRelease === "cancel") return;

    if (ticks < 30 && source.onRelease === "click") {
        const blockRaycast = source.getBlockFromViewDirection();
        const entityRaycast = source.getEntitiesFromViewDirection({
            ignoreBlockCollision: true,
        });

        system.clearRun(source.dragId);

        Events.click.emit({
            player: source,
            itemStack,
            blockRaycast,
            entityRaycast,
        });
    } else if (source.onRelease === "release") {
        Events.releaseUse.emit({
            player: source,
        });
    }
});

world.afterEvents.playerHotbarSelectedSlotChange.subscribe((data) => {
    const { player, previousSlotSelected } = data;
    const inventory = player.getComponent("inventory");

    if (!inventory) return;

    const container = inventory.container;
    const item = container.getItem(previousSlotSelected);

    if (item?.typeId !== colorWheel.typeId) return;

    Events.releaseUse.emit({
        player,
    });
});

world.afterEvents.entitySpawn.subscribe((data) => {
    const { entity } = data;

    if (!(entity instanceof Player)) return;

    Events.releaseUse.emit({
        player: entity,
    });
});

world.afterEvents.playerSwingStart.subscribe((data) => {
    const { swingSource, player, heldItemStack } = data;

    if (heldItemStack?.typeId !== colorWheel.typeId) return;
    if (swingSource !== "Attack") return;

    Events.punch.emit({
        player: player,
        itemStack: heldItemStack,
    });
});

export const Events: ItemEvents = {
    click: new MinPriorityEvent(),
    releaseUse: new Event(),
    startUse: new MinPriorityEvent(),
    punch: new Event(),
};
