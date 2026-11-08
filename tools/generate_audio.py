#!/usr/bin/env python3
"""Makes every mp3 the app plays, with gTTS (Google text-to-speech), into audio/.

  audio/phrases/<lang>/<phrase id>.mp3        Home screen phrases (data/lang/<lang>.json)
  audio/learn/<lang>/<phrase id>.f.mp3        Learn, formal      (data/lang/<lang>.json)
  audio/learn/<lang>/<phrase id>.i.mp3        Learn, informal

Only clips whose text changed (or that are missing) are generated, tracked in audio/manifest.json.
Clips no longer in the data are deleted.

  pip install gTTS
  python tools/generate_audio.py            # generate what's new or changed
  python tools/generate_audio.py --force    # regenerate everything
  python tools/generate_audio.py --check    # list what would be generated, change nothing
"""
import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA, OUT = ROOT / "data", ROOT / "audio"
MANIFEST = OUT / "manifest.json"
RETRIES, PAUSE = 3, 0.5  # be gentle with the free endpoint


def read(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def wanted():
    """Every clip the app can ask for: {relative path: (language, text)}. Read from data/lang/*.json."""
    clips = {}
    for lang in read("languages.json"):
        path = DATA / "lang" / f"{lang}.json"
        if not path.exists():
            continue
        pack = json.loads(path.read_text(encoding="utf-8"))
        for pid, cell in pack.get("phrases", {}).items():
            text = cell.split("|")[0].strip()
            if text:
                clips[f"phrases/{lang}/{pid}.mp3"] = (lang, text)
        for pid, t in pack.get("learn", {}).items():
            for reg in ("f", "i"):
                text = t.get(reg, "").split("|")[0].strip()
                if text:
                    clips[f"learn/{lang}/{pid}.{reg}.mp3"] = (lang, text)
    return clips


def signature(lang, text):
    return hashlib.sha1(f"{lang}\0{text}".encode("utf-8")).hexdigest()[:16]


def synthesize(lang, text, dest):
    from gtts import gTTS

    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(1, RETRIES + 1):
        try:
            gTTS(text=text, lang=lang).save(str(dest))
            return True
        except Exception as e:
            print(f"::warning::{dest.relative_to(OUT)} attempt {attempt}: {e}")
            time.sleep(2 * attempt)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    clips = wanted()
    old = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    todo = [
        p for p, (lang, text) in clips.items()
        if args.force or not (OUT / p).exists() or old.get(p) != signature(lang, text)
    ]
    orphans = [str(f.relative_to(OUT)) for f in OUT.rglob("*.mp3") if str(f.relative_to(OUT)) not in clips] if OUT.exists() else []
    print(f"{len(clips)} clips wanted, {len(todo)} to generate, {len(orphans)} to delete")
    if args.check:
        for p in todo:
            print("  +", p)
        for p in orphans:
            print("  -", p)
        return 0

    new = {p: s for p, s in old.items() if p in clips}
    failed = 0
    for i, p in enumerate(todo, 1):
        lang, text = clips[p]
        print(f"[{i}/{len(todo)}] {p}  {text}")
        if synthesize(lang, text, OUT / p):
            new[p] = signature(lang, text)
            time.sleep(PAUSE)
        else:
            failed += 1
    for p in orphans:
        (OUT / p).unlink()
    OUT.mkdir(exist_ok=True)
    MANIFEST.write_text(json.dumps(dict(sorted(new.items())), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    if failed:
        print(f"::warning::{failed} clip(s) failed and will be retried on the next run")
    return 0  # a failed clip must not block the deploy; the app falls back to the device voice


if __name__ == "__main__":
    sys.exit(main())
