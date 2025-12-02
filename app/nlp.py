import torch
from textwrap import wrap
from transformers import pipeline

# ----------------- Models & pipelines (Cell 2) -----------------

SUMMARIZATION_MODEL = "facebook/bart-large-cnn"
TRANSLATION_MODEL_EN_AR = "Helsinki-NLP/opus-mt-en-ar"
TRANSLATION_MODEL_AR_EN = "Helsinki-NLP/opus-mt-ar-en"

# device=0 for GPU, -1 for CPU
device = 0 if torch.cuda.is_available() else -1

summarizer = pipeline(
    "summarization",
    model=SUMMARIZATION_MODEL,
    device=device,
)

translator_en_ar = pipeline(
    "translation",
    model=TRANSLATION_MODEL_EN_AR,
    device=device,
)

translator_ar_en = pipeline(
    "translation",
    model=TRANSLATION_MODEL_AR_EN,
    device=device,
)

# Optional: print once when backend starts
print("Summarizer loaded model config:", summarizer.model.config.to_dict())
print("Translator EN→AR config:", translator_en_ar.model.config.to_dict())
print("Translator AR→EN config:", translator_ar_en.model.config.to_dict())


# ----------------- Helpers (Cell 3) -----------------


def split_text_into_chunks(text: str, max_chars: int = 1024) -> list[str]:
    """
    Split text into chunks of a maximum number of characters.
    """
    text = text.replace("\n", " ")
    return wrap(text, max_chars)


# ----------------- Summarization (Cell 4) -----------------


def summarize_text(
    text: str,
    min_length: int = 30,
    max_length: int = 250,
) -> str:
    """
    Summarize text using the summarization pipeline.
    """
    text = text.strip()
    if not text:
        return "Please enter some text to summarize."

    chunks = split_text_into_chunks(text, 1024)

    summary_chunks: list[str] = []
    for chunk in chunks:
        # You were using positional args in Colab (min_length, max_length);
        # here we make them explicit:
        result = summarizer(
            chunk,
            min_length=min_length,
            max_length=max_length,
            do_sample=False,
        )
        summary_chunks.append(result[0]["summary_text"])

    combined_summary = " ".join(summary_chunks)
    return combined_summary


# ----------------- Translation (Cell 5) -----------------


def translate_text(
    text: str,
    source_language: str = "en",
    target_language: str = "ar",
) -> str:
    """
    Translate text between English and Arabic using the preloaded pipelines.
    """
    text = text.strip()

    if not text:
        return "Please enter some text to translate."
    if source_language == target_language:
        return "Source and target languages must be different."

    if source_language == "en" and target_language == "ar":
        pipeline_to_use = translator_en_ar
    elif source_language == "ar" and target_language == "en":
        pipeline_to_use = translator_ar_en
    else:
        return "Unsupported language pair. Use 'en' or 'ar'."

    chunks = split_text_into_chunks(text, max_chars=512)

    translated_chunks: list[str] = []
    for chunk in chunks:
        result = pipeline_to_use(chunk)
        translated_chunks.append(result[0]["translation_text"])

    combined_translation = " ".join(translated_chunks)
    return combined_translation
