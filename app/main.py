# app/main.py
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langdetect import detect, LangDetectException

from .nlp import summarize_text, translate_text

app = FastAPI(
    title="Local Text AI Backend",
    description="Summarization and EN↔AR translation using local Hugging Face models.",
    version="1.0.0",
)

# ---------- CORS so React can talk to backend ----------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # if you use Vite
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------------------------


class SummarizeRequest(BaseModel):
    text: str
    min_length: int = 30
    max_length: int = 250
    bullet_points: bool = False


class SummarizeResponse(BaseModel):
    summary: str
    bullet_points: Optional[list[str]] = None


class DetectLanguageRequest(BaseModel):
    text: str


class DetectLanguageResponse(BaseModel):
    language: str
    confidence: str


class TextStatsRequest(BaseModel):
    text: str


class TextStatsResponse(BaseModel):
    characters: int
    words: int
    sentences: int
    paragraphs: int
    reading_time_seconds: int


class TranslateRequest(BaseModel):
    text: str
    source_language: Literal["en", "ar"] = "en"
    target_language: Literal["en", "ar"] = "ar"


class TranslateResponse(BaseModel):
    translation: str


@app.get("/")
def root():
    return {"status": "ok"}


@app.post("/summarize", response_model=SummarizeResponse)
def summarize(req: SummarizeRequest):
    try:
        summary = summarize_text(
            req.text,
            min_length=req.min_length,
            max_length=req.max_length,
        )

        bullet_points_list = None
        if req.bullet_points:
            # Split summary into bullet points by sentences
            import re
            sentences = re.split(r'(?<=[.!?])\s+', summary.strip())
            bullet_points_list = [s.strip() for s in sentences if s.strip()]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return SummarizeResponse(summary=summary, bullet_points=bullet_points_list)


@app.post("/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    try:
        translation = translate_text(
            req.text,
            source_language=req.source_language,
            target_language=req.target_language,
        )
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

    return TranslateResponse(translation=translation)


@app.post("/detect-language", response_model=DetectLanguageResponse)
def detect_language(req: DetectLanguageRequest):
    try:
        text = req.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        detected = detect(text)

        # Map language codes to full names
        lang_map = {
            "en": "English",
            "ar": "Arabic",
            "fr": "French",
            "es": "Spanish",
            "de": "German",
            "zh-cn": "Chinese",
            "ja": "Japanese",
            "ko": "Korean",
            "ru": "Russian",
            "pt": "Portuguese",
            "it": "Italian",
            "nl": "Dutch",
            "tr": "Turkish",
            "hi": "Hindi",
        }

        lang_name = lang_map.get(detected, detected.upper())

        # Confidence is approximate since langdetect doesn't provide exact confidence
        confidence = "high" if len(text) > 50 else "medium" if len(text) > 20 else "low"

    except LangDetectException as e:
        raise HTTPException(status_code=400, detail=f"Could not detect language: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return DetectLanguageResponse(language=lang_name, confidence=confidence)


@app.post("/stats", response_model=TextStatsResponse)
def text_stats(req: TextStatsRequest):
    import re

    text = req.text.strip()

    # Character count (excluding extra whitespace)
    characters = len(text)

    # Word count
    words = len(text.split()) if text else 0

    # Sentence count (split by .!?)
    sentences = len(re.findall(r'[.!?]+', text)) if text else 0
    if sentences == 0 and text:
        sentences = 1  # At least one sentence if there's text

    # Paragraph count (split by double newlines or single newlines)
    paragraphs = len([p for p in re.split(r'\n\s*\n|\n', text) if p.strip()]) if text else 0
    if paragraphs == 0 and text:
        paragraphs = 1

    # Reading time (average 200 words per minute)
    reading_time_seconds = int((words / 200) * 60) if words > 0 else 0

    return TextStatsResponse(
        characters=characters,
        words=words,
        sentences=sentences,
        paragraphs=paragraphs,
        reading_time_seconds=reading_time_seconds,
    )


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models": {
            "summarizer": "facebook/bart-large-cnn",
            "translator_en_ar": "Helsinki-NLP/opus-mt-en-ar",
            "translator_ar_en": "Helsinki-NLP/opus-mt-ar-en",
        },
    }
