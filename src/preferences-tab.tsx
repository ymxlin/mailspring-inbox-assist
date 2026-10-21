import {React} from "mailspring-exports";
import {CONFIG_KEYS, scrollToLatestEnabled, threadCountEnabled} from "./config-keys";
import {aiConfig, getApiKey, setApiKey} from "./ai/ai-settings";
import {chatCompletion} from "./ai/llm-client";
import {DEFAULT_MAX_CHARS, DEFAULT_SYSTEM_PROMPT, PROVIDERS, providerById} from "./ai/providers";

interface State {
    provider: string;
    baseUrl: string;
    model: string;
    systemPrompt: string;
    maxChars: number;
    apiKey: string;
    keySaved: boolean;
    testStatus: string;
    scrollToLatest: boolean;
    threadCount: boolean;
}

export default class InboxAssistPreferences extends React.Component<{}, State> {

    static displayName = "InboxAssistPreferences";

    constructor(props: {}) {
        super(props);
        this.state = {
            ...aiConfig(),
            apiKey: "",
            keySaved: false,
            testStatus: "",
            scrollToLatest: scrollToLatestEnabled(),
            threadCount: threadCountEnabled(),
        };
    }

    _toggle = (stateKey: "scrollToLatest" | "threadCount", configKey: string) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.checked;
            AppEnv.config.set(configKey, value);
            this.setState({[stateKey]: value} as any);
        };

    async componentDidMount() {
        const apiKey = await getApiKey();
        this.setState({apiKey, keySaved: true});
    }

    _set = (stateKey: keyof State, configKey: string) => (event: any) => {
        const value = event.target.value;
        this.setState({[stateKey]: value} as any);
        AppEnv.config.set(configKey, value);
    };

    _onProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const preset = providerById(event.target.value);
        if (!preset) {
            return;
        }
        AppEnv.config.set(CONFIG_KEYS.AI_PROVIDER, preset.id);

        if (preset.id === "custom") {
            this.setState({provider: preset.id});
            return;
        }
        AppEnv.config.set(CONFIG_KEYS.AI_BASE_URL, preset.baseUrl);
        AppEnv.config.set(CONFIG_KEYS.AI_MODEL, preset.model);
        this.setState({provider: preset.id, baseUrl: preset.baseUrl, model: preset.model});
    };

    // also runs on blur: Test connection uses the typed key, summaries use the saved one,
    // so an unsaved key would pass the test and then fail later
    _saveKey = async () => {
        if (this.state.keySaved) {
            return;
        }
        await setApiKey(this.state.apiKey.trim());
        this.setState({keySaved: true});
    };

    _test = async () => {
        this.setState({testStatus: "Testing…"});
        const {baseUrl, model, apiKey} = this.state;
        try {
            const reply = await chatCompletion({baseUrl, model, apiKey: apiKey.trim()}, [
                {role: "user", content: "Reply with the single word: OK"},
            ]);
            this.setState({testStatus: `✓ Connected. Model replied: ${reply.slice(0, 80)}`});
        } catch (err) {
            this.setState({testStatus: `✗ ${err?.message || err}`});
        }
    };

    _resetPrompt = () => {
        AppEnv.config.set(CONFIG_KEYS.AI_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT);
        this.setState({systemPrompt: DEFAULT_SYSTEM_PROMPT});
    };

    render() {
        const {
            provider, baseUrl, model, systemPrompt, maxChars, apiKey, keySaved, testStatus,
            scrollToLatest, threadCount,
        } = this.state;
        const preset = providerById(provider);

        return (
            <div className="container-inbox-assist">
                <section>
                    <h6>Reading</h6>
                    <div className="inbox-assist-checkbox">
                        <input id="inbox-assist-thread-count" type="checkbox"
                               checked={threadCount}
                               onChange={this._toggle("threadCount", CONFIG_KEYS.THREAD_COUNT)}/>
                        <label htmlFor="inbox-assist-thread-count">
                            Show a message-count badge on conversations in the thread list
                        </label>
                    </div>

                    <div className="inbox-assist-checkbox">
                        <input id="inbox-assist-scroll-to-latest" type="checkbox"
                               checked={scrollToLatest}
                               onChange={this._toggle("scrollToLatest", CONFIG_KEYS.SCROLL_TO_LATEST)}/>
                        <label htmlFor="inbox-assist-scroll-to-latest">
                            Scroll to the latest message when opening a conversation
                        </label>
                    </div>
                    <p className="inbox-assist-hint">
                        Off: conversations open at the top, with the oldest message (Mailspring's default).
                    </p>
                </section>

                <section>
                    <h6>AI summary</h6>
                    <p className="inbox-assist-hint">
                        Any OpenAI-compatible <code>/chat/completions</code> endpoint: a cloud API,
                        a mainland-China provider, or a model running locally (Ollama, LM Studio).
                        Email content is sent to the endpoint below.
                    </p>

                    <label>Provider</label>
                    <select value={provider} onChange={this._onProviderChange}>
                        {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>

                    <label>Base URL</label>
                    <input type="text" value={baseUrl} placeholder="https://host/v1"
                           onChange={this._set("baseUrl", CONFIG_KEYS.AI_BASE_URL)}/>

                    <label>Model</label>
                    <input type="text" value={model} onChange={this._set("model", CONFIG_KEYS.AI_MODEL)}/>

                    <label>API key {preset && !preset.needsKey ? "(usually not needed)" : ""}</label>
                    <div className="inbox-assist-row">
                        <input type="password" value={apiKey} placeholder="stored in the system keychain"
                               onChange={(e) => this.setState({apiKey: e.target.value, keySaved: false})}
                               onBlur={this._saveKey}/>
                        <button className="btn" onClick={this._saveKey}>{keySaved ? "Saved" : "Save key"}</button>
                    </div>

                    <div className="inbox-assist-row">
                        <button className="btn" onClick={this._test}>Test connection</button>
                        <span className="inbox-assist-hint">{testStatus}</span>
                    </div>

                    <label>Instructions (system prompt)</label>
                    <textarea rows={5} value={systemPrompt}
                              onChange={this._set("systemPrompt", CONFIG_KEYS.AI_SYSTEM_PROMPT)}/>
                    <div><a onClick={this._resetPrompt}>Reset to default</a></div>

                    <label>Max characters sent per thread</label>
                    <input type="number" min={1000} step={1000} value={maxChars}
                           placeholder={String(DEFAULT_MAX_CHARS)}
                           onChange={this._set("maxChars", CONFIG_KEYS.AI_MAX_CHARS)}/>
                </section>
            </div>
        );
    }
}
