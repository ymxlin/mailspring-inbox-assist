import {React} from "mailspring-exports";
import {scrollToLatestEnabled} from "./config-keys";

interface Props {
    // exposed by Mailspring to every MessageListHeaders component
    thread?: any;
    messages?: any[];
}

// How long to keep the latest message pinned while bodies above it finish loading.
// Message bodies render in iframes that grow after load, which pushes the target down.
const PIN_MS = 3000;
const TOP_GAP = 8;

// Invisible component injected into the message list's scroll region (role
// "MessageListHeaders"). When a thread opens, it scrolls the reading pane to the
// latest message instead of leaving it at the oldest one at the top.
export default class ScrollToLatest extends React.Component<Props> {

    static displayName = "InboxAssistScrollToLatest";
    static containerRequired = false;

    private _marker: HTMLElement | null = null;
    private _scrolledThreadId: string | null = null;
    private _stopPinning: (() => void) | null = null;

    componentDidMount() {
        this._maybeScroll();
    }

    componentDidUpdate() {
        this._maybeScroll();
    }

    componentWillUnmount() {
        this._stopPinning?.();
    }

    _maybeScroll() {
        const {thread, messages = []} = this.props;
        if (!thread || thread.id === this._scrolledThreadId) {
            return;
        }
        // messages for the new thread load after the thread itself; wait for them
        if (messages.length === 0 || messages[0].threadId !== thread.id) {
            return;
        }

        this._scrolledThreadId = thread.id;
        this._stopPinning?.();

        if (!scrollToLatestEnabled() || messages.length < 2) {
            return;
        }

        // let the message list render the new thread's messages first
        window.requestAnimationFrame(() => this._pinToLatest(thread.id));
    }

    _pinToLatest(threadId: string) {
        const viewport = (this._marker?.closest(".scroll-region-content")
            || document.querySelector(".messages-wrap .scroll-region-content")) as HTMLElement | null;
        if (!viewport || this._scrolledThreadId !== threadId) {
            return;
        }
        // the custom scrollbar sits beside the viewport, inside the region root
        const region = (viewport.closest(".scroll-region") || viewport) as HTMLElement;

        const scroll = () => {
            const items = viewport.querySelectorAll(".message-item-wrap:not(.draft)");
            const latest = items[items.length - 1] as HTMLElement | undefined;
            if (!latest) {
                return;
            }
            const offset = latest.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
            viewport.scrollTop += offset - TOP_GAP;
        };

        scroll();

        // keep re-aligning as iframes above grow, until the user takes over or time runs out
        const content = viewport.firstElementChild || viewport;
        const observer = new ResizeObserver(scroll);
        observer.observe(content);

        const userEvents = ["wheel", "mousedown", "keydown", "touchstart"];
        const stop = () => {
            observer.disconnect();
            clearTimeout(timer);
            userEvents.forEach((e) => region.removeEventListener(e, stop, true));
            if (this._stopPinning === stop) {
                this._stopPinning = null;
            }
        };
        const timer = setTimeout(stop, PIN_MS);
        userEvents.forEach((e) => region.addEventListener(e, stop, true));

        this._stopPinning = stop;
    }

    render(): any {
        // a zero-size marker, only used to find the surrounding scroll region
        return (
            <span
                className="inbox-assist-scroll-marker"
                style={{display: "none"}}
                ref={(el) => (this._marker = el)}/>
        );
    }
}
