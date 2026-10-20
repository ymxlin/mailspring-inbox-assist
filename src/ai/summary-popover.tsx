import {Actions, React} from "mailspring-exports";
import {summarizeThread, SummaryResult} from "./summarize";
import {renderMarkdown} from "./markdown";

interface Props {
    threadId: string;
}

interface State {
    loading: boolean;
    result: SummaryResult | null;
    error: string | null;
    copied: boolean;
}

export default class SummaryPopover extends React.Component<Props, State> {

    static displayName = "InboxAssistSummaryPopover";

    private _mounted = false;

    state: State = {loading: true, result: null, error: null, copied: false};

    componentDidMount() {
        this._mounted = true;
        document.addEventListener("keydown", this._onKeyDown);
        this._run();
    }

    componentWillUnmount() {
        this._mounted = false;
        document.removeEventListener("keydown", this._onKeyDown);
    }

    _onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            this._close();
        }
    };

    _close = () => {
        Actions.closePopover();
    };

    _retry = () => this._run({force: true});

    _run = async ({force = false} = {}) => {
        this.setState({loading: true, result: null, error: null, copied: false});
        try {
            const result = await summarizeThread(this.props.threadId, {force});
            if (this._mounted) {
                this.setState({loading: false, result});
            }
        } catch (err) {
            if (this._mounted) {
                this.setState({loading: false, error: err?.message || String(err)});
            }
        }
    };

    _copy = () => {
        const {result} = this.state;
        if (!result) {
            return;
        }
        // Mailspring's renderer code reaches the clipboard through @electron/remote
        require("@electron/remote").clipboard.writeText(result.summary);
        this.setState({copied: true});
    };

    _openPreferences = () => {
        Actions.closePopover();
        Actions.switchPreferencesTab("InboxAssist");
        Actions.openPreferences();
    };

    render() {
        const {loading, result, error, copied} = this.state;

        return (
            // focusable root: Mailspring's popover focuses the first [tabIndex] element on open
            // and closes itself when focus leaves it (click outside, or switching apps)
            <div className="inbox-assist-summary" tabIndex={-1}>
                <div className="inbox-assist-summary-header">Summary</div>

                {loading && <div className="inbox-assist-summary-status">Summarizing…</div>}

                {error && (
                    <div className="inbox-assist-summary-error">
                        {error}
                        <div>
                            <a onClick={this._openPreferences}>Open Inbox Assist preferences</a>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="inbox-assist-summary-body">
                        {renderMarkdown(result.summary)}
                        <div className="inbox-assist-summary-meta">
                            {result.model}
                            {result.cached ? " · cached, Retry to regenerate" : ""}
                            {result.truncated ? " · long thread, only the latest part was sent" : ""}
                        </div>
                    </div>
                )}

                <div className="inbox-assist-summary-actions">
                    {result && <button className="btn" onClick={this._copy}>{copied ? "Copied" : "Copy"}</button>}
                    {!loading && <button className="btn" onClick={this._retry}>Retry</button>}
                    <button className="btn" onClick={this._close}>Close</button>
                </div>
            </div>
        );
    }
}
