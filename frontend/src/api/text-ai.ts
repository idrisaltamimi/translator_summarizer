export interface SummarizePayload {
  text: string
  min_length?: number
  max_length?: number
  bullet_points?: boolean
}

export interface SummarizeResult {
  summary: string
  bullet_points?: string[]
}

export interface TranslatePayload {
  text: string
  source_language: "en" | "ar"
  target_language: "en" | "ar"
}

export interface TranslateResult {
  translation: string
}

export interface DetectLanguagePayload {
  text: string
}

export interface DetectLanguageResult {
  language: string
  confidence: string
}

export interface TextStatsPayload {
  text: string
}

export interface TextStatsResult {
  characters: number
  words: number
  sentences: number
  paragraphs: number
  reading_time_seconds: number
}

const API_BASE = "http://127.0.0.1:8000"

export async function summarize(payload: SummarizePayload) {
  const res = await fetch(`${API_BASE}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || "Failed to summarize")
  }

  return (await res.json()) as SummarizeResult
}

export async function translate(payload: TranslatePayload) {
  const res = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || "Failed to translate")
  }

  return (await res.json()) as TranslateResult
}

export async function detectLanguage(payload: DetectLanguagePayload) {
  const res = await fetch(`${API_BASE}/detect-language`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || "Failed to detect language")
  }

  return (await res.json()) as DetectLanguageResult
}

export async function getTextStats(payload: TextStatsPayload) {
  const res = await fetch(`${API_BASE}/stats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || "Failed to get stats")
  }

  return (await res.json()) as TextStatsResult
}
