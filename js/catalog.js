export const normalizeTitle = (text) => String(text || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const initial = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const vowels = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const finals = ['ㄱ','ㄲ','ㄱㅅ','ㄴ','ㄴㅈ','ㄴㅎ','ㄷ','ㄹ','ㄹㄱ','ㄹㅁ','ㄹㅂ','ㄹㅅ','ㄹㅌ','ㄹㅍ','ㄹㅎ','ㅁ','ㅂ','ㅂㅅ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
export function titleJamo(text) {
  return [...normalizeTitle(text).normalize('NFD')].map(c => {
    const code = c.charCodeAt(0);
    if (code >= 0x1100 && code <= 0x1112) return initial[code - 0x1100];
    if (code >= 0x1161 && code <= 0x1175) return vowels[code - 0x1161];
    if (code >= 0x11a8 && code <= 0x11c2) return finals[code - 0x11a8];
    return c;
  }).join('');
}
export function initials(text) {
  return [...text].map(c => { const n = c.charCodeAt(0) - 44032; return n >= 0 && n < 11172 ? initial[Math.floor(n / 588)] : c; }).join('');
}
const searchIndex = new WeakMap();
function indexed(games) {
  if (!searchIndex.has(games)) searchIndex.set(games, games.map(game => ({ game,
    titles: [game.nameKo, game.nameEn].map(normalizeTitle),
    initial: normalizeTitle(initials(game.nameKo)), jamo: titleJamo(game.nameKo),
  })));
  return searchIndex.get(games);
}
export function searchCatalog(games, query, limit = 30) {
  const q = normalizeTitle(query);
  if (!q) return [];
  const jamoQuery = titleJamo(query);
  return indexed(games).map(({game, titles, initial, jamo}) => {
    const score = titles.some(t => t === q) ? 0 : titles.some(t => t.startsWith(q)) ? 1 : titles.some(t => t.includes(q)) ? 2 : initial.includes(q) ? 3 : jamo.includes(jamoQuery) ? 4 : 99;
    return { game, score };
  }).filter(x => x.score < 99).sort((a, b) => a.score - b.score || a.game.rank - b.game.rank).slice(0, limit).map(x => x.game);
}
let catalogPromise;
export function loadCatalog() {
  catalogPromise ||= fetch(new URL('../data/games.json', import.meta.url)).then(r => { if (!r.ok) throw new Error('게임 목록을 불러오지 못했습니다.'); return r.json(); }).catch(e => { catalogPromise = null; throw e; });
  return catalogPromise;
}

export function renderCatalogSearch(container, games, recent, onSelect, onBack) {
  container.replaceChildren();
  const wrap = document.createElement('section'); wrap.className = 'catalog-screen';
  const header = document.createElement('div'); header.className = 'catalog-header';
  const back = document.createElement('button'); back.textContent = '← 게임 결과'; back.onclick = onBack;
  const input = document.createElement('input'); input.type = 'search'; input.placeholder = '한글·영문 게임명 검색'; input.setAttribute('aria-label', '게임명 검색'); input.maxLength = 100;
  header.append(back, input);
  const label = document.createElement('p');
  const results = document.createElement('div'); results.className = 'catalog-results';
  function draw() {
    const query = input.value.trim(); results.replaceChildren();
    const found = query ? searchCatalog(games, query) : recent;
    label.textContent = query ? `검색 결과 ${found.length}개 (최대 30개)` : '최근 선택한 게임';
    for (const game of found) {
      const button = document.createElement('button'); button.className = 'catalog-result';
      if (game.image) { const image = document.createElement('img'); image.src = game.image; image.alt = ''; image.loading = 'lazy'; image.onerror = () => image.remove(); button.append(image); }
      const text = document.createElement('span'); const title = document.createElement('strong'); title.textContent = game.nameKo;
      const subtitle = document.createElement('small'); subtitle.textContent = `${game.nameEn || ''} ${game.year || ''}`;
      text.append(title, subtitle); button.append(text); button.onclick = () => onSelect(game); results.append(button);
    }
    if (query) { const custom = document.createElement('button'); custom.className = 'catalog-result'; custom.textContent = `“${query}” 이름으로 기록`; custom.onclick = () => onSelect({ id: '', nameKo: query, nameEn: '', year: '' }); results.append(custom); }
    else if (!found.length) label.textContent = '최근 게임이 없습니다. 제목을 검색하세요.';
  }
  input.addEventListener('input', draw);
  input.addEventListener('compositionupdate', () => queueMicrotask(draw));
  input.addEventListener('compositionend', draw);
  wrap.append(header, label, results); container.append(wrap); draw(); input.focus();
}
