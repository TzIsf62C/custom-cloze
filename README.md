# CustomCloze

A mobile-friendly, fill-in-the-blank language practice app that runs entirely in the browser — no build tools, no framework, no installation required.

**Live app:** https://tzisf62c.github.io/custom-cloze/

---

## Features

- Practice cloze (fill-in-the-blank) exercises using your own word lists
- Pick from multiple categories; words are drawn from a local IndexedDB database
- Import words via CSV or enter them manually
- Session history and scoring stored locally — no server, no login
- Works offline after the first page load

## Supported Languages (sample data included)

Arabic, Chinese (Simplified & Traditional), English, French, Hindi, Korean, Spanish, Thai

## Usage

Open `customcloze/index.html` directly in any modern browser, or visit the live app link above.

**To add your own words:**
1. Go to **Manage Words**
2. Enter words manually, or import a CSV with columns: `word`, `sentence`, `category`

## Project Structure

```
customcloze/
├── index.html    # App shell — all screen markup
├── style.css     # Mobile-first styles
├── app.js        # Entry point; handles screen switching
├── db.js         # IndexedDB access via Dexie.js
├── engine.js     # Word selection and sentence masking
├── activity.js   # Practice screen logic
├── manage.js     # Manage screen logic
└── samples/      # Sample CSV word lists
```

## Dependencies

Loaded from CDN — no installation needed:

- [Dexie.js](https://dexie.org/) — IndexedDB wrapper
- [PapaParse](https://www.papaparse.com/) — CSV parsing

## Deployment

This repo deploys automatically to GitHub Pages via GitHub Actions on every push to `main`. See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## License

See [LICENSE](LICENSE).
