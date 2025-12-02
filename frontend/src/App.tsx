import React, { useState } from "react"
import { summarize, translate } from "./api/text-ai"

const App: React.FC = () => {
  const [mode, setMode] = useState<"summarize" | "translate">("summarize")
  const [text, setText] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceLang, setSourceLang] = useState<"en" | "ar">("en")
  const [targetLang, setTargetLang] = useState<"en" | "ar">("ar")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)
    setResult("")

    try {
      if (mode === "summarize") {
        const res = await summarize({ text, min_length: 40, max_length: 200 })
        setResult(res.summary)
      } else {
        const res = await translate({
          text,
          source_language: sourceLang,
          target_language: targetLang
        })
        setResult(res.translation)
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>Local Text AI</h1>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setMode("summarize")} disabled={mode === "summarize"}>
          Summarize
        </button>
        <button onClick={() => setMode("translate")} disabled={mode === "translate"}>
          Translate
        </button>
      </div>

      {mode === "translate" && (
        <div style={{ marginBottom: 8 }}>
          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
          <span style={{ margin: "0 8px" }}>→</span>
          <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          rows={10}
          style={{ width: "100%", marginBottom: 8 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            mode === "summarize" ? "Paste text to summarize..." : "Text to translate..."
          }
        />
        <button type="submit" disabled={loading || !text.trim()}>
          {loading ? "Processing..." : mode === "summarize" ? "Summarize" : "Translate"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h2>Result</h2>
          <p>{result}</p>
        </div>
      )}
    </div>
  )
}

export default App
