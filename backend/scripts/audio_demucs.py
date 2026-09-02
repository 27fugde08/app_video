import os
import sys
import argparse
import subprocess

def separate_audio_demucs(input_audio, output_dir, model="htdemucs", device="cpu"):
    print(f"[DEMUCS] Separating vocals and background music for: {input_audio} (Model: {model}, Device: {device})")
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        cmd = [
            sys.executable, "-m", "demucs",
            "--two-stems=vocals",
            "-n", model,
            "-d", device,
            "-o", output_dir,
            input_audio
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"[DEMUCS] Audio separation completed successfully.")
            return True
        else:
            print(f"[DEMUCS] Demucs process exited with code {res.returncode}: {res.stderr}")
    except Exception as e:
        print(f"[DEMUCS] Execution failed: {e}")

    return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="CreatorOS Demucs Audio Separator")
    parser.add_argument('--audio', required=True, help="Input audio path")
    parser.add_argument('--output_dir', required=True, help="Output folder")
    parser.add_argument('--model', default='htdemucs', help="Demucs Model")
    parser.add_argument('--device', default='cpu', help="cpu or cuda")

    args = parser.parse_args()
    separate_audio_demucs(args.audio, args.output_dir, args.model, args.device)
