/* ============================================================
   매일연산 - core.js
   난수 생성기(시드 기반), 문제지번호 인코딩, 공통 수학 헬퍼
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 시드 난수 (mulberry32) ----------
     같은 시드 → 항상 같은 문제. 시드가 바뀌면 숫자가 전부 바뀝니다. */
  function makeRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function ri(rng, min, max) {           // [min, max] 정수
    return min + Math.floor(rng() * (max - min + 1));
  }
  function pick(rng, arr) {
    return arr[ri(rng, 0, arr.length - 1)];
  }
  function shuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = ri(rng, 0, i);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function chance(rng, p) { return rng() < p; }

  /* 조건을 만족할 때까지 재생성. 못 찾으면 마지막 값을 그대로 사용. */
  function tryGen(rng, make, ok, tries) {
    var last = null;
    var n = tries || 500;
    for (var i = 0; i < n; i++) {
      last = make(rng);
      if (!ok || ok(last)) return last;
    }
    return last;
  }

  /* ---------- 자릿수/형태별 수 생성 ----------
     spec: 숫자 | [min,max] | {d:자릿수, form:'tens'|'hundreds'|'ht'|'thousands', min, max} */
  function genNum(rng, sp) {
    if (typeof sp === 'number') return sp;
    if (Array.isArray(sp)) return ri(rng, sp[0], sp[1]);
    sp = sp || {};
    if (sp.form === 'tens') return ri(rng, sp.min || 1, sp.max || 9) * 10;         // 몇십
    if (sp.form === 'hundreds') return ri(rng, sp.min || 1, sp.max || 9) * 100;     // 몇백
    if (sp.form === 'thousands') return ri(rng, sp.min || 1, sp.max || 9) * 1000;   // 몇천
    if (sp.form === 'ht') return ri(rng, 1, 9) * 100 + ri(rng, 1, 9) * 10;          // 몇백 몇십
    var d = sp.d || 1;
    var lo = d === 1 ? 1 : Math.pow(10, d - 1);
    var hi = Math.pow(10, d) - 1;
    if (sp.min != null) lo = sp.min;
    if (sp.max != null) hi = sp.max;
    return ri(rng, lo, hi);
  }

  /* ---------- 받아올림 / 받아내림 개수 세기 ---------- */
  function countCarries(a, b) {
    var c = 0, carry = 0;
    while (a > 0 || b > 0) {
      var s = (a % 10) + (b % 10) + carry;
      if (s >= 10) { c++; carry = 1; } else carry = 0;
      a = Math.floor(a / 10); b = Math.floor(b / 10);
    }
    return c;
  }
  function countBorrows(a, b) {          // a >= b 가정
    var c = 0, borrow = 0, x = a, y = b;
    while (x > 0) {
      var da = (x % 10) - borrow, db = y % 10;
      if (da < db) { c++; borrow = 1; } else borrow = 0;
      x = Math.floor(x / 10); y = Math.floor(y / 10);
    }
    return c;
  }
  /* 곱셈(× 한 자리)에서 올림이 일어난 자리 수 */
  function countMulCarries(a, b) {
    var c = 0, carry = 0, x = a;
    while (x > 0) {
      var p = (x % 10) * b + carry;
      if (p >= 10) { c++; carry = Math.floor(p / 10); } else carry = 0;
      x = Math.floor(x / 10);
    }
    return c;
  }
  function digits(n) { return String(Math.abs(n)).length; }

  /* ---------- 약수/배수 ---------- */
  function divisorsOf(n) {
    var r = [];
    for (var i = 1; i * i <= n; i++) {
      if (n % i === 0) { r.push(i); if (i !== n / i) r.push(n / i); }
    }
    return r.sort(function (a, b) { return a - b; });
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function lcm(a, b) { return a / gcd(a, b) * b; }

  /* ---------- 분수 ---------- */
  function frac(n, d) { return { n: n, d: d }; }
  function fracReduce(f) {
    var g = gcd(f.n, f.d);
    return { n: f.n / g, d: f.d / g };
  }
  function fracAdd(a, b) { return fracReduce({ n: a.n * b.d + b.n * a.d, d: a.d * b.d }); }
  function fracSub(a, b) { return fracReduce({ n: a.n * b.d - b.n * a.d, d: a.d * b.d }); }
  function fracMul(a, b) { return fracReduce({ n: a.n * b.n, d: a.d * b.d }); }
  function fracDiv(a, b) { return fracReduce({ n: a.n * b.d, d: a.d * b.n }); }
  /* 가분수 → [정수부, 분자, 분모] */
  function toMixed(f) {
    var w = Math.floor(f.n / f.d), n = f.n % f.d;
    return [w, n, f.d];
  }
  /* 대분수 [w,n,d] → 가분수 */
  function fromMixed(w, n, d) { return { n: w * d + n, d: d }; }

  /* ---------- 소수 ---------- */
  function decPlaces(x) {
    var s = String(x);
    var i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
  }
  /* 부동소수점 오차 없이 계산하기 위해 정수로 변환 후 연산 */
  function decCalc(a, b, op) {
    var k = Math.max(decPlaces(a), decPlaces(b));
    var p = Math.pow(10, k);
    var ai = Math.round(a * p), bi = Math.round(b * p);
    if (op === '+') return fmtDec((ai + bi) / p);
    if (op === '-') return fmtDec((ai - bi) / p);
    if (op === '×') return fmtDec(ai * bi / (p * p));
    return fmtDec(a / b);
  }
  /* 소수 보기 좋게: 끝자리 0 제거, 부동소수점 잡음 제거 */
  function fmtDec(x) {
    var v = Math.round(x * 1e10) / 1e10;
    var s = v.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
    return parseFloat(s);
  }
  function roundTo(x, k) {
    var p = Math.pow(10, k);
    return fmtDec(Math.round(x * p + (x >= 0 ? 1e-9 : -1e-9)) / p);
  }

  /* ============================================================
     문제지번호 인코딩
     유형번호(10bit) + 문항수옵션(3bit) + 시드(24bit) = 37bit
     → 32진수 8자리. 같은 번호 = 항상 같은 문제지.
     ============================================================ */
  var B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   // I, L, O, U 제외 (혼동 방지)

  function toBase32(v, len) {
    var s = '';
    for (var i = 0; i < len; i++) { s = B32.charAt(v % 32) + s; v = Math.floor(v / 32); }
    return s;
  }
  /* 공백/하이픈만 걷어내고 헷갈리기 쉬운 글자를 보정합니다.
     그 밖의 문자가 남아 있으면 잘못된 번호로 봅니다. */
  function normalizeCode(s) {
    return String(s == null ? '' : s).toUpperCase().replace(/[\s\-_]/g, '')
      .replace(/I/g, '1').replace(/L/g, '1').replace(/O/g, '0').replace(/U/g, 'V');
  }
  function fromBase32(s, len) {
    s = normalizeCode(s);
    if (len != null && s.length !== len) return null;
    if (!s.length) return null;
    var v = 0;
    for (var i = 0; i < s.length; i++) {
      var d = B32.indexOf(s.charAt(i));
      if (d < 0) return null;
      v = v * 32 + d;
    }
    return v;
  }

  var SEED_MOD = 16777216;   // 2^24

  function encodePaperCode(stepIndex, countIdx, seed) {
    var v = ((stepIndex * 8 + countIdx) * SEED_MOD) + (seed % SEED_MOD);
    return toBase32(v, 8);
  }
  function decodePaperCode(code) {
    var v = fromBase32(code, 8);          // 반드시 8자리
    if (v == null || v < 0) return null;
    var seed = v % SEED_MOD;
    var rest = Math.floor(v / SEED_MOD);
    return { stepIndex: Math.floor(rest / 8), countIdx: rest % 8, seed: seed };
  }
  function randomSeed() {
    return Math.floor(Math.random() * SEED_MOD);
  }

  global.Core = {
    makeRng: makeRng, ri: ri, pick: pick, shuffle: shuffle, chance: chance,
    tryGen: tryGen, genNum: genNum,
    countCarries: countCarries, countBorrows: countBorrows, countMulCarries: countMulCarries,
    digits: digits,
    divisorsOf: divisorsOf, gcd: gcd, lcm: lcm,
    frac: frac, fracReduce: fracReduce, fracAdd: fracAdd, fracSub: fracSub,
    fracMul: fracMul, fracDiv: fracDiv, toMixed: toMixed, fromMixed: fromMixed,
    decPlaces: decPlaces, decCalc: decCalc, fmtDec: fmtDec, roundTo: roundTo,
    encodePaperCode: encodePaperCode, decodePaperCode: decodePaperCode,
    normalizeCode: normalizeCode, randomSeed: randomSeed
  };
})(window);
