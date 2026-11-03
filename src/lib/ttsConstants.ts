// YarnGPT voice names are lowercase; "idera" is the service's default Igbo voice.
export const YARNGPT_VOICES = ["chinenye", "nonso", "idera", "adaora"] as const;
export type YarnGPTVoice = (typeof YARNGPT_VOICES)[number];
export const DEFAULT_YARNGPT_VOICE: YarnGPTVoice = "idera";
