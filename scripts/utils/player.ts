import { Player, system, Vector3, world } from "@minecraft/server";
import { PACK_ID } from "../constants.js";

export class PlayerId {
    static idToName: Record<string, string> = {};
    static propertyIdentifier = PACK_ID + ":player_id_to_name";

    static getName(playerId: string): string {
        return this.idToName[playerId];
    }

    static getAll(): { name: string; id: string }[] {
        return Object.entries(this.idToName).map(([id, name]) => {
            return { id, name };
        });
    }

    static save(): void {
        world.setDynamicProperty(this.propertyIdentifier, JSON.stringify(this.idToName));
    }

    static innit(): void {
        this.idToName = JSON.parse(
            (world.getDynamicProperty(this.propertyIdentifier) as string | undefined) || "{}"
        );
    }
}

system.run(() => {
    PlayerId.innit();
});

world.afterEvents.playerJoin.subscribe((data) => {
    const { playerId, playerName } = data;

    PlayerId.idToName[playerId] = playerName;
    PlayerId.save();
});

export class PlayerUtils {
    static getEyeLocation(player: Player): Vector3 {
        const headModelSize = 8;
        const headHeight = headModelSize / 32;
        const location = player.getHeadLocation();

        location.y += headHeight / 2 - 0.022;

        return location;
    }

    static dev(): Player {
        return world.getPlayers({ name: "Paperweightt192" })[0];
    }

    static id = PlayerId;
}
