# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Text Alchemist - A feature-rich local text summarization and English/Arabic translation application using Hugging Face models. The app runs entirely locally for privacy.

## Development Commands

### Backend (FastAPI)
```bash
# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server (port 8000)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend

# Install dependencies
npm install

# Run dev server (port 5173)
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Architecture

### Backend (`app/`)
- **main.py**: FastAPI application with endpoints:
  - `POST /summarize` - Text summarization (text, min_length, max_length, bullet_points)
  - `POST /translate` - EN↔AR translation (text, source_language, target_language)
  - `POST /detect-language` - Auto-detect input language
  - `POST /stats` - Get text statistics (chars, words, sentences, paragraphs, reading time)
  - `GET /health` - Health check endpoint
  - CORS configured for localhost:3000 and localhost:5173

- **nlp.py**: Hugging Face pipeline wrappers using:
  - Summarization: `facebook/bart-large-cnn`
  - EN→AR: `Helsinki-NLP/opus-mt-en-ar`
  - AR→EN: `Helsinki-NLP/opus-mt-ar-en`
  - Text is chunked (1024 chars for summarization, 512 for translation) before processing

### Frontend (`frontend/`)
- React 19 + TypeScript + Vite + Tailwind CSS v4
- **src/App.tsx**: Feature-rich single-page app with:
  - Mode toggle (summarize/translate)
  - Summary length options (short/medium/long)
  - Bullet points mode for summaries
  - Auto language detection for translations
  - History panel with localStorage persistence
  - Favorites system
  - Dark/light theme toggle
  - File upload with drag-and-drop
  - Copy to clipboard and download
  - Side-by-side compare view
  - Text statistics display
  - Toast notifications
  - Keyboard shortcuts (Ctrl+Enter to submit, Escape to clear)
  - Sample texts for quick testing
  - Processing time display
- **src/api/text-ai.ts**: API client functions for all backend endpoints

## Features Summary

| Feature | Description |
|---------|-------------|
| Copy to Clipboard | One-click copy with visual feedback |
| Download Results | Export as TXT file |
| Sample Texts | Pre-loaded examples for demos |
| History Panel | Full history with restore and delete |
| Favorites | Bookmark important results |
| Language Detection | Auto-detect input language |
| Summary Length | Adjustable output length (short/medium/long) |
| Bullet Points | Convert summary to bullet points |
| Text Statistics | Chars, words, sentences, reading time |
| Compare View | Side-by-side original vs result |
| File Upload | Drag-and-drop .txt files |
| Dark/Light Theme | User preference toggle (persisted) |
| Keyboard Shortcuts | Ctrl+Enter, Escape |
| Toast Notifications | Visual feedback for actions |
| Processing Time | Shows how long operations take |

## Notes
- Models are loaded at startup and cached in memory (first request may be slow as models download)
- GPU used automatically if CUDA is available, otherwise CPU
- Stop the backend server after use to free resources
- History and theme preferences are persisted in localStorage
