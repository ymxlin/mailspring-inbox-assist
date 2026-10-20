import {Actions, React} from "mailspring-exports";
import SummaryPopover from "./summary-popover";

interface Props {
    // provided by Mailspring's thread-actions toolbar (same props as Archive / Trash)
    items?: any[];
    thread?: any;
}

// Registered with the message-list thread-actions role, so it renders in the same
// button group as Archive / Trash / Star for the open thread.
export default class SummarizeButton extends React.Component<Props> {

    static displayName = "InboxAssistSummarizeButton";

    _threadId() {
        const {items = [], thread} = this.props;
        return items.length === 1 ? (thread || items[0])?.id : null;
    }

    _onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        const threadId = this._threadId();
        if (!threadId) {
            return;
        }
        const originRect = event.currentTarget.getBoundingClientRect();
        Actions.openPopover(<SummaryPopover threadId={threadId}/>, {originRect, direction: "down"});
    };

    render() {
        // summarizing several selected threads at once isn't supported
        if (!this._threadId()) {
            return null;
        }

        return (
            <button
                className="btn btn-toolbar inbox-assist-summarize"
                title="Summarize this email with AI"
                onClick={this._onClick}>
                ✨ Summarize
            </button>
        );
    }
}
