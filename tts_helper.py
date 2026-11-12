import sys
import asyncio
import edge_tts

async def main():
    if len(sys.argv) < 6:
        print("Usage: python tts_helper.py <voice> <rate> <pitch> <volume> <output_path>", file=sys.stderr)
        sys.exit(1)

    voice = sys.argv[1]
    rate = sys.argv[2]
    pitch = sys.argv[3]
    volume = sys.argv[4]
    output_path = sys.argv[5]

    # Read text from stdin in utf-8
    text = sys.stdin.read().strip()
    if not text:
        sys.exit(0)

    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=rate,
        pitch=pitch,
        volume=volume
    )
    await communicate.save(output_path)
    print("OK")

if __name__ == "__main__":
    asyncio.run(main())
