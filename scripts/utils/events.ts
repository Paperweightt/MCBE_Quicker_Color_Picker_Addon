export class Event<T> {
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

type MinPriorityEventListener<T> = {
    priority: number | ((data: T) => number);
    callback: (data: T) => void;
};

export class MinPriorityEvent<T> {
    private listeners: MinPriorityEventListener<T>[] = [];

    subscribe({ priority, callback }: MinPriorityEventListener<T>) {
        this.listeners.push({ priority, callback });
    }

    unsubscribe(callback: (data: T) => number) {
        this.listeners = this.listeners.filter((l) => l.callback !== callback);
    }

    emit(data: T) {
        let best = null;
        let bestPriority = Infinity;

        for (const listener of this.listeners) {
            const p = typeof listener.priority === "function" ? listener.priority(data) : listener.priority;

            if (p < bestPriority) {
                bestPriority = p;
                best = listener.callback;
            }
        }

        if (best) best(data);
    }
}
