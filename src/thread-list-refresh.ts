import {FocusedPerspectiveStore} from "mailspring-exports";

let _scheduled = false;

// The thread list rebuilds its query whenever FocusedPerspectiveStore triggers, and that
// rebuild calls perspective.threads() again, which is where the Inbox Assist filter applies.
// Emitting a change on the store is enough to re-run it without switching perspectives.
// Calls made in the same tick are coalesced into one refresh.
export function refreshThreadList() {
    if (_scheduled) {
        return;
    }
    _scheduled = true;

    setTimeout(() => {
        _scheduled = false;
        FocusedPerspectiveStore.trigger();
    }, 0);
}
