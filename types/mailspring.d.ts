// Minimal ambient types so the plugin builds without a Mailspring source checkout.
// The real modules are provided by the Mailspring host at runtime.
declare module "mailspring-exports" {
    export const React: typeof import("react");
    export const Actions: any;
    export const ComponentRegistry: any;
    export const DatabaseStore: any;
    export const Message: any;
    export const FocusedPerspectiveStore: any;
    export const KeyManager: any;
    export const MailboxPerspective: any;
    export const MessageStore: any;
    export const PreferencesUIStore: any;
    export const QuotedHTMLTransformer: any;
    export const Thread: any;
    export const WorkspaceStore: any;
}

declare module "mailspring-component-kit" {
    export const ButtonDropdown: any;
    export const Menu: any;
    export const RetinaImg: any;
}

declare const AppEnv: {
    config: {
        get(key: string): any;
        set(key: string, value: any): void;
        observe(key: string, cb: (value: any) => void): { dispose(): void };
    };
};
