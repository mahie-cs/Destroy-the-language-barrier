<div align="center">

# [Lingua Aid](https://mahie-cs.github.io/Destroy-the-language-barrier/)

</div>

Emergency numbers and everyday phrases, with pronunciation and audio, for when you don't speak the language.
Offline-first, no accounts, no tracking. Plain HTML, CSS and JavaScript: no build step and no framework.

## Run it locally

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

Open it through a server, not by double-clicking `index.html` (the app loads its data with `fetch`).

## Publish it (GitHub Pages)

1. Create a GitHub repo and push this folder to the `main` branch.
2. **Settings > Pages > Build and deployment > Source: GitHub Actions.**
3. **Settings > Actions > General > Workflow permissions: Read and write** (the audio job commits mp3 files).

That's all. On the first push two workflows run:

| Workflow | When | What it does |
|---|---|---|
| `generate-audio.yml` | `data/**` changes, or run it by hand | Makes every mp3 with gTTS and commits it to `audio/` |
| `deploy.yml` | every push to `main`, and after audio is generated | Validates the data and publishes the site |
| `release.yml` | you push a tag like `v0.2.0` | Creates a GitHub release (the Updates tab reads it) |

Until the first audio run finishes, the app falls back to the phone's built-in voice, so nothing breaks.
Your site will be at `https://<user>.github.io/<repo>/`.

## Folder map

```
index.html            page shell, loads the scripts below
manifest.webmanifest  makes it installable on a phone ("Add to Home Screen")
sw.js                 service worker: lets the app shell work offline
css/styles.css        all styling (colours are CSS variables)
js/config.js          app version, tabs, GitHub repo
js/data.js            loads the JSON in data/
js/state.js           chosen countries, current tab
js/ui.js              main screen, sheets, country picker
js/updates.js         Updates tab (latest GitHub release, in-app download)
js/settings.js        Settings tab, Terms of Service
js/learn.js           Learn tab (phrasebook, formal and informal)
js/audio.js           playback, emergency audio cache, Learn audio cache
js/app.js             startup
data/countries.json   countries, languages spoken, helpline numbers
data/languages.json   language names
data/phrases.json     Home screen phrases (emergency and common)
data/learn.json       Learn phrasebook
audio/                generated mp3 files (created by the workflow, don't edit)
tools/                validate_data.py, generate_audio.py, build_site.sh
.github/workflows/    the three workflows above
```

## Editing content

Everything people read lives in `data/`. Edit the JSON, commit, push: the workflows validate it, regenerate only
the audio that changed, and redeploy.

- **Add a country:** add it to `data/countries.json` (`name`, `flag`, `lang`, `locale`, `numbers`). If it uses a new language, add the
  language to `data/languages.json` and give every phrase a translation in it. The validator lists what is missing.
- **Add a Learn phrase:** add an object to a category in `data/learn.json`. `id` is permanent (it names the audio file).
  Translations are `"text|pronunciation"`. `f` is formal, `i` is informal (leave `i` out if one version works for both).
- **Verify emergency numbers** against official sources before you rely on them. The sample numbers are not guaranteed.

Check your data any time: `python3 tools/validate_data.py`.
Preview audio work without generating: `python3 tools/generate_audio.py --check`.
Generate audio yourself: `pip install gTTS && python3 tools/generate_audio.py`.

## How audio works

1. The app asks for a static mp3 from `audio/` (same site, served by GitHub Pages).
2. **Emergency phrases** are downloaded ahead of time for the chosen country, kept for a week, and cleared when the country changes.
3. **Learn phrases** are fetched when tapped and kept in a small separate cache (60 clips, oldest dropped first: `LEARN_CACHE_MAX` in `js/audio.js`).
4. If a file isn't there or the user is offline, the phone's built-in voice speaks instead.

## Notes

- Each deploy replaces the service worker's cache name with the commit hash, so users get the new version on their next visit.
- Learn needs a connection by design. To allow it offline, remove the `navigator.onLine` check in `loadLearn` (`js/learn.js`).
- Google Fonts (Nunito) loads online; offline the app uses the phone's system font.
- License: MIT. Created by MD. Montasir Rahman Mahie, 26 October 2026. Contact: mahie.edu@gmail.com
