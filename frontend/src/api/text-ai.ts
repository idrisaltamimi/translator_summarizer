export interface SummarizePayload {
  text: string
  min_length?: number
  max_length?: number
}

export interface SummarizeResult {
  summary: string
}

export interface TranslatePayload {
  text: string
  source_language: "en" | "ar"
  target_language: "en" | "ar"
}

export interface TranslateResult {
  translation: string
}

const API_BASE = "http://127.0.0.1:8000"

export async function summarize(payload: SummarizePayload) {
  const res = await fetch(`${API_BASE}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })

  console.log(res)

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
