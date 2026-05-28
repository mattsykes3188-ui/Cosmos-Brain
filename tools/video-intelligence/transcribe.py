import argparse
import sys
from pathlib import Path


ALLOWED_MODELS = {"tiny", "base", "small", "medium", "large"}
ALLOWED_LANGUAGES = {"pt", "auto"}


def transcribe_audio(audio_path, output_path, model_name, language):
    try:
        import whisper
    except ImportError as exc:
        raise RuntimeError(
            "openai-whisper nao esta instalado. Rode: pip install openai-whisper"
        ) from exc

    model = whisper.load_model(model_name)
    transcribe_options = {"fp16": False}

    if language != "auto":
        transcribe_options["language"] = language

    result = model.transcribe(str(audio_path), **transcribe_options)
    text = str(result.get("text", "")).strip()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(text, encoding="utf-8")

    return text


def build_parser():
    parser = argparse.ArgumentParser(description="Transcreve audio localmente com Whisper.")
    parser.add_argument("--audio", required=True, help="Caminho do arquivo .wav")
    parser.add_argument("--output", required=True, help="Caminho de saida .txt")
    parser.add_argument(
        "--model",
        default="small",
        choices=sorted(ALLOWED_MODELS),
        help="Modelo local do Whisper. Padrao: small",
    )
    parser.add_argument(
        "--language",
        default="pt",
        choices=sorted(ALLOWED_LANGUAGES),
        help="Idioma da transcricao. Use pt ou auto. Padrao: pt",
    )
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    audio_path = Path(args.audio)
    output_path = Path(args.output)

    if args.model not in ALLOWED_MODELS:
        print(f"Modelo Whisper invalido: {args.model}", file=sys.stderr)
        return 2

    if args.language not in ALLOWED_LANGUAGES:
        print(f"Idioma Whisper invalido: {args.language}", file=sys.stderr)
        return 2

    if not audio_path.exists():
        print(f"Arquivo de audio nao encontrado: {audio_path}", file=sys.stderr)
        return 2

    try:
        text = transcribe_audio(audio_path, output_path, args.model, args.language)
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1

    print(f"OK transcription_chars={len(text)} output={output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
