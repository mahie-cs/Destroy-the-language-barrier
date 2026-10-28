// app.js: startup. Loads the data, restores saved choices, draws the first screen.

async function boot() {
  try {
    await loadData();
  } catch (e) {
    $('#app').innerHTML =
      "<div class='soon'><h1>Couldn\u2019t load the app data</h1><p class='sub'>Check your connection and reload.</p></div>";
    return;
  }
  restoreState();
  render();
  purge().then(prefetch);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
