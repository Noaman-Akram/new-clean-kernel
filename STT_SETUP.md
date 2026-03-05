# STT Setup (Groq + ElevenLabs)

Current STT fallback order:

1. Groq (`GROQ`)
2. ElevenLabs (`ELEVENLABS`)

No local Whisper path is used now.

## Required keys

- Groq API key: [https://console.groq.com/keys](https://console.groq.com/keys)
- ElevenLabs API key: [https://elevenlabs.io](https://elevenlabs.io)

Paste keys in the app:

- `Routing` -> `STT Provider Settings`

## Recommended config

- STT mode: `AUTO`
- STT route order: `GROQ -> ELEVENLABS`
- Groq model: `whisper-large-v3-turbo`
- ElevenLabs model: `scribe_v1`

## Fallback behavior

- If Groq returns a temporary failure (timeout, 429, or 5xx), the app retries once, then falls back to ElevenLabs.
- If a key/credit/auth issue occurs, it skips retry and falls back immediately.
