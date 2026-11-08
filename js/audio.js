// audio.js: audio playback and caches. Mp3 files are static files in audio/ (see tools/generate_audio.py).

// ---- Learn audio: its own small cache, separate from the emergency cache. Never prefetched, never promised offline. ----
// Fetched on tap, then reused. Past LEARN_CACHE_MAX clips, the least recently played are dropped.
const LEARN_CACHE_MAX = 60;
const ldb = new Promise((r) => {
  try {
    const q = indexedDB.open('lingua-learn-audio', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('c');
    q.onsuccess = () => r(q.result);
    q.onerror = () => r(null);
  } catch (e) {
    r(null);
  }
});
const lreq = async (mode, fn) => {
  const d = await ldb;
  if (!d) return null;
  return new Promise((r) => {
    try {
      const t = d.transaction('c', mode),
        q = fn(t.objectStore('c'));
      t.oncomplete = () => r(q && q.result);
      t.onerror = t.onabort = () => r(null);
    } catch (e) {
      r(null);
    }
  });
};
async function lput(key, blob) {
  await lreq('readwrite', (s) => s.put({ blob, at: Date.now() }, key));
  const d = await ldb;
  if (!d) return;
  try {
    const s = d.transaction('c', 'readwrite').objectStore('c'),
      rows = [];
    s.openCursor().onsuccess = (e) => {
      const c = e.target.result;
      if (c) {
        rows.push([c.key, c.value.at]);
        c.continue();
        return;
      }
      rows
        .sort((a, b) => a[1] - b[1])
        .slice(0, Math.max(0, rows.length - LEARN_CACHE_MAX))
        .forEach(([k]) => s.delete(k));
    };
  } catch (e) {}
}
async function learnAudio(lang, item) {
  const text = item.file; // static mp3 made by tools/generate_audio.py
  const key = lang + ':' + text,
    hit = await lreq('readonly', (s) => s.get(key));
  if (hit) {
    lreq('readwrite', (s) => s.put({ blob: hit.blob, at: Date.now() }, key));
    return [hit.blob, 'cached'];
  } // refresh recency
  if (!navigator.onLine) return null;
  try {
    const ac = new AbortController(),
      tm = setTimeout(() => ac.abort(), 6000);
    const r = await fetch(text, { signal: ac.signal });
    clearTimeout(tm);
    if (!r.ok) return null;
    const b = await r.blob();
    if (!b.size) return null;
    await lput(key, b);
    return [b, 'online'];
  } catch (e) {
    return null;
  }
}
let cur = null;
async function playLearn(btn, lang, item) {
  const text = item.text;
  const st = btn.parentElement.querySelector('.st'),
    say = (m) => {
      st.textContent = m;
    };
  say('Loading…');
  if (cur) {
    cur.pause();
    cur = null;
  }
  if (window.speechSynthesis) speechSynthesis.cancel();
  const a = await learnAudio(lang, item);
  if (a) {
    try {
      cur = new Audio(URL.createObjectURL(a[0]));
      cur.playbackRate = ST.speed;
      await cur.play();
      say(a[1] === 'cached' ? 'From saved copy' : 'Online voice');
      return;
    } catch (e) {}
  }
  if (window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = C[S.here][3];
    u.rate = 0.85 * ST.speed;
    speechSynthesis.speak(u);
    say('Device voice');
  } else say('Audio isn’t available on this device.');
}
// ---- Emergency and common phrase audio: static mp3 files in audio/, made by GitHub Actions ----
const WEEK = 7 * 864e5;
const db = new Promise((r) => {
  try {
    const q = indexedDB.open('lingua-audio', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('a');
    q.onsuccess = () => r(q.result);
    q.onerror = () => r(null);
  } catch (e) {
    r(null);
  }
});
const idb = async (mode, fn) => {
  const d = await db;
  if (!d) return null;
  return new Promise((r) => {
    try {
      const t = d.transaction('a', mode),
        q = fn(t.objectStore('a'));
      t.oncomplete = () => r(q && q.result);
      t.onerror = t.onabort = () => r(null);
    } catch (e) {
      r(null);
    }
  });
};
// Emergency audio is kept for a week, and dropped as soon as the country changes
async function purge() {
  const d = await db;
  if (!d) return;
  try {
    d.transaction('a', 'readwrite').objectStore('a').openCursor().onsuccess = (e) => {
      const c = e.target.result;
      if (!c) return;
      if (c.value.country !== S.here || Date.now() - c.value.at > WEEK) c.delete();
      c.continue();
    };
  } catch (e) {}
}
async function audio(id) {
  const country = S.here,
    lang = C[country][2],
    key = country + ':' + id,
    hit = await idb('readonly', (s) => s.get(key));
  if (hit && hit.country === country && Date.now() - hit.at < WEEK) return [hit.blob, 'cached'];
  if (!navigator.onLine) return null;
  try {
    const ac = new AbortController(),
      tm = setTimeout(() => ac.abort(), 6000);
    const r = await fetch(`audio/phrases/${lang}/${id}.mp3`, { signal: ac.signal });
    clearTimeout(tm);
    if (!r.ok) return null;
    const b = await r.blob();
    if (!b.size) return null;
    if (P[id][1] === 'e') await idb('readwrite', (s) => s.put({ blob: b, at: Date.now(), country }, key));
    return [b, 'online'];
  } catch (e) {
    return null;
  }
}
let pf = false;
async function prefetch() {
  if (pf || !S.here || !navigator.onLine) return;
  pf = true;
  try {
    for (const id of Object.keys(P)) if (P[id][1] === 'e') await audio(id);
  } finally {
    pf = false;
  }
}
addEventListener('online', prefetch);
const note = (m) => {
  const e = $('#aud');
  if (e) e.textContent = m;
};
async function speak(id, txt) {
  note('Loading…');
  if (window.speechSynthesis) speechSynthesis.cancel();
  const a = await audio(id);
  if (a) {
    try {
      const p = new Audio(URL.createObjectURL(a[0]));
      p.playbackRate = ST.speed;
      await p.play();
      note(a[1] === 'cached' ? 'Playing saved audio (works offline).' : 'Playing online audio.');
      return;
    } catch (e) {}
  }
  if (window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = C[S.here][3];
    u.rate = 0.85 * ST.speed;
    speechSynthesis.speak(u);
    note('Using your device’s voice (works offline).');
  } else note('Audio isn’t available on this device.');
}
