import * as mc from "@minecraft/server";

declare module "@minecraft/server" {
    interface Player {
        onRelease: "click" | "release" | "cancel";
        dragId: number;
    }
}
