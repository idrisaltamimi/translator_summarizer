import React, { useEffect, useMemo, useRef, useState } from "react"
import { summarize, translate, detectLanguage, getTextStats, type TextStatsResult } from "./api/text-ai"

// ==================== TYPES ====================
type Mode = "summarize" | "translate"
type Language = "en" | "ar"
type Theme = "dark" | "light"
type SummaryLength = "short" | "medium" | "long"

interface HistoryItem {
  id: string
  timestamp: number
  mode: Mode
  inputText: string
  outputText: string
  sourceLang?: Language
  targetLang?: Language
  isFavorite: boolean
}

interface Toast {
  id: string
  message: string
  type: "success" | "error" | "info"
}

// ==================== CONSTANTS ====================
const LANG_LABELS: Record<Language, string> = {
  en: "English",
  ar: "Arabic"
}

const SUMMARY_LENGTH_CONFIG: Record<SummaryLength, { min: number; max: number; label: string }> = {
  short: { min: 20, max: 80, label: "Short (~50 words)" },
  medium: { min: 40, max: 150, label: "Medium (~100 words)" },
  long: { min: 80, max: 300, label: "Long (~200 words)" }
}

const SAMPLE_TEXTS = {
  summarize: [
    {
      label: "News Article",
      text: "Artificial intelligence has made remarkable strides in recent years, transforming industries from healthcare to finance. Machine learning algorithms can now diagnose diseases with accuracy rivaling human doctors, while natural language processing enables computers to understand and generate human-like text. Despite these advances, experts caution that AI systems still lack true understanding and consciousness. The technology raises important ethical questions about privacy, job displacement, and the concentration of power among tech giants. As AI continues to evolve, society must grapple with how to harness its benefits while mitigating potential risks."
    },
    {
      label: "Academic Abstract",
      text: "This study investigates the impact of social media usage on mental health among university students. A cross-sectional survey was conducted with 500 participants from three universities. Results indicate a significant correlation between excessive social media use and increased anxiety and depression symptoms. Students who spent more than 3 hours daily on social platforms reported lower self-esteem and higher levels of social comparison. However, moderate use showed potential benefits for maintaining social connections. The findings suggest that universities should implement digital wellness programs and provide guidelines for healthy social media consumption."
    },
    {
      label: "Scientific Report",
      text: "Climate change continues to accelerate at an alarming rate, with global temperatures rising faster than previously predicted. The latest data from climate scientists shows that the past decade was the warmest on record, with sea levels rising by 3.7 millimeters per year. Arctic ice coverage has declined by 13% per decade since satellite measurements began. These changes are causing more frequent extreme weather events, including hurricanes, droughts, and wildfires. Researchers emphasize the urgent need for immediate action to reduce greenhouse gas emissions and transition to renewable energy sources to prevent catastrophic environmental consequences."
    }
  ],
  translate: [
    {
      label: "Greeting (EN)",
      text: "Hello, how are you today? I hope you're having a wonderful day. The weather is beautiful and I'm feeling grateful for this moment."
    },
    {
      label: "Greeting (AR)",
      text: "مرحبا، كيف حالك اليوم؟ أتمنى أن يكون يومك رائعا. الطقس جميل وأنا أشعر بالامتنان لهذه اللحظة."
    },
    {
      label: "Business (EN)",
      text: "Thank you for your interest in our company. We would be happy to schedule a meeting to discuss potential collaboration opportunities. Please let us know your availability."
    }
  ]
}

// ==================== UTILITY FUNCTIONS ====================
const generateId = () => Math.random().toString(36).substring(2, 15)

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })
}

const formatReadingTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s read`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min read`
}

