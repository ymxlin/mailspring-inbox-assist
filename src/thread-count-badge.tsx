import {React} from "mailspring-exports";
import {threadCountEnabled} from "./config-keys";

declare const __non_webpack_require__: NodeRequire;

const PATCHED = "__inboxAssistCountPatched";
const MODULE_NAME = /[\\/]thread-list-participants\.(js|ts)$/;

// Shows a message-count badge next to the participants of every multi-message
// conversation in the thread list, in both the wide and narrow layouts.
//
// Mailspring already appends " (N)" to the participants text, but it's the first thing
// cut off by the ellipsis. There's no plugin slot beside the participants, so this
// wraps the ThreadListParticipants component in its already-loaded module (found in
// Node's require cache, like the right-click menu hook). The thread-list columns read
// that export at render time, so the wrapper takes effect on the next render.
export class ThreadCountBadgeFeature {

    private _exports: any = null;
    private _original: any = null;

    enable() {
        const exported = findModuleExports();
        const original = exported?.default;
        if (!original) {
            console.warn("[mailspring-inbox-assist] thread list participants not found; message-count badge disabled");
            return;
        }
        if (original[PATCHED]) {
            return;
        }

        const Wrapped: any = React.memo(
            (props: any) => withCountBadge(original, props),
            (prev: any, next: any) => prev.thread === next.thread,
        );
        Wrapped.displayName = original.displayName || "ThreadListParticipants";
        Wrapped[PATCHED] = true;

        try {
            exported.default = Wrapped;
        } catch (e) {
            console.warn("[mailspring-inbox-assist] couldn't wrap thread list participants", e);
            return;
        }

        this._exports = exported;
        this._original = original;
    }

    disable() {
        if (this._exports && this._original) {
            this._exports.default = this._original;
        }
        this._exports = null;
        this._original = null;
    }
}

function withCountBadge(Original: any, props: any) {
    const participants = <Original {...props}/>;
    const {thread} = props;

    if (!threadCountEnabled() || !thread) {
        return participants;
    }

    const count = (thread.__messages || []).filter((m: any) => !m.draft).length;
    if (count < 2) {
        return participants;
    }

    return (
        <div className="inbox-assist-participants">
            {participants}
            <span
                className={`inbox-assist-thread-count ${thread.unread ? "unread" : ""}`}
                title={`${count} messages in this conversation`}>
                {count}
            </span>
        </div>
    );
}

function findModuleExports(): any {
    const cache = __non_webpack_require__.cache || {};
    const key = Object.keys(cache).find((k) => MODULE_NAME.test(k));
    return key ? cache[key].exports : null;
}
