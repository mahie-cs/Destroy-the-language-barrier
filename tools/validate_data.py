#!/usr/bin/env python3
"""Checks every file in data/ so a typo can't reach production. Standard library only.

  data/languages.json     which languages exist:  {"it": "Italian", ...}
  data/lang/<code>.json   one file per language (its words and pronunciations)
  data/phrases.json       Home phrase ids, icons, groups (no words)
  data/learn.json         Learn categories and phrase ids (no words)
  data/countries.json     countries, helplines, and which language each one speaks

Run:  python tools/validate_data.py
Errors stop the deploy. Warnings (untranslated phrases) don't: the app falls back to English.
"""
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
errors, warnings = [], []


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # missing file or invalid JSON
        errors.append(f"{path.relative_to(DATA)}: {e}")
        return {}


languages = load(DATA / "languages.json")
countries = load(DATA / "countries.json")
phrases = load(DATA / "phrases.json")
learn = load(DATA / "learn.json")

if "en" not in languages:
    errors.append("languages.json: 'en' is required (fallback language, and the meaning shown on Learn cards)")

# ---- structure
phrase_ids = list(phrases)
for pid, p in phrases.items():
    if p.get("group") not in ("e", "c"):
        errors.append(f"phrases.{pid}: group must be 'e' or 'c'")
    if not p.get("icon"):
        errors.append(f"phrases.{pid}: missing icon")

learn_ids, seen = [], set()
for cat in learn.get("categories", []):
    for key in ("id", "icon", "title"):
        if not cat.get(key):
            errors.append(f"learn: a category is missing '{key}'")
    for pid in cat.get("phrases", []):
        if not isinstance(pid, str):
            errors.append(f"learn.{cat.get('id')}: phrase ids must be strings")
            continue
        if pid in seen:
            errors.append(f"learn: duplicate phrase id '{pid}'")
        seen.add(pid)
        learn_ids.append(pid)

# ---- countries
for code, c in countries.items():
    if not re.fullmatch(r"[A-Z]{2}", code):
        errors.append(f"countries: bad code '{code}'")
    for key in ("name", "flag", "lang", "locale", "numbers"):
        if not c.get(key):
            errors.append(f"countries.{code}: missing '{key}'")
    if c.get("lang") not in languages:
        errors.append(f"countries.{code}: language '{c.get('lang')}' is not in languages.json")
    for n in c.get("numbers", []):
        if not (len(n) == 2 and re.fullmatch(r"\+?[0-9]{2,15}", str(n[1]).replace(" ", "").replace("-", ""))):
            errors.append(f"countries.{code}: bad helpline entry {n}")

# ---- language files
report = []
for code in languages:
    path = DATA / "lang" / f"{code}.json"
    if not path.exists():
        errors.append(f"lang/{code}.json: file is missing (listed in languages.json)")
        continue
    pack = load(path)
    if pack.get("code") != code:
        errors.append(f'lang/{code}.json: "code" must be "{code}"')
    # English must be complete; other languages may be partial (the app falls back to English)
    gaps = errors if code == "en" else warnings
    ph, ln = pack.get("phrases", {}), pack.get("learn", {})
    for pid in ph:
        if pid not in phrases:
            errors.append(f"lang/{code}.json: unknown phrase id '{pid}'")
    for pid in ln:
        if pid not in seen:
            errors.append(f"lang/{code}.json: unknown learn id '{pid}'")
    have_ph = 0
    for pid in phrase_ids:
        if str(ph.get(pid, "")).split("|")[0].strip():
            have_ph += 1
        else:
            gaps.append(f"lang/{code}.json: phrase '{pid}' is not translated")
    have_ln = 0
    for pid in learn_ids:
        t = ln.get(pid) or {}
        if str(t.get("f", "")).split("|")[0].strip():
            have_ln += 1
            if code != "en" and "|" not in t["f"]:
                warnings.append(f"lang/{code}.json: learn '{pid}' has no pronunciation (text|pronunciation)")
        else:
            gaps.append(f"lang/{code}.json: learn '{pid}' is not translated")
    report.append(f"  {code:<4} phrases {have_ph}/{len(phrase_ids)}   learn {have_ln}/{len(learn_ids)}")

for f in sorted((DATA / "lang").glob("*.json")):
    if f.stem not in languages:
        warnings.append(f"lang/{f.name}: not listed in languages.json, so the app ignores it")

print("Languages:")
print("\n".join(report))
for w in warnings:
    print("warning:", w)
for e in errors:
    print("error:", e)
print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
sys.exit(1 if errors else 0)
