import { system, world } from "@minecraft/server";

(globalThis as any).__debug = {
  world,
};

let i = 0;

system.run(() => {
  console.log(i++);
  console.log(i++);
  console.log(i++);
  console.log(i++);
  console.log(i++);
  console.log(i++);
});

system.run(() => {
  const player = world.getPlayers({ name: "none" })[0];

  player.addTag("none"); // throw property of undefined error
});
