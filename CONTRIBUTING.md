# Contributing to Lingua Aid

Welcome, potential collaborator! If you are here because you want to help people navigate foreign countries without fumbling through translation apps, you are in the right place. 

If you are here to steal the code, slap your own logo on it, and pretend you built an offline-first polyglot travel rescue tool from scratch while eating cereal—please review our [License](LICENSE) and reconsider your life choices.

We love open source, but we love **teamwork** more. If you want to change, improve, or expand this project, you do it *here*, with us, via Pull Requests. 

---

## How to Contribute

### 1. Add a New Language
Got proficiency in a language currently missing from the app? Awesome.
1. Run the generator script:
   ```bash
   python3 tools/new_language.py <language_code> "Language Name"
   ```
   *(e.g., `python3 tools/new_language.py de "German"`)*
2. Fill in the newly created `data/lang/<code.json>` file with proper translations and pronunciations (`"text|pronunciation"`).
3. Add a country that speaks it to `data/countries.json`.
4. Run validation to ensure you didn't break JSON syntax:
   ```bash
   python3 tools/validate_data.py
   ```

### 2. Fix a Bug or Add a Phrase
- **Phrases:** Add phrase IDs to `data/phrases.json` (Home) or `data/learn.json` (Learn), then populate the corresponding text across the language files.
- **Bugs:** Found a typo in an emergency helpline or a glitch in the service worker? PRs are open.

---

## The Ground Rules

1. **Test Before You Push:** Run `python3 tools/validate_data.py`. If it fails, your PR will fail, and we will silently judge your syntax errors.
2. **Keep it Offline-First:** Don't bloat the app with heavy external framework dependencies or cloud database SDKs. We like it lean, fast, and local.
3. **No Lone Wolves:** As per the [License](LICENSE), independent forks for commercial re-branding or solo cloning are strictly prohibited. Make your magic happen *inside* this repository so everyone benefits.

Ready? Fork, code, test, and send that Pull Request!