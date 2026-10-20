import {Actions, React} from "mailspring-exports";
import SummaryPopover from "./summary-popover";

declare const __non_webpack_require__: NodeRequire;

const PATCHED = "__inboxAssistSummarizePatched";
const MODULE_NAME = /[\\/]thread-list-context-menu\.(js|ts)$/;

// Adds "Summarize with AI" to the thread list's right-click menu.
// Mailspring doesn't export that menu, so this finds the already-loaded module in Node's
// require cache (webpack's own `require` would only see this bundle) and wraps
// menuItemTemplate() on its prototype.
export class ThreadContextMenuFeature {

    private _proto: any = null;
    private _original: any = null;
    private _lastClick = {x: 0, y: 0};

    enable() {
        // remember where the menu was opened, to anchor the popover there
        document.addEventListener("contextmenu", this._onContextMenu, true);

        const MenuClass = findMenuClass();
        if (!MenuClass) {
            console.warn("[mailspring-inbox-assist] thread list context menu not found; right-click item disabled");
            return;
        }

        const proto = MenuClass.prototype;
        if (proto.menuItemTemplate[PATCHED]) {
            return;
        }

        const feature = this;
        const original = proto.menuItemTemplate;

        proto.menuItemTemplate = function menuItemTemplateWithSummary(this: any, ...args: any[]) {
            return original.apply(this, args).then((items: any[]) => {
                if (!this.threadIds || this.threadIds.length !== 1) {
                    return items;
                }
                const threadId = this.threadIds[0];
                return [
                    {label: "✨ Summarize with AI", click: () => feature.openSummary(threadId)},
                    {type: "separator"},
                    ...items,
                ];
            });
        };
        proto.menuItemTemplate[PATCHED] = true;

        this._proto = proto;
        this._original = original;
    }

    disable() {
        document.removeEventListener("contextmenu", this._onContextMenu, true);

        if (this._proto && this._original) {
            this._proto.menuItemTemplate = this._original;
        }
        this._proto = null;
        this._original = null;
    }

    private _onContextMenu = (event: MouseEvent) => {
        this._lastClick = {x: event.clientX, y: event.clientY};
    };

    private openSummary(threadId: string) {
        const {x, y} = this._lastClick;
        const originRect = {left: x, top: y, right: x + 1, bottom: y + 1, width: 1, height: 1};
        Actions.openPopover(React.createElement(SummaryPopover, {threadId}), {
            originRect,
            direction: "right",
            fallbackDirection: "down",
        });
    }
}

function findMenuClass(): any {
    const cache = __non_webpack_require__.cache || {};
    const key = Object.keys(cache).find((k) => MODULE_NAME.test(k));
    const exported = key && cache[key].exports;
    const MenuClass = exported && (exported.default || exported);
    return MenuClass && MenuClass.prototype && typeof MenuClass.prototype.menuItemTemplate === "function"
        ? MenuClass
        : null;
}
