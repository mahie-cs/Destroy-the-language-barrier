// updates.js: the Updates tab: checks the latest GitHub release and downloads it in the app.

// ---- Updates: the latest GitHub release is the single source of truth ----
const REL_API = `https://api.github.com/repos/${REPO}/releases/latest`,
  REL_PAGE = `https://github.com/${REPO}/releases`;
const vnum = (v) =>
  String(v || '')
    .replace(/^[^\d]*/, '')
    .split(/[.\-+]/)
    .map((n) => parseInt(n) || 0);
const newer = (a, b) => {
  const x = vnum(a),
    y = vnum(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d > 0;
  }
  return false;
};
const esc = (t) =>
  String(t).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const fmtSize = (n) =>
  n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round((n || 0) / 1024)) + ' KB';
const notesHtml = (b) =>
  esc(b || '')
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\*\*/g, ''))
    .filter(Boolean)
    .map(
      (l) =>
        `<p style='margin:0 0 6px'>${/^[-*] /.test(l) ? '• ' + l.slice(2) : l.replace(/^#+\s*/, '')}</p>`,
    )
    .join('');
const slim = (r) => ({
  tag: r.tag_name,
  name: r.name || r.tag_name,
  body: r.body || '',
  at: r.published_at,
  url: r.html_url,
  assets: (r.assets || []).map((a) => ({ id: a.id, name: a.name, size: a.size, digest: a.digest || '' })),
});
// Checks at most once an hour (GitHub allows 60 anonymous calls an hour). Falls back to the last result if offline.
async function getRelease(force) {
  let c = null;
  try {
    c = JSON.parse(localStorage.getItem('lingua-update') || 'null');
  } catch (e) {}
  if (!force && c && Date.now() - c.at < 36e5) return { rel: c.rel, at: c.at };
  try {
    const r = await fetch(REL_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (r.status !== 404 && !r.ok) throw new Error(r.status);
    const rec = { at: Date.now(), rel: r.status === 404 ? false : slim(await r.json()) };
    try {
      localStorage.setItem('lingua-update', JSON.stringify(rec));
    } catch (e) {}
    return rec;
  } catch (e) {
    if (c) return { rel: c.rel, at: c.at, stale: true };
    throw e;
  }
}
const updatesView = () =>
  `<h1>Updates</h1><p class='sub'>You have version ${APP_VERSION}.</p><div id='upd'><div class='card'>Checking for updates…</div></div>`;
async function updates(force) {
  const put = (h) => {
    const u = $('#upd');
    if (!u) return;
    u.innerHTML = h;
    const c = $('#ucheck');
    if (c)
      c.onclick = () => {
        u.innerHTML = `<div class='card'>Checking for updates…</div>`;
        updates(true);
      };
  };
  const again = `<button class='btn blue' id='ucheck' style='margin-top:10px'>Check again</button>`;
  let res;
  try {
    res = await getRelease(force);
  } catch (e) {
    return put(
      `<div class='card'><b>Couldn’t check for updates</b><p class='cap'>${navigator.onLine ? 'GitHub couldn’t be reached from here.' : 'You’re offline. Updates need an internet connection.'}</p></div>${again}<a class='btn' style='margin-top:10px' href='${REL_PAGE}' target='_blank' rel='noopener'>Open releases on GitHub</a>`,
    );
  }
  const rel = res.rel,
    foot = `<p class='cap' style='text-align:center;margin-top:14px'>${res.stale ? 'Offline, showing the last result. ' : ''}Last checked ${new Date(res.at).toLocaleString()}</p>`;
  if (!rel)
    return put(
      `<div class='card'><b>No releases yet</b><p class='cap' style='margin:4px 0 0'>You’re up to date. New versions will show up here as soon as they’re published.</p></div>${again}${foot}`,
    );
  const a = rel.assets.find((x) => /\.apk$/i.test(x.name)) || rel.assets[0],
    isNew = newer(rel.tag, APP_VERSION);
  put(
    `<div class='card'><span class='tag ${isNew ? 'inf' : 'f'}'>${isNew ? 'Update available' : 'Up to date'}</span><div style='font-size:20px;font-weight:900'>${esc(rel.name)}</div><div class='cap'>${esc(rel.tag)} · ${new Date(rel.at).toLocaleDateString()}</div><div style='margin-top:10px'>${notesHtml(rel.body) || `<p class='cap'>No release notes.</p>`}</div>${isNew && a ? `<div class='bar' id='ubarw' hidden><i id='ubar'></i></div><button class='btn' id='udl' style='margin-top:12px'>Download update (${fmtSize(a.size)})</button><p class='cap' id='umsg' aria-live='polite'></p>` : ''}${isNew && !a ? `<a class='btn' style='margin-top:12px' href='${esc(rel.url)}' target='_blank' rel='noopener'>View on GitHub</a>` : ''}</div>${again}${foot}`,
  );
  if (isNew && a) $('#udl').onclick = () => downloadUpdate(a);
}
// Downloads inside the app with a progress bar, checks the SHA-256 GitHub publishes for the file, then hands it to the device.
async function downloadUpdate(a) {
  const btn = $('#udl'),
    bar = $('#ubar'),
    msg = (m) => {
      const e = $('#umsg');
      if (e) e.textContent = m;
    };
  try {
    btn.disabled = true;
    $('#ubarw').hidden = false;
    msg('');
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/assets/${a.id}`, {
      headers: { Accept: 'application/octet-stream' },
    });
    if (!r.ok || !r.body) throw new Error('Download failed (' + r.status + ').');
    const total = a.size || +r.headers.get('content-length') || 0,
      rd = r.body.getReader(),
      parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      if (total) {
        const p = Math.min(100, (got / total) * 100);
        bar.style.width = p + '%';
        btn.textContent = 'Downloading… ' + Math.floor(p) + '%';
      }
    }
    const blob = new Blob(parts);
    if (/^sha256:/.test(a.digest) && window.crypto && crypto.subtle) {
      const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
      if ('sha256:' + h !== a.digest)
        throw new Error('The file didn’t match its checksum, so it was discarded.');
    }
    const u = URL.createObjectURL(blob),
      l = document.createElement('a');
    l.href = u;
    l.download = a.name;
    document.body.appendChild(l);
    l.click();
    l.remove();
    setTimeout(() => URL.revokeObjectURL(u), 6e4);
    btn.textContent = 'Downloaded';
    msg('Open the downloaded file to install it.');
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Download update';
    msg(e.message || 'Download failed.');
  }
}
