// state.js: what the user picked (home country, current country, tab) and tiny DOM helpers.

const S = { home: null, here: null, tab: 'home' };
function restoreState() {
  try {
    const s = JSON.parse(localStorage.getItem('lingua') || '{}');
    if (C[s.home] && C[s.here]) {
      S.home = s.home;
      S.here = s.here;
    }
  } catch (e) {}
}
const save = () => {
  try {
    localStorage.setItem('lingua', JSON.stringify({ home: S.home, here: S.here }));
  } catch (e) {}
};
const $ = (s) => document.querySelector(s);
