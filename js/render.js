/* ============================================================
   매일연산 - render.js
   문제 객체 → HTML. 문제지 / 정답지 공용.
   ============================================================ */
(function (global) {
  'use strict';
  var C = global.Core;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  /* 속성값에 넣을 때는 따옴표까지 막아야 합니다 */
  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }

  /* ---------- 문제 목록 만들기 (같은 시드 → 같은 문제) ---------- */
  function signature(p) {
    return JSON.stringify(p);
  }
  function buildProblems(step, count, seed) {
    var rng = C.makeRng(seed ^ (step.index * 2654435761));
    var out = [], seen = {}, guard = 0;
    while (out.length < count && guard < count * 60) {
      guard++;
      var p = step.m(rng);
      var sg = signature(p);
      if (seen[sg] && guard < count * 30) continue;   // 중복 문제 회피
      seen[sg] = 1;
      out.push(p);
    }
    return out;
  }

  /* ---------- 토큰 렌더 ---------- */
  var OPS = { '+': 1, '-': 1, '×': 1, '÷': 1, '=': 1, ':': 1, '…': 1, '>': 1, '<': 1 };

  function tokenHtml(t, ansMode, ansList, boxRef, last) {
    if (t == null) return '';
    if (typeof t === 'string') {
      if (OPS[t]) return '<i class="op">' + esc(t) + '</i>';
      return '<i class="txt">' + esc(t) + '</i>';
    }
    if (t.box) {
      var v = ansMode ? ansList[boxRef.i] : null;
      boxRef.i++;
      /* 줄 끝에서 답만 쓰는 칸은 테두리를 두르지 않습니다.
         칸보다 크게 쓰는 아이가 많아 오히려 지저분해 보입니다.
         식 안에 있는 □(8 + □ = 15)는 문제의 일부라 그대로 둡니다. */
      /* t.plain: 줄 끝이 아니어도 테두리를 두르지 않습니다 (올림 □ 버림 □ 반올림 □) */
      var cls = 'box' + (t.long ? ' longans' : '') + (t.wide ? ' wide' : '') +
        (last || t.plain ? ' plain' : '');
      if (v == null) return '<i class="' + cls + '"></i>';
      return '<i class="' + cls + ' filled">' + valueHtml(v) + '</i>';
    }
    if (t.nw) {                               // 줄바꿈으로 갈라지면 안 되는 묶음
      return '<i class="nowrap">' + lineHtml(t.nw, ansMode, ansList, boxRef, last) + '</i>';
    }
    if (t.n != null) return '<i class="num">' + esc(t.n) + '</i>';
    if (t.f) return fracHtml(t.f[0], t.f[1], t.f[2]);
    return '';
  }

  function fracHtml(w, n, d) {
    var s = '<i class="fr">';
    if (w) s += '<i class="fw">' + esc(w) + '</i>';
    s += '<i class="fv"><i class="fn">' + esc(n) + '</i><i class="fd">' + esc(d) + '</i></i>';
    return s + '</i>';
  }

  function valueHtml(v) {
    if (v == null) return '';
    if (typeof v === 'object' && v.f) return fracHtml(v.f[0], v.f[1], v.f[2]);
    if (typeof v === 'object' && v.n != null) return '<i class="num">' + esc(v.n) + '</i>';
    return '<i class="num">' + esc(v) + '</i>';
  }

  /* 줄 끝에서 '답만 쓰는' 칸이 어디부터인지 찾습니다.
     뒤에서부터 칸과 연산 기호·쉼표만 나오는 동안이 답 자리입니다.
       129 ÷ 6 = □ … □      → 두 칸 모두 답 자리
       8 + □ = 15           → 뒤에 수가 있으니 식 안의 □
       3 m 40 cm = □ cm     → 뒤에 낱말이 있으니 식 안의 □ */
  function tailPlain(tokens) {
    var from = tokens.length;
    for (var i = tokens.length - 1; i >= 0; i--) {
      var t = tokens[i];
      if (t && t.box) { from = i; continue; }
      if (t && t.nw) {                        // 묶음은 속을 들여다봅니다
        if (tailPlain(t.nw) !== 0) break;
        from = i; continue;
      }
      if (typeof t === 'string' && (OPS[t] || t === ',')) continue;
      break;
    }
    return from;
  }

  function lineHtml(tokens, ansMode, ansList, boxRef, allowPlain) {
    var from = allowPlain ? tailPlain(tokens) : tokens.length;
    var s = '';
    for (var i = 0; i < tokens.length; i++) {
      s += tokenHtml(tokens[i], ansMode, ansList, boxRef, i >= from);
    }
    return s;
  }

  /* ---------- 세로셈 ---------- */
  var PLACE = ['일', '십', '백', '천', '만', '십만', '백만'];

  function splitNumStr(s) {
    s = String(s);
    var i = s.indexOf('.');
    return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
  }
  /* 한 장 안에서 세로셈 칸 수를 맞춥니다.
     답에 받아올림이 생긴 문제만 한 칸 넓어지면 문제마다 수가 시작하는 자리가
     달라져 보기 어렵습니다. 그래서 가장 넓은 문제에 맞춰 앞칸을 비워 둡니다. */
  function vertSize(problems) {
    var maxI = 0, maxF = 0;
    for (var i = 0; i < problems.length; i++) {
      var p = problems[i];
      if (!p || p.s !== 'vert') continue;
      var nums = [String(p.a), String(p.b), String(p.ansList[0])];
      for (var j = 0; j < nums.length; j++) {
        var q = splitNumStr(nums[j]);
        if (q[0].length > maxI) maxI = q[0].length;
        if (q[1].length > maxF) maxF = q[1].length;
      }
    }
    return maxI ? { i: maxI, f: maxF } : null;
  }

  function vertHtml(p, ansMode, example, size) {
    var nums = [String(p.a), String(p.b), String(p.ansList[0])];
    var maxI = 0, maxF = 0;
    nums.forEach(function (n) {
      var q = splitNumStr(n);
      if (q[0].length > maxI) maxI = q[0].length;
      if (q[1].length > maxF) maxF = q[1].length;
    });
    if (size) {                       // 한 장 전체 기준으로 넓혀 줍니다
      if (size.i > maxI) maxI = size.i;
      if (size.f > maxF) maxF = size.f;
    }
    var cols = maxI + (maxF > 0 ? 1 + maxF : 0);

    /* shift: 오른쪽으로 비워 둘 칸 수 (곱셈 부분곱의 자리 밀기) */
    function cells(n, blank, shift) {
      shift = shift || 0;
      var q = splitNumStr(n), body = [], out = [], i;
      for (i = 0; i < q[0].length; i++) body.push(q[0].charAt(i));
      if (maxF > 0) {
        body.push(q[1].length ? '.' : '');
        for (i = 0; i < maxF; i++) body.push(q[1].charAt(i) || '');
      }
      for (i = 0; i < cols - body.length - shift; i++) out.push('');
      out = out.concat(body);
      for (i = 0; i < shift; i++) out.push('');
      return out.map(function (c) {
        return '<i class="vc' + (c === '.' ? ' dot' : '') + '">' + (blank ? '' : esc(c)) + '</i>';
      }).join('');
    }

    /* 부분곱을 쓸 자리를 마련합니다.
       - 두 자리 이상을 곱할 때는 곱하는 수의 자리마다 한 줄 (441 × 23 → 1323, 8820)
       - 한 자리 수를 곱할 때는 곱해지는 수의 자리마다 한 줄 (441 × 2 → 2, 80, 800) */
    var partials = [], k;
    if (p.op === '×' && String(p.a).indexOf('.') < 0) {
      var bs = String(p.b), as = String(p.a);
      if (bs.length >= 2) {
        for (k = 0; k < bs.length; k++) {
          var bd = Number(bs.charAt(bs.length - 1 - k));
          if (bd !== 0) partials.push({ v: p.a * bd, shift: k });
        }
      } else {
        for (k = 0; k < as.length; k++) {
          var ad = Number(as.charAt(as.length - 1 - k));
          if (ad !== 0) partials.push({ v: ad * Math.pow(10, k) * p.b, shift: 0 });
        }
      }
    }

    var s = '<div class="vwrap" style="--vc:' + cols + '">';
    /* 예시 문제에는 자릿값 이름을 붙여 줍니다 */
    if (example && p.op === '×' && maxF === 0) {
      s += '<div class="vplace"><i class="vop"></i>';
      for (var g = 0; g < cols; g++) s += '<i class="vc">' + (PLACE[cols - 1 - g] || '') + '</i>';
      s += '</div>';
    }
    s += '<div class="vert' + (p.op === '×' ? ' guided' : '') + '">';
    /* 자릿값 점선: 칸마다 세로선을 그려 자리를 맞춰 쓰게 합니다 */
    if (p.op === '×') {
      s += '<div class="vguide">';
      for (var v = 0; v < cols; v++) s += '<i></i>';
      s += '</div>';
    }
    s += '<div class="vrow"><i class="vop"></i>' + cells(nums[0]) + '</div>';
    s += '<div class="vrow"><i class="vop">' + esc(p.op) + '</i>' + cells(nums[1]) + '</div>';
    s += '<div class="vbar"></div>';
    if (partials.length >= 2) {
      for (var j = 0; j < partials.length; j++) {
        s += '<div class="vrow vpart' + (ansMode ? ' filled' : '') + '"><i class="vop"></i>' +
          cells(String(partials[j].v), !ansMode, partials[j].shift) + '</div>';
      }
      s += '<div class="vbar"></div>';
    }
    s += '<div class="vrow vans' + (ansMode ? ' filled' : '') + '"><i class="vop"></i>' +
      cells(nums[2], !ansMode) + '</div>';
    return s + '</div></div>';
  }

  /* ---------- 장제법 ----------
     실제 계산 순서대로 칸을 만듭니다.
       몫 상자
       나누는 수 ) 나누어지는 수
       곱한 수 상자 → 가로줄 → (내려쓴 수 상자 → 곱한 수 상자 → 가로줄) …
       마지막 줄에 나머지
     한 단계마다 몫이 한 자리씩 나오므로 상자 수는 몫의 자릿수를 따라갑니다. */
  function ldSteps(dvd, dvs) {
    var s = String(dvd), steps = [], cur = 0, started = false;
    for (var i = 0; i < s.length; i++) {
      cur = cur * 10 + Number(s.charAt(i));
      var qd = Math.floor(cur / dvs);
      if (!started && qd === 0) continue;        // 몫 앞자리의 0은 쓰지 않습니다
      started = true;
      var product = qd * dvs;
      steps.push({ qd: qd, endCol: i, cur: cur, product: product, diff: cur - product });
      cur -= product;
    }
    return steps;
  }

  /* 괄호 곡선. 맨 위 점이 가로선과 같은 높이여서 딱 붙습니다. */
  var LD_PAR = '<svg class="ld-par" viewBox="0 0 13 30" preserveAspectRatio="none">' +
    '<path d="M 1.4 1 C 11 8.5, 11 21.5, 1.4 29" fill="none" stroke="#222" ' +
    'stroke-width="2" stroke-linecap="round"/></svg>';

  function ldHtml(p, ansMode) {
    var ds = String(p.dvd), nd = ds.length;
    var all = ldSteps(p.dvd, p.dvs);
    var q = String(p.ansList[0]), r = p.ansList[1];
    var SP = '<i class="ld-sp"></i><i class="ld-sp"></i>';
    var fill = ansMode ? ' filled' : '';

    /* 맨 끝에서 곱한 수가 0인 단계는 쓰지 않습니다 (90 ÷ 3 처럼 몫이 …0 으로 끝날 때) */
    var steps = all.slice();
    while (steps.length > 1 && steps[steps.length - 1].product === 0) steps.pop();

    /* 값을 제 자리에 놓되, 상자는 그 값이 차지하는 칸만큼만 두릅니다 */
    function row(cls, val, endCol, blank, fullWidth) {
      var v = String(val), vFrom = endCol - v.length + 1;
      var from = fullWidth ? 0 : vFrom;
      var to = fullWidth ? nd - 1 : endCol;
      var out = '<div class="ldrow"><div class="' + cls +
        '" style="grid-column:' + (from + 1) + '/' + (to + 2) + '">';
      for (var i = from; i <= to; i++) {
        var ch = (i >= vFrom && i <= endCol) ? v.charAt(i - vFrom) : '';
        out += '<i class="ldc">' + (blank ? '' : esc(ch)) + '</i>';
      }
      return out + '</div></div>';
    }

    var s = '<div class="ldg" style="--nd:' + nd + '">';
    /* 몫 — 자리마다 칸을 따로 둡니다 */
    s += SP + '<div class="ldrow ldqrow">';
    for (var d = 0; d < q.length; d++) {
      var col = all[all.length - q.length + d].endCol;
      s += '<i class="ldqbox' + fill + '" style="grid-column:' + (col + 1) + '">' +
        (ansMode ? esc(q.charAt(d)) : '') + '</i>';
    }
    s += '</div>';

    s += '<i class="ld-dvs">' + esc(p.dvs) + '</i>' + LD_PAR + '<div class="ldbar">';
    for (var c = 0; c < nd; c++) s += '<i class="ldc">' + esc(ds.charAt(c)) + '</i>';
    s += '</div>';

    for (var i = 0; i < steps.length; i++) {
      s += SP + row('ldw' + fill, steps[i].product, steps[i].endCol, !ansMode);
      s += SP + '<div class="ldrule"></div>';
      if (i < steps.length - 1) {                 // 뺀 나머지에 다음 자리를 내려씁니다
        var nx = steps[i + 1];
        s += SP + row('ldw' + fill, nx.cur, nx.endCol, !ansMode);
      }
    }
    s += SP + row('ldlast' + fill, r, nd - 1, !ansMode, true);
    return s + '</div>';
  }

  /* ---------- 가르기 / 모으기 ---------- */
  function smHtml(p, ansMode) {
    var isSplit = p.s === 'split';
    var link = isSplit
      ? '<svg class="sm-link" viewBox="0 0 120 26" preserveAspectRatio="none"><line x1="60" y1="3" x2="24" y2="23"/><line x1="60" y1="3" x2="96" y2="23"/></svg>'
      : '<svg class="sm-link" viewBox="0 0 120 26" preserveAspectRatio="none"><line x1="24" y1="3" x2="60" y2="23"/><line x1="96" y1="3" x2="60" y2="23"/></svg>';
    var s = '<div class="sm">';
    if (isSplit) {
      s += '<div class="sm-row"><i class="cell">' + esc(p.top) + '</i></div>' + link;
      var l = p.side === 'l' ? esc(p.left) : (ansMode ? esc(p.left) : '');
      var r = p.side === 'l' ? (ansMode ? esc(p.right) : '') : esc(p.right);
      var lc = p.side === 'l' ? 'cell' : 'cell blank' + (ansMode ? ' filled' : '');
      var rc = p.side === 'l' ? 'cell blank' + (ansMode ? ' filled' : '') : 'cell';
      s += '<div class="sm-row two"><i class="' + lc + '">' + l + '</i><i class="' + rc + '">' + r + '</i></div>';
    } else {
      s += '<div class="sm-row two"><i class="cell">' + esc(p.a) + '</i><i class="cell">' + esc(p.b) + '</i></div>' + link;
      s += '<div class="sm-row"><i class="cell blank' + (ansMode ? ' filled' : '') + '">' +
        (ansMode ? esc(p.ansList[0]) : '') + '</i></div>';
    }
    return s + '</div>';
  }

  /* ---------- 시계 ---------- */
  function clockHtml(p, ansMode) {
    var show = !p.draw || ansMode;       // 읽기 문제는 항상 바늘 표시, 그리기 문제는 정답지에서만
    var cx = 50, cy = 50, R = 44;
    var s = '<svg class="clockface' + (p.big ? ' big' : '') + '" viewBox="0 0 100 100">';
    s += '<circle cx="50" cy="50" r="' + R + '" class="cf-rim"/>';
    for (var i = 0; i < 60; i++) {
      var a = i * 6 * Math.PI / 180;
      var big = i % 5 === 0;
      var r1 = big ? R - 6 : R - 3;
      s += '<line class="cf-tick' + (big ? ' big' : '') + '" x1="' + (cx + r1 * Math.sin(a)).toFixed(2) +
        '" y1="' + (cy - r1 * Math.cos(a)).toFixed(2) + '" x2="' + (cx + (R - 1) * Math.sin(a)).toFixed(2) +
        '" y2="' + (cy - (R - 1) * Math.cos(a)).toFixed(2) + '"/>';
    }
    for (var h = 1; h <= 12; h++) {
      var ah = h * 30 * Math.PI / 180, rr = R - 13;
      s += '<text class="cf-num" x="' + (cx + rr * Math.sin(ah)).toFixed(2) +
        '" y="' + (cy - rr * Math.cos(ah) + 3.6).toFixed(2) + '">' + h + '</text>';
    }
    if (show) {
      var ha = ((p.h % 12) * 30 + p.m * 0.5) * Math.PI / 180;
      var ma = (p.m * 6) * Math.PI / 180;
      s += '<line class="cf-hour" x1="50" y1="50" x2="' + (cx + 22 * Math.sin(ha)).toFixed(2) +
        '" y2="' + (cy - 22 * Math.cos(ha)).toFixed(2) + '"/>';
      s += '<line class="cf-min" x1="50" y1="50" x2="' + (cx + 32 * Math.sin(ma)).toFixed(2) +
        '" y2="' + (cy - 32 * Math.cos(ma)).toFixed(2) + '"/>';
    }
    s += '<circle cx="50" cy="50" r="2.6" class="cf-pin"/></svg>';

    if (p.draw) {
      return '<div class="clockwrap"><div class="clocklabel">' + esc(p.label) + '</div>' + s + '</div>';
    }
    return '<div class="clockwrap">' + s +
      '<div class="clockans"><i class="box wide' + (ansMode ? ' filled' : '') + '">' +
      (ansMode ? esc(p.ansList[0]) : '') + '</i></div></div>';
  }

  /* ---------- 혼합 계산의 계산 순서 표시 (예시 문제 전용) ----------
     줄의 높이는 계산 순서가 아니라 "식의 깊이"로 정합니다.
     (14-4) ÷ 2 + 2 × 2 에서 14-4 와 2×2 는 둘 다 수끼리의 계산이라
     같은 높이, 곧 숫자 바로 아래에 붙습니다.
       깊이 = 1 + (피연산자 중 계산 결과인 것의 깊이 최대값)
     수를 가리킬 때는 그 수 바로 밑까지 세로선을 올리고,
     앞 계산의 결과를 가리킬 때는 그 계산 줄의 가운데에서 내려옵니다. */
  function orderDepths(steps) {
    var d = [], max = 1;
    for (var i = 0; i < steps.length; i++) {
      var v = 1;
      if (steps[i].l.s != null) v = Math.max(v, d[steps[i].l.s] + 1);
      if (steps[i].r.s != null) v = Math.max(v, d[steps[i].r.s] + 1);
      d[i] = v;
      if (v > max) max = v;
    }
    return { d: d, max: max };
  }

  function orderHtml(p) {
    var line = p.lines[0], boxRef = { i: 0 };
    var rows = orderDepths(p.order).max;
    var out = '<div class="ordwrap" style="--ordrows:' + rows + '"><div class="ordline">';
    for (var t = 0; t < line.length; t++) {
      out += '<i class="ordtok">' + tokenHtml(line[t], true, p.ansList, boxRef) + '</i>';
    }
    out += '</div><svg class="ordsvg" preserveAspectRatio="none" data-ord="' +
      escAttr(JSON.stringify({ s: p.order, a: line.length - 1 })) + '"></svg></div>';
    return out;
  }

  /* 화면에 올라간 뒤 실제 좌표를 재서 선을 그립니다. */
  function paintOrder(root) {
    if (!root || !root.querySelectorAll) return;
    var svgs = root.querySelectorAll('svg.ordsvg');
    for (var k = 0; k < svgs.length; k++) {
      var svg = svgs[k], wrap = svg.parentNode, data;
      try { data = JSON.parse(svg.getAttribute('data-ord')); } catch (e) { continue; }
      var steps = data.s;
      var toks = wrap.getElementsByClassName('ordtok');
      var wr = wrap.getBoundingClientRect();
      var W = wr.width, H = svg.getBoundingClientRect().height;
      if (!W || !H || !steps.length) continue;

      var dep = orderDepths(steps);
      var rowH = H / (dep.max + 1);
      var TOP = 1.5;                                   // 숫자 바로 아래
      var tokCx = function (i) {
        var r = toks[i].getBoundingClientRect();
        return r.left + r.width / 2 - wr.left;
      };

      /* 각 계산의 가로줄 위치를 먼저 정합니다 */
      var L = [];
      for (var i = 0; i < steps.length; i++) {
        var endX = function (o) { return o.t != null ? tokCx(o.t) : L[o.s].cx; };
        var x1 = endX(steps[i].l), x2 = endX(steps[i].r), y = dep.d[i] * rowH;
        L[i] = { x1: x1, x2: x2, y: y, cx: (x1 + x2) / 2 };
      }

      var path = '';
      for (i = 0; i < steps.length; i++) {
        path += 'M' + L[i].x1 + ' ' + L[i].y + 'L' + L[i].x2 + ' ' + L[i].y;
        var ends = [[steps[i].l, L[i].x1], [steps[i].r, L[i].x2]];
        for (var e = 0; e < 2; e++) {
          var o = ends[e][0], x = ends[e][1];
          if (o.t != null) path += 'M' + x + ' ' + L[i].y + 'L' + x + ' ' + TOP;
          else path += 'M' + x + ' ' + L[o.s].y + 'L' + x + ' ' + L[i].y;
        }
      }

      /* 마지막 계산 → 답 상자로 올라가는 화살표 */
      var rt = L[L.length - 1];
      var ax = tokCx(data.a), yBot = H - 1.2;
      path += 'M' + rt.cx + ' ' + rt.y + 'L' + rt.cx + ' ' + yBot +
        'L' + ax + ' ' + yBot + 'L' + ax + ' ' + TOP;
      var head = 'M' + (ax - 3.4) + ' 6L' + ax + ' ' + TOP + 'L' + (ax + 3.4) + ' 6';

      /* 순서 번호는 줄 아래 칸 가운데에. 흰 원이라 지나가는 선을 가려 줍니다. */
      var rr = Math.min(rowH * 0.40, 8.2), fs = rr * 1.25;
      var marks = '';
      for (i = 0; i < steps.length; i++) {
        var my = L[i].y + rowH / 2;
        marks += '<circle cx="' + L[i].cx + '" cy="' + my + '" r="' + rr +
          '" fill="#fff" stroke="#2f6fd0" stroke-width="1.25"/>' +
          '<text x="' + L[i].cx + '" y="' + my + '" dy="0.36em" text-anchor="middle" ' +
          'font-size="' + fs + '" fill="#2f6fd0" font-weight="700">' + (i + 1) + '</text>';
      }

      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.innerHTML =
        '<path d="' + path + '" fill="none" stroke="#2f6fd0" stroke-width="1.4" ' +
        'stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="' + head + '" fill="none" stroke="#2f6fd0" stroke-width="1.7" ' +
        'stroke-linejoin="round" stroke-linecap="round"/>' + marks;
    }
  }

  /* ---------- 단위가 붙은 세로셈 (3 m 40 cm + 2 m 25 cm) ---------- */
  function vunitHtml(p, ansMode) {
    var n = p.units.length;
    /* 답의 앞자리가 0이면 그 칸은 비웁니다 (0 m 77 cm → 77 cm) */
    function leadZeros(vals) {
      var k = 0;
      while (k < vals.length - 1 && vals[k] === 0) k++;
      return k;
    }
    function row(vals, units, op, cls, blank, skip) {
      var s = '<div class="vurow ' + cls + '"><i class="vuop">' + esc(op || '') + '</i>';
      for (var i = 0; i < n; i++) {
        var off = skip != null && i < skip;
        s += '<i class="vun">' + (blank || off ? '' : esc(vals[i])) + '</i>' +
          '<i class="vuu">' + (off ? '' : esc(units[i])) + '</i>';
      }
      return s + '</div>';
    }
    var s = '<div class="vu" style="--n:' + n + '">';
    s += row(p.a, p.units, '', '');
    s += row(p.b, p.unitsB || p.units, p.op, '');
    s += '<div class="vubar"></div>';
    s += row(p.ansList, p.unitsR || p.units, '', 'vuans' + (ansMode ? ' filled' : ''),
      !ansMode, ansMode ? leadZeros(p.ansList) : 0);
    return s + '</div>';
  }

  /* ---------- 문장제 ---------- */
  function wordHtml(p, ansMode, plain) {
    var boxRef = { i: 0 };
    return '<div class="word"><div class="wq">' + esc(p.text) + '</div>' +
      '<div class="wa"><i class="walabel">답</i>' +
      lineHtml(p.ans, ansMode, p.ansList, boxRef, plain) + '</div></div>';
  }

  /* ---------- 문제 1개 ---------- */
  /* boxed: 안내문이 '□ 안에 …' 라고 말하는 유형은 칸을 □ 모양 그대로 둡니다 */
  function problemHtml(p, idx, ansMode, example, size, boxed) {
    var body = '', mid = false, plain = !boxed;
    if (p.s === 'vert') body = vertHtml(p, ansMode, example, size);
    else if (p.s === 'ld') body = ldHtml(p, ansMode);
    else if (p.s === 'split' || p.s === 'merge') body = smHtml(p, ansMode);
    else if (p.s === 'clock') body = clockHtml(p, ansMode);
    else if (p.s === 'word') body = wordHtml(p, ansMode, plain);
    else if (p.s === 'vunit') body = vunitHtml(p, ansMode);
    else if (example && p.order && p.lines.length === 1) {
      body = orderHtml(p);              // 예시 문제에는 계산 순서를 함께 보여 줍니다
    }
    else {
      var boxRef = { i: 0 };
      var lines = p.lines || [];
      body = '<div class="il">';
      for (var i = 0; i < lines.length; i++) {
        body += '<div class="ilrow">' + lineHtml(lines[i], ansMode, p.ansList, boxRef, plain) + '</div>';
      }
      body += '</div>';
      /* 한 줄짜리 가로셈은 문제 번호를 식의 한가운데에 맞춥니다 */
      if (lines.length === 1 && !p.hint) mid = true;
    }
    var hint = p.hint ? '<div class="phint">' + esc(p.hint) + '</div>' : '';
    return '<div class="prob' + (p.wide ? ' wide' : '') + (mid ? ' mid' : '') +
      (example ? ' example' : '') + '">' +
      '<div class="pno">' + (idx + 1) + '</div>' +
      '<div class="pbody">' + body + hint + '</div></div>';
  }

  /* ---------- 문제지 전체 ---------- */
  /* 유형 이름에서 문제지 안내문을 정합니다. 앞쪽 규칙이 우선입니다. */
  function instruction(step) {
    if (step.inst) return step.inst;          // 유형에 직접 적어 둔 안내문이 우선
    var t = step.t;
    if (/가르기/.test(t)) return '빈 곳에 알맞은 수를 써넣으세요.';
    if (/모으기/.test(t)) return '두 수를 모으면 얼마인지 써넣으세요.';
    if (/시계|시각|몇 시/.test(t)) {
      return /나타내기/.test(t) ? '시계에 시각을 나타내세요.' : '시계를 보고 시각을 쓰세요.';
    }
    if (/혼합/.test(t)) return '계산 순서에 맞게 계산하세요.';
    if (/크기 비교/.test(t)) return '○ 안에 >, <, = 를 알맞게 써넣으세요.';
    if (/통분/.test(t)) return '두 분수를 통분하세요.';
    if (/기약분수|약분/.test(t)) return '기약분수로 나타내세요.';
    if (/검산/.test(t)) return '나눗셈을 하고 검산식을 쓰세요.';
    if (/몫과 나머지|나머지 구하기/.test(t)) return '몫과 나머지를 구하세요.';
    if (/□|관계|크기가 같은 분수/.test(t)) return '□ 안에 알맞은 수를 써넣으세요.';
    if (/분수를 소수로/.test(t)) return '분수를 소수로 나타내세요.';
    if (/소수를 분수로/.test(t)) return '소수를 기약분수로 나타내세요.';
    if (/가분수|대분수를/.test(t) && /나타내기/.test(t)) return '분수를 바꾸어 나타내세요.';
    if (/약수|배수|나타내기|비례배분|비율|백분율/.test(t)) return '다음을 구하세요.';
    if (/나눗셈|나누기/.test(t)) return '나눗셈을 하세요.';
    if (/곱셈|곱/.test(t)) return '곱셈을 하세요.';
    if (/덧셈/.test(t) && /뺄셈/.test(t)) return '계산을 하세요.';
    if (/덧셈/.test(t)) return '덧셈을 하세요.';
    if (/뺄셈/.test(t)) return '뺄셈을 하세요.';
    return '계산을 하세요.';
  }

  function paperHtml(opt) {
    var step = opt.step, problems = opt.problems, ansMode = !!opt.ansMode;
    var cols = opt.cols || step.cols || 4;
    var density = opt.density || 0;
    var s = '';
    s += '<div class="paper' + (ansMode ? ' ansmode' : '') + '">';
    s += '<div class="phead">';
    s += '<div class="ph-left">';
    s += '<div class="ph-site">매일연산</div>';
    s += '<div class="ph-grade">' + step.grade + '학년 ' + step.sem + '학기</div>';
    s += '</div>';
    s += '<div class="ph-mid">';
    s += '<div class="ph-chapter">' + esc(step.chapterNo + '. ' + step.chapterTitle) + '</div>';
    s += '<div class="ph-title">' + esc(step.t) + (ansMode ? ' <span class="ansbadge">정답</span>' : '') + '</div>';
    s += '</div>';
    s += '<div class="ph-right">';
    s += '<div class="ph-code">문제지번호 <b>' + esc(opt.code) + '</b></div>';
    s += '</div></div>';
    /* 안내문 줄 오른쪽 끝에 이름 / 맞은 개수 쓰는 칸 */
    s += '<div class="pinst-row">';
    s += '<div class="pinst">' + esc(instruction(step)) + '</div>';
    s += '<div class="ph-meta">' +
      '<span class="mlabel">이름</span><span class="lineblank"></span>' +
      '<span class="mlabel">맞은 개수</span><span class="lineblank short"></span>' +
      '</div>';
    s += '</div>';
    s += '<div class="grid d' + density + (step.tall ? ' tall' : '') + (step.work ? ' work' : '') +
      (cols === 1 ? ' onecol' : '') + '" style="--cols:' + cols + '">';
    /* 1번은 늘 예시로, 답이 채워진 채 보여 줍니다 */
    var vsize = vertSize(problems);
    var boxed = instruction(step).indexOf('□') >= 0;
    for (var i = 0; i < problems.length; i++) {
      s += problemHtml(problems[i], i, ansMode || i === 0, i === 0, vsize, boxed);
    }
    s += '</div>';
    s += '</div>';
    return s;
  }

  /* ============================================================
     한 장에 맞추기
     문항 수는 절대 바꾸지 않습니다 (바꾸면 문제 내용이 달라져
     문제지번호로 재현이 안 됩니다). 열 수와 밀도만 조절합니다.
     ============================================================ */
  function maxColsFor(step, problems) {
    var base = step.cols || 4;
    if (step.fixedCols) return base;         // 한 줄로 길게 쓰는 유형은 열을 늘리지 않습니다
    var wide = problems.length && problems[0].wide;
    if (wide) return Math.min(base + 1, 3);
    if (step.work || step.tall) return Math.min(base + 2, 6);
    return Math.min(base + 2, 6);
  }

  /* 느슨한 배치부터 차례로: 먼저 열을 늘리고, 그래도 넘치면 밀도를 높입니다 */
  function fitPlans(step, problems) {
    var base = step.cols || 4, max = maxColsFor(step, problems), out = [];
    for (var d = 0; d <= 4; d++) {
      for (var c = base; c <= max; c++) out.push({ cols: c, density: d });
    }
    return out;
  }

  var _meas = null, _pageH = 0;
  function measurer() {
    if (!_meas) {
      _meas = document.createElement('div');
      _meas.className = 'measurer';
      document.body.appendChild(_meas);
    }
    return _meas;
  }
  function pageHeightPx() {                 // A4 세로 297mm - 위아래 여백 10mm씩
    if (_pageH) return _pageH;
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:-10000px;top:0;height:277mm;';
    document.body.appendChild(d);
    _pageH = d.getBoundingClientRect().height;
    d.parentNode.removeChild(d);
    return _pageH;
  }
  function measureHeight(html) {
    return measureFit(html).h;
  }
  /* 높이와 함께 가로 넘침도 봅니다.
     세로셈·장제법은 줄바꿈이 안 되는 덩어리라, 열이 좁으면
     높이는 줄지만 내용이 종이 밖으로 잘려 나갑니다. */
  function measureFit(html) {
    var m = measurer();
    m.innerHTML = html;
    var el = m.querySelector('.paper');
    if (!el) return { h: 0, clipped: false };
    var h = el.getBoundingClientRect().height;
    /* 문제 내용(.pbody)이 자기 칸 안에 온전히 들어가야 합니다.
       .prob 기준으로 보면 좌우 여백까지 침범한 것을 놓칩니다. */
    var clipped = false;
    var bodies = m.querySelectorAll('.pbody');
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i].scrollWidth > bodies[i].clientWidth + 1) { clipped = true; break; }
    }
    return { h: h, clipped: clipped };
  }

  /* 인쇄 기준으로 재어 한 장에 들어가는 첫 배치를 고릅니다. */
  function fittedPaperHtml(opt) {
    if (typeof document === 'undefined') return paperHtml(opt);
    var plans = fitPlans(opt.step, opt.problems), limit = pageHeightPx() * 0.995;
    var html = '';
    for (var i = 0; i < plans.length; i++) {
      html = paperHtml({
        step: opt.step, problems: opt.problems, code: opt.code, ansMode: opt.ansMode,
        cols: plans[i].cols, density: plans[i].density
      });
      var r = measureFit(html);
      if (!r.clipped && r.h <= limit) { measurer().innerHTML = ''; return html; }
    }
    measurer().innerHTML = '';
    return html;                            // 어떤 배치로도 안 되면 가장 빽빽한 것
  }

  /* 이 문항 수가 문제지·정답지 모두 한 장에 들어가는지.
     결과는 유형+문항수 단위로 캐시합니다. */
  var _fitCache = {};
  function fitsOnePage(step, count) {
    if (typeof document === 'undefined') return true;
    var key = step.index + '/' + count;
    if (_fitCache[key] != null) return _fitCache[key];
    var limit = pageHeightPx() * 0.995;
    var problems = buildProblems(step, count, 777);
    var plans = fitPlans(step, problems);
    var ok = false;
    for (var i = 0; i < plans.length && !ok; i++) {
      var both = true;
      for (var m = 0; m < 2 && both; m++) {
        var html = paperHtml({
          step: step, problems: problems, code: 'FITCHECK', ansMode: m === 1,
          cols: plans[i].cols, density: plans[i].density
        });
        var r = measureFit(html);
        if (r.clipped || r.h > limit) both = false;
      }
      ok = both;
    }
    measurer().innerHTML = '';
    _fitCache[key] = ok;
    return ok;
  }

  global.Render = {
    buildProblems: buildProblems,
    fitsOnePage: fitsOnePage,
    paperHtml: paperHtml,
    fittedPaperHtml: fittedPaperHtml,
    paintOrder: paintOrder,
    measureFit: measureFit,
    fitPlans: fitPlans,
    pageHeightPx: pageHeightPx,
    measureHeight: measureHeight,
    problemHtml: problemHtml,
    instruction: instruction
  };
})(window);
