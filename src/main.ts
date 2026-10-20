import {ComponentRegistry, PreferencesUIStore, WorkspaceStore} from "mailspring-exports";
import {LIST_KEYS} from "./config-keys";
import {refreshThreadList} from "./thread-list-refresh";
import {ThreadFiltersFeature} from "./thread-filters-feature";
import FilterSelect from "./filter-select";
import SummarizeButton from "./ai/summarize-button";
import {ThreadContextMenuFeature} from "./ai/thread-context-menu";
import InboxAssistPreferences from "./preferences-tab";

const threadFilters = new ThreadFiltersFeature();
const threadContextMenu = new ThreadContextMenuFeature();

// every *.Toolbar location renders inside that column's div.item-container
const TOOLBAR_ITEMS: [any, any][] = [
    [FilterSelect, WorkspaceStore.Location.ThreadList.Toolbar],
    [SummarizeButton, WorkspaceStore.Location.MessageList.Toolbar],
];

const preferencesTab = new PreferencesUIStore.TabItem({
    tabId: "InboxAssist",
    displayName: "Inbox Assist",
    componentClassFn: () => InboxAssistPreferences,
    order: 100,
});

let _disposers: any[] = [];

export function activate() {
    threadFilters.enable();
    threadContextMenu.enable();

    for (const [component, location] of TOOLBAR_ITEMS) {
        ComponentRegistry.register(component, {location});
    }

    PreferencesUIStore.registerPreferencesTab(preferencesTab);

    // observe() fires immediately too; the refresh guard collapses those into one refresh
    _disposers = LIST_KEYS.map((key) =>
        AppEnv.config.observe(key, () => refreshThreadList())
    );

    console.log("[mailspring-inbox-assist] initialized");
}

export function deactivate() {
    for (const disposer of _disposers) {
        disposer?.dispose?.();
    }
    _disposers = [];

    for (const [component] of TOOLBAR_ITEMS) {
        ComponentRegistry.unregister(component);
    }

    PreferencesUIStore.unregisterPreferencesTab(preferencesTab.tabId);

    threadContextMenu.disable();
    threadFilters.disable();
    refreshThreadList();
}
