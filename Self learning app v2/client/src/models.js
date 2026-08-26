export const AVAILABLE_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { id: 'z-ai/glm-5.2:free', label: 'GLM 5.2 (free)' },
  { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning (free)' },
  { id: 'minimax/minimax-m3:free', label: 'MiniMax M3 (free)' },
];

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;
