#!/usr/bin/env python3
"""Adds a language in one step.

  python tools/new_language.py de "German"

Creates data/lang/de.json with every phrase listed (empty, ready to fill in) and adds it to data/languages.json.
Then: fill in data/lang/de.json, add the country to data/countries.json, run tools/validate_data.py, and push.
Phrases you leave empty simply fall back to English until you translate them.
"""
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"


def main():
    if len(sys.argv) != 3 or not re.fullmatch(r"[a-z]{2,3}", sys.argv[1]):
        sys.exit('usage: python tools/new_language.py <code, e.g. de> "<English name, e.g. German>"')
    code, name = sys.argv[1], sys.argv[2]
    path = DATA / "lang" / f"{code}.json"
    if path.exists():
        sys.exit(f"{path} already exists")
    languages = json.loads((DATA / "languages.json").read_text(encoding="utf-8"))
    phrases = json.loads((DATA / "phrases.json").read_text(encoding="utf-8"))
    learn = json.loads((DATA / "learn.json").read_text(encoding="utf-8"))
    j = lambda x: json.dumps(x, ensure_ascii=False)
    learn_ids = [pid for c in learn["categories"] for pid in c["phrases"]]
    text = '{\n  "code": %s,\n  "phrases": {\n%s\n  },\n  "learn": {\n%s\n  }\n}\n' % (
        j(code),
        ",\n".join(f'    {j(pid)}: ""' for pid in phrases),
        ",\n".join(f'    {j(pid)}: {{ "f": "" }}' for pid in learn_ids),
    )
    path.parent.mkdir(exist_ok=True)
    path.write_text(text, encoding="utf-8")
    languages[code] = name
    (DATA / "languages.json").write_text(json.dumps(languages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Created {path.relative_to(DATA.parent)} and added '{code}' to data/languages.json")
    print('Fill the strings in as "text|pronunciation" (add an "i" next to "f" for an informal version).')


main()
