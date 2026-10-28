#!/usr/bin/env python3
"""Checks every file in data/ so a typo can't reach production. Standard library only.
Run:  python tools/validate_data.py
"""
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
errors, warnings = [], []


def load(name):
    try:
        return json.loads((DATA / name).read_text(encoding="utf-8"))
    except Exception as e:  # missing file or invalid JSON
        errors.append(f"{name}: {e}")
        return {}


languages = load("languages.json")
countries = load("countries.json")
phrases = load("phrases.json")
learn = load("learn.json")

for code, c in countries.items():
    if not re.fullmatch(r"[A-Z]{2}", code):
        errors.append(f"countries: bad code '{code}'")
    for key in ("name", "flag", "lang", "locale", "numbers"):
        if not c.get(key):
            errors.append(f"countries.{code}: missing '{key}'")
    if c.get("lang") not in languages:
        errors.append(f"countries.{code}: language '{c.get('lang')}' not in languages.json")
    for n in c.get("numbers", []):
        if not (len(n) == 2 and re.fullmatch(r"\+?[0-9]{2,15}", str(n[1]).replace(" ", "").replace("-", ""))):
            errors.append(f"countries.{code}: bad helpline entry {n}")

for pid, p in phrases.items():
    if p.get("group") not in ("e", "c"):
        errors.append(f"phrases.{pid}: group must be 'e' or 'c'")
    for lang in languages:
        v = p.get("tr", {}).get(lang)
        text = v if isinstance(v, str) else (v or [""])[0]
        if not text:
            errors.append(f"phrases.{pid}: missing '{lang}' text")

ids = set()
for cat in learn.get("categories", []):
    for p in cat.get("phrases", []):
        if p["id"] in ids:
            errors.append(f"learn: duplicate phrase id '{p['id']}'")
        ids.add(p["id"])
        for lang in languages:
            t = p.get("tr", {}).get(lang)
            if not t or not t.get("f"):
                errors.append(f"learn.{p['id']}: missing formal '{lang}' text")
            elif lang != "en" and "|" not in t["f"]:
                warnings.append(f"learn.{p['id']}.{lang}: no pronunciation (text|pronunciation)")

for w in warnings:
    print("warning:", w)
for e in errors:
    print("error:", e)
print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
sys.exit(1 if errors else 0)
