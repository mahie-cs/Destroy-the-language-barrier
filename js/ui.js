// ui.js: the main screen, bottom sheets and the country picker.

function render() {
  const app = $('#app');
  if (!S.home || !S.here) {
    app.innerHTML = `<div class="hero"><div class="em">${E('🌍')}</div><h1>Welcome to Lingua Aid</h1><p class="sub">Say the right thing when it matters. Works offline once loaded.</p></div>
    <label>Which country are you from?</label>${fieldBtn('h', S.home)}
    <label>Which country are you in now?</label>${fieldBtn('w', S.here)}
    <button class="btn" id="go" ${S.home && S.here ? '' : 'disabled'}>Continue</button>`;
    $('#h').onclick = () =>
      pickCountry('Which country are you from?', S.home, (k) => {
        S.home = k;
        render();
      });
    $('#w').onclick = () =>
      pickCountry('Which country are you in now?', S.here, (k) => {
        S.here = k;
        render();
      });
    $('#go').onclick = () => {
      save();
      render();
      purge().then(prefetch);
    };
    return;
  }
  const h = C[S.home],
    w = C[S.here];
  let body = '';
  if (S.tab === 'home') {
    const ids = Object.keys(P),
      tile = (id, c) =>
        `<button class="tile ${c}" data-p="${id}"><span class="em">${E(P[id][0])}</span>${T(id, h[2])[0]}</button>`;
    body = `<h1>Need help in ${w[0]}?</h1><p class="sub">Tap a phrase to show or say it in ${L[w[2]]}.</p>
    <div class="grid">${ids
      .filter((i) => P[i][1] === 'e')
      .map((i) => tile(i, 'sos'))
      .join('')}</div>
    <h2>Good to know</h2><div class="list">${ids
      .filter((i) => P[i][1] === 'c')
      .map(
        (i) =>
          `<button class="row" data-p="${i}"><span class="em">${E(P[i][0])}</span>${T(i, h[2])[0]}</button>`,
      )
      .join('')}</div>`;
  } else if (S.tab === 'updates') {
    body = updatesView();
  } else if (S.tab === 'settings') {
    body = settingsView();
  } else if (S.tab === 'about') {
    body = `<h1>About Lingua Aid</h1>
    <p class='sub'>Lingua Aid helps you get by in a country where you don’t speak the language. Emergency numbers and the phrases you need most are one tap away, with pronunciation and audio. The essentials work offline.</p>
    <div class='card'>
      <div class='kv'><b>Created by</b>MD. Montasir Rahman Mahie</div>
      <div class='kv'><b>Created on</b>26 October 2026</div>
      <div class='kv' style='margin:0'><b>Contact</b><a class='mail' href='mailto:mahie.edu@gmail.com' target='_blank' rel='noopener'>mahie.edu@gmail.com</a></div>
    </div>
    <button class='tos' id='tos'>Terms of Service</button>`;
  } else if (S.tab === 'learn') {
    body = `<div id='learn'><p class='sub'>Loading lesson…</p></div>`;
  } else {
    const t = TABS.find((x) => x[0] === S.tab);
    body = `<div class="soon"><div class="em">${E(t[1])}</div><h1>${t[2]}: coming soon</h1><p class="sub">We’re still building this part.</p></div>`;
  }
  app.innerHTML = `<header><button class="loc" id="loc" aria-label="Change location"><span class="fl">${w[1]}</span>${w[0]}${ICON.down}</button>
    <button class="help" id="help">${ICON.phone}Helpline</button></header>${body}
    <nav><div>${TABS.map((t) => `<button data-t="${t[0]}" class="${t[0] === S.tab ? 'on' : ''}"><span class="i">${E(t[1])}</span>${t[2]}</button>`).join('')}</div></nav>`;
  $('#loc').onclick = locSheet;
  $('#help').onclick = helpSheet;
  if ($('#tos')) $('#tos').onclick = tosSheet;
  if (S.tab === 'settings') bindSettings();
  if (S.tab === 'updates') updates();
  if (S.tab === 'learn') learn();
  app.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => phraseSheet(b.dataset.p)));
  app.querySelectorAll('[data-t]').forEach(
    (b) =>
      (b.onclick = () => {
        S.tab = b.dataset.t;
        render();
        scrollTo(0, 0);
      }),
  );
}
function sheet(html) {
  $('#layer').innerHTML =
    `<div class="ov" id="ov"><div class="sheet" role="dialog" aria-modal="true"><button class="close" aria-label="Close" id="x">×</button>${html}</div></div>`;
  const close = () => {
    $('#layer').innerHTML = '';
    if (window.speechSynthesis) speechSynthesis.cancel();
  };
  $('#x').onclick = close;
  $('#ov').onclick = (e) => {
    if (e.target.id === 'ov') close();
  };
  return close;
}
function helpSheet() {
  const w = C[S.here];
  sheet(`<h1>${w[1]} Helpline</h1><p class="sub">Emergency numbers in ${w[0]}. Tap Call to open your dialer; you still press the call button.</p>
  ${N[S.here].map(([l, n]) => `<div class="num"><div><div class="cap">${l}</div><b>${n}</b></div><a class="btn" href="tel:${n}">Call</a></div>`).join('')}
  <p class="cap">Sample data. Confirm numbers with official sources.</p>`);
}
const fieldBtn = (id, val, style = '') =>
  `<button class='field' id='${id}' style='${style}'>${val ? `<span>${C[val][1]} ${C[val][0]}</span>` : `<span class='ph'>Choose a country\u2026</span>`}${ICON.down}</button>`;
