import {React} from "mailspring-exports";
import {ButtonDropdown, Menu, RetinaImg} from "mailspring-component-kit";
import {CONFIG_KEYS, threadFilter, ThreadFilter} from "./config-keys";

interface FilterOption {
    value: ThreadFilter;
    label: string;
    icon: string;
}

const OPTIONS: FilterOption[] = [
    {value: "all", label: "All mail", icon: "inbox.png"},
    {value: "unread", label: "Unread only", icon: "unread.png"},
    {value: "starred", label: "Starred only", icon: "starred.png"},
];

// Toolbar dropdown: All / Unread only / Starred only (mutually exclusive).
// Built on Mailspring's ButtonDropdown + Menu so it follows the active theme.
export default class FilterSelect extends React.Component<{}, { value: ThreadFilter }> {

    static displayName = "InboxAssistFilterSelect";

    private _disposer: any = null;

    state = {value: threadFilter()};

    componentDidMount() {
        this._disposer = AppEnv.config.observe(CONFIG_KEYS.THREAD_FILTER, () => {
            this.setState({value: threadFilter()});
        });
    }

    componentWillUnmount() {
        this._disposer?.dispose?.();
        this._disposer = null;
    }

    _onSelect = (option: FilterOption) => {
        AppEnv.config.set(CONFIG_KEYS.THREAD_FILTER, option.value);
    };

    _renderOption = (option: FilterOption) => (
        <span className="inbox-assist-filter-option">
            <RetinaImg name={option.icon} mode={RetinaImg.Mode.ContentIsMask}/>
            <span>{option.label}</span>
        </span>
    );

    render() {
        const {value} = this.state;
        const current = OPTIONS.find((o) => o.value === value) || OPTIONS[0];

        return (
            <ButtonDropdown
                className={`inbox-assist-filter ${value !== "all" ? "active" : ""}`}
                style={{order: 101}}
                primaryTitle={`Thread filter: ${current.label}`}
                primaryItem={this._renderOption(current)}
                closeOnMenuClick
                attachment="right"
                menu={
                    <Menu
                        items={OPTIONS}
                        itemKey={(o: FilterOption) => o.value}
                        itemChecked={(o: FilterOption) => o.value === value}
                        itemContent={this._renderOption}
                        onSelect={this._onSelect}
                    />
                }
            />
        );
    }
}
