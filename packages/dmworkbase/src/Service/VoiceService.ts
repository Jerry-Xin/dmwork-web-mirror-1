import APIClient from "./APIClient"

export interface VoiceConfig {
    enabled: boolean
    max_duration: number
    max_file_size: number
}

export interface TranscribeResult {
    text: string
    model: string
}

export interface VoiceContextResponse {
    status: number
    has_context: boolean
    context: string
    updated_at: string
}

const VOICE_CONTEXT_CACHE_TTL = 5 * 60 * 1000

const VOICE_CONTEXT_TIMEOUT = 3000

interface VoiceContextCacheEntry {
    data: VoiceContextResponse
    timestamp: number
}

export default class VoiceService {
    private constructor() {}
    public static shared = new VoiceService()

    private _voiceContextCache = new Map<string, VoiceContextCacheEntry>()
    private _voiceContextInflight = new Map<string, Promise<VoiceContextResponse>>()

    async getConfig(): Promise<VoiceConfig> {
        return APIClient.shared.get<VoiceConfig>("/voice/config")
    }

    async transcribe(audio: Blob, contextText?: string, chatContext?: string): Promise<TranscribeResult> {
        const formData = new FormData()
        const ext = audio.type.includes("mp4") ? "mp4" : "webm"
        formData.append("audio", audio, `recording.${ext}`)
        if (contextText) {
            formData.append("context_text", contextText)
        }
        if (chatContext) {
            formData.append("chat_context", chatContext)
        }
        return APIClient.shared.post("/voice/transcribe", formData)
    }

    async getVoiceContext(spaceId: string): Promise<VoiceContextResponse> {
        const cached = this._voiceContextCache.get(spaceId)
        if (cached && Date.now() - cached.timestamp < VOICE_CONTEXT_CACHE_TTL) {
            return cached.data
        }
        if (cached) {
            this._voiceContextCache.delete(spaceId)
        }

        const inflight = this._voiceContextInflight.get(spaceId)
        if (inflight) return inflight

        const request = Promise.race([
            APIClient.shared.get<VoiceContextResponse>("/voice/context", {
                param: { space_id: spaceId },
            }),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("voice context request timeout")), VOICE_CONTEXT_TIMEOUT)
            ),
        ])
            .then((resp: VoiceContextResponse) => {
                this._voiceContextCache.set(spaceId, { data: resp, timestamp: Date.now() })
                this._voiceContextInflight.delete(spaceId)
                return resp
            })
            .catch((err: unknown) => {
                this._voiceContextInflight.delete(spaceId)
                throw err
            })

        this._voiceContextInflight.set(spaceId, request)
        return request
    }

    clearVoiceContextCache(spaceId?: string): void {
        if (spaceId) {
            this._voiceContextCache.delete(spaceId)
            this._voiceContextInflight.delete(spaceId)
        } else {
            this._voiceContextCache.clear()
            this._voiceContextInflight.clear()
        }
    }
}
