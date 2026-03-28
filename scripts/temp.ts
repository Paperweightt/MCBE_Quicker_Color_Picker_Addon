import { Vector3Utils } from "@minecraft/math";
import { Entity, EntityRaycastOptions, Player, system, Vector3, world } from "@minecraft/server";
import { MinecraftEntityTypes, MinecraftItemTypes } from "@minecraft/vanilla-data";

world.afterEvents.entitySpawn.subscribe((data) => {
  const { entity } = data;

  new Selectable(entity);
});

world.afterEvents.itemUse.subscribe((data) => {
  const { source, itemStack } = data;

  if (MinecraftItemTypes.Apple !== itemStack.typeId) return;

  const query: EntityRaycastOptions = {
    excludeTypes: [MinecraftEntityTypes.Player],
  };

  const entityRayHit = source.getEntitiesFromViewDirection(query);

  if (!entityRayHit.length) return;

  const entity = entityRayHit[0].entity;

  console.log("grabbed an entity");

  Selectable.get(entity.id)?.toggleSelectRelease(source);
});

system.runInterval(() => {
  Selectable.runTick();
});

class Event<T> {
  private readonly listeners: Set<(data: T) => void> = new Set();

  subscribe(fn: (data: T) => void): void {
    this.listeners.add(fn);
  }

  unsubscribe(fn: (data: T) => void): void {
    this.listeners.delete(fn);
  }

  emit(data: T): void {
    for (const fn of this.listeners) {
      fn(data);
    }
  }
}

type LocationChange = { readonly prev: Readonly<Vector3>; readonly new: Readonly<Vector3> };
type EventDefault = { readonly owner: Player; cancel: boolean };

type DragData = EventDefault & { readonly location: LocationChange };
type ReleaseData = EventDefault & { readonly location: Readonly<Vector3> };
type SelectData = EventDefault & { readonly location: Readonly<Vector3> };

class Selectable {
  static readonly list: Record<string, Selectable> = {};

  static getAll(): Selectable[] {
    return Object.values(Selectable.list);
  }

  static get(id: Readonly<string>): Selectable {
    return this.list[id];
  }

  private static remove(id: Readonly<string>): boolean {
    if (this.list[id]) {
      delete this.list[id];
      return true;
    }
    return false;
  }

  private static add(selectable: Selectable): void {
    this.list[selectable.id] = selectable;
  }

  static runTick(): void {
    for (const selectable of Selectable.getAll()) {
      if (!selectable.entity.isValid) {
        this.remove(selectable.id);
        return;
      }
      selectable.drag();
    }
  }

  private readonly id: string;
  private owner: Player | undefined;
  private distance: number | undefined;

  readonly events = {
    drag: new Event<EventDefault & { location: LocationChange }>(),
    release: new Event<EventDefault & { location: Vector3 }>(),
    select: new Event<EventDefault & { location: Vector3 }>(),
  };

  constructor(private entity: Entity) {
    this.id = entity.id;

    Selectable.add(this);
  }

  private setOwner(owner: Player): void {
    this.owner = owner;
    this.distance = Vector3Utils.distance(this.entity.location, owner.getHeadLocation());
  }

  private removeOwner(): void {
    this.owner = undefined;
    this.distance = undefined;
  }

  drag(): void {
    if (!this.owner) return;

    const newLocation = this.getNewLocation();

    this.events.drag.emit({
      owner: this.owner,
      cancel: false,
      location: {
        prev: this.entity.location,
        new: newLocation,
      },
    });

    this.entity.teleport(newLocation);
  }

  release(): void {
    this.events.release.emit({
      owner: this.owner!,
      cancel: false,
      location: this.entity.location,
    });

    this.removeOwner();
  }

  select(owner: Player): void {
    this.events.select.emit({
      owner: owner,
      cancel: false,
      location: this.entity.location,
    });

    this.setOwner(owner);
  }

  toggleSelectRelease(owner: Player): boolean {
    if (this.owner) {
      this.release();
      return false;
    } else {
      this.select(owner);
      return true;
    }
  }

  private getNewLocation(): Vector3 {
    return Vector3Utils.add(
      this.owner!.getHeadLocation(),
      Vector3Utils.scale(this.owner!.getViewDirection(), this.distance!)
    );
  }
}