// In-app country picker: replaces the browser's native dropdown. Type to search by country, code or language.
function pickCountry(title, cur, done) {
  const all = Object.entries(C).sort((a, b) => a[1][0].localeCompare(b[1][0]));
  const close = sheet(
    `<h1>${title}</h1><div class='search'><span aria-hidden='true'>🔍</span><input id='q' type='search' placeholder='Search country or language' autocomplete='off' autocapitalize='off' spellcheck='false' enterkeyhint='search' aria-label='Search countries'></div><div class='list' id='cl'></div>`,
  );
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase();
    const m = all.filter(
      ([k, v]) =>
        !q || v[0].toLowerCase().includes(q) || k.toLowerCase() === q || L[v[2]].toLowerCase().includes(q),
    );
    $('#cl').innerHTML = m.length
      ? m
          .map(
            ([k, v]) =>
              `<button class='row' data-k='${k}'><span class='em'>${v[1]}</span>${v[0]}${k === cur ? `<span class='ck'>\u2713</span>` : ''}</button>`,
          )
          .join('')
      : `<p class='sub' style='text-align:center'>No country matches your search.</p>`;
  };
  $('#q').oninput = draw;
  $('#q').onkeydown = (e) => {
    if (e.key === 'Enter') {
      const b = $('#cl [data-k]');
      if (b) b.click();
    }
  };
  $('#cl').onclick = (e) => {
    const b = e.target.closest('[data-k]');
    if (b) {
      close();
      done(b.dataset.k);
    }
  };
  draw();
}
function locSheet() {
  pickCountry('Where are you now?', S.here, (k) => {
    S.here = k;
    save();
    render();
    purge().then(prefetch);
  });
}
function phraseSheet(id) {
  const h = C[S.home],
    w = C[S.here],
    [src] = T(id, h[2]),
    [txt, ph] = T(id, w[2]),
    same = h[2] === w[2];
  sheet(`<div class="cap">${E(P[id][0])}${src}</div><div class="cap" style="margin-top:14px">In ${L[w[2]]}</div>
  <div class="big" lang="${w[2]}">${txt}</div>
  ${!same && ph ? `<div class="cap">Say it like this</div><div class="say">${ph}</div>` : ''}
  <button class="btn blue" id="spk">${E('🔊')} Listen</button><p class="cap" id="aud" aria-live="polite"></p>`);
  $('#spk').onclick = () => speak(id, txt);
}
