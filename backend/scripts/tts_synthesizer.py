import os
import sys
import json
import asyncio
import argparse

VOICE_MAP = {
    'manh_dung': 'vi-VN-NamMinhNeural',
    'ban_mai': 'vi-VN-HoaiMyNeural',
    'calm_woman': 'en-US-JennyNeural',
    'chieu_thanh': 'vi-VN-NamMinhNeural',
    'lac_phi': 'vi-VN-HoaiMyNeural',
    'mai_phuong': 'vi-VN-HoaiMyNeural',
    'my_tam': 'vi-VN-HoaiMyNeural',
    'ngoc_huyen': 'vi-VN-HoaiMyNeural',
    'default': 'vi-VN-NamMinhNeural'
}

async def generate_voice_edge(text, voice_id, output_file, rate='+0%', volume='+0%', pitch='+0Hz'):
    actual_voice = VOICE_MAP.get(voice_id, voice_id if '-' in voice_id else VOICE_MAP['default'])
    print(f"[TTS_SYNTHESIZER] Generating audio with voice: {actual_voice} (Rate: {rate}, Pitch: {pitch})")
    
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, actual_voice, rate=rate, volume=volume, pitch=pitch)
        await communicate.save(output_file)
        print(f"[TTS_SYNTHESIZER] Successfully saved voice to {output_file}")
        return True
    except Exception as e:
        print(f"[TTS_SYNTHESIZER] edge_tts failed or not installed: {e}")
        # Fallback: create a blank wave header or notify
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'wb') as f:
            # Minimal WAV file header so FFmpeg can parse it if needed
            f.write(b'RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00')
        return False

def main():
    parser = argparse.ArgumentParser(description="CreatorOS Neural TTS Synthesizer")
    parser.add_argument('--voice_id', default='manh_dung', help="Voice Identifier")
    parser.add_argument('--target_lang', default='vi', help="Target language")
    parser.add_argument('--text', default='Chào mừng bạn đến với CreatorOS Video Dubbing Studio.', help="Text to speak")
    parser.add_argument('--transcript_json', default='', help="Optional input transcript json with segments")
    parser.add_argument('--rate', default='+0%', help="Speaking speed rate")
    parser.add_argument('--pitch', default='+0Hz', help="Voice pitch shift")
    parser.add_argument('--volume', default='+0%', help="Volume adjustment")
    parser.add_argument('--device', default='cpu', help="Execution device")
    parser.add_argument('--output', required=True, help="Output wav/mp3 file path")

    args = parser.parse_args()

    # If transcript json is provided, concatenate dialogue
    text_to_speak = args.text
    if args.transcript_json and os.path.exists(args.transcript_json):
        try:
            with open(args.transcript_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
                segments = data.get('segments', [])
                text_to_speak = ' '.join([s.get('translatedText', s.get('text', '')) for s in segments])
        except Exception as e:
            print(f"[TTS_SYNTHESIZER] Warning loading transcript json: {e}")

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    asyncio.run(generate_voice_edge(
        text_to_speak,
        args.voice_id,
        args.output,
        rate=args.rate,
        volume=args.volume,
        pitch=args.pitch
    ))

if __name__ == '__main__':
    main()
