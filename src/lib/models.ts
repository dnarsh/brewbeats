export interface ModelConfig {
  id: string;
  name: string;
  type: 'chat' | 'reasoning' | 'code';
  speed: number; // tokens/s
  tier: 'fast' | 'balanced' | 'powerful';
}

export const LOCAL_MODELS: ModelConfig[] = [
  // === FAST TIER (65+ t/s) ===
  { id: 'openai/gpt-oss-20b', name: 'Standard 20B', type: 'chat', speed: 168, tier: 'fast' },
  { id: 'google/gemma-3-1b-it', name: 'Mini 1B', type: 'chat', speed: 141, tier: 'fast' },
  { id: 'meta/llama-3.1-8b-instruct', name: 'Standard 8B', type: 'chat', speed: 106, tier: 'fast' },
  { id: 'openai/gpt-oss-120b', name: 'Standard 120B', type: 'chat', speed: 99, tier: 'fast' },
  { id: 'google/gemma-3n-e2b-it', name: 'Mini E2B', type: 'chat', speed: 95, tier: 'fast' },
  { id: 'z-ai/glm4.7', name: 'GLM 4.7', type: 'chat', speed: 94, tier: 'fast' },
  { id: 'stepfun-ai/step-3.5-flash', name: 'Flash Reasoning', type: 'reasoning', speed: 92, tier: 'fast' },
  { id: 'google/gemma-3-4b-it', name: 'Mini 4B', type: 'chat', speed: 90, tier: 'fast' },
  { id: 'local/nano-9b-v2', name: 'Pro Nano 9B', type: 'chat', speed: 90, tier: 'fast' },
  { id: 'meta/llama-3.2-1b-instruct', name: 'Micro 1B', type: 'chat', speed: 88, tier: 'fast' },
  { id: 'google/gemma-3n-e4b-it', name: 'Mini E4B', type: 'chat', speed: 85, tier: 'fast' },
  { id: 'meta/llama-3.2-3b-instruct', name: 'Mini 3B', type: 'chat', speed: 85, tier: 'fast' },
  { id: 'deepseek-ai/deepseek-r1-distill-llama-8b', name: 'Pro Reasoning 8B', type: 'reasoning', speed: 82, tier: 'fast' },
  { id: 'google/gemma-2-2b-it', name: 'Mini 2B', type: 'chat', speed: 80, tier: 'fast' },
  { id: 'deepseek-ai/deepseek-r1-distill-qwen-7b', name: 'Pro Reasoning 7B', type: 'reasoning', speed: 78, tier: 'fast' },
  { id: 'microsoft/phi-3-mini-128k-instruct', name: 'Micro 128K', type: 'chat', speed: 75, tier: 'fast' },
  { id: 'meta/llama3-8b-instruct', name: 'Standard 8B v3', type: 'chat', speed: 75, tier: 'fast' },
  { id: 'microsoft/phi-3.5-mini-instruct', name: 'Micro 3.5', type: 'chat', speed: 72, tier: 'fast' },
  { id: 'local/nano-4b-v1.1', name: 'Pro Nano 4B', type: 'chat', speed: 70, tier: 'fast' },
  { id: 'microsoft/phi-3-mini-4k-instruct', name: 'Micro 4K', type: 'chat', speed: 70, tier: 'fast' },
  { id: 'local/nano-8b-v1', name: 'Pro Nano 8B', type: 'chat', speed: 70, tier: 'fast' },
  { id: 'qwen/qwen3-next-80b-a3b-thinking', name: 'Pro Reasoning 80B', type: 'reasoning', speed: 70, tier: 'fast' },
  { id: 'local/mini-4b-instruct', name: 'Pro Mini 4B', type: 'chat', speed: 68, tier: 'fast' },
  { id: 'qwen/qwen2.5-7b-instruct', name: 'Standard 7B', type: 'chat', speed: 65, tier: 'fast' },
  { id: 'microsoft/phi-4-mini-instruct', name: 'Micro 4', type: 'chat', speed: 65, tier: 'fast' },
  { id: 'qwen/qwen2.5-coder-7b-instruct', name: 'Coder 7B', type: 'code', speed: 65, tier: 'fast' },

  // === BALANCED TIER (35-64 t/s) ===
  { id: 'qwen/qwen3.5-122b-a10b', name: 'Standard 122B', type: 'chat', speed: 55, tier: 'balanced' },
  { id: 'local/minitron-8b-8k-instruct', name: 'Mistral Mini 8B', type: 'chat', speed: 62, tier: 'balanced' },
  { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B', type: 'chat', speed: 60, tier: 'balanced' },
  { id: 'meta/llama-4-maverick-17b-128e-instruct', name: 'Maverick 17B', type: 'chat', speed: 60, tier: 'balanced' },
  { id: 'microsoft/phi-3-small-128k-instruct', name: 'Micro Small', type: 'chat', speed: 60, tier: 'balanced' },
  { id: 'qwen/qwen2-7b-instruct', name: 'Standard 7B v2', type: 'chat', speed: 60, tier: 'balanced' },
  { id: 'meta/llama-3.3-70b-instruct', name: 'Standard 70B v3.3', type: 'chat', speed: 55, tier: 'balanced' },
  { id: 'google/gemma-2-9b-it', name: 'Standard 9B', type: 'chat', speed: 55, tier: 'balanced' },
  { id: 'meta/llama-4-scout-17b-16e-instruct', name: 'Scout 17B', type: 'chat', speed: 55, tier: 'balanced' },
  { id: 'microsoft/phi-4-mini-flash-reasoning', name: 'Micro Flash Reasoning', type: 'reasoning', speed: 55, tier: 'balanced' },
  { id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B', type: 'chat', speed: 52, tier: 'balanced' },
  { id: 'local/70b-instruct', name: 'Pro 70B', type: 'chat', speed: 50, tier: 'balanced' },
  { id: 'microsoft/phi-3-medium-128k-instruct', name: 'Micro Medium', type: 'chat', speed: 50, tier: 'balanced' },
  { id: 'mistralai/mistral-small-24b-instruct', name: 'Mistral Small 24B', type: 'chat', speed: 50, tier: 'balanced' },
  { id: 'google/gemma-3-12b-it', name: 'Standard 12B', type: 'chat', speed: 50, tier: 'balanced' },
  { id: 'local/super-49b-v1.5', name: 'Super 49B v1.5', type: 'chat', speed: 49, tier: 'balanced' },
  { id: 'meta/llama-3.1-70b-instruct', name: 'Standard 70B', type: 'chat', speed: 48, tier: 'balanced' },
  { id: 'meta/llama3-70b-instruct', name: 'Standard 70B v3', type: 'chat', speed: 45, tier: 'balanced' },
  { id: 'google/gemma-3-27b-it', name: 'Standard 27B', type: 'chat', speed: 45, tier: 'balanced' },
  { id: 'local/super-49b-v1', name: 'Super 49B', type: 'chat', speed: 45, tier: 'balanced' },
  { id: 'microsoft/phi-3.5-moe-instruct', name: 'Micro MoE', type: 'chat', speed: 45, tier: 'balanced' },
  { id: 'meta/llama-3.1-405b-instruct', name: 'Standard 405B', type: 'chat', speed: 42, tier: 'balanced' },
  { id: 'qwen/qwen2.5-coder-32b-instruct', name: 'Coder 32B', type: 'code', speed: 40, tier: 'balanced' },
  { id: 'google/gemma-2-27b-it', name: 'Standard 27B v2', type: 'chat', speed: 40, tier: 'balanced' },
  { id: 'local/51b-instruct', name: 'Pro 51B', type: 'chat', speed: 40, tier: 'balanced' },
  { id: 'qwen/qwq-32b', name: 'QwQ Reasoning 32B', type: 'reasoning', speed: 40, tier: 'balanced' },
  { id: 'local/ultra-253b-v1', name: 'Ultra 253B', type: 'chat', speed: 38, tier: 'balanced' },
  { id: 'deepseek-ai/deepseek-r1-distill-qwen-32b', name: 'Pro Reasoning 32B', type: 'reasoning', speed: 35, tier: 'balanced' },
  { id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'Mixtral 8x22B', type: 'chat', speed: 35, tier: 'balanced' },
  { id: 'deepseek-ai/deepseek-v3.1', name: 'DeepSeek V3.1', type: 'chat', speed: 35, tier: 'balanced' },

  // === POWERFUL TIER (0-34 t/s) ===
  { id: 'bytedance/seed-oss-36b-instruct', name: 'Seed OSS 36B', type: 'reasoning', speed: 34, tier: 'powerful' },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2', type: 'chat', speed: 30, tier: 'powerful' },
  { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2', type: 'chat', speed: 30, tier: 'powerful' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', type: 'chat', speed: 30, tier: 'powerful' },
  { id: 'mistralai/magistral-small-2506', name: 'Magistral Small', type: 'reasoning', speed: 29, tier: 'powerful' },
  { id: 'deepseek-ai/deepseek-r1-distill-qwen-14b', name: 'Pro Reasoning 14B', type: 'reasoning', speed: 28, tier: 'powerful' },
  { id: 'local/340b-instruct', name: 'Pro 340B', type: 'chat', speed: 25, tier: 'powerful' },
  { id: 'minimaxai/minimax-m2.5', name: 'MiniMax M2.5', type: 'chat', speed: 25, tier: 'powerful' },
  { id: 'sarvamai/sarvam-m', name: 'Sarvam M', type: 'chat', speed: 24, tier: 'powerful' },
  { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Coder 480B', type: 'chat', speed: 2, tier: 'powerful' },
  { id: 'mistralai/mistral-large-3-675b-instruct-2512', name: 'Mistral Large 3', type: 'chat', speed: 4, tier: 'powerful' },
  { id: 'mistralai/devstral-2-123b-instruct-2512', name: 'Devstral 123B', type: 'chat', speed: 4, tier: 'powerful' },
  { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking', type: 'chat', speed: 1, tier: 'powerful' },
  { id: 'mistralai/mistral-medium-3-instruct', name: 'Mistral Medium 3', type: 'chat', speed: 1, tier: 'powerful' },
  { id: 'local/mistral-engine', name: 'Mistral Pro', type: 'chat', speed: 1, tier: 'powerful' },
  { id: 'deepseek-ai/deepseek-v3.1-terminus', name: 'DeepSeek Terminus', type: 'chat', speed: 1, tier: 'powerful' },
  { id: 'stockmark/stockmark-2-100b-instruct', name: 'Stockmark 100B', type: 'chat', speed: 2, tier: 'powerful' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Pro 80B', type: 'chat', speed: 2, tier: 'powerful' },
];

// Recommended models for music composition (good balance of quality + speed)
export const RECOMMENDED_MODELS = [
  'meta/llama-4-maverick-17b-128e-instruct',
  'meta/llama-3.1-8b-instruct',
  'openai/gpt-oss-120b',
  'meta/llama-3.3-70b-instruct',
  'local/super-49b-v1.5',
  'meta/llama-4-scout-17b-16e-instruct',
  'deepseek-ai/deepseek-v3.1',
  'qwen/qwen3.5-122b-a10b',
];

export const REASONING_MODELS = new Set(
  LOCAL_MODELS.filter(m => m.type === 'reasoning').map(m => m.id)
);
