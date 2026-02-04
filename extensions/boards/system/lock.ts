/**
 * File locking mechanism for board operations
 *
 * Uses a promise queue to ensure exclusive access to files
 */

interface LockEntry {
    promise: Promise<void>;
    resolve: () => void;
}

const lockQueues = new Map<string, LockEntry[]>();

export async function acquireLock(filePath: string): Promise<void> {
    // Get or create the queue for this file
    if (!lockQueues.has(filePath)) {
        lockQueues.set(filePath, []);
    }
    const queue = lockQueues.get(filePath)!;

    // If there's someone ahead of us, wait for the last one
    const waitFor = queue.length > 0 ? queue[queue.length - 1].promise : Promise.resolve();

    // Create our entry
    let resolveOur: () => void;
    const ourPromise = new Promise<void>(resolve => {
        resolveOur = resolve;
    });

    const entry: LockEntry = {
        promise: ourPromise,
        resolve: resolveOur!
    };

    queue.push(entry);

    // Wait for our turn
    await waitFor;
}

export function releaseLock(filePath: string): void {
    const queue = lockQueues.get(filePath);
    if (!queue || queue.length === 0) return;

    // Remove ourselves from the front of the queue and resolve
    const entry = queue.shift();
    entry?.resolve();

    // Clean up empty queues
    if (queue.length === 0) {
        lockQueues.delete(filePath);
    }
}
