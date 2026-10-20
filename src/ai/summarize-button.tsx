import {Actions, MessageStore, React} from "mailspring-exports";
import SummaryPopover from "./summary-popover";

// Message-list toolbar button; opens a popover that summarizes the open thread.
export default class SummarizeButton extends React.Component<{}> {

    static displayName = "InboxAssistSummarizeButton";

    _onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        const originRect = event.currentTarget.getBoundingClientRect();
        Actions.openPopover(<SummaryPopover threadId={MessageStore.threadId()}/>, {originRect, direction: "down"});
    };

    render() {
        return (
            <button
                className="btn btn-toolbar inbox-assist-summarize"
                style={{order: -100}}
                title="Summarize this email with AI"
                onClick={this._onClick}>
                ✨ Summarize
            </button>
        );
    }
}
