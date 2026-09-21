/* ============================================================
   매일연산 - gen.js
   문제 생성기 공장(factory). 각 함수는 rng을 받아 문제 1개를 만드는
   함수를 돌려줍니다.

   문제 객체 형태
     {s:'vert',   op, a, b, ansList:[정답]}            세로셈
     {s:'ld',     dvd, dvs, ansList:[몫, (나머지)]}     장제법 나눗셈
     {s:'inline', lines:[[토큰...], ...], ansList:[]}   가로셈/기타
     {s:'split',  top, given, side}                    가르기
     {s:'merge',  a, b, ansList:[정답]}                 모으기
     {s:'clock',  h, m, draw:true|false, ansList:[]}    시계

   토큰: 문자열 | {n:수} | {f:[정수부,분자,분모]} | {box:1}
   ============================================================ */
(function (global) {
  'use strict';
  var C = global.Core;
  var ri = C.ri, pick = C.pick, shuffle = C.shuffle, tryGen = C.tryGen, genNum = C.genNum;

  /* ---------- 토큰 헬퍼 ---------- */
  function fr(n, d) { return { f: [0, n, d] }; }                 // 진분수/가분수
  function fk(w, n, d) { return { f: [w, n, d] }; }              // 대분수
  function fo(o) { return { f: [0, o.n, o.d] }; }                // Core 분수객체 → 토큰
  function fmix(o) { var m = C.toMixed(o); return m[1] === 0 ? { n: m[0] } : { f: m }; }
  var BOX = { box: 1 };
  var BOXW = { box: 1, long: 1 };            // 낱말을 쓰는 넓은 칸
  var BOXP = { box: 1, plain: 1 };           // 줄 가운데에 있어도 테두리 없는 칸
  function num(v) { return { n: v }; }

  /* ============================================================
     1. 세로셈 (덧셈/뺄셈/곱셈)
     ============================================================ */
  function vAdd(o) {
    o = o || {};
    return function (rng) {
      var p = tryGen(rng, function (r) {
        return [genNum(r, o.a), genNum(r, o.b)];
      }, function (p) {
        var a = p[0], b = p[1];
        if (o.carries != null && C.countCarries(a, b) !== o.carries) return false;
        if (o.maxSum != null && a + b > o.maxSum) return false;
        if (o.minSum != null && a + b < o.minSum) return false;
        return true;
      });
      return { s: 'vert', op: '+', a: p[0], b: p[1], ansList: [p[0] + p[1]] };
    };
  }

  function vSub(o) {
    o = o || {};
    return function (rng) {
      var p = tryGen(rng, function (r) {
        var a = genNum(r, o.a), b = genNum(r, o.b);
        if (a < b) { var t = a; a = b; b = t; }
        return [a, b];
      }, function (p) {
        var a = p[0], b = p[1];
        if (a <= b) return false;
        if (o.borrows != null && C.countBorrows(a, b) !== o.borrows) return false;
        if (o.minDiff != null && a - b < o.minDiff) return false;
        return true;
      });
      return { s: 'vert', op: '-', a: p[0], b: p[1], ansList: [p[0] - p[1]] };
    };
  }

  /* 덧셈/뺄셈 섞어서 */
  function vAddSub(oAdd, oSub) {
    var A = vAdd(oAdd), S = vSub(oSub || oAdd);
    return function (rng) { return (rng() < 0.5 ? A : S)(rng); };
  }

  function vMul(o) {
    o = o || {};
    return function (rng) {
      var p = tryGen(rng, function (r) {
        return [genNum(r, o.a), genNum(r, o.b)];
      }, function (p) {
        var a = p[0], b = p[1];
        if (a < 2 || b < 2) return false;
        if (o.carries != null && b < 10 && C.countMulCarries(a, b) !== o.carries) return false;
        if (o.onesCarry != null) {                 // 일의 자리에서 올림 여부
          var hasOnes = (a % 10) * (b % 10) >= 10;
          if (hasOnes !== o.onesCarry) return false;
        }
        if (o.tensCarry != null && b < 10) {       // 십의 자리에서 올림 여부
          var carry = Math.floor((a % 10) * b / 10);
          var hasTens = (Math.floor(a / 10) % 10) * b + carry >= 10;
          if (hasTens !== o.tensCarry) return false;
        }
        if (o.maxProd != null && a * b > o.maxProd) return false;
        return true;
      });
      return { s: 'vert', op: '×', a: p[0], b: p[1], ansList: [p[0] * p[1]] };
    };
  }

  /* ============================================================
     2. 가로셈 (inline)
     ============================================================ */
  function hAdd(o) {
    o = o || {};
    return function (rng) {
      var p = tryGen(rng, function (r) { return [genNum(r, o.a), genNum(r, o.b)]; },
        function (p) {
          if (o.carries != null && C.countCarries(p[0], p[1]) !== o.carries) return false;
          if (o.maxSum != null && p[0] + p[1] > o.maxSum) return false;
          if (o.minSum != null && p[0] + p[1] < o.minSum) return false;
          return true;
        });
      return { s: 'inline', lines: [[num(p[0]), '+', num(p[1]), '=', BOX]], ansList: [p[0] + p[1]] };
    };
  }

  function hSub(o) {
    o = o || {};
    return function (rng) {
      var p = tryGen(rng, function (r) {
        var a = genNum(r, o.a), b = genNum(r, o.b);
        if (a < b) { var t = a; a = b; b = t; }
        return [a, b];
      }, function (p) {
        if (p[0] <= p[1]) return false;
        if (o.borrows != null && C.countBorrows(p[0], p[1]) !== o.borrows) return false;
        if (o.minDiff != null && p[0] - p[1] < o.minDiff) return false;
        return true;
      });
      return { s: 'inline', lines: [[num(p[0]), '-', num(p[1]), '=', BOX]], ansList: [p[0] - p[1]] };
    };
  }

  function hAddSub(oA, oS) {
    var A = hAdd(oA), S = hSub(oS || oA);
    return function (rng) { return (rng() < 0.5 ? A : S)(rng); };
  }

  /* 한 자리 수 곱셈구구 */
  function times(bases, opt) {
    opt = opt || {};
    return function (rng) {
      var a = pick(rng, bases);
      var b = ri(rng, opt.min == null ? 1 : opt.min, opt.max == null ? 9 : opt.max);
      if (rng() < 0.5 && !opt.fixOrder) { var t = a; a = b; b = t; }
      return { s: 'inline', lines: [[num(a), '×', num(b), '=', BOX]], ansList: [a * b] };
    };
  }

  /* 곱셈구구에서 □ 찾기 */
  function timesBox(bases) {
    return function (rng) {
      var a = pick(rng, bases), b = ri(rng, 2, 9);
      var p = a * b;
      if (rng() < 0.5) return { s: 'inline', lines: [[num(a), '×', BOX, '=', num(p)]], ansList: [b] };
      return { s: 'inline', lines: [[BOX, '×', num(b), '=', num(p)]], ansList: [a] };
    };
  }

  /* ============================================================
     3. 세 수의 계산
     ============================================================ */
  function three(o) {
    o = o || {};
    var ops = o.ops || ['+-'];
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var pat = pick(r, ops);                       // '++', '--', '+-', '-+'
        var a = genNum(r, o.a), b = genNum(r, o.b), c = genNum(r, o.c || o.b);
        var v1 = pat.charAt(0) === '+' ? a + b : a - b;
        var v2 = pat.charAt(1) === '+' ? v1 + c : v1 - c;
        return { a: a, b: b, c: c, pat: pat, v1: v1, v2: v2 };
      }, function (x) {
        if (x.v1 < (o.minMid == null ? 0 : o.minMid)) return false;
        if (x.v2 < (o.min == null ? 0 : o.min)) return false;
        if (o.max != null && x.v2 > o.max) return false;
        if (o.midMax != null && x.v1 > o.midMax) return false;
        if (o.strictPositive && (x.v1 <= 0 || x.v2 <= 0)) return false;
        return true;
      });
      return {
        s: 'inline',
        lines: [[num(r.a), r.pat.charAt(0), num(r.b), r.pat.charAt(1), num(r.c), '=', BOX]],
        ansList: [r.v2]
      };
    };
  }

  /* 두 수의 합이 10이 되는 세 수의 덧셈 */
  function threeMakeTen() {
    return function (rng) {
      var a = ri(rng, 1, 9), b = 10 - a, c = ri(rng, 1, 9);
      var order = ri(rng, 0, 2);
      var t = order === 0 ? [a, b, c] : order === 1 ? [a, c, b] : [c, a, b];
      return {
        s: 'inline',
        lines: [[num(t[0]), '+', num(t[1]), '+', num(t[2]), '=', BOX]],
        ansList: [t[0] + t[1] + t[2]]
      };
    };
  }

  /* ============================================================
     4. 가르기 / 모으기
     ============================================================ */
  function split(o) {
    o = o || {};
    return function (rng) {
      var top = o.fixed != null ? o.fixed : ri(rng, o.min || 2, o.max || 9);
      var left = ri(rng, 1, top - 1);
      var side = rng() < 0.5 ? 'l' : 'r';
      return { s: 'split', top: top, left: left, right: top - left, side: side, ansList: [side === 'l' ? top - left : left] };
    };
  }
  function merge(o) {
    o = o || {};
    return function (rng) {
      var sum = o.fixed != null ? o.fixed : ri(rng, o.min || 2, o.max || 9);
      var a = ri(rng, 1, sum - 1);
      return { s: 'merge', a: a, b: sum - a, ansList: [sum] };
    };
  }

  /* ============================================================
     5. □ 안의 수 찾기 / 덧셈·뺄셈의 관계
     ============================================================ */
  function boxFind(o) {
    o = o || {};
    return function (rng) {
      var a = genNum(rng, o.a), b = genNum(rng, o.b);
      if (o.maxSum && a + b > o.maxSum) { b = Math.max(1, o.maxSum - a); }
      var c = a + b;
      var mode = ri(rng, 0, 3);
      if (o.only === 'add') mode = ri(rng, 0, 1);
      if (o.only === 'sub') mode = ri(rng, 2, 3);
      if (mode === 0) return { s: 'inline', lines: [[num(a), '+', BOX, '=', num(c)]], ansList: [b] };
      if (mode === 1) return { s: 'inline', lines: [[BOX, '+', num(b), '=', num(c)]], ansList: [a] };
      if (mode === 2) return { s: 'inline', lines: [[num(c), '-', BOX, '=', num(a)]], ansList: [b] };
      return { s: 'inline', lines: [[BOX, '-', num(b), '=', num(a)]], ansList: [c] };
    };
  }

  /* 덧셈 → 뺄셈 관계 */
  function relAddToSub(o) {
    o = o || {};
    return function (rng) {
      var a = genNum(rng, o.a), b = genNum(rng, o.b), c = a + b;
      return {
        s: 'inline',
        lines: [
          [num(a), '+', num(b), '=', num(c)],
          [num(c), '-', num(a), '=', BOX],
          [num(c), '-', num(b), '=', BOX]
        ],
        ansList: [b, a]
      };
    };
  }
  /* 뺄셈 → 덧셈 관계 */
  function relSubToAdd(o) {
    o = o || {};
    return function (rng) {
      var a = genNum(rng, o.a), b = genNum(rng, o.b);
      if (a <= b) { var t = a; a = b + 1; b = t; }
      var c = a - b;
      return {
        s: 'inline',
        lines: [
          [num(a), '-', num(b), '=', num(c)],
          [num(c), '+', num(b), '=', BOX],
          [num(b), '+', num(c), '=', BOX]
        ],
        ansList: [a, a]
      };
    };
  }

  /* 10 만들기 */
  function makeTenAdd() {
    return function (rng) {
      var a = ri(rng, 1, 9);
      if (rng() < 0.5) return { s: 'inline', lines: [[num(a), '+', BOX, '=', num(10)]], ansList: [10 - a] };
      return { s: 'inline', lines: [[BOX, '+', num(a), '=', num(10)]], ansList: [10 - a] };
    };
  }
  function makeTenSub() {
    return function (rng) {
      var a = ri(rng, 1, 9);
      return { s: 'inline', lines: [[num(10), '-', num(a), '=', BOX]], ansList: [10 - a] };
    };
  }

  /* ============================================================
     6. 나눗셈
     ============================================================ */
  /* 가로 나눗셈 (나머지 없음) */
  function hDiv(o) {
    o = o || {};
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var b = genNum(r, o.b), q = genNum(r, o.q);
        return { b: b, q: q, a: b * q };
      }, function (x) {
        if (x.b < 2) return false;
        if (o.maxA != null && x.a > o.maxA) return false;
        if (o.minA != null && x.a < o.minA) return false;
        return true;
      });
      return { s: 'inline', lines: [[num(r.a), '÷', num(r.b), '=', BOX]], ansList: [r.q] };
    };
  }

  /* 가로 나눗셈 (몫과 나머지) */
  function hDivR(o) {
    o = o || {};
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var b = genNum(r, o.b), q = genNum(r, o.q);
        var rem = ri(r, o.forceRem ? 1 : 0, b - 1);
        return { b: b, q: q, r: rem, a: b * q + rem };
      }, function (x) {
        if (x.b < 2) return false;
        if (o.forceRem && x.r === 0) return false;
        if (o.maxA != null && x.a > o.maxA) return false;
        return true;
      });
      return {
        s: 'inline',
        lines: [[num(r.a), '÷', num(r.b), '=', BOX, '…', BOX]],
        ansList: [r.q, r.r], hint: '몫 … 나머지'
      };
    };
  }

  /* 장제법(세로 나눗셈) */
  function longDiv(o) {
    o = o || {};
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var b = genNum(r, o.b), q = genNum(r, o.q);
        var rem = o.rem === false ? 0 : ri(r, o.rem === true ? 1 : 0, b - 1);
        return { b: b, q: q, r: rem, a: b * q + rem };
      }, function (x) {
        if (x.b < 2) return false;
        if (o.rem === true && x.r === 0) return false;
        if (o.rem === false && x.r !== 0) return false;
        if (o.maxA != null && x.a > o.maxA) return false;
        if (o.minA != null && x.a < o.minA) return false;
        if (o.qDigits != null && C.digits(x.q) !== o.qDigits) return false;
        if (o.aDigits != null && C.digits(x.a) !== o.aDigits) return false;
        /* 내림(자리 내려쓰기) 여부: 첫 자리가 나누어떨어지지 않으면 내림이 있음 */
        if (o.carryDown != null) {
          var first = Math.floor(x.a / Math.pow(10, C.digits(x.a) - 1));
          var has = (first % x.b) !== 0;
          if (has !== o.carryDown) return false;
        }
        return true;
      });
      return { s: 'ld', dvd: r.a, dvs: r.b, ansList: [r.q, r.r] };
    };
  }

  /* 나눗셈의 검산 */
  function divCheck(o) {
    o = o || {};
    return function (rng) {
      var b = ri(rng, 3, 9), q = ri(rng, 11, 99), rem = ri(rng, 1, b - 1);
      var a = b * q + rem;
      return {
        s: 'inline',
        lines: [
          [num(a), '÷', num(b), '=', BOX, '…', BOX],
          ['검산 :', num(b), '×', BOX, '+', BOX, '=', BOX]
        ],
        ansList: [q, rem, q, rem, a]
      };
    };
  }

  /* 곱셈과 나눗셈의 관계 */
  function relMulDiv() {
    return function (rng) {
      var a = ri(rng, 2, 9), b = ri(rng, 2, 9), c = a * b;
      return {
        s: 'inline',
        lines: [
          [num(a), '×', num(b), '=', num(c)],
          [num(c), '÷', num(a), '=', BOX],
          [num(c), '÷', num(b), '=', BOX]
        ],
        ansList: [b, a]
      };
    };
  }
  function relDivMul() {
    return function (rng) {
      var a = ri(rng, 2, 9), b = ri(rng, 2, 9), c = a * b;
      return {
        s: 'inline',
        lines: [
          [num(c), '÷', num(a), '=', num(b)],
          [num(a), '×', BOX, '=', num(c)],
          [BOX, '×', num(a), '=', num(c)]
        ],
        ansList: [b, b]
      };
    };
  }

  /* ============================================================
     7. 혼합 계산 (식 트리)
     ============================================================ */
  function node(op, l, r) { return { op: op, l: l, r: r }; }
  function evalEx(e) {
    if (typeof e === 'number') return e;
    var a = evalEx(e.l), b = evalEx(e.r);
    if (a == null || b == null) return null;
    switch (e.op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return (b === 0 || a % b !== 0) ? null : a / b;
    }
    return null;
  }
  var PREC = { '+': 1, '-': 1, '×': 2, '÷': 2 };
  /* 괄호가 필요한 깊이를 계산해서 ( ) → { } → [ ] 순으로 */
  function bracketDepth(e, parentPrec, isRight) {
    if (typeof e === 'number') return 0;
    var need = PREC[e.op] < parentPrec || (PREC[e.op] === parentPrec && isRight);
    var dl = bracketDepth(e.l, PREC[e.op], false);
    var dr = bracketDepth(e.r, PREC[e.op], true);
    var inner = Math.max(dl, dr);
    return need ? inner + 1 : inner;
  }
  var BRACKETS = [['(', ')'], ['{', '}'], ['[', ']']];
  /* 토큰을 out 에 쌓으면서, 계산 순서(후위 순회)대로 steps 를 만듭니다.
     각 계산은 왼쪽/오른쪽이 무엇에 붙는지를 가리킵니다.
       {t: 토큰번호}  — 그 자리에 적힌 수
       {s: 계산번호}  — 앞에서 이미 계산한 결과 (그 묶음의 가운데에서 이어집니다)
     반환값은 이 식 자체를 가리키는 위치입니다. */
  function exTokens(e, parentPrec, isRight, out, steps) {
    if (typeof e === 'number') { var ti = out.length; out.push(num(e)); return { t: ti }; }
    var need = PREC[e.op] < parentPrec || (PREC[e.op] === parentPrec && isRight);
    var lv = 0;
    if (need) {
      lv = Math.min(2, Math.max(bracketDepth(e.l, PREC[e.op], false), bracketDepth(e.r, PREC[e.op], true)));
      out.push(BRACKETS[lv][0]);
    }
    var ld = exTokens(e.l, PREC[e.op], false, out, steps);
    out.push(e.op);
    var rd = exTokens(e.r, PREC[e.op], true, out, steps);
    if (need) out.push(BRACKETS[lv][1]);
    steps.push({ l: ld, r: rd });
    return { s: steps.length - 1 };
  }

  /* 템플릿 기반 혼합계산.
     tmpl(r) → 식 트리. 값이 자연수 범위이고 나눗셈이 딱 떨어질 때까지 재생성. */
  function mixedCalc(templates, o) {
    o = o || {};
    return function (rng) {
      var e = tryGen(rng, function (r) {
        return pick(r, templates)(r);
      }, function (e) {
        var v = evalEx(e);
        if (v == null || v <= 0 || !isFinite(v) || Math.floor(v) !== v) return false;
        if (o.max != null && v > o.max) return false;
        /* 모든 부분식이 자연수인지 확인 */
        var ok = true;
        (function walk(n) {
          if (typeof n === 'number') return;
          var vv = evalEx(n);
          if (vv == null || vv <= 0 || Math.floor(vv) !== vv) ok = false;
          walk(n.l); walk(n.r);
        })(e);
        return ok;
      }, 900);
      var steps = [], toks = [];
      exTokens(e, 0, false, toks, steps);
      toks.push('='); toks.push(BOX);
      return { s: 'inline', lines: [toks], ansList: [evalEx(e)], wide: true, order: steps };
    };
  }

  /* ============================================================
     8. 약수와 배수
     ============================================================ */
  function divisorList(o) {
    o = o || {};
    return function (rng) {
      var n = tryGen(rng, function (r) { return ri(r, o.min || 12, o.max || 60); },
        function (n) { return C.divisorsOf(n).length >= 4; });
      return {
        s: 'inline',
        lines: [[num(n), '의 약수 →', BOX]],
        ansList: [C.divisorsOf(n).join(', ')], wide: true
      };
    };
  }
  function multipleList(o) {
    o = o || {};
    return function (rng) {
      var n = ri(rng, o.min || 3, o.max || 15);
      var k = o.count || 5;
      var arr = [];
      for (var i = 1; i <= k; i++) arr.push(n * i);
      return {
        s: 'inline',
        lines: [[num(n), '의 배수를 작은 것부터 ' + k + '개 →', BOX]],
        ansList: [arr.join(', ')], wide: true
      };
    };
  }
  function commonDivisor(o) {
    o = o || {};
    return function (rng) {
      var p = tryGen(rng, function (r) {
        var g = ri(r, 2, 12);
        return [g * ri(r, 2, 9), g * ri(r, 2, 9)];
      }, function (p) { return p[0] !== p[1] && C.gcd(p[0], p[1]) > 1; });
      var g = C.gcd(p[0], p[1]);
      if (o.gcdOnly) {
        return {
          s: 'inline',
          lines: [['(', num(p[0]), ',', num(p[1]), ') 의 최대공약수 →', BOX]],
          ansList: [g], wide: true
        };
      }
      return {
        s: 'inline',
        lines: [['(', num(p[0]), ',', num(p[1]), ') 의 공약수 →', BOX]],
        ansList: [C.divisorsOf(g).join(', ')], wide: true
      };
    };
  }
  function commonMultiple(o) {
    o = o || {};
    return function (rng) {
      var a = ri(rng, 2, 15), b = ri(rng, 2, 15);
      if (a === b) b = a + 1;
      var l = C.lcm(a, b);
      if (o.lcmOnly) {
        return {
          s: 'inline',
          lines: [['(', num(a), ',', num(b), ') 의 최소공배수 →', BOX]],
          ansList: [l], wide: true
        };
      }
      return {
        s: 'inline',
        lines: [['(', num(a), ',', num(b), ') 의 공배수를 작은 것부터 3개 →', BOX]],
        ansList: [[l, l * 2, l * 3].join(', ')], wide: true
      };
    };
  }

  /* ============================================================
     9. 분수
     ============================================================ */
  /* 기약분수인 진분수 (2/4 같은 약분되는 꼴이 나오지 않게) */
  function properFrac(rng, maxD) {
    var d = ri(rng, 2, maxD || 12);
    return C.fracReduce({ n: ri(rng, 1, d - 1), d: d });
  }

  /* 대분수 → 가분수 */
  function mixedToImproper() {
    return function (rng) {
      var d = ri(rng, 2, 12), w = ri(rng, 1, 9), n = ri(rng, 1, d - 1);
      return { s: 'inline', lines: [[fk(w, n, d), '=', BOX]], ansList: [fr(w * d + n, d)] };
    };
  }
  /* 가분수 → 대분수 */
  function improperToMixed() {
    return function (rng) {
      var d = ri(rng, 2, 12), w = ri(rng, 1, 9), n = ri(rng, 1, d - 1);
      var m = C.toMixed({ n: w * d + n, d: d });
      return { s: 'inline', lines: [[fr(w * d + n, d), '=', BOX]], ansList: [fk(m[0], m[1], m[2])] };
    };
  }
  /* 분모가 같은 분수의 크기 비교 */
  function compareSameDen() {
    return function (rng) {
      var d = ri(rng, 3, 12);
      function one(r) {
        if (r() < 0.5) return { t: fr(ri(r, d + 1, d * 3), d), v: 0 };
        var w = ri(r, 1, 3), n = ri(r, 1, d - 1);
        return { t: fk(w, n, d), v: 0 };
      }
      var A = one(rng), B = one(rng);
      function val(t) { var f = t.f; return (f[0] * f[2] + f[1]) / f[2]; }
      var va = val(A.t), vb = val(B.t);
      if (va === vb) vb += 1 / d, B.t.f[1] += 1;
      return {
        s: 'inline',
        lines: [[A.t, BOX, B.t]],
        ansList: [va > vb ? '>' : '<']
      };
    };
  }

  /* 분모가 같은 분수의 덧셈/뺄셈 */
  function fracAddSame(o) {
    o = o || {};
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var d = ri(r, 3, o.maxD || 12);
        var w1 = o.mixed ? ri(r, 1, 6) : 0, w2 = o.mixed2 === false ? 0 : (o.mixed ? ri(r, 1, 6) : 0);
        var n1 = ri(r, 1, d - 1), n2 = ri(r, 1, d - 1);
        return { d: d, w1: w1, w2: w2, n1: n1, n2: n2 };
      }, function (x) {
        var s = x.n1 + x.n2;
        if (o.sumProper === true && s >= x.d) return false;     // 합이 진분수
        if (o.sumProper === false && s < x.d) return false;     // 합이 가분수(받아올림)
        return true;
      });
      var A = { n: r.w1 * r.d + r.n1, d: r.d }, B = { n: r.w2 * r.d + r.n2, d: r.d };
      var sum = C.fracAdd(A, B);
      var ta = o.mixed ? fk(r.w1, r.n1, r.d) : fr(r.n1, r.d);
      var tb = (o.mixed && o.mixed2 !== false) ? fk(r.w2, r.n2, r.d) : fr(r.n2, r.d);
      return { s: 'inline', lines: [[ta, '+', tb, '=', BOX]], ansList: [fmix(sum)] };
    };
  }

  function fracSubSame(o) {
    o = o || {};
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var d = ri(r, 3, o.maxD || 12);
        var w1 = o.mixed ? ri(r, 2, 8) : 0;
        var w2 = (o.mixed && o.mixed2 !== false) ? ri(r, 1, 6) : 0;
        var n1 = ri(r, 1, d - 1), n2 = ri(r, 1, d - 1);
        return { d: d, w1: w1, w2: w2, n1: n1, n2: n2 };
      }, function (x) {
        var A = x.w1 * x.d + x.n1, B = x.w2 * x.d + x.n2;
        if (A <= B) return false;
        if (o.borrow === true && x.n1 >= x.n2) return false;    // 받아내림 있음
        if (o.borrow === false && x.n1 <= x.n2) return false;   // 받아내림 없음
        return true;
      });
      var A = { n: r.w1 * r.d + r.n1, d: r.d }, B = { n: r.w2 * r.d + r.n2, d: r.d };
      var diff = C.fracSub(A, B);
      var ta = o.mixed ? fk(r.w1, r.n1, r.d) : fr(r.n1, r.d);
      var tb = (o.mixed && o.mixed2 !== false) ? fk(r.w2, r.n2, r.d) : fr(r.n2, r.d);
      return { s: 'inline', lines: [[ta, '-', tb, '=', BOX]], ansList: [fmix(diff)] };
    };
  }

  /* 자연수 - 진분수 */
  function natMinusFrac() {
    return function (rng) {
      var d = ri(rng, 3, 12), n = ri(rng, 1, d - 1), w = ri(rng, 2, 9);
      var diff = C.fracSub({ n: w * d, d: d }, { n: n, d: d });
      return { s: 'inline', lines: [[num(w), '-', fr(n, d), '=', BOX]], ansList: [fmix(diff)] };
    };
  }

  /* 분모가 다른 분수의 덧셈/뺄셈 */
  function fracDiffDen(op, o) {
    o = o || {};
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var d1 = ri(r, 2, o.maxD || 12), d2 = ri(r, 2, o.maxD || 12);
        var w1 = o.mixed ? ri(r, 1, 5) : 0, w2 = o.mixed ? ri(r, 1, 5) : 0;
        return { d1: d1, d2: d2, n1: ri(r, 1, d1 - 1), n2: ri(r, 1, d2 - 1), w1: w1, w2: w2 };
      }, function (x) {
        if (x.d1 === x.d2) return false;
        var A = { n: x.w1 * x.d1 + x.n1, d: x.d1 }, B = { n: x.w2 * x.d2 + x.n2, d: x.d2 };
        if (op === '-' && A.n * B.d <= B.n * A.d) return false;
        if (op === '+' && o.carry != null) {
          var over = x.n1 * x.d2 + x.n2 * x.d1 >= x.d1 * x.d2;
          if (over !== o.carry) return false;
        }
        if (op === '-' && o.borrow != null) {
          var need = x.n1 * x.d2 < x.n2 * x.d1;
          if (need !== o.borrow) return false;
        }
        return true;
      });
      var A = { n: r.w1 * r.d1 + r.n1, d: r.d1 }, B = { n: r.w2 * r.d2 + r.n2, d: r.d2 };
      var res = op === '+' ? C.fracAdd(A, B) : C.fracSub(A, B);
      var ta = o.mixed ? fk(r.w1, r.n1, r.d1) : fr(r.n1, r.d1);
      var tb = o.mixed ? fk(r.w2, r.n2, r.d2) : fr(r.n2, r.d2);
      return { s: 'inline', lines: [[ta, op, tb, '=', BOX]], ansList: [fmix(res)] };
    };
  }

  /* 분수의 곱셈 */
  function fracMulGen(kind) {
    return function (rng) {
      var a, b, ta, tb, res;
      if (kind === 'fn') {                      // 분수 × 자연수
        var d = ri(rng, 2, 12), n = ri(rng, 1, d - 1), k = ri(rng, 2, 9);
        ta = fr(n, d); tb = num(k);
        res = C.fracMul({ n: n, d: d }, { n: k, d: 1 });
      } else if (kind === 'nf') {               // 자연수 × 분수
        var d2 = ri(rng, 2, 12), n2 = ri(rng, 1, d2 - 1), k2 = ri(rng, 2, 9);
        ta = num(k2); tb = fr(n2, d2);
        res = C.fracMul({ n: k2, d: 1 }, { n: n2, d: d2 });
      } else if (kind === 'ff') {               // 진분수 × 진분수
        var A = properFrac(rng, 12), B = properFrac(rng, 12);
        ta = fr(A.n, A.d); tb = fr(B.n, B.d);
        res = C.fracMul(A, B);
      } else {                                  // 대분수 × 대분수
        var d3 = ri(rng, 2, 9), d4 = ri(rng, 2, 9);
        var w3 = ri(rng, 1, 4), w4 = ri(rng, 1, 4);
        var A2 = { n: w3 * d3 + ri(rng, 1, d3 - 1), d: d3 };
        var B2 = { n: w4 * d4 + ri(rng, 1, d4 - 1), d: d4 };
        var m3 = C.toMixed(A2), m4 = C.toMixed(B2);
        ta = fk(m3[0], m3[1], m3[2]); tb = fk(m4[0], m4[1], m4[2]);
        res = C.fracMul(A2, B2);
      }
      return { s: 'inline', lines: [[ta, '×', tb, '=', BOX]], ansList: [fmix(res)] };
    };
  }

  /* 세 분수의 곱셈 */
  function fracMul3(withMixed) {
    return function (rng) {
      var A = properFrac(rng, 9), B = properFrac(rng, 9);
      var ta, tb, tc, third;
      if (withMixed) {
        var d = ri(rng, 2, 6), w = ri(rng, 1, 3);
        third = { n: w * d + ri(rng, 1, d - 1), d: d };
        var m = C.toMixed(third); tc = fk(m[0], m[1], m[2]);
      } else {
        third = properFrac(rng, 9); tc = fr(third.n, third.d);
      }
      ta = fr(A.n, A.d); tb = fr(B.n, B.d);
      var res = C.fracMul(C.fracMul(A, B), third);
      return { s: 'inline', lines: [[ta, '×', tb, '×', tc, '=', BOX]], ansList: [fmix(res)], wide: true };
    };
  }

  /* 분수의 나눗셈 */
  function fracDivGen(kind) {
    return function (rng) {
      var ta, tb, res;
      if (kind === 'fn') {                       // 분수 ÷ 자연수
        var d = ri(rng, 2, 12), n = ri(rng, 1, d - 1), k = ri(rng, 2, 9);
        ta = fr(n, d); tb = num(k);
        res = C.fracDiv({ n: n, d: d }, { n: k, d: 1 });
      } else if (kind === 'same') {              // 분모가 같은 분수끼리
        var d2 = ri(rng, 3, 12);
        var n1 = ri(rng, 1, d2 - 1), n2 = ri(rng, 1, d2 - 1);
        ta = fr(n1, d2); tb = fr(n2, d2);
        res = C.fracDiv({ n: n1, d: d2 }, { n: n2, d: d2 });
      } else if (kind === 'diff') {              // 분모가 다른 분수끼리
        var A = properFrac(rng, 12), B = properFrac(rng, 12);
        ta = fr(A.n, A.d); tb = fr(B.n, B.d);
        res = C.fracDiv(A, B);
      } else {                                   // 대분수 포함
        var da = ri(rng, 2, 8), db = ri(rng, 2, 8);
        var A2 = { n: ri(rng, 1, 4) * da + ri(rng, 1, da - 1), d: da };
        var B2 = { n: ri(rng, 1, 3) * db + ri(rng, 1, db - 1), d: db };
        var ma = C.toMixed(A2), mb = C.toMixed(B2);
        ta = fk(ma[0], ma[1], ma[2]); tb = fk(mb[0], mb[1], mb[2]);
        res = C.fracDiv(A2, B2);
      }
      return { s: 'inline', lines: [[ta, '÷', tb, '=', BOX]], ansList: [fmix(res)] };
    };
  }

  /* 분수와 자연수의 곱셈·나눗셈 혼합 */
  function fracMulDivMix() {
    return function (rng) {
      var d = ri(rng, 2, 9), n = ri(rng, 1, d - 1);
      var k1 = ri(rng, 2, 9), k2 = ri(rng, 2, 9);
      var op1 = rng() < 0.5 ? '×' : '÷', op2 = rng() < 0.5 ? '×' : '÷';
      var v = { n: n, d: d };
      v = op1 === '×' ? C.fracMul(v, { n: k1, d: 1 }) : C.fracDiv(v, { n: k1, d: 1 });
      v = op2 === '×' ? C.fracMul(v, { n: k2, d: 1 }) : C.fracDiv(v, { n: k2, d: 1 });
      return {
        s: 'inline',
        lines: [[fr(n, d), op1, num(k1), op2, num(k2), '=', BOX]],
        ansList: [fmix(v)], wide: true
      };
    };
  }

  /* 크기가 같은 분수 만들기 */
  function equivFrac() {
    return function (rng) {
      var f = properFrac(rng, 9);
      f = C.fracReduce(f);
      var k1 = ri(rng, 2, 5), k2 = ri(rng, 6, 9);
      return {
        s: 'inline',
        lines: [[fr(f.n, f.d), '=', BOX, '=', BOX]],
        ansList: [fr(f.n * k1, f.d * k1), fr(f.n * k2, f.d * k2)],
        hint: '분모가 ' + (f.d * k1) + ', ' + (f.d * k2) + '가 되도록', wide: true
      };
    };
  }
  /* 기약분수로 나타내기 (약분) */
  function reduceFrac() {
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var f = properFrac(r, 9);
        var k = ri(r, 2, 6);
        return { n: f.n * k, d: f.d * k };
      }, function (f) { return C.gcd(f.n, f.d) > 1 && f.d <= 96; });
      return { s: 'inline', lines: [[fr(r.n, r.d), '=', BOX]], ansList: [fo(C.fracReduce(r))], hint: '기약분수로' };
    };
  }
  /* 통분 */
  function commonDenom(useLcm) {
    return function (rng) {
      var r = tryGen(rng, function (r) {
        return [properFrac(r, 9), properFrac(r, 9)];
      }, function (p) { return p[0].d !== p[1].d; });
      var A = r[0], B = r[1];
      var cd = useLcm ? C.lcm(A.d, B.d) : A.d * B.d;
      return {
        s: 'inline',
        lines: [['(', fr(A.n, A.d), ',', fr(B.n, B.d), ') →', '(', BOX, ',', BOX, ')']],
        ansList: [fr(A.n * (cd / A.d), cd), fr(B.n * (cd / B.d), cd)],
        hint: useLcm ? '최소공배수를 공통분모로' : '분모의 곱을 공통분모로', wide: true
      };
    };
  }
  /* 분수의 크기 비교 (분모가 다름) */
  /* ---------- 크기 비교 (답이 '=' 인 문제도 섞습니다) ----------
     두 수의 크기가 같으려면 모양이 서로 달라야 문제가 됩니다.
       2 2/3 ○ 8/3   대분수와 가분수
       2/4  ○ 3/6    크기가 같은 분수
       1/2  ○ 0.5    분수와 소수                                  */
  var EQ_RATE = 0.3;                         // 세 문제에 한 번쯤 '='

  function compareSameDenEq() {
    return function (rng) {
      var d = ri(rng, 3, 12);
      if (rng() < EQ_RATE) {                 // 대분수 = 가분수
        var w = ri(rng, 1, 3), n = ri(rng, 1, d - 1);
        var mixed = fk(w, n, d), imp = fr(w * d + n, d);
        var mLeft = rng() < 0.5;
        return {
          s: 'inline',
          lines: [[mLeft ? mixed : imp, BOX, mLeft ? imp : mixed]],
          ansList: ['=']
        };
      }
      function one(r) {
        if (r() < 0.5) return fr(ri(r, d + 1, d * 3), d);
        return fk(ri(r, 1, 3), ri(r, 1, d - 1), d);
      }
      var A = one(rng), B = one(rng);
      function val(t) { return (t.f[0] * t.f[2] + t.f[1]) / t.f[2]; }
      var va = val(A), vb = val(B);
      if (va === vb) { B.f[1] += 1; vb += 1 / d; }     // 모양이 같으면 문제가 안 됩니다
      return { s: 'inline', lines: [[A, BOX, B]], ansList: [va > vb ? '>' : '<'] };
    };
  }

  function compareFracEq() {
    return function (rng) {
      if (rng() < EQ_RATE) {                 // 크기가 같은 분수 (2/4 = 3/6)
        var base = tryGen(rng, function (r) {
          var d = ri(r, 2, 6);
          return { n: ri(r, 1, d - 1), d: d };
        }, function (f) { return C.gcd(f.n, f.d) === 1; });
        var k = tryGen(rng, function (r) { return [ri(r, 1, 5), ri(r, 1, 5)]; },
          function (p) {
            return p[0] !== p[1] && base.d * p[0] <= 12 && base.d * p[1] <= 12;
          });
        return {
          s: 'inline',
          lines: [[fr(base.n * k[0], base.d * k[0]), BOX, fr(base.n * k[1], base.d * k[1])]],
          ansList: ['=']
        };
      }
      var r = tryGen(rng, function (r) { return [properFrac(r, 12), properFrac(r, 12)]; },
        function (p) { return p[0].n * p[1].d !== p[1].n * p[0].d; });
      var A = r[0], B = r[1];
      return {
        s: 'inline', lines: [[fr(A.n, A.d), BOX, fr(B.n, B.d)]],
        ansList: [A.n * B.d > B.n * A.d ? '>' : '<']
      };
    };
  }

  function compareFracDecEq() {
    return function (rng) {
      var d = pick(rng, [2, 4, 5, 8, 10, 20, 25]);
      var n = ri(rng, 1, d - 1);
      var v = C.fmtDec(n / d);
      if (rng() < EQ_RATE) {                 // 분수를 소수로 고친 값 (1/2 = 0.5)
        return { s: 'inline', lines: [[fr(n, d), BOX, num(v)]], ansList: ['='] };
      }
      var other = C.fmtDec(Math.max(0.01, C.roundTo(v + (rng() < 0.5 ? 1 : -1) * (ri(rng, 1, 30) / 100), 2)));
      if (other === v) other = C.fmtDec(v + 0.1);
      return {
        s: 'inline', lines: [[fr(n, d), BOX, num(other)]],
        ansList: [v > other ? '>' : '<']
      };
    };
  }

  function compareFrac() {
    return function (rng) {
      var r = tryGen(rng, function (r) { return [properFrac(r, 12), properFrac(r, 12)]; },
        function (p) { return p[0].n * p[1].d !== p[1].n * p[0].d; });
      var A = r[0], B = r[1];
      return {
        s: 'inline', lines: [[fr(A.n, A.d), BOX, fr(B.n, B.d)]],
        ansList: [A.n * B.d > B.n * A.d ? '>' : '<']
      };
    };
  }
  /* 분수 → 소수 */
  function fracToDec() {
    return function (rng) {
      var d = pick(rng, [2, 4, 5, 8, 10, 20, 25, 50]);
      var n = ri(rng, 1, d - 1);
      return { s: 'inline', lines: [[fr(n, d), '=', BOX]], ansList: [C.fmtDec(n / d)], hint: '소수로' };
    };
  }
  /* 소수 → 분수 */
  function decToFrac() {
    return function (rng) {
      var k = ri(rng, 1, 2), p = Math.pow(10, k);
      var v = ri(rng, 1, p - 1);
      var f = C.fracReduce({ n: v, d: p });
      return { s: 'inline', lines: [[num(C.fmtDec(v / p)), '=', BOX]], ansList: [fo(f)], hint: '기약분수로' };
    };
  }
  /* 분수와 소수의 크기 비교 */
  function compareFracDec() {
    return function (rng) {
      var d = pick(rng, [2, 4, 5, 8, 10, 20, 25]);
      var n = ri(rng, 1, d - 1);
      var v = C.fmtDec(n / d);
      var other = C.fmtDec(Math.max(0.01, C.roundTo(v + (rng() < 0.5 ? 1 : -1) * (ri(rng, 1, 30) / 100), 2)));
      if (other === v) other = C.fmtDec(v + 0.1);
      return {
        s: 'inline', lines: [[fr(n, d), BOX, num(other)]],
        ansList: [v > other ? '>' : '<']
      };
    };
  }

  /* ============================================================
     10. 소수
     ============================================================ */
  function randDec(rng, intDigits, decDigits) {
    var ip = intDigits > 0 ? ri(rng, intDigits === 1 ? 1 : Math.pow(10, intDigits - 1), Math.pow(10, intDigits) - 1) : 0;
    var dp = ri(rng, 1, Math.pow(10, decDigits) - 1);
    return C.fmtDec(ip + dp / Math.pow(10, decDigits));
  }

  /* 소수 세로셈 덧셈/뺄셈 */
  function decVert(op, o) {
    o = o || {};
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var ka = o.ka != null ? o.ka : ri(r, o.kMin || 1, o.kMax || 2);
        var kb = o.kb != null ? o.kb : (o.sameK ? ka : ri(r, o.kMin || 1, o.kMax || 2));
        var a = randDec(r, o.intDigits, ka), b = randDec(r, o.intDigits2 != null ? o.intDigits2 : o.intDigits, kb);
        if (op === '-' && a < b) { var t = a; a = b; b = t; }
        return [a, b];
      }, function (p) {
        if (op === '-' && p[0] <= p[1]) return false;
        return true;
      });
      return {
        s: 'vert', op: op, a: r[0], b: r[1], dec: true,
        ansList: [C.decCalc(r[0], r[1], op)]
      };
    };
  }

  /* 같은 수를 가로식으로 냅니다.
     수를 고르는 방법은 세로식(decVert)과 똑같고 쓰는 모양만 다릅니다. */
  function decHorz(op, o) {
    var make = decVert(op, o);
    return function (rng) {
      var p = make(rng);
      return {
        s: 'inline',
        lines: [[num(p.a), op, num(p.b), '=', BOX]],
        ansList: p.ansList
      };
    };
  }

  /* 소수 × 자연수 / 소수 × 소수 */
  function decMul(kind) {
    return function (rng) {
      var a, b, ans;
      if (kind === 'nat') {
        a = randDec(rng, ri(rng, 0, 1), ri(rng, 1, 2));
        b = ri(rng, 2, 9);
      } else if (kind === 'dec') {
        a = randDec(rng, ri(rng, 0, 1), ri(rng, 1, 2));
        b = randDec(rng, ri(rng, 0, 1), ri(rng, 1, 2));
      } else {                       // 곱의 소수점 위치: ×10, ×100, ×1000, ×0.1, ×0.01
        b = pick(rng, [10, 100, 1000, 0.1, 0.01]);
        /* 곱한 결과가 소수 넷째 자리를 넘지 않도록 자릿수를 맞춥니다 */
        a = randDec(rng, ri(rng, 0, 1), b >= 1 ? ri(rng, 1, 3) : ri(rng, 1, 2));
      }
      ans = C.decCalc(a, b, '×');
      return { s: 'inline', lines: [[num(a), '×', num(b), '=', BOX]], ansList: [ans] };
    };
  }
  function decMul3() {
    return function (rng) {
      var a = C.fmtDec(ri(rng, 2, 9) / 10);
      var b = C.fmtDec(ri(rng, 2, 9) / 10);
      var c = C.fmtDec(ri(rng, 11, 99) / 10);
      var ans = C.fmtDec(Math.round(a * b * c * 1000) / 1000);
      return { s: 'inline', lines: [[num(a), '×', num(b), '×', num(c), '=', BOX]], ansList: [ans], wide: true };
    };
  }

  /* 소수 ÷ 자연수, 자연수 ÷ 자연수 */
  function decDiv(kind, o) {
    o = o || {};
    return function (rng) {
      if (kind === 'decByNat') {
        var b = ri(rng, 2, 9);
        var q = C.fmtDec(ri(rng, 11, 999) / Math.pow(10, ri(rng, 1, 2)));
        var a = C.decCalc(q, b, '×');
        return { s: 'inline', lines: [[num(a), '÷', num(b), '=', BOX]], ansList: [C.fmtDec(a / b)] };
      }
      if (kind === 'natByNat') {
        var r = tryGen(rng, function (r) {
          return [ri(r, 2, 99), ri(r, 2, 16)];
        }, function (p) {
          var v = p[0] / p[1];
          return v !== Math.floor(v) && C.decPlaces(C.fmtDec(Math.round(v * 1000) / 1000)) <= 3 &&
            Math.abs(Math.round(v * 1000) / 1000 - v) < 1e-9;
        });
        return { s: 'inline', lines: [[num(r[0]), '÷', num(r[1]), '=', BOX]], ansList: [C.fmtDec(r[0] / r[1])] };
      }
      if (kind === 'round') {
        var a2 = ri(rng, 11, 99), b2 = ri(rng, 3, 9);
        var k = o.k || 2;
        return {
          s: 'inline', lines: [[num(a2), '÷', num(b2), '=', BOX]],
          ansList: [C.roundTo(a2 / b2, k)], hint: '반올림하여 소수 ' + k + '째 자리까지'
        };
      }
      if (kind === 'natByDec') {
        /* 자연수 ÷ 소수 : 몫이 자연수로 딱 떨어지게 */
        var nb = tryGen(rng, function (r) {
          var m = ri(r, 11, 95), q = ri(r, 2, 20);
          return { b: C.fmtDec(m / 10), q: q, a: m * q / 10 };
        }, function (x) {
          return x.a === Math.floor(x.a) && x.a >= 2 && x.a <= 300 && C.decPlaces(x.b) === 1;
        });
        return { s: 'inline', lines: [[num(nb.a), '÷', num(nb.b), '=', BOX]], ansList: [nb.q] };
      }
      /* 소수 ÷ 소수 : 나누는 수·나누어지는 수의 소수 자릿수를 유형에 맞춤 */
      var kA = o.kA || 1, kB = o.kB || 1, pB = Math.pow(10, kB);
      var dd = tryGen(rng, function (r) {
        var b = C.fmtDec(ri(r, 2, pB * 9) / pB);
        var q = ri(r, 2, 40);
        return { b: b, q: q, a: C.decCalc(b, q, '×') };
      }, function (x) {
        return C.decPlaces(x.b) === kB && C.decPlaces(x.a) === kA && x.a > x.b;
      });
      return { s: 'inline', lines: [[num(dd.a), '÷', num(dd.b), '=', BOX]], ansList: [dd.q] };
    };
  }

  /* 소수의 나눗셈에서 나머지 구하기 */
  function decDivRem() {
    return function (rng) {
      var b = C.fmtDec(ri(rng, 11, 49) / 10);
      var q = ri(rng, 2, 9);
      var rem = C.fmtDec(ri(rng, 1, Math.floor(b * 10) - 1) / 10);
      var a = C.fmtDec(C.decCalc(b, q, '×') + rem);
      return {
        s: 'inline', lines: [[num(a), '÷', num(b), '=', BOX, '…', BOX]],
        ansList: [q, rem], hint: '몫은 자연수까지'
      };
    };
  }

  /* 분수와 소수의 혼합 계산 */
  function fracDecMix(long) {
    return function (rng) {
      var r = tryGen(rng, function (r) {
        var f0 = C.fracReduce({ n: 0, d: 1 });
        var d0 = pick(r, [2, 4, 5, 8, 10]);
        f0 = C.fracReduce({ n: ri(r, 1, d0 - 1), d: d0 });
        var n = f0.n, d = f0.d;
        var a = C.fmtDec(ri(r, 2, 9) / 10);
        var k = ri(r, 2, 9);
        var ops = ['×', '÷'];
        var o1 = pick(r, ops), o2 = pick(r, ops);
        var v = { n: n, d: d };
        var af = C.fracReduce({ n: Math.round(a * 10), d: 10 });
        v = o1 === '×' ? C.fracMul(v, af) : C.fracDiv(v, af);
        v = o2 === '×' ? C.fracMul(v, { n: k, d: 1 }) : C.fracDiv(v, { n: k, d: 1 });
        var line = [fr(n, d), o1, num(a), o2, num(k)];
        if (long) {
          var k2 = ri(r, 2, 9), o3 = pick(r, ops);
          v = o3 === '×' ? C.fracMul(v, { n: k2, d: 1 }) : C.fracDiv(v, { n: k2, d: 1 });
          line.push(o3); line.push(num(k2));
        }
        line.push('='); line.push(BOX);
        return { line: line, v: v };
      }, function (x) {
        return x.v.d <= 120 && x.v.n <= 4000;      // 답이 지나치게 복잡해지지 않게
      });
      return { s: 'inline', lines: [r.line], ansList: [fmix(r.v)], hint: '분수로', wide: true };
    };
  }

  /* ============================================================
     11. 비와 비율 / 비례식
     ============================================================ */
  function ratioValue(kind) {
    return function (rng) {
      var b = ri(rng, 2, 20), a = ri(rng, 1, 20);
      if (kind === 'frac') {
        var f = C.fracReduce({ n: a, d: b });
        return {
          s: 'inline', lines: [[num(a), ':', num(b), '의 비율 →', BOX]],
          ansList: [fmix(f)], hint: '기약분수로', wide: true
        };
      }
      /* 백분율 / 할푼리 */
      var d = pick(rng, [4, 5, 8, 10, 20, 25, 50]);
      var n = ri(rng, 1, d - 1);
      var pct = C.fmtDec(n / d * 100);
      return {
        s: 'inline', lines: [[fr(n, d), '→', BOX, '%']],
        ansList: [pct], hint: '백분율로', wide: true
      };
    };
  }
  function proportionBox() {
    return function (rng) {
      var a = ri(rng, 2, 12), b = ri(rng, 2, 12), k = ri(rng, 2, 9);
      var pos = ri(rng, 0, 3);
      var v = [a, b, a * k, b * k];
      var toks = [];
      for (var i = 0; i < 4; i++) {
        toks.push(i === pos ? BOX : num(v[i]));
        if (i === 0 || i === 2) toks.push(':');
        if (i === 1) toks.push('=');
      }
      return { s: 'inline', lines: [toks], ansList: [v[pos]], wide: true };
    };
  }
  function simplestRatio() {
    return function (rng) {
      var g = ri(rng, 2, 9), a = ri(rng, 2, 9) * g, b = ri(rng, 2, 9) * g;
      var d = C.gcd(a, b);
      return {
        s: 'inline', lines: [[num(a), ':', num(b), '→', BOX, ':', BOX]],
        ansList: [a / d, b / d], hint: '가장 간단한 자연수의 비', wide: true
      };
    };
  }
  function proportionalShare() {
    return function (rng) {
      var p = ri(rng, 1, 9), q = ri(rng, 1, 9);
      if (C.gcd(p, q) !== 1) q = q + 1;
      var unit = ri(rng, 2, 15);
      var total = (p + q) * unit;
      return {
        s: 'inline',
        lines: [[num(total), '을(를)', num(p), ':', num(q), '로 비례배분 →', BOX, ',', BOX]],
        ansList: [p * unit, q * unit], wide: true
      };
    };
  }

  /* ============================================================
     12. 시계
     ============================================================ */
  /* kind: oclock 정각 / half 30분 / both 정각·30분 / m5 5분 단위 / m1 1분 단위 */
  function clockMin(rng, kind) {
    if (kind === 'half') return 30;
    if (kind === 'both') return rng() < 0.5 ? 0 : 30;
    if (kind === 'm5') return ri(rng, 1, 11) * 5;
    if (kind === 'm1') {                       // 5의 배수는 빼서 1분 단위를 읽게 합니다
      return tryGen(rng, function (r) { return ri(r, 1, 59); },
        function (m) { return m % 5 !== 0; });
    }
    return 0;
  }
  function timeText(h, m) { return m === 0 ? h + '시' : h + '시 ' + m + '분'; }

  function clock(kind) {
    var big = kind === 'm5' || kind === 'm1';   // 분 눈금을 세어야 하므로 크게
    return function (rng) {
      var h = ri(rng, 1, 12), m = clockMin(rng, kind);
      return { s: 'clock', h: h, m: m, draw: false, big: big, ansList: [timeText(h, m)] };
    };
  }
  function clockDraw(kind) {
    var big = kind === 'm5' || kind === 'm1';
    return function (rng) {
      var h = ri(rng, 1, 12), m = clockMin(rng, kind);
      var label = timeText(h, m);
      return { s: 'clock', h: h, m: m, draw: true, big: big, label: label, ansList: [label] };
    };
  }

  /* 몇 시 몇 분 전으로 읽기 — 3시 55분 → 4시 5분 전 */
  function clockBefore() {
    return function (rng) {
      var h = ri(rng, 1, 12), m = ri(rng, 7, 11) * 5;    // 35 ~ 55분
      var nh = h === 12 ? 1 : h + 1;
      return {
        s: 'inline',
        lines: [[num(timeText(h, m)), '→', { nw: [BOX, '시', BOX, '분 전'] }]],
        ansList: [nh, 60 - m], wide: true
      };
    };
  }

  /* 시간 단위 바꾸기 — 1시간=60분, 1일=24시간, 1주일=7일, 1년=12개월 */
  var TIME_UNITS = {
    hm: { big: '시간', small: '분', per: 60, bigMax: 5 },
    dh: { big: '일', small: '시간', per: 24, bigMax: 4 },
    wd: { big: '주일', small: '일', per: 7, bigMax: 5 },
    ym: { big: '년', small: '개월', per: 12, bigMax: 5 },
    /* 3학년 길이와 시간 */
    ms: { big: '분', small: '초', per: 60, bigMax: 9 },
    cmm: { big: 'cm', small: 'mm', per: 10, bigMax: 9 },
    mcm: { big: 'm', small: 'cm', per: 100, bigMax: 9 },
    kmm: { big: 'km', small: 'm', per: 1000, bigMax: 9 }
  };
  /* kind 를 배열로 주면 문제마다 골라 씁니다.
     하나만 줄 때는 난수를 쓰지 않아 기존 문제지가 그대로 재현됩니다. */
  function timeUnit(kind) {
    var list = typeof kind === 'string' ? [kind] : kind;
    return function (rng) {
      var u = TIME_UNITS[list.length === 1 ? list[0] : pick(rng, list)];
      var a = ri(rng, 1, u.bigMax), b = ri(rng, 1, u.per - 1);
      if (rng() < 0.5) {
        return {
          s: 'inline',
          lines: [[{ nw: [num(a), u.big, num(b), u.small] }, '=', { nw: [BOX, u.small] }]],
          ansList: [a * u.per + b]
        };
      }
      return {
        s: 'inline',
        lines: [[{ nw: [num(a * u.per + b), u.small] }, '=',
          { nw: [BOX, u.big, BOX, u.small] }]],
        ansList: [a, b]
      };
    };
  }

  /* 걸린 시간 / 끝난 시각 */
  function clockSpan(kind) {
    return function (rng) {
      var h1 = ri(rng, 1, 8), m1 = ri(rng, 0, 11) * 5;
      var dh = ri(rng, 1, 3), dm = ri(rng, 0, 11) * 5;
      var tot = h1 * 60 + m1 + dh * 60 + dm;
      var h2 = Math.floor(tot / 60), m2 = tot % 60;
      if (h2 > 12) h2 -= 12;
      if (kind === 'elapsed') {                 // 두 시각 사이의 걸린 시간
        return {
          s: 'inline',
          lines: [[num(timeText(h2, m2)), '-', num(timeText(h1, m1)), '=',
            { nw: [BOX, '시간', BOX, '분'] }]],
          ansList: [dh, dm], wide: true
        };
      }
      var span = dm === 0 ? dh + '시간' : dh + '시간 ' + dm + '분';
      return {                                  // 시각 + 걸린 시간 = 끝난 시각
        s: 'inline',
        lines: [[num(timeText(h1, m1)), '+', num(span), '=',
          { nw: [BOX, '시', BOX, '분'] }]],
        ansList: [h2, m2], wide: true
      };
    };
  }

  /* ---------- 시각과 시간 문장제 ----------
     한국어 조사는 앞 글자의 받침에 따라 달라지므로 직접 계산해서 붙입니다. */
  function hasJong(w) {
    var c = w.charCodeAt(w.length - 1);
    if (c < 0xAC00 || c > 0xD7A3) return false;
    return (c - 0xAC00) % 28 !== 0;
  }
  function jo(w, pair) {                       // '은는' '이가' '을를' '과와'
    return hasJong(w) ? pair.charAt(0) : pair.charAt(1);
  }

  var W_NAME = ['지훈', '서연', '민서', '하윤', '도현', '예나', '시우', '지아',
    '준호', '다연', '유진', '태윤', '수아', '건우'];
  var W_ACT = ['숙제', '운동', '독서', '청소', '피아노 연습', '줄넘기', '산책',
    '그림 그리기', '블록 놀이', '동화책 읽기', '자전거 타기', '요리'];

  var W_TPL = {
    elapsed: [
      function (n, a, s, e) {
        return n + jo(n, '은는') + ' ' + s + '에 ' + a + jo(a, '을를') +
          ' 시작해서 ' + e + '에 마쳤습니다. ' + a + jo(a, '을를') + ' 한 시간은 얼마일까요?';
      },
      function (n, a, s, e) {
        return n + jo(n, '은는') + ' ' + s + '부터 ' + e + '까지 ' + a + jo(a, '을를') +
          ' 했습니다. 몇 시간 몇 분 동안 했을까요?';
      },
      function (n, a, s, e) {
        return s + '에 시작한 ' + a + jo(a, '이가') + ' ' + e +
          '에 끝났습니다. 걸린 시간은 얼마일까요?';
      }
    ],
    end: [
      function (n, a, s, e, d) {
        return n + jo(n, '은는') + ' ' + s + '에 ' + a + jo(a, '을를') +
          ' 시작했습니다. ' + d + ' 동안 했다면 끝난 시각은 몇 시 몇 분일까요?';
      },
      function (n, a, s, e, d) {
        return s + '에 시작한 ' + a + jo(a, '이가') + ' ' + d +
          ' 만에 끝났습니다. 끝난 시각은 몇 시 몇 분일까요?';
      },
      function (n, a, s, e, d) {
        return n + jo(n, '은는') + ' ' + s + '부터 ' + d + ' 동안 ' + a + jo(a, '을를') +
          ' 했습니다. ' + a + jo(a, '을를') + ' 마친 시각은 몇 시 몇 분일까요?';
      }
    ],
    start: [
      function (n, a, s, e, d) {
        return n + jo(n, '은는') + ' ' + d + ' 동안 ' + a + jo(a, '을를') +
          ' 하고 ' + e + '에 마쳤습니다. 시작한 시각은 몇 시 몇 분일까요?';
      },
      function (n, a, s, e, d) {
        return e + '에 끝난 ' + a + jo(a, '이가') + ' ' + d +
          ' 걸렸습니다. 시작한 시각은 몇 시 몇 분일까요?';
      }
    ]
  };

  function wordTime(kind) {
    return function (rng) {
      var h1 = ri(rng, 1, 8), m1 = ri(rng, 0, 11) * 5;
      var dh = ri(rng, 1, 3), dm = ri(rng, 0, 11) * 5;
      var tot = h1 * 60 + m1 + dh * 60 + dm;
      var h2 = Math.floor(tot / 60), m2 = tot % 60;
      if (h2 > 12) h2 -= 12;
      var name = pick(rng, W_NAME), act = pick(rng, W_ACT);
      var dur = dm === 0 ? dh + '시간' : dh + '시간 ' + dm + '분';
      var text = pick(rng, W_TPL[kind])(name, act, timeText(h1, m1), timeText(h2, m2), dur);

      if (kind === 'elapsed') {
        return { s: 'word', text: text, ans: [{ nw: [BOX, '시간', BOX, '분'] }], ansList: [dh, dm] };
      }
      if (kind === 'end') {
        return { s: 'word', text: text, ans: [{ nw: [BOX, '시', BOX, '분'] }], ansList: [h2, m2] };
      }
      return { s: 'word', text: text, ans: [{ nw: [BOX, '시', BOX, '분'] }], ansList: [h1, m1] };
    };
  }

  /* ---------- 단위가 붙은 세로셈 (3학년 길이와 시간) ----------
     3 m 40 cm + 2 m 25 cm,  2시간 30분 15초 - 1시간 45분 30초 처럼
     자리마다 단위가 다르고 받아올림 기준(bases)도 다릅니다.
       units: ['시간','분','초']   bases: [60, 60]  ← 1시간=60분, 1분=60초 */
  function uToBase(v, bases) {
    var t = v[0];
    for (var i = 1; i < v.length; i++) t = t * bases[i - 1] + v[i];
    return t;
  }
  function uFromBase(t, bases) {
    var out = [];
    for (var i = bases.length - 1; i >= 0; i--) {
      out.unshift(t % bases[i]);
      t = Math.floor(t / bases[i]);
    }
    out.unshift(t);
    return out;
  }
  function uCarries(a, b, bases) {
    var c = 0, carry = 0;
    for (var i = a.length - 1; i >= 1; i--) {
      var t = a[i] + b[i] + carry;
      if (t >= bases[i - 1]) { c++; carry = 1; } else carry = 0;
    }
    return c;
  }
  function uBorrows(a, b, bases) {
    var c = 0, borrow = 0;
    for (var i = a.length - 1; i >= 1; i--) {
      var t = a[i] - borrow - b[i];
      if (t < 0) { c++; borrow = 1; } else borrow = 0;
    }
    return c;
  }

  function vUnit(o) {
    var bases = o.bases, units = o.units, n = units.length;
    /* op 를 배열로 주면 문제마다 골라 씁니다 (합과 차 섞어 내기).
       하나만 줄 때는 난수를 쓰지 않아 기존 문제지가 그대로 재현됩니다. */
    var ops = typeof o.op === 'string' ? null : o.op;
    return function (rng) {
      var op = ops ? pick(rng, ops) : o.op;
      var r = tryGen(rng, function (r) {
        var a = [], b = [], i;
        for (i = 0; i < n; i++) {
          a.push(ri(r, o.ranges[i][0], o.ranges[i][1]));
          b.push(ri(r, o.ranges[i][0], o.ranges[i][1]));
        }
        if (op === '-' && uToBase(a, bases) < uToBase(b, bases)) { var t = a; a = b; b = t; }
        return { a: a, b: b };
      }, function (x) {
        var ta = uToBase(x.a, bases), tb = uToBase(x.b, bases);
        if (op === '-' && ta <= tb) return false;
        /* 받아올림은 덧셈에만, 받아내림은 뺄셈에만 적용합니다 */
        if (op === '+' && o.carries != null && uCarries(x.a, x.b, bases) !== o.carries) return false;
        if (op === '-' && o.borrows != null && uBorrows(x.a, x.b, bases) !== o.borrows) return false;
        if (op === '+' && o.maxTop != null && uFromBase(ta + tb, bases)[0] > o.maxTop) return false;
        return true;
      });
      var ta = uToBase(r.a, bases), tb = uToBase(r.b, bases);
      var res = uFromBase(op === '+' ? ta + tb : ta - tb, bases);
      return {
        s: 'vunit', op: op, units: units,
        a: r.a, b: r.b, ansList: res,
        unitsB: o.unitsB || units, unitsR: o.unitsR || units
      };
    };
  }

  /* ============================================================
     네 자리 수 (2학년 2학기 1단원)
     ============================================================ */
  var KOR_D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  var KOR_U = ['', '십', '백', '천'];
  /* 2032 → 이천삼십이.
     자리 숫자가 1이면 '일'을 붙이지 않고(1421 → 천사백이십일),
     0인 자리는 건너뜁니다. */
  function korNum(n) {
    var s = String(n), out = '', i, d, u, pos;
    for (i = 0; i < s.length; i++) {
      d = Number(s.charAt(i));
      if (d === 0) continue;
      pos = s.length - 1 - i;
      u = pos === 4 ? '만' : KOR_U[pos];     // 다섯 자리까지 (조사 붙일 때 씁니다)
      out += (d === 1 && u ? '' : KOR_D[d]) + u;
    }
    return out || '영';
  }

  var PV = [1000, 100, 10, 1];              // 자릿값
  var PV_NAME = ['천', '백', '십', '일'];

  /* 네 자리 수의 각 자리 숫자를 뽑습니다. 0인 자리가 자주 나오게 합니다. */
  function fourDigits(rng, zeroRate) {
    return tryGen(rng, function (r) {
      var d = [ri(r, 1, 9), ri(r, 0, 9), ri(r, 0, 9), ri(r, 0, 9)];
      if (r() < (zeroRate == null ? 0.3 : zeroRate)) d[ri(r, 1, 3)] = 0;
      return d;
    }, function (d) { return d[1] + d[2] + d[3] > 0; });   // 2000 같은 수만 남지 않게
  }
  function fromDigits(d) { return d[0] * 1000 + d[1] * 100 + d[2] * 10 + d[3]; }

  /* 묶음을 적은 토큰: 1000이 2개,  100이 32개, … (0인 자리는 아예 쓰지 않습니다)
     '1000이' 처럼 조사까지 한 토큰에 넣어야 사이가 벌어지지 않습니다. */
  function bundleTokens(counts, box, lastTail) {
    var out = [], idx = [], i, k, tail;
    for (i = 0; i < 4; i++) if (counts[i] !== 0 || box) idx.push(i);
    for (i = 0; i < idx.length; i++) {
      k = idx[i];
      tail = i === idx.length - 1 ? (lastTail || '개') : '개,';
      out.push(box
        ? { nw: [num(PV[k] + '이'), BOX, num(tail)] }
        : { nw: [num(PV[k] + '이'), num(counts[k] + tail)] });
    }
    return out;
  }

  /* 1) 묶음 → 수. 숫자와 읽기를 둘 다 씁니다.
        묶음이 10개를 넘는 문제(100이 32개 → 3200)도 섞습니다. */
  function fourBundle() {
    return function (rng) {
      var c = tryGen(rng, function (r) {
        var d = fourDigits(r, 0.3);
        if (r() < 0.25) {                    // 묶음이 10개를 넘는 문제
          d[0] = ri(r, 1, 5);
          d[ri(r, 1, 3)] = ri(r, 11, 35);
        }
        return d;
      }, function (d) {
        var v = fromDigits(d);
        return v >= 1000 && v <= 9999;
      });
      var v = fromDigits(c);
      return {                               /* 묻는 줄과 답 줄을 나눕니다 */
        s: 'inline',
        lines: [
          bundleTokens(c, false, '개인 수는?'),
          ['쓰기', BOX],
          ['읽기', BOXW]
        ],
        ansList: [v, korNum(v)]
      };
    };
  }

  /* 2) 수 → 묶음 */
  function fourSplit() {
    return function (rng) {
      var d = fourDigits(rng, 0.25), v = fromDigits(d);
      return {
        s: 'inline',
        lines: [[num(v + jo(korNum(v), '은는'))].concat(bundleTokens(d, true, '개입니다'))],
        ansList: [d[0], d[1], d[2], d[3]]
      };
    };
  }

  /* 3) 자릿값 덧셈식 — 3712 = 3000 + □ + 10 + 2 / 1000 + 400 + 20 + 1 = □ */
  function placeSum() {
    return function (rng) {
      var d = tryGen(rng, function (r) { return fourDigits(r, 0.35); },
        function (d) {                       // 더할 것이 둘은 되어야 식이 됩니다
          var k = 0, i;
          for (i = 0; i < 4; i++) if (d[i]) k++;
          return k >= 2;
        });
      var v = fromDigits(d), terms = [], i;
      for (i = 0; i < 4; i++) if (d[i]) terms.push(d[i] * PV[i]);
      var line = [], hide = rng() < 0.5 ? ri(rng, 0, terms.length - 1) : -1;
      if (hide < 0) {                        // 1000 + 400 + 20 + 1 = □
        for (i = 0; i < terms.length; i++) {
          if (i) line.push('+');
          line.push(num(terms[i]));
        }
        line.push('=', BOX);
        return { s: 'inline', lines: [line], ansList: [v] };
      }
      line.push(num(v), '=');                // 3712 = 3000 + □ + 10 + 2
      for (i = 0; i < terms.length; i++) {
        if (i) line.push('+');
        line.push(i === hide ? BOX : num(terms[i]));
      }
      return { s: 'inline', lines: [line], ansList: [terms[hide]] };
    };
  }

  /* 4) 돈으로 네 자리 수 만들기 — 1000원 지폐와 100원·10원 동전을 섞습니다.
        1원짜리가 없어 일의 자리는 0이 됩니다. */
  var MONEY = [
    { v: 1000, w: '1000원짜리 지폐', unit: '장' },
    { v: 100, w: '100원짜리 동전', unit: '개' },
    { v: 10, w: '10원짜리 동전', unit: '개' }
  ];
  function moneyFour() {
    return function (rng) {
      var c = tryGen(rng, function (r) {
        var x = [ri(r, 1, 9), ri(r, 0, 9), ri(r, 0, 9)];
        if (r() < 0.3) x[ri(r, 1, 2)] = 0;   // 자리가 비는 문제
        return x;
      }, function (x) { return x[0] >= 1 && (x[1] || x[2]); });
      var name = pick(rng, W_NAME);
      var total = c[0] * 1000 + c[1] * 100 + c[2] * 10;
      var parts = [];
      for (var i = 0; i < 3; i++) if (c[i]) parts.push(MONEY[i].w + ' ' + c[i] + MONEY[i].unit);
      var last = parts[parts.length - 1];
      return {
        s: 'word',
        text: name + jo(name, '은는') + ' ' + parts.join(', ') + jo(last, '을를') +
          ' 가지고 있습니다. ' +
          name + jo(name, '이가') + ' 가진 돈은 모두 얼마일까요?',
        ans: [{ nw: [BOX, '원'] }],
        ansList: [total]
      };
    };
  }

  /* 수 안에서 '한 번만 나오는 0이 아닌 숫자' 의 자리들.
     5454 처럼 하나도 없는 수는 문제로 쓸 수 없습니다. */
  function onceDigits(d) {
    var out = [], i, j, k;
    for (i = 0; i < 4; i++) {
      if (d[i] === 0) continue;
      k = 0;
      for (j = 0; j < 4; j++) if (d[j] === d[i]) k++;
      if (k === 1) out.push(i);
    }
    return out;
  }

  /* 5) 자릿값이 나타내는 값 — 한 자리의 값과 두 자리 값의 합을 섞습니다 */
  function placeValue() {
    return function (rng) {
      if (rng() < 0.5) {                     // 8743 에서 4가 나타내는 값
        var d = tryGen(rng, function (r) { return fourDigits(r, 0.2); },
          function (d) { return onceDigits(d).length > 0; });
        var k = pick(rng, onceDigits(d)), g = d[k];
        return {
          s: 'inline',
          lines: [[num(fromDigits(d) + '에서'), num(g + jo(KOR_D[g], '이가')),
            '나타내는 값', '→', BOX]],
          ansList: [g * PV[k]]
        };
      }
      /* 5253 에서 백의 자리와 일의 자리가 나타내는 값의 합 */
      var r = tryGen(rng, function (r) {
        var d = fourDigits(r, 0.2);
        var p = shuffle(r, [0, 1, 2, 3]).slice(0, 2).sort(function (a, b) { return a - b; });
        return { d: d, p: p };
      }, function (x) {
        return x.d[x.p[0]] + x.d[x.p[1]] > 0;    // 둘 다 0이면 답이 0이라 문제가 안 됩니다
      });
      return {
        s: 'inline',
        lines: [[num(fromDigits(r.d) + '에서'),
          PV_NAME[r.p[0]] + '의 자리 숫자와 ' + PV_NAME[r.p[1]] +
          '의 자리 숫자가 나타내는 값의 합', '→', BOX]],
        ansList: [r.d[r.p[0]] * PV[r.p[0]] + r.d[r.p[1]] * PV[r.p[1]]]
      };
    };
  }

  /* 6) 뛰어 세기 — 커지는 것과 작아지는 것을 섞습니다.
        나열을 보고 규칙을 알아내는 것이 목적이라 앞의 두 수는 늘 보여 줍니다. */
  function skipCount() {
    return function (rng) {
      var step = pick(rng, [1, 10, 100, 1000]);
      var up = rng() < 0.5;
      var a0 = tryGen(rng, function (r) { return ri(r, 1000, 9999); }, function (a) {
        var last = a + (up ? 1 : -1) * step * 4;
        return last >= 1000 && last <= 9999;
      });
      var seq = [], i;
      for (i = 0; i < 5; i++) seq.push(a0 + (up ? 1 : -1) * step * i);
      var hide = shuffle(rng, [2, 3, 4]).slice(0, ri(rng, 1, 2)).sort(function (a, b) { return a - b; });
      var line = [], ans = [];
      for (i = 0; i < 5; i++) {
        var cell = hide.indexOf(i) >= 0 ? BOX : num(seq[i]);
        if (hide.indexOf(i) >= 0) ans.push(seq[i]);
        /* 화살표는 뒤에 오는 수와 한 덩어리로 둡니다 (줄바꿈에 떼이지 않게) */
        line.push(i === 0 ? cell : { nw: ['→', cell] });
      }
      return { s: 'inline', lines: [line], ansList: ans, wide: true };
    };
  }

  /* ============================================================
     수의 범위와 어림하기 (5학년 2학기 1단원)
     ============================================================ */
  /* 이상·이하·초과·미만 — 경계를 넣느냐 빼느냐가 전부인 단원입니다 */
  var R_LO = [{ w: '이상', inc: true }, { w: '초과', inc: false }];   // 작은 쪽 경계
  var R_HI = [{ w: '이하', inc: true }, { w: '미만', inc: false }];   // 큰 쪽 경계

  function inRange(v, k, g, hi) {
    if (hi) return g.inc ? v <= k : v < k;
    return g.inc ? v >= k : v > k;
  }

  /* 주어진 수 중에서 고르기.
     기준값을 반드시 후보에 넣습니다. 기준값이 빠지면 '이상'과 '초과'의 답이
     같아져서, 둘을 구분하지 못해도 정답이 됩니다. */
  function rangePick(rng) {
    var hi = rng() < 0.5;
    var g = pick(rng, hi ? R_HI : R_LO);
    var k = ri(rng, 14, 48);
    var list = tryGen(rng, function (r) {
      var out = [k], i;
      for (i = 0; i < 5; i++) out.push(ri(r, Math.max(2, k - 13), k + 13));
      return shuffle(r, out);
    }, function (out) {
      var seen = {}, i;
      for (i = 0; i < out.length; i++) {          // 같은 수가 두 번 나오면 안 됩니다
        if (seen[out[i]]) return false;
        seen[out[i]] = 1;
      }
      var got = out.filter(function (v) { return inRange(v, k, g, hi); });
      return got.length >= 2 && got.length <= out.length - 2;
    });
    var got = list.filter(function (v) { return inRange(v, k, g, hi); })
      .sort(function (a, b) { return a - b; });
    return {
      s: 'inline',
      /* 후보가 여섯이라 한 줄에 답까지 넣으면 접힙니다. 답은 아래 줄로 내립니다. */
      lines: [[num(list.join(', ')), '중에서', num(k), g.w + '인 수를 모두 쓰시오'],
        ['→', BOXW]],
      ansList: [got.join(', ')]
    };
  }

  /* 범위에 드는 자연수의 개수 — 네 가지 조합을 고루 냅니다 */
  function rangeCount(rng) {
    var lo = pick(rng, R_LO), hi = pick(rng, R_HI);
    var r = tryGen(rng, function (r) {
      var a = ri(r, 10, 60);
      return [a, a + ri(r, 3, 16)];
    }, function (p) {
      var s = lo.inc ? p[0] : p[0] + 1, e = hi.inc ? p[1] : p[1] - 1;
      return e - s + 1 >= 2;
    });
    var s = lo.inc ? r[0] : r[0] + 1, e = hi.inc ? r[1] : r[1] - 1;
    return {
      s: 'inline',
      lines: [[num(r[0]), lo.w, num(r[1]), hi.w + '인 자연수는 모두', BOX, '개']],
      ansList: [e - s + 1]
    };
  }

  /* 경계가 되는 수 — 이상/초과, 이하/미만이 1 차이로 갈립니다 */
  function rangeEdge(rng) {
    var hi = rng() < 0.5;
    var g = pick(rng, hi ? R_HI : R_LO);
    var k = ri(rng, 12, 85);
    return {
      s: 'inline',
      lines: [[num(k), g.w + '인 자연수 중 가장 ' + (hi ? '큰' : '작은') + ' 수', '→', BOX]],
      ansList: [hi ? (g.inc ? k : k - 1) : (g.inc ? k : k + 1)]
    };
  }

  function numRange() {
    return function (rng) {
      var r = rng();
      if (r < 0.4) return rangePick(rng);
      if (r < 0.7) return rangeCount(rng);
      return rangeEdge(rng);
    };
  }

  /* ---------- 올림 · 버림 · 반올림 ---------- */
  var RK = [{ k: 'up', w: '올림' }, { k: 'down', w: '버림' }, { k: 'half', w: '반올림' }];
  var RP = [{ p: 10, w: '십' }, { p: 100, w: '백' }, { p: 1000, w: '천' }];

  function roundAt(v, p, k) {
    if (k === 'up') return Math.ceil(v / p) * p;
    if (k === 'down') return Math.floor(v / p) * p;
    return Math.round(v / p) * p;
  }

  function roundNum() {
    return function (rng) {
      var pl = pick(rng, RP);
      var v = ri(rng, 1000, 99999);
      if (rng() < 0.15) v = Math.floor(v / pl.p) * pl.p;            // 그 자리가 이미 0
      else if (rng() < 0.2) v = Math.floor(v / pl.p) * pl.p + pl.p / 2;  // 반올림 경계
      if (rng() < 0.18) {                    // 한 수를 세 가지로 비교
        return {
          s: 'inline',
          lines: [[num(v + jo(korNum(v), '을를')), pl.w + '의 자리까지'],
            ['올림', BOXP, '버림', BOXP, '반올림', BOXP]],
          ansList: [roundAt(v, pl.p, 'up'), roundAt(v, pl.p, 'down'), roundAt(v, pl.p, 'half')]
        };
      }
      var kd = pick(rng, RK);
      return {
        s: 'inline',
        lines: [[num(v + jo(korNum(v), '을를')),
          kd.w + '하여 ' + pl.w + '의 자리까지 나타내기', '→', BOX]],
        ansList: [roundAt(v, pl.p, kd.k)]
      };
    };
  }

  /* 거꾸로 — 어림해서 그 수가 되는 자연수의 범위.
     어림 방법마다 경계를 여는 쪽이 다릅니다.
       올림   3400 초과 3500 이하
       버림   3500 이상 3600 미만
       반올림 3450 이상 3550 미만 */
  function roundBack() {
    return function (rng) {
      var pl = pick(rng, RP), kd = pick(rng, RK);
      var t = ri(rng, 2, 60) * pl.p;
      var lo, hi, loW, hiW;
      if (kd.k === 'up') { lo = t - pl.p; hi = t; loW = '초과'; hiW = '이하'; }
      else if (kd.k === 'down') { lo = t; hi = t + pl.p; loW = '이상'; hiW = '미만'; }
      else { lo = t - pl.p / 2; hi = t + pl.p / 2; loW = '이상'; hiW = '미만'; }
      return {
        s: 'inline',
        lines: [
          [kd.w + '하여 ' + pl.w + '의 자리까지 나타내면',
            num(t + jo(korNum(t), '이가')), '되는 자연수의 범위'],
          ['→', BOX, loW, BOX, hiW]
        ],
        ansList: [lo, hi]
      };
    };
  }

  /* ---------- 올림·버림 문장제 ----------
     '적어도' 면 올림, '최대' 면 버림입니다. 두 상황을 한 장에 섞어야
     어느 쪽인지 고르는 연습이 됩니다. */
  var CARRY = [
    { thing: '공책', tu: '권', box: '상자' },
    { thing: '사탕', tu: '개', box: '봉지' },
    { thing: '색종이', tu: '장', box: '묶음' },
    { thing: '구슬', tu: '개', box: '주머니' },
    { thing: '귤', tu: '개', box: '상자' }
  ];

  function roundWord() {
    return function (rng) {
      var up = rng() < 0.5;
      if (rng() < 0.25) {
        if (up) {                            // 버스 (올림)
          var per = pick(rng, [25, 30, 35, 40, 45]);
          var who = tryGen(rng, function (r) { return ri(r, per + 5, per * 6); },
            function (m) { return m % per !== 0; });
          return {
            s: 'word',
            text: '학생 ' + who + '명이 버스를 타려고 합니다. 버스 한 대에 ' + per +
              '명씩 탈 수 있다면 버스는 적어도 몇 대 필요할까요?',
            ans: [{ nw: [BOX, '대'] }],
            ansList: [Math.ceil(who / per)]
          };
        }
        var money = tryGen(rng, function (r) { return ri(r, 1200, 9900); },
          function (m) { return m % 1000 !== 0; });
        return {                             // 지폐로 바꾸기 (버림)
          s: 'word',
          text: '저금통에 ' + money + '원이 들어 있습니다. 이 돈을 1000원짜리 지폐로 ' +
            '바꾼다면 최대 몇 장까지 바꿀 수 있을까요?',
          ans: [{ nw: [BOX, '장'] }],
          ansList: [Math.floor(money / 1000)]
        };
      }
      var c = pick(rng, CARRY);
      var n = pick(rng, [4, 5, 6, 8, 10, 12]);
      var m = tryGen(rng, function (r) { return ri(r, n * 3 + 1, n * 20); },
        function (m) { return m % n !== 0; });   // 딱 나누어떨어지면 올림·버림이 같아집니다
      var head = c.thing + ' ' + m + c.tu + jo(c.tu, '을를') + ' 한 ' + c.box + '에 ' +
        n + c.tu + '씩 담으려고 합니다. ';
      if (up) {
        return {
          s: 'word',
          text: head + c.thing + jo(c.thing, '을를') + ' 모두 담으려면 ' + c.box +
            jo(c.box, '은는') + ' 적어도 몇 ' + c.box + ' 필요할까요?',
          ans: [{ nw: [BOX, c.box] }],
          ansList: [Math.ceil(m / n)]
        };
      }
      return {
        s: 'word',
        text: head + c.tu + '수를 꽉 채운 ' + c.box + jo(c.box, '은는') +
          ' 최대 몇 ' + c.box + '일까요?',
        ans: [{ nw: [BOX, c.box] }],
        ansList: [Math.floor(m / n)]
      };
    };
  }

  global.Gen = {
    fr: fr, fk: fk, num: num, BOX: BOX, node: node,
    vAdd: vAdd, vSub: vSub, vAddSub: vAddSub, vMul: vMul,
    hAdd: hAdd, hSub: hSub, hAddSub: hAddSub, times: times, timesBox: timesBox,
    three: three, threeMakeTen: threeMakeTen,
    split: split, merge: merge, boxFind: boxFind,
    relAddToSub: relAddToSub, relSubToAdd: relSubToAdd,
    makeTenAdd: makeTenAdd, makeTenSub: makeTenSub,
    hDiv: hDiv, hDivR: hDivR, longDiv: longDiv, divCheck: divCheck,
    relMulDiv: relMulDiv, relDivMul: relDivMul,
    mixedCalc: mixedCalc,
    divisorList: divisorList, multipleList: multipleList,
    commonDivisor: commonDivisor, commonMultiple: commonMultiple,
    mixedToImproper: mixedToImproper, improperToMixed: improperToMixed,
    compareSameDen: compareSameDen, compareSameDenEq: compareSameDenEq,
    compareFracEq: compareFracEq, compareFracDecEq: compareFracDecEq, fracAddSame: fracAddSame, fracSubSame: fracSubSame,
    natMinusFrac: natMinusFrac, fracDiffDen: fracDiffDen,
    fracMulGen: fracMulGen, fracMul3: fracMul3, fracDivGen: fracDivGen, fracMulDivMix: fracMulDivMix,
    equivFrac: equivFrac, reduceFrac: reduceFrac, commonDenom: commonDenom,
    compareFrac: compareFrac, fracToDec: fracToDec, decToFrac: decToFrac, compareFracDec: compareFracDec,
    numRange: numRange, roundNum: roundNum, roundBack: roundBack,
    roundWord: roundWord,
    fourBundle: fourBundle, fourSplit: fourSplit, placeSum: placeSum,
    moneyFour: moneyFour, placeValue: placeValue, skipCount: skipCount,
    korNum: korNum,
    decVert: decVert, decHorz: decHorz, decMul: decMul, decMul3: decMul3, decDiv: decDiv, decDivRem: decDivRem,
    fracDecMix: fracDecMix,
    ratioValue: ratioValue, proportionBox: proportionBox,
    simplestRatio: simplestRatio, proportionalShare: proportionalShare,
    clock: clock, clockDraw: clockDraw,
    clockBefore: clockBefore, timeUnit: timeUnit, clockSpan: clockSpan,
    wordTime: wordTime, vUnit: vUnit
  };
})(window);
