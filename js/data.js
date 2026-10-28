// data.js: loads the JSON files in data/ and holds them in memory.

// Filled by loadData() at startup. Edit the JSON files in data/, not this file.
let C = {}; // countries: code -> [name, flag, language, speech locale]
let L = {}; // language code -> display name
let N = {}; // country code -> helpline numbers [[label, number], ...]
let P = {}; // phrase id -> [icon, group ('e' emergency, 'c' common), translations]
let PB = []; // Learn categories

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(path + ' ' + res.status);
  return res.json();
}

async function loadData() {
  const [countries, languages, phrases, learn] = await Promise.all([
    loadJSON('data/countries.json'),
    loadJSON('data/languages.json'),
    loadJSON('data/phrases.json'),
    loadJSON('data/learn.json'),
  ]);
  L = languages;
  for (const k in countries) {
    const v = countries[k];
    C[k] = [v.name, v.flag, v.lang, v.locale];
    N[k] = v.numbers;
  }
  for (const id in phrases) P[id] = [phrases[id].icon, phrases[id].group, phrases[id].tr];
  PB = learn.categories;
}

const T = (id, lang) => {
  const v = P[id][2][lang];
  return typeof v === 'string' ? [v, ''] : v;
};
const ICON = {
  phone:
    '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
};
// Icons are emoji. E() is the one place to swap them if that ever changes.
const E = (k) => k;
