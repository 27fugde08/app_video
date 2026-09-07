#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CreatorOS AudioExtractionStage: FFmpeg -> Demucs -> faster-whisper."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable


def emit_progress(progress: int, stage: str, message: str) -> None:
    print(
        json.dumps(
            {
                "type": "audio_extraction_progress",
                "progress": progress,
                "stage": stage,
                "message": message,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


def run_command(command: list[str], label: str) -> None:
    try:
        result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")
    except OSError as error:
        raise RuntimeError(f"Khong the chay {label}: {error}") from error

    if result.returncode != 0:
        detail = (result.stderr or result.stdout)[-2000:]
        raise RuntimeError(f"{label} that bai voi ma {result.returncode}: {detail}")


def find_stem(root: Path, filename: str) -> Path | None:
    matches = list(root.rglob(filename))
    return matches[0] if matches else None


def extract_audio(video_path: Path, output_dir: Path, ffmpeg: str) -> Path:
    audio_path = output_dir / "original_16k.wav"
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            str(audio_path),
        ],
        "FFmpeg audio extraction",
    )
    if not audio_path.is_file() or audio_path.stat().st_size == 0:
        raise RuntimeError(f"FFmpeg khong tao audio: {audio_path}")
    return audio_path


def separate_stems(audio_path: Path, output_dir: Path, model: str, device: str, ffmpeg: str) -> tuple[Path, Path]:
    demucs_dir = output_dir / "demucs"
    run_command(
        [
            sys.executable,
            "-m",
            "demucs",
            "--two-stems=vocals",
            "-n",
            model,
            "-d",
            device,
            "-o",
            str(demucs_dir),
            str(audio_path),
        ],
        "Demucs stem separation",
    )

    vocals_source = find_stem(demucs_dir, "vocals.wav")
    ambient_source = find_stem(demucs_dir, "no_vocals.wav")
    if vocals_source is None or ambient_source is None:
        raise RuntimeError("Demucs khong tao du vocals.wav va no_vocals.wav.")

    vocals_path = output_dir / "vocals.wav"
    ambient_path = output_dir / "ambient_sfx.wav"
    shutil.copyfile(vocals_source, vocals_path)
    shutil.copyfile(ambient_source, ambient_path)
    for source_path in (vocals_path, ambient_path):
        normalized_path = source_path.with_name(f"{source_path.stem}_16k.wav")
        run_command(
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(source_path),
                "-acodec",
                "pcm_s16le",
                "-ar",
                "16000",
                "-ac",
                "1",
                str(normalized_path),
            ],
            f"FFmpeg normalize {source_path.name}",
        )
        normalized_path.replace(source_path)
    return vocals_path, ambient_path


def iter_words(words: Iterable[Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for word in words or []:
        text = str(getattr(word, "word", "")).strip()
        start = getattr(word, "start", None)
        end = getattr(word, "end", None)
        if not text or start is None or end is None:
            continue
        result.append({"word": text, "start": round(float(start), 3), "end": round(float(end), 3)})
    return result


def transcribe(vocals_path: Path, output_path: Path, model_name: str, device: str, language: str) -> None:
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise RuntimeError("Thieu faster-whisper. Hay cai backend/requirements.txt.") from error

    compute_type = "float16" if device == "cuda" else "int8"
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        str(vocals_path),
        language=None if language == "auto" else language,
        word_timestamps=True,
        vad_filter=True,
    )

    segment_payload: list[dict[str, Any]] = []
    all_words: list[dict[str, Any]] = []
    for index, segment in enumerate(segments):
        words = iter_words(getattr(segment, "words", None))
        all_words.extend(words)
        segment_payload.append(
            {
                "id": index,
                "start": round(float(segment.start), 3),
                "end": round(float(segment.end), 3),
                "text": str(segment.text).strip(),
                "words": words,
            }
        )

    payload = {
        "sourceLang": getattr(info, "language", language),
        "model": model_name,
        "wordTimestampMode": "faster-whisper-word-level",
        "segmentCount": len(segment_payload),
        "wordCount": len(all_words),
        "segments": segment_payload,
        "words": all_words,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CreatorOS audio extraction, Demucs stems and word-level Whisper STT")
    parser.add_argument("--video", required=True, help="Video input path")
    parser.add_argument("--output-dir", required=True, help="Stage output directory")
    parser.add_argument("--model", default="htdemucs", help="Demucs model")
    parser.add_argument("--whisper-model", default="base", help="faster-whisper model name")
    parser.add_argument("--device", choices=["cpu", "cuda"], default="cpu")
    parser.add_argument("--language", default="auto")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    video_path = Path(args.video).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    transcript_path = output_dir / "transcript.json"

    try:
        if not video_path.is_file():
            raise RuntimeError(f"Video dau vao khong ton tai: {video_path}")
        emit_progress(0, "validate", "Kiem tra video dau vao...")
        audio_path = extract_audio(video_path, output_dir, args.ffmpeg)
        emit_progress(5, "audio_extract", "Da tach audio 16kHz WAV.")
        vocals_path, ambient_path = separate_stems(audio_path, output_dir, args.model, args.device, args.ffmpeg)
        emit_progress(15, "stem_separation", "Da tao vocals.wav va ambient_sfx.wav.")
        transcribe(vocals_path, transcript_path, args.whisper_model, args.device, args.language)
        emit_progress(30, "whisper_word_timestamps", "Whisper STT word-level timestamps hoan tat.")
        print(
            json.dumps(
                {
                    "type": "audio_extraction_completed",
                    "progress": 30,
                    "vocalsPath": str(vocals_path),
                    "ambientPath": str(ambient_path),
                    "transcriptPath": str(transcript_path),
                },
                ensure_ascii=False,
            ),
            flush=True,
        )
        return 0
    except Exception as error:
        print(json.dumps({"type": "audio_extraction_failed", "message": str(error)}, ensure_ascii=False), flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
