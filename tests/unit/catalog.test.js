import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCatalog, normalizeTitle } from '../../js/catalog.js';
const games = [
  {id:'1',rank:2,nameKo:'브라스: 버밍엄',nameEn:'Brass: Birmingham'},
  {id:'2',rank:1,nameKo:'세티: 외계의 지성체를 찾아서',nameEn:'SETI: Search for Extraterrestrial Intelligence'},
];
test('한영, 공백/기호, 초성 검색', () => {
  for (const q of ['brass','브라스버밍엄','ㅂㄹㅅ']) assert.equal(searchCatalog(games,q)[0].id,'1');
  for (const q of ['SETI','외계','세티']) assert.equal(searchCatalog(games,q)[0].id,'2');
  assert.equal(normalizeTitle('Brass : Birmingham'),'brassbirmingham');
  assert.deepEqual(searchCatalog(games,''),[]);
});
test('정확 일치가 인기순보다 앞서고 결과 제한을 지킨다', () => {
  const sample = [...games,{id:'3',rank:100,nameKo:'브라스',nameEn:'Brass'}];
  assert.equal(searchCatalog(sample,'브라스',1)[0].id,'3');
});
test('한글 조합 중 마지막 자음과 음절을 검색한다', () => {
  for (const q of ['ㅂ','브','브ㄹ','브라ㅅ','브라스버ㅁ']) assert.equal(searchCatalog(games,q)[0].id,'1');
  for (const q of ['세ㅌ','세티외ㄱ']) assert.equal(searchCatalog(games,q)[0].id,'2');
  assert.deepEqual(searchCatalog(games,'브라ㅈ'),[]);
});
