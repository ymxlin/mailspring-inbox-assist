// In-memory cache of the most recent summaries, one entry per thread.
// Kept in memory only (cleared on restart / reload) so email summaries never touch disk.
const MAX_ENTRIES = 3;

interface Entry<T> {
    // fingerprint of everything that affects the summary; a mismatch means it's stale
    fingerprint: string;
    value: T;
}

export class SummaryCache<T> {

    // Map keeps insertion order: first key = least recently used
    private _entries = new Map<string, Entry<T>>();

    get(threadId: string, fingerprint: string): T | null {
        const entry = this._entries.get(threadId);
        if (!entry || entry.fingerprint !== fingerprint) {
            return null;
        }
        // refresh recency
        this._entries.delete(threadId);
        this._entries.set(threadId, entry);
        return entry.value;
    }

    set(threadId: string, fingerprint: string, value: T) {
        this._entries.delete(threadId);
        this._entries.set(threadId, {fingerprint, value});

        while (this._entries.size > MAX_ENTRIES) {
            this._entries.delete(this._entries.keys().next().value);
        }
    }
}
