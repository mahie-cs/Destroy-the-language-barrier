// learn.js: the Learn tab: an everyday phrasebook with formal and informal versions.

// Learn needs a connection by design (see README). Rows come from data/learn.json.
async function loadLearn(lang) {
  if (!navigator.onLine) throw new Error('offline');
  if (!L[lang]) throw new Error('missing');
  const sp = (cell, file) => {
    const [text, pron] = cell.split('|');
    return { text, pron: pron || '', file };
  };
  return PB.map((c) => [
    c.icon,
    c.title,
    c.phrases
      .filter((p) => p.tr[lang])
      .map((p) => {
        const t = p.tr[lang],
          base = `audio/learn/${lang}/${p.id}`;
        return {
          en: p.en,
          v: t.i
            ? [
                ['Formal', sp(t.f, base + '.f.mp3')],
                ['Informal', sp(t.i, base + '.i.mp3')],
              ]
            : [['Formal & informal', sp(t.f, base + '.f.mp3')]],
        };
      }),
  ]);
}

let LROWS = [];
function learnView(code, lang, cats) {
  LROWS = [];
  return `<h1>${C[code][1]} Phrasebook</h1><p class='sub'>Everyday ${L[lang]} for ${C[code][0]}. Tap a box to open it, then tap Listen. Use formal with strangers and informal with friends. Learn needs internet.</p>
  <div class='list'>${cats.map(([e, t, rows], i) => `<div><button class='cat' aria-expanded='false' aria-controls='cp${i}' data-cat='${i}'><span class='em'>${E(e)}</span><span class='ct'>${t}<small>${rows.length} phrases</small></span>${ICON.down}</button><div class='cpanel' id='cp${i}' hidden><div class='list'>${rows.map((r) => `<div class='card sen'>${lang === 'en' ? '' : `<div class='cap'>${r.en}</div>`}${r.v.map(([tag, x]) => `<div class='v'><span class='tag ${tag === 'Informal' ? 'inf' : tag === 'Formal' ? 'f' : ''}'>${tag}</span><div class='t' lang='${lang}'>${x.text}</div>${x.pron ? `<div class='p'>${x.pron}</div>` : ''}<div class='ar'><button class='btn blue pl' data-s='${LROWS.push(x) - 1}'>${E('🔊')} Listen</button><span class='st cap' aria-live='polite'></span></div></div>`).join('')}</div>`).join('')}</div></div></div>`).join('')}</div>`;
}
async function learn() {
  const code = S.here,
    lang = C[code][2];
  try {
    const cats = await loadLearn(lang),
      el = $('#learn');
    if (!el || S.tab !== 'learn' || S.here !== code) return;
    el.innerHTML = learnView(code, lang, cats);
    el.querySelectorAll('[data-cat]').forEach(
      (b) =>
        (b.onclick = () => {
          const p = $('#cp' + b.dataset.cat),
            o = p.hidden;
          p.hidden = !o;
          b.setAttribute('aria-expanded', o);
          b.classList.toggle('open', o);
        }),
    );
    el.querySelectorAll('[data-s]').forEach(
      (b) => (b.onclick = () => playLearn(b, lang, LROWS[b.dataset.s])),
    );
  } catch (e) {
    const el = $('#learn');
    if (!el) return;
    el.innerHTML = `<div class='soon'><div class='em'>${E('📡')}</div><h1>${e.message === 'offline' ? 'You’re offline' : 'Phrasebook not available'}</h1><p class='sub'>${e.message === 'offline' ? 'Learn needs an internet connection. The rest of the app still works offline.' : 'There’s no phrasebook for this language yet.'}</p><button class='btn blue' id='retry'>Try again</button></div>`;
    $('#retry').onclick = learn;
  }
}
addEventListener('online', () => {
  if (S.tab === 'learn') learn();
});
