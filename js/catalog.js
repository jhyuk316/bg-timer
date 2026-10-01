export const normalizeTitle = (text) => String(text || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const initial = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
export function initials(text) {
  return [...text].map(c => { const n = c.charCodeAt(0) - 44032; return n >= 0 && n < 11172 ? initial[Math.floor(n / 588)] : c; }).join('');
}
export function searchCatalog(games, query, limit = 30) {
  const q = normalizeTitle(query);
  if (!q) return [];
  return games.map(game => {
    const titles = [game.nameKo, game.nameEn].map(normalizeTitle);
    const score = titles.some(t => t === q) ? 0 : titles.some(t => t.startsWith(q)) ? 1 : titles.some(t => t.includes(q)) ? 2 : normalizeTitle(initials(game.nameKo)).includes(q) ? 3 : 99;
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
  input.addEventListener('input', () => { if (!input.composing) draw(); });
  input.addEventListener('compositionstart', () => { input.composing = true; }); input.addEventListener('compositionend', () => { input.composing = false; draw(); });
  wrap.append(header, label, results); container.append(wrap); draw(); input.focus();
}