const downloadAsText = (text: string, filename: string) => {
  const blob = new Blob([text], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ==================== HOOKS ====================
function useLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function useClipboard() {
  const [copied, setCopied] = useState(false)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch {
      return false
    }
  }

  return { copy, copied }
}

// ==================== COMPONENTS ====================
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-slide-in ${
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : toast.type === "error"
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white"
          }`}
        >
          <span>
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
          </span>
          {toast.message}
          <button onClick={() => onRemove(toast.id)} className="ml-2 opacity-70 hover:opacity-100">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

const StatsDisplay: React.FC<{ stats: TextStatsResult | null; label: string }> = ({ stats, label }) => {
  if (!stats) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{label} Statistics</p>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <div className="rounded-lg bg-white/5 px-2 py-1">
          <span className="text-slate-400">Chars:</span>{" "}
          <span className="font-semibold text-white">{stats.characters.toLocaleString()}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1">
          <span className="text-slate-400">Words:</span>{" "}
          <span className="font-semibold text-white">{stats.words.toLocaleString()}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1">
          <span className="text-slate-400">Sentences:</span>{" "}
          <span className="font-semibold text-white">{stats.sentences}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1">
          <span className="text-slate-400">Paragraphs:</span>{" "}
          <span className="font-semibold text-white">{stats.paragraphs}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1">
          <span className="text-slate-400">Read:</span>{" "}
          <span className="font-semibold text-white">{formatReadingTime(stats.reading_time_seconds)}</span>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN APP ====================
const App: React.FC = () => {
  // Core state
  const [mode, setMode] = useState<Mode>("summarize")
  const [text, setText] = useState("")
  const [result, setResult] = useState("")
  const [bulletPoints, setBulletPoints] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Translation options
  const [sourceLang, setSourceLang] = useState<Language>("en")
  const [targetLang, setTargetLang] = useState<Language>("ar")
  const [detectedLang, setDetectedLang] = useState<string | null>(null)
  const [detectingLang, setDetectingLang] = useState(false)

  // Summarization options
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium")
  const [useBulletPoints, setUseBulletPoints] = useState(false)

  // Stats
  const [inputStats, setInputStats] = useState<TextStatsResult | null>(null)
  const [outputStats, setOutputStats] = useState<TextStatsResult | null>(null)
  const [showStats, setShowStats] = useState(false)

  // UI state
  const [theme, setTheme] = useLocalStorage<Theme>("theme", "dark")
  const [history, setHistory] = useLocalStorage<HistoryItem[]>("text-ai-history", [])
  const [showHistory, setShowHistory] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [processingTime, setProcessingTime] = useState<number | null>(null)

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clipboard hook
  const { copy, copied } = useClipboard()

  // Computed values
  const charCount = text.length
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const disableAction = loading || !text.trim()
  const isTranslate = mode === "translate"

  const modeDescription = useMemo(
    () =>
      mode === "summarize"
        ? "Distill long passages into crisp, readable briefs."
        : "Bridge languages with fast, local translation.",
    [mode]
  )

  // Toast functions
  const addToast = (message: string, type: Toast["type"] = "success") => {
    const id = generateId()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // History functions
  const addToHistory = (inputText: string, outputText: string) => {
    const newItem: HistoryItem = {
      id: generateId(),
      timestamp: Date.now(),
      mode,
      inputText,
      outputText,
      sourceLang: isTranslate ? sourceLang : undefined,
      targetLang: isTranslate ? targetLang : undefined,
      isFavorite: false
    }
    setHistory((prev) => [newItem, ...prev.slice(0, 49)])
  }

  const toggleFavorite = (id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    )
  }

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id))
  }

  const restoreFromHistory = (item: HistoryItem) => {
    setMode(item.mode)
    setText(item.inputText)
    setResult(item.outputText)
    if (item.sourceLang) setSourceLang(item.sourceLang)
    if (item.targetLang) setTargetLang(item.targetLang)
    setShowHistory(false)
    addToast("Restored from history", "info")
  }

  const clearHistory = () => {
    setHistory([])
    addToast("History cleared", "info")
  }

  // Auto-detect language
  const handleDetectLanguage = async () => {
    if (!text.trim() || text.length < 10) return

    setDetectingLang(true)
    try {
      const res = await detectLanguage({ text: text.slice(0, 500) })
      setDetectedLang(res.language)

      // Auto-set source language if detected
      if (res.language === "English") setSourceLang("en")
      else if (res.language === "Arabic") setSourceLang("ar")
    } catch {
      // Silently fail for auto-detection
    } finally {
      setDetectingLang(false)
    }
  }

  // Fetch stats
  const fetchStats = async (inputText: string, outputText: string) => {
    try {
      const [inStats, outStats] = await Promise.all([
        getTextStats({ text: inputText }),
        getTextStats({ text: outputText })
      ])
      setInputStats(inStats)
      setOutputStats(outStats)
    } catch {
      // Silently fail for stats
    }
  }

  // Main submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)
    setResult("")
    setBulletPoints(null)
    setProcessingTime(null)

    const startTime = Date.now()

    try {
      let outputText = ""

      if (mode === "summarize") {
        const config = SUMMARY_LENGTH_CONFIG[summaryLength]
        const res = await summarize({
          text,
          min_length: config.min,
          max_length: config.max,
          bullet_points: useBulletPoints
        })
        outputText = res.summary
        setResult(res.summary)
        if (res.bullet_points) setBulletPoints(res.bullet_points)
      } else {
        const res = await translate({
          text,
          source_language: sourceLang,
          target_language: targetLang
        })
        outputText = res.translation
        setResult(res.translation)
      }

      setProcessingTime(Date.now() - startTime)
      addToHistory(text, outputText)
      addToast(mode === "summarize" ? "Summary generated!" : "Translation complete!", "success")

      // Fetch stats in background
      if (showStats) fetchStats(text, outputText)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      setError(message)
      addToast(message, "error")
    } finally {
      setLoading(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        if (!disableAction) {
          handleSubmit(e as unknown as React.FormEvent)
        }
      }
      // Escape to clear
      if (e.key === "Escape") {
        setText("")
        setResult("")
        setBulletPoints(null)
        setError(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [text, disableAction])

  // Auto-detect language on text change (debounced)
  useEffect(() => {
    if (isTranslate && text.length > 20) {
      const timeout = setTimeout(handleDetectLanguage, 500)
      return () => clearTimeout(timeout)
    }
  }, [text, isTranslate])

  // File handling
  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith(".txt")) {
      addToast("Please upload a .txt file", "error")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setText(content)
      addToast(`Loaded: ${file.name}`, "success")
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleSwapLanguages = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
  }

  const handleCopy = async () => {
    if (result) {
      const success = await copy(result)
      if (success) addToast("Copied to clipboard!", "success")
    }
  }

  const handleDownload = () => {
    if (result) {
      const filename = mode === "summarize" ? "summary.txt" : "translation.txt"
      downloadAsText(result, filename)
      addToast("Downloaded!", "success")
    }
  }

  const handleClear = () => {
    setText("")
    setResult("")
    setBulletPoints(null)
    setError(null)
    setInputStats(null)
    setOutputStats(null)
    setDetectedLang(null)
  }

  const handleSampleText = (sampleText: string) => {
    setText(sampleText)
    textareaRef.current?.focus()
  }

  // Theme toggle
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  // Favorites and history filtering
  const favoriteItems = history.filter((item) => item.isFavorite)

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-950 text-slate-50" : "bg-slate-100 text-slate-900"
      }`}
    >
      {/* Background gradient */}
      <div
        className={`fixed inset-0 -z-10 pointer-events-none ${
          theme === "dark"
            ? "bg-gradient-to-br from-slate-950 via-slate-900 to-black"
            : "bg-gradient-to-br from-slate-100 via-white to-slate-200"
        }`}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
        {/* ==================== HEADER ==================== */}
        <header
          className={`flex flex-col gap-4 rounded-3xl p-6 shadow-xl backdrop-blur ${
            theme === "dark"
              ? "bg-white/5 ring-1 ring-white/10 shadow-blue-900/30"
              : "bg-white ring-1 ring-slate-200 shadow-slate-300/50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p
                className={`text-xs uppercase tracking-[0.2em] ${
                  theme === "dark" ? "text-blue-300/80" : "text-blue-600"
                }`}
              >
                Local · Private · Instant
              </p>
              <h1
                className={`mt-2 text-3xl font-bold sm:text-4xl ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                Text Alchemist
              </h1>
              <p className={theme === "dark" ? "text-sm text-slate-300" : "text-sm text-slate-600"}>
                {modeDescription}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition hover:scale-105 ${
                  theme === "dark"
                    ? "border-white/10 bg-white/5 text-yellow-300 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              {/* History toggle */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex h-10 items-center gap-2 rounded-xl border px-3 transition hover:scale-105 ${
                  theme === "dark"
                    ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                } ${showHistory ? "ring-2 ring-blue-500" : ""}`}
              >
                📜 History
                {history.length > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      theme === "dark" ? "bg-blue-500/30 text-blue-200" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {history.length}
                  </span>
                )}
              </button>

              {/* Status indicator */}
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide shadow-lg ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-blue-500/80 to-indigo-500/70 text-white"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-lime-300 shadow shadow-lime-200 animate-pulse" />
                Running locally
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { title: "Mode", value: mode === "summarize" ? "Summarize" : "Translate", icon: mode === "summarize" ? "✂️" : "🌐" },
              { title: "Input", value: `${wordCount} words`, icon: "📝" },
              { title: "History", value: `${history.length} items`, icon: "📜" },
              { title: "Favorites", value: `${favoriteItems.length} saved`, icon: "⭐" }
            ].map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl border px-4 py-3 shadow-sm ${
                  theme === "dark"
                    ? "border-white/10 bg-white/5 shadow-black/30"
                    : "border-slate-200 bg-white shadow-slate-200/50"
                }`}
              >
                <p
                  className={`text-xs uppercase tracking-wide ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {item.title}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span
                    className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                  >
                    {item.value}
                  </span>
                  <span className="text-xl">{item.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </header>

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ==================== LEFT PANEL: INPUT ==================== */}
          <section className="lg:col-span-2 space-y-4">
            {/* Mode selector */}
            <div className="flex gap-3">
              {(["summarize", "translate"] as Mode[]).map((option) => {
                const active = mode === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setMode(option)
                      setResult("")
                      setBulletPoints(null)
                      setError(null)
                    }}
                    className={`flex flex-1 items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? theme === "dark"
                          ? "border-blue-400/70 bg-blue-500/20 text-white shadow-lg shadow-blue-900/40"
                          : "border-blue-400 bg-blue-50 text-blue-900 shadow-lg shadow-blue-200/50"
                        : theme === "dark"
                        ? "border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <p
                        className={`text-xs uppercase tracking-wide ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {option === "summarize" ? "Summarize" : "Translate"}
                      </p>
                      <p
                        className={`text-sm font-semibold ${
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {option === "summarize" ? "Short, focused highlights" : "English ↔ Arabic"}
                      </p>
                    </div>
                    <span className="text-xl">{option === "summarize" ? "✂️" : "🌐"}</span>
                  </button>
                )
              })}
            </div>

            {/* Input form */}
            <form
              onSubmit={handleSubmit}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col gap-4 rounded-3xl border p-5 shadow-xl transition-all ${
                isDragging
                  ? "border-blue-400 bg-blue-500/10 ring-2 ring-blue-500/50"
                  : theme === "dark"
                  ? "border-white/10 bg-white/5 shadow-black/30"
                  : "border-slate-200 bg-white shadow-slate-200/50"
              }`}
            >
              {/* Summarization options */}
              {mode === "summarize" && (
                <div
                  className={`flex flex-wrap items-center gap-3 rounded-2xl p-3 ${
                    theme === "dark" ? "bg-white/5 ring-1 ring-white/5" : "bg-slate-50 ring-1 ring-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <label
                      className={`text-xs font-medium ${theme === "dark" ? "text-white" : "text-slate-700"}`}
                    >
                      Summary Length
                    </label>
                    <select
                      value={summaryLength}
                      onChange={(e) => setSummaryLength(e.target.value as SummaryLength)}
                      className={`h-10 rounded-xl border px-3 text-sm outline-none transition ${
                        theme === "dark"
                          ? "border-white/10 bg-slate-900/80 text-white hover:border-white/40 focus:border-blue-400/70"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-blue-400"
                      }`}
                    >
                      {Object.entries(SUMMARY_LENGTH_CONFIG).map(([key, config]) => (
                        <option key={key} value={key} className={theme === "dark" ? "bg-slate-900" : ""}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useBulletPoints}
                      onChange={(e) => setUseBulletPoints(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
                    >
                      Bullet points
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showStats}
                      onChange={(e) => setShowStats(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
                    >
                      Show statistics
                    </span>
                  </label>
                </div>
              )}

              {/* Translation options */}
              {isTranslate && (
                <div
                  className={`flex flex-wrap items-center gap-3 rounded-2xl p-3 ${
                    theme === "dark" ? "bg-white/5 ring-1 ring-white/5" : "bg-slate-50 ring-1 ring-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <label
                      className={`text-xs font-medium ${theme === "dark" ? "text-white" : "text-slate-700"}`}
                    >
                      From
                    </label>
                    <select
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value as Language)}
                      className={`h-10 min-w-[9rem] rounded-xl border px-3 text-sm outline-none transition ${
                        theme === "dark"
                          ? "border-white/10 bg-slate-900/80 text-white hover:border-white/40 focus:border-blue-400/70"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-blue-400"
                      }`}
                    >
                      {Object.entries(LANG_LABELS).map(([key, labelText]) => (
                        <option key={key} value={key} className={theme === "dark" ? "bg-slate-900" : ""}>
                          {labelText}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwapLanguages}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition hover:scale-105 ${
                      theme === "dark"
                        ? "border-white/10 bg-slate-900/60 text-slate-200 hover:border-blue-400/60 hover:text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    ⇄
                  </button>

                  <div className="flex flex-col gap-1">
                    <label
                      className={`text-xs font-medium ${theme === "dark" ? "text-white" : "text-slate-700"}`}
                    >
                      To
                    </label>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value as Language)}
                      className={`h-10 min-w-[9rem] rounded-xl border px-3 text-sm outline-none transition ${
                        theme === "dark"
                          ? "border-white/10 bg-slate-900/80 text-white hover:border-white/40 focus:border-blue-400/70"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-blue-400"
                      }`}
                    >
                      {Object.entries(LANG_LABELS).map(([key, labelText]) => (
                        <option key={key} value={key} className={theme === "dark" ? "bg-slate-900" : ""}>
                          {labelText}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Detected language badge */}
                  {detectedLang && (
                    <div
                      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                        theme === "dark" ? "bg-emerald-500/20 text-emerald-200" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {detectingLang ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        "✓"
                      )}
                      Detected: {detectedLang}
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={showStats}
                      onChange={(e) => setShowStats(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
                    >
                      Show statistics
                    </span>
                  </label>
                </div>
              )}

              {/* Textarea */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-slate-700"}`}
                  >
                    {mode === "summarize" ? "Source text" : "Text to translate"}
                  </label>
                  <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    {charCount.toLocaleString()} chars · {wordCount} words
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={10}
                  className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                    theme === "dark"
                      ? "border-white/10 bg-slate-900/70 text-slate-100 focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/30"
                      : "border-slate-200 bg-white text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    isDragging
                      ? "Drop your .txt file here..."
                      : mode === "summarize"
                      ? "Drop in a long paragraph, article snippet, or meeting notes. Or drag & drop a .txt file."
                      : "Type or paste the text you want to translate. Or drag & drop a .txt file."
                  }
                />
              </div>

              {/* Sample texts */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Try samples:
                </span>
                {SAMPLE_TEXTS[mode].map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => handleSampleText(sample.text)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      theme === "dark"
                        ? "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                      theme === "dark"
                        ? "bg-white/5 text-slate-300 hover:bg-white/10"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    📁 Upload .txt
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                      theme === "dark"
                        ? "bg-white/5 text-slate-300 hover:bg-white/10"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
                    Ctrl+Enter to submit
                  </span>
                  <button
                    type="submit"
                    disabled={disableAction}
                    className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition ${
                      disableAction
                        ? "opacity-60 grayscale cursor-not-allowed"
                        : "hover:scale-[1.02] hover:shadow-purple-900/40 active:scale-100"
                    }`}
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                        Processing...
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
              </div>
            </form>

            {/* Stats display (input) */}
            {showStats && inputStats && <StatsDisplay stats={inputStats} label="Input" />}
          </section>

          {/* ==================== RIGHT PANEL: OUTPUT ==================== */}
          <section className="space-y-4">
            <div
              className={`flex flex-col gap-4 rounded-3xl border p-5 shadow-xl ${
                theme === "dark"
                  ? "border-white/10 bg-white/5 shadow-black/30"
                  : "border-slate-200 bg-white shadow-slate-200/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-xs uppercase tracking-wide ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Output
                  </p>
                  <h2
                    className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                  >
                    Result
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {processingTime && (
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        theme === "dark" ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {(processingTime / 1000).toFixed(1)}s
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      loading
                        ? theme === "dark"
                          ? "bg-yellow-500/20 text-yellow-200"
                          : "bg-yellow-100 text-yellow-700"
                        : theme === "dark"
                        ? "bg-emerald-500/20 text-emerald-100"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {loading ? "Processing" : "Ready"}
                  </span>
                </div>
              </div>

              {error && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    theme === "dark"
                      ? "border-red-500/40 bg-red-500/10 text-red-100"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {error}
                </div>
              )}

              {loading && (
                <div className="space-y-3 animate-pulse">
                  <div
                    className={`h-4 w-3/4 rounded ${theme === "dark" ? "bg-slate-700/50" : "bg-slate-200"}`}
                  />
                  <div
                    className={`h-4 w-full rounded ${theme === "dark" ? "bg-slate-700/50" : "bg-slate-200"}`}
                  />
                  <div
                    className={`h-4 w-2/3 rounded ${theme === "dark" ? "bg-slate-700/50" : "bg-slate-200"}`}
                  />
                  <div
                    className={`h-4 w-5/6 rounded ${theme === "dark" ? "bg-slate-700/50" : "bg-slate-200"}`}
                  />
                </div>
              )}

              {!loading && result && (
                <>
                  {/* Bullet points view */}
                  {bulletPoints && bulletPoints.length > 0 ? (
                    <ul
                      className={`rounded-2xl border px-4 py-4 text-sm shadow-inner ${
                        theme === "dark"
                          ? "border-white/10 bg-slate-900/60 text-slate-200 shadow-black/40"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {bulletPoints.map((point, index) => (
                        <li key={index} className="mb-2 flex gap-2">
                          <span className="text-blue-400">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <article
                      className={`rounded-2xl border px-4 py-4 text-sm shadow-inner animate-fade-in ${
                        theme === "dark"
                          ? "border-white/10 bg-slate-900/60 text-slate-200 shadow-black/40"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {result}
                    </article>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleCopy}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                        copied
                          ? "bg-emerald-500 text-white"
                          : theme === "dark"
                          ? "bg-white/5 text-slate-300 hover:bg-white/10"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {copied ? "✓ Copied!" : "📋 Copy"}
                    </button>

                    <button
                      onClick={handleDownload}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                        theme === "dark"
                          ? "bg-white/5 text-slate-300 hover:bg-white/10"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      💾 Download
                    </button>

                    <button
                      onClick={() => setShowCompare(!showCompare)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                        showCompare
                          ? "bg-blue-500 text-white"
                          : theme === "dark"
                          ? "bg-white/5 text-slate-300 hover:bg-white/10"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      🔄 Compare
                    </button>
                  </div>

                  {/* Stats display (output) */}
                  {showStats && outputStats && <StatsDisplay stats={outputStats} label="Output" />}

                  {/* Compression ratio for summaries */}
                  {mode === "summarize" && inputStats && outputStats && (
                    <div
                      className={`text-center text-xs ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Compression ratio:{" "}
                      <span className="font-semibold text-emerald-400">
                        {Math.round((1 - outputStats.words / inputStats.words) * 100)}%
                      </span>{" "}
                      reduction
                    </div>
                  )}
                </>
              )}

              {!loading && !result && !error && (
                <div
                  className={`flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center ${
                    theme === "dark"
                      ? "border-white/10 bg-slate-900/50 text-slate-400"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <span className="text-4xl mb-3">✨</span>
                  <p
                    className={`font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}
                  >
                    Your result will appear here
                  </p>
                  <p className="text-xs mt-1">
                    {mode === "summarize"
                      ? "Summaries keep nuance and key points."
                      : "Translations preserve tone and meaning."}
                  </p>
                </div>
              )}
            </div>

            {/* Compare view */}
            {showCompare && result && (
              <div
                className={`rounded-3xl border p-5 shadow-xl ${
                  theme === "dark"
                    ? "border-white/10 bg-white/5 shadow-black/30"
                    : "border-slate-200 bg-white shadow-slate-200/50"
                }`}
              >
                <h3
                  className={`mb-3 font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                >
                  Side-by-Side Comparison
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p
                      className={`mb-2 text-xs uppercase tracking-wide ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Original
                    </p>
                    <div
                      className={`max-h-48 overflow-y-auto rounded-xl border p-3 text-sm ${
                        theme === "dark"
                          ? "border-white/10 bg-slate-900/60 text-slate-300"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {text}
                    </div>
                  </div>
                  <div>
                    <p
                      className={`mb-2 text-xs uppercase tracking-wide ${
                        theme === "dark" ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      {mode === "summarize" ? "Summary" : "Translation"}
                    </p>
                    <div
                      className={`max-h-48 overflow-y-auto rounded-xl border p-3 text-sm ${
                        theme === "dark"
                          ? "border-blue-500/30 bg-blue-500/10 text-slate-200"
                          : "border-blue-200 bg-blue-50 text-slate-700"
                      }`}
                    >
                      {result}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ==================== HISTORY SIDEBAR ==================== */}
      {showHistory && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          />

          {/* Sidebar */}
          <div
            className={`fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto shadow-2xl animate-slide-in-right ${
              theme === "dark" ? "bg-slate-900" : "bg-white"
            }`}
          >
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2
                  className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                >
                  History
                </h2>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className={`rounded-lg px-3 py-1 text-sm ${
                        theme === "dark"
                          ? "text-red-400 hover:bg-red-500/10"
                          : "text-red-600 hover:bg-red-50"
                      }`}
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setShowHistory(false)}
                    className={`rounded-lg p-2 text-xl ${
                      theme === "dark" ? "hover:bg-white/10" : "hover:bg-slate-100"
                    }`}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Favorites section */}
              {favoriteItems.length > 0 && (
                <div className="mb-6">
                  <h3
                    className={`mb-3 text-sm font-semibold uppercase tracking-wide ${
                      theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                    }`}
                  >
                    ⭐ Favorites ({favoriteItems.length})
                  </h3>
                  <div className="space-y-2">
                    {favoriteItems.map((item) => (
                      <HistoryItemCard
                        key={item.id}
                        item={item}
                        theme={theme}
                        onRestore={restoreFromHistory}
                        onToggleFavorite={toggleFavorite}
                        onDelete={deleteHistoryItem}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All history */}
              <h3
                className={`mb-3 text-sm font-semibold uppercase tracking-wide ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Recent ({history.length})
              </h3>

              {history.length === 0 ? (
                <div
                  className={`rounded-xl border border-dashed py-8 text-center ${
                    theme === "dark" ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"
                  }`}
                >
                  <p className="text-3xl mb-2">📜</p>
                  <p className="text-sm">No history yet</p>
                  <p className="text-xs mt-1">Your operations will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      onRestore={restoreFromHistory}
                      onToggleFavorite={toggleFavorite}
                      onDelete={deleteHistoryItem}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// ==================== HISTORY ITEM CARD ====================
const HistoryItemCard: React.FC<{
  item: HistoryItem
  theme: Theme
  onRestore: (item: HistoryItem) => void
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
}> = ({ item, theme, onRestore, onToggleFavorite, onDelete }) => {
  return (
    <div
      className={`rounded-xl border p-3 transition ${
        theme === "dark"
          ? "border-white/10 bg-white/5 hover:bg-white/10"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{item.mode === "summarize" ? "✂️" : "🌐"}</span>
          <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            {formatTime(item.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFavorite(item.id)}
            className={`p-1 rounded transition ${
              item.isFavorite
                ? "text-yellow-400"
                : theme === "dark"
                ? "text-slate-500 hover:text-yellow-400"
                : "text-slate-400 hover:text-yellow-500"
            }`}
          >
            {item.isFavorite ? "★" : "☆"}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className={`p-1 rounded transition ${
              theme === "dark" ? "text-slate-500 hover:text-red-400" : "text-slate-400 hover:text-red-500"
            }`}
          >
            🗑
          </button>
        </div>
      </div>

      <p
        className={`mb-1 text-xs line-clamp-2 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
      >
        {item.inputText.slice(0, 100)}...
      </p>

      <p
        className={`text-xs line-clamp-2 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}
      >
        → {item.outputText.slice(0, 80)}...
      </p>

      <button
        onClick={() => onRestore(item)}
        className={`mt-2 w-full rounded-lg py-1.5 text-xs font-medium transition ${
          theme === "dark"
            ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
        }`}
      >
        Restore
      </button>
    </div>
  )
}

export default App
