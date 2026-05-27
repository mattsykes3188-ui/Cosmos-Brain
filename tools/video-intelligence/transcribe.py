import argparse
import sys
from pathlib import Path


def transcribe_audio(input_path, output_path, model_name):
    try:
        import whisper
    except ImportError as exc:
        raise RuntimeError(
            "openai-whisper nao esta instalado. Rode: pip install openai-whisper"
        ) from exc

    model = whisper.load_model(model_name)
    result = model.transcribe(str(input_path), fp16=False)
    text = str(result.get("text", "")).strip()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(text, encoding="utf-8")

    return text


def main():
    parser = argparse.ArgumentParser(description="Transcreve audio localmente com Whisper.")
    parser.add_argument("input", help="Caminho do arquivo .wav")
    parser.add_argument("output", help="Caminho de saida .txt")
    parser.add_argument(
        "--model",
        default="tiny",
        help="Modelo local do Whisper. Padrao: tiny",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Arquivo de audio nao encontrado: {input_path}", file=sys.stderr)
        return 2

    try:
        text = transcribe_audio(input_path, output_path, args.model)
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1

    print(f"OK transcription_chars={len(text)} output={output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
