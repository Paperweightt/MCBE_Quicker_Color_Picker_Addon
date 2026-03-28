import { BlockRaycastHit, EntityRaycastHit, ItemStack, Player, Vector3 } from "@minecraft/server";
import { MinPriorityEvent, Event } from "../../utils/events";

export type ItemStartUseData = {
    player: Player;
    initialViewDirection: Vector3;
    initialViewLocation: Vector3;
    itemStack: ItemStack;
    blockRaycast: BlockRaycastHit | undefined;
};

export type ItemReleaseData = {
    player: Player;
};

export type ItemClickData = {
    player: Player;
    itemStack: ItemStack;
    blockRaycast: BlockRaycastHit | undefined;
    entityRaycast: EntityRaycastHit[];
};

export type ItemPunchData = {
    player: Player;
    itemStack: ItemStack;
};

export type ItemEvents = {
    click: MinPriorityEvent<ItemClickData>;
    releaseUse: Event<ItemReleaseData>;
    startUse: MinPriorityEvent<ItemStartUseData>;
    punch: Event<ItemPunchData>;
};
