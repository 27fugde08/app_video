import os
import sys
import argparse
import subprocess
import random

def mutate_video(input_video, output_video, speed=1.02, flip=False, crop_px=2, brightness=0.03, contrast=1.05, use_gpu=False):
    print(f"[MUTATOR] Processing Anti-Detection Video Filters: {input_video} -> {output_video}")
    os.makedirs(os.path.dirname(os.path.abspath(output_video)), exist_ok=True)

    # Build complex FFmpeg filtergraph
    vf_filters = []
    
    # 1. Micro Crop edges to defeat geometric hash
    if crop_px > 0:
        vf_filters.append(f"crop=in_w-{crop_px*2}:in_h-{crop_px*2}:{crop_px}:{crop_px}")

    # 2. Horizontal Flip if requested
    if flip:
        vf_filters.append("hflip")

    # 3. Micro Color and EQ grading
    vf_filters.append(f"eq=brightness={brightness}:contrast={contrast}:saturation=1.04")

    # 4. Micro Speed variation
    if speed != 1.0:
        vf_filters.append(f"setpts={1.0/speed}*PTS")

    vf_string = ",".join(vf_filters)
    af_string = f"atempo={speed}" if speed != 1.0 else "anull"

    video_codec = "h264_nvenc" if use_gpu else "libx264"

    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-vf", vf_string,
        "-af", af_string,
        "-c:v", video_codec,
        "-preset", "p4" if use_gpu else "fast",
        "-crf", "19",
        "-c:a", "aac",
        "-b:a", "192k",
        "-metadata", f"comment=CreatorOS_Render_{random.randint(100000, 999999)}",
        output_video
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"[MUTATOR] Finished rendering video: {output_video}")
            return True
        else:
            print(f"[MUTATOR] FFmpeg error: {res.stderr}")
    except Exception as e:
        print(f"[MUTATOR] Error executing FFmpeg: {e}")

    return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="CreatorOS Anti-Detection Mutator")
    parser.add_argument('--input', required=True, help="Input video path")
    parser.add_argument('--output', required=True, help="Output video path")
    parser.add_argument('--speed', type=float, default=1.02, help="Micro speed multiplier")
    parser.add_argument('--flip', action='store_true', help="Flip horizontally")
    parser.add_argument('--crop', type=int, default=2, help="Crop border pixels")
    parser.add_argument('--gpu', action='store_true', help="Use NVIDIA NVENC")

    args = parser.parse_args()
    mutate_video(args.input, args.output, speed=args.speed, flip=args.flip, crop_px=args.crop, use_gpu=args.gpu)
