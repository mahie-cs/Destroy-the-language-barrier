// settings.js: the Settings tab and the Terms of Service sheet.

// ---- Settings: one small object, saved as JSON. In the native app this maps 1:1 to DataStore / UserDefaults. ----
const ST = { theme: 'system', speed: 1 };
try {
  Object.assign(ST, JSON.parse(localStorage.getItem('lingua-settings') || '{}'));
} catch (e) {}
const saveST = () => {
  try {
    localStorage.setItem('lingua-settings', JSON.stringify(ST));
  } catch (e) {}
};
const applyTheme = () => {
  const r = document.documentElement;
  if (ST.theme === 'system') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', ST.theme);
};
applyTheme();
const seg = (key, list, cur) =>
  `<div class='seg' role='group'>${list.map(([v, l]) => `<button data-st='${key}' data-v='${v}' class='${String(v) === String(cur) ? 'on' : ''}' aria-pressed='${String(v) === String(cur)}'>${l}</button>`).join('')}</div>`;
function settingsView() {
  return `<h1>Settings</h1>
  <h2>Location</h2><div class='card'><label>My country</label>${fieldBtn('sh', S.home)}<label>I’m in</label>${fieldBtn('sw', S.here, 'margin-bottom:0')}</div>
  <h2>Audio</h2><div class='card'><div class='kv' style='margin-bottom:8px'><b>Speaking speed</b></div>${seg(
    'speed',
    [
      [1, 'Normal'],
      [0.8, 'Slow'],
      [0.6, 'Slower'],
    ],
    ST.speed,
  )}</div>
  <h2>Appearance</h2><div class='card'>${seg(
    'theme',
    [
      ['system', 'System'],
      ['light', 'Light'],
      ['dark', 'Dark'],
    ],
    ST.theme,
  )}</div>
  <h2>Storage</h2><div class='card'><div class='kv'><b>Saved audio</b><span id='cnt'>Counting…</span></div>
    <button class='btn blue' id='dl'>Download emergency audio</button><button class='btn blue' id='clr' style='margin-top:10px'>Clear saved audio</button><p class='cap' id='stmsg' aria-live='polite' style='margin:10px 0 0'></p></div>
  <h2>Privacy</h2><div class='card'><p style='margin:0'>No accounts and no tracking. Your countries, settings and saved audio stay on this device. Audio is only fetched when you tap Listen or download emergency audio.</p></div>
  <h2>About</h2><div class='list'>
    <button class='row' id='sab'><span class='em'>ℹ️</span>About Lingua Aid</button>
    <button class='row' id='stos'><span class='em'>📄</span>Terms of Service</button>
    <a class='row' href='mailto:mahie.edu@gmail.com' target='_blank' rel='noopener'><span class='em'>✉️</span>Contact</a></div>
  <h2>Reset</h2><button class='btn' id='rst' style='background:var(--red);border-bottom-color:var(--redD)'>Reset app</button>
  <p class='cap' style='text-align:center;margin-top:20px'>Lingua Aid ${APP_VERSION} · ${navigator.onLine ? 'Online' : 'Offline'}</p>`;
}
function bindSettings() {
  $('#sh').onclick = () =>
    pickCountry('My country', S.home, (k) => {
      S.home = k;
      save();
      render();
    });
  $('#sw').onclick = () =>
    pickCountry('Where are you now?', S.here, (k) => {
      S.here = k;
      save();
      render();
      purge().then(prefetch);
    });
  document.querySelectorAll('[data-st]').forEach(
    (b) =>
      (b.onclick = () => {
        const k = b.dataset.st;
        ST[k] = k === 'speed' ? +b.dataset.v : b.dataset.v;
        saveST();
        if (k === 'theme') applyTheme();
        render();
      }),
  );
  $('#sab').onclick = () => {
    S.tab = 'about';
    render();
    scrollTo(0, 0);
  };
  $('#stos').onclick = tosSheet;
  const msg = (m) => {
    const e = $('#stmsg');
    if (e) e.textContent = m;
  };
  const count = async () => {
    const [a, b] = await Promise.all([idb('readonly', (s) => s.count()), lreq('readonly', (s) => s.count())]);
    const el = $('#cnt');
    if (el) el.textContent = `${a || 0} emergency clips, ${b || 0} phrasebook clips`;
    return a || 0;
  };
  count();
  $('#dl').onclick = async () => {
    if (!navigator.onLine) return msg('You’re offline. Connect to download.');
    msg('Downloading…');
    await prefetch();
    const n = await count();
    msg(n ? `Emergency audio for ${C[S.here][0]} is saved.` : 'Couldn’t download audio. Try again later.');
  };
  $('#clr').onclick = async () => {
    await idb('readwrite', (s) => s.clear());
    await lreq('readwrite', (s) => s.clear());
    await count();
    msg('Saved audio cleared.');
  };
  let armed = false;
  $('#rst').onclick = async function () {
    const b = this;
    if (!armed) {
      armed = true;
      b.textContent = 'Tap again to erase everything';
      setTimeout(() => {
        armed = false;
        if (b.isConnected) b.textContent = 'Reset app';
      }, 4000);
      return;
    }
    try {
      localStorage.removeItem('lingua');
      localStorage.removeItem('lingua-settings');
    } catch (e) {}
    await idb('readwrite', (s) => s.clear());
    await lreq('readwrite', (s) => s.clear());
    S.home = S.here = null;
    S.tab = 'home';
    ST.theme = 'system';
    ST.speed = 1;
    applyTheme();
    render();
  };
}
function tosSheet() {
  sheet(`<div class='terms'><h1>Terms of Service</h1><p class='cap'>Last updated 26 October 2026</p>
  <p><b>1. Using Lingua Aid.</b> By using the app you agree to these terms. If you don’t agree, please don’t use it.</p>
  <p><b>2. Not an emergency service.</b> Lingua Aid does not place calls or contact anyone for you. The Helpline button opens your phone’s dialer with a number filled in, and you press call yourself. In an emergency, contact local emergency services directly.</p>
  <p><b>3. Information may be wrong.</b> Emergency numbers, translations and pronunciations are general guidance. They may be incomplete, out of date or inaccurate. Check important details with official sources. Nothing in the app is medical, legal or safety advice.</p>
  <p><b>4. Audio.</b> When you tap Listen, the text of that phrase is sent to an online speech service to create the audio. Audio may be saved on your device so it doesn’t need to be fetched again.</p>
  <p><b>5. Privacy.</b> Lingua Aid has no accounts and does not track you. Your chosen countries and saved audio stay in your browser or device storage.</p>
  <p><b>6. Fair use.</b> Use the app lawfully. Don’t misuse it, interfere with it, or present it as your own.</p>
  <p><b>7. No warranty.</b> The app is provided “as is”, without promises that it will be accurate, available or error-free. To the extent the law allows, the creator is not liable for any loss or harm that results from using it.</p>
  <p><b>8. Changes.</b> These terms may change. Continuing to use the app means you accept the updated terms.</p>
  <p><b>9. Contact.</b> Questions: <a class='mail' href='mailto:mahie.edu@gmail.com' target='_blank' rel='noopener'>mahie.edu@gmail.com</a></p></div>`);
}
