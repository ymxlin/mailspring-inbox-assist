import {FocusedPerspectiveStore, Thread} from "mailspring-exports";
import {threadFilter} from "./config-keys";

const PATCHED = "__inboxAssistThreadsPatched";

// Hooks FocusedPerspectiveStore.current() so every perspective handed to the thread list
// gets its threads() wrapped. The wrapper reads the filter setting on each call:
//  - search perspectives get is:unread / is:starred appended to their query string
//  - folder / label / starred perspectives get an extra matcher on their thread query
export class ThreadFiltersFeature {

    private _active = false;
    private _originalCurrent: any = null;
    private _hadOwnCurrent = false;

    enable() {
        if (this._active) {
            return;
        }
        this._active = true;

        const store = FocusedPerspectiveStore as any;
        const feature = this;
        const original = store.current;

        this._hadOwnCurrent = Object.prototype.hasOwnProperty.call(store, "current");
        this._originalCurrent = original;

        store.current = function currentWithInboxAssist(this: any, ...args: any[]) {
            const perspective = original.apply(this, args);
            feature.patchPerspective(perspective);
            return perspective;
        };

        console.log("[mailspring-inbox-assist] thread filters enabled");
    }

    disable() {
        if (!this._active) {
            return;
        }
        this._active = false;

        const store = FocusedPerspectiveStore as any;
        if (this._hadOwnCurrent) {
            store.current = this._originalCurrent;
        } else {
            delete store.current;
        }
        this._originalCurrent = null;

        console.log("[mailspring-inbox-assist] thread filters disabled");
    }

    private patchPerspective(perspective: any) {
        if (!perspective || perspective[PATCHED] || typeof perspective.threads !== "function") {
            return;
        }

        const feature = this;
        const originalThreads = perspective.threads;

        // instance-level override: leaves the perspective classes untouched
        perspective.threads = function threadsWithInboxAssist(this: any, ...args: any[]) {
            // already-patched instances outlive disable(), so check on every call
            if (!feature._active) {
                return originalThreads.apply(this, args);
            }

            if (isSearchPerspective(this)) {
                const shadow = Object.create(this);
                shadow.searchQuery = buildSearchQuery(this);
                return originalThreads.apply(shadow, args);
            }

            return applyFilter(originalThreads.apply(this, args));
        };

        perspective[PATCHED] = true;
    }
}

function isSearchPerspective(perspective: any) {
    return typeof perspective.searchQuery === "string" && !!perspective.sourcePerspective;
}

function buildSearchQuery(perspective: any): string {
    const filter = threadFilter();
    return filter === "all"
        ? perspective.searchQuery
        : `(${perspective.searchQuery}) AND is:${filter}`;
}

function applyFilter(subscription: any) {
    const filter = threadFilter();

    if (filter === "all" || !subscription || typeof subscription.replaceQuery !== "function") {
        return subscription;
    }

    // only thread lists (skips drafts and other non-thread perspectives)
    const query = subscription.query();
    if (!query || query._klass !== Thread) {
        return subscription;
    }

    const matcher = filter === "unread"
        ? Thread.attributes.unread.equal(true)
        : Thread.attributes.starred.equal(true);

    // clone() returns an un-finalized copy, so it can still take more matchers
    subscription.replaceQuery(query.clone().where([matcher]));
    return subscription;
}
