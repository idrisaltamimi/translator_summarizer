import React, { useMemo, useState } from "react"
import { summarize, translate } from "./api/text-ai"

type Mode = "summarize" | "translate"
type Language = "en" | "ar"

const LANG_LABELS: Record<Language, string> = {
  en: "English",
  ar: "Arabic"
}

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>("summarize")
  const [text, setText] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceLang, setSourceLang] = useState<Language>("en")
  const [targetLang, setTargetLang] = useState<Language>("ar")

  const charCount = text.length
  const disableAction = loading || !text.trim()
  const isTranslate = mode === "translate"

  const modeDescription = useMemo(
    () =>
      mode === "summarize"
        ? "Distill long passages into crisp, readable briefs."
        : "Bridge languages with fast, local translation.",
    [mode]
  )

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

  const handleSwapLanguages = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-slate-50">
      <div className="fixed inset-0 -z-10 bg-linear-to-br from-slate-950 via-slate-900 to-black pointer-events-none" />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="flex flex-col gap-4 rounded-3xl bg-white/5 p-6 shadow-xl shadow-blue-900/30 ring-1 ring-white/10 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-300/80">
                Local · Private · Instant
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Text Alchemist
              </h1>
              <p className="text-sm text-slate-300">{modeDescription}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-linear-to-r from-blue-500/80 to-indigo-500/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg">
              <span className="h-2 w-2 rounded-full bg-lime-300 shadow shadow-lime-200" />
              Running locally
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: "Summaries today", value: "∞", accent: "from-emerald-400/40" },
              { title: "Translations", value: "Ready", accent: "from-cyan-400/40" },
              { title: "Latency", value: "Instant", accent: "from-pink-400/40" }
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm shadow-black/30"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {item.title}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">{item.value}</span>
                  <span
                    className={`h-8 w-8 rounded-xl bg-linear-to-br ${item.accent} to-white/10`}
                  />
                </div>
              </div>
            ))}
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
              <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-white">
                Mode
              </span>
              <span className="text-slate-400">Choose your tool</span>
            </div>
            <div className="flex gap-3">
              {(["summarize", "translate"] as Mode[]).map((option) => {
                const active = mode === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    className={[
                      "flex flex-1 items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                      active
                        ? "border-blue-400/70 bg-blue-500/20 text-white shadow-lg shadow-blue-900/40"
                        : "border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
                    ].join(" ")}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {option === "summarize" ? "Summarize" : "Translate"}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {option === "summarize"
                          ? "Short, focused highlights"
                          : "English ↔ Arabic switcher"}
                      </p>
                    </div>
                    <span className="text-lg">
                      {option === "summarize" ? "✂️" : "🌐"}
                    </span>
                  </button>
                )
              })}
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/30"
            >
              {isTranslate && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
                  <LangSelect
                    label="From"
                    value={sourceLang}
                    onChange={(v) => setSourceLang(v)}
                  />
                  <button
                    type="button"
                    onClick={handleSwapLanguages}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/60 text-lg text-slate-200 transition hover:border-blue-400/60 hover:text-white"
                  >
                    ⇄
                  </button>
                  <LangSelect
                    label="To"
                    value={targetLang}
                    onChange={(v) => setTargetLang(v)}
                  />
                </div>
              )}

              <label className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="font-medium text-white">
                    {mode === "summarize" ? "Source text" : "Text to translate"}
                  </span>
                  <span className="text-xs text-slate-400">{charCount} chars</span>
                </div>
                <textarea
                  rows={10}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none ring-blue-500/0 transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/30"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    mode === "summarize"
                      ? "Drop in a long paragraph, article snippet, or meeting notes."
                      : "Type or paste the text you want to translate."
                  }
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-white/5 px-3 py-1">Private</span>
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    {mode === "summarize" ? "1-step summary" : "Dual-language"}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={disableAction}
                  className={[
                    "inline-flex items-center gap-2 rounded-full bg-linear-to-r from-blue-500 via-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition",
                    disableAction
                      ? "opacity-60 grayscale"
                      : "hover:scale-[1.02] hover:shadow-purple-900/40 active:scale-100"
                  ].join(" ")}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                      Working...
                    </>
                  ) : mode === "summarize" ? (
                    <>
                      Summarize
                      <span className="text-base">→</span>
                    </>
                  ) : (
                    <>
                      Translate
                      <span className="text-base">→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/30 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Output</p>
                <h2 className="text-lg font-semibold text-white">Result panel</h2>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                Live
              </span>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            {result ? (
              <article className="prose prose-invert max-w-none rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 text-sm shadow-inner shadow-black/40">
                {result}
              </article>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/50 px-4 py-6 text-center text-sm text-slate-400">
                <span className="text-3xl">✨</span>
                <p className="mt-2 font-medium text-slate-200">
                  Your result will appear here
                </p>
                <p className="text-xs text-slate-400">
                  Summaries keep nuance; translations keep tone.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
              Tip: You can swap languages instantly, and everything stays local for
              privacy.
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

type LangSelectProps = {
  label: string
  value: Language
  onChange: (value: Language) => void
}

const LangSelect: React.FC<LangSelectProps> = ({ label, value, onChange }) => {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-300">
      <span className="font-medium text-white">{label}</span>
      <select
        className="h-10 min-w-[9rem] rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-white outline-none ring-blue-500/0 transition hover:border-white/40 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/30"
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
      >
        {Object.entries(LANG_LABELS).map(([key, labelText]) => (
          <option key={key} value={key} className="bg-slate-900">
            {labelText}
          </option>
        ))}
      </select>
    </label>
  )
}

export default App
