export const YARNGPT_VOICES = ["Chinenye", "Nonso", "Idera", "Adaora"] as const;
export type YarnGPTVoice = (typeof YARNGPT_VOICES)[number];
export const DEFAULT_YARNGPT_VOICE: YarnGPTVoice = "Idera";
