# app/main.py
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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


class SummarizeResponse(BaseModel):
    summary: str


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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return SummarizeResponse(summary=summary)


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
