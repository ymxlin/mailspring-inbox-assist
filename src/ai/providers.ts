// Presets for OpenAI-compatible endpoints (POST {baseUrl}/chat/completions).
// Picking a preset only pre-fills base URL and model; both stay editable.
export interface ProviderPreset {
    id: string;
    label: string;
    baseUrl: string;
    model: string;
    needsKey: boolean;
}

export const PROVIDERS: ProviderPreset[] = [
    // international / cloud
    {id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", needsKey: true},
    {id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", needsKey: true},
    // mainland China
    {id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", needsKey: true},
    {id: "qwen", label: "Qwen (DashScope)", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", needsKey: true},
    {id: "moonshot", label: "Moonshot / Kimi", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k", needsKey: true},
    {id: "zhipu", label: "Zhipu GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash", needsKey: true},
    // local, on this machine
    {id: "ollama", label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", model: "llama3.1", needsKey: false},
    {id: "lmstudio", label: "LM Studio (local)", baseUrl: "http://localhost:1234/v1", model: "local-model", needsKey: false},
    {id: "custom", label: "Custom", baseUrl: "", model: "", needsKey: false},
];

export const DEFAULT_PROVIDER = PROVIDERS.find((p) => p.id === "ollama");

export const DEFAULT_SYSTEM_PROMPT = [
    "You summarize email threads for a busy reader.",
    "Reply with: a one-line TL;DR, then 3-5 bullet key points,",
    "then any action items, questions or deadlines for the reader (or \"None\").",
    "Write in the same language as the email. Be concise; do not invent facts.",
].join(" ");

export const DEFAULT_MAX_CHARS = 12000;

export function providerById(id: string) {
    return PROVIDERS.find((p) => p.id === id);
}
