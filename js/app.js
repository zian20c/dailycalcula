/* ============================================================
   매일연산 - app.js
   화면 조작: 학년/단원/유형 선택, 새 문제 뽑기, 정답 보기, 인쇄
   ============================================================ */
(function (global) {
  'use strict';
  var Core = global.Core, Cur = global.Curriculum, Render = global.Render;
  var $ = function (id) { return document.getElementById(id); };

  var state = { stepIndex: 0, countIdx: 0, seed: 0, showAns: false };
  var cache = { problems: null, key: '' };

  var LS = 'maeil-yeonsan/last';

  function save() {
    try { localStorage.setItem(LS, JSON.stringify({ i: state.stepIndex, c: state.countIdx })); } catch (e) { }
  }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(LS) || 'null');
      if (v && Cur.byIndex(v.i)) { state.stepIndex = v.i; state.countIdx = v.c || 0; }
    } catch (e) { }
  }

  /* 주소창에 문제지번호를 남깁니다. file:// 로 열었을 때는 막힐 수 있어 감쌉니다. */
  function setHash(code) {
    try {
      if (history.replaceState) history.replaceState(null, '', '#' + code);
      else location.hash = code;
    } catch (e) {
      try { location.hash = code; } catch (e2) { }
    }
  }

  function countOf(step) {
    return Cur.COUNTS[state.countIdx] || step.dc || 24;
  }
  function currentCode() {
    return Core.encodePaperCode(state.stepIndex, state.countIdx, state.seed);
  }

  /* ---------------- 선택 UI 만들기 ---------------- */
  function buildGrades() {
    var box = $('grades');
    if (!box) return;
    box.innerHTML = '';
    for (var g = 1; g <= 6; g++) {
      (function (g) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = g + '학년';
        b.dataset.grade = g;
        b.onclick = function () { selectGrade(g); };
        box.appendChild(b);
      })(g);
    }
  }

  function selectGrade(g) {
    var groups = Cur.gradeKeys(g);
    for (var i = 0; i < groups.length; i++) {
      var chs = groups[i].visibleChapters;
      if (chs.length) { setStep(chs[0].visible[0].index, true); return; }
    }
  }

  function buildChapterSelect(step) {
    var sel = $('sel-chapter');
    sel.innerHTML = '';
    var groups = Cur.gradeKeys(step.grade);
    groups.forEach(function (grp) {
      var og = document.createElement('optgroup');
      og.label = grp.sem + '학기';
      grp.visibleChapters.forEach(function (ch) {
        var o = document.createElement('option');
        o.value = grp.key + '/' + ch.no;
        o.textContent = ch.no + '. ' + ch.title;
        if (grp.key === step.gradeKey && ch.no === step.chapterNo) o.selected = true;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }

  function buildStepSelect(step) {
    var sel = $('sel-step');
    sel.innerHTML = '';
    var grp = Cur.findGroup(step.gradeKey);
    var ch = null;
    grp.chapters.forEach(function (c) { if (c.no === step.chapterNo) ch = c; });
    /* 목록에서 뺀 유형이라도, 지금 보고 있는 것이면 그대로 보여 줍니다 */
    var list = ch.visible.slice();
    if (list.indexOf(step) < 0) list.push(step);
    list.forEach(function (st) {
      var o = document.createElement('option');
      o.value = st.index;
      o.textContent = st.no + ') ' + st.t;
      if (st.index === step.index) o.selected = true;
      sel.appendChild(o);
    });
  }

  /* 한 장을 넘기는 문항 수는 고를 수 없게 막습니다 (왜 막혔는지 함께 보여 줍니다). */
  function buildCountSelect() {
    var step = Cur.byIndex(state.stepIndex);
    var sel = $('sel-count');
    sel.innerHTML = '';
    var okCurrent = false;
    Cur.COUNTS.forEach(function (n, i) {
      if (step.maxCount && n > step.maxCount) return;   // 유형별 문항 수 상한
      var fits = n === 0 || Render.fitsOnePage(step, n);
      var o = document.createElement('option');
      o.value = i;
      o.textContent = (n === 0 ? '문항 수 : 기본 (' + (step.dc || 24) + '문제)' : '문항 수 : ' + n + '문제') +
        (fits ? '' : ' — 1장 초과');
      o.disabled = !fits;
      if (i === state.countIdx && fits) { o.selected = true; okCurrent = true; }
      sel.appendChild(o);
    });
    if (!okCurrent) {                 // 이 유형에서 못 쓰는 문항 수면 기본으로 되돌립니다
      state.countIdx = 0;
      sel.value = 0;
      cache.key = '';
    }
  }

  function syncGradeButtons(step) {
    var box = $('grades');
    Array.prototype.forEach.call(box.children, function (b) {
      b.classList.toggle('on', Number(b.dataset.grade) === step.grade);
    });
  }

  /* ---------------- 상태 변경 ---------------- */
  function setStep(idx, newSeed) {
    state.stepIndex = idx;
    if (newSeed) state.seed = Core.randomSeed();
    cache.key = '';
    save();
    refreshAll();
  }

  function refreshAll() {
    var step = Cur.byIndex(state.stepIndex);
    syncGradeButtons(step);
    buildChapterSelect(step);
    buildStepSelect(step);
    buildCountSelect();
    draw();
  }

  function draw() {
    var step = Cur.byIndex(state.stepIndex);
    var count = countOf(step);
    var key = state.stepIndex + '/' + count + '/' + state.seed;
    if (cache.key !== key) {
      cache.problems = Render.buildProblems(step, count, state.seed);
      cache.key = key;
    }
    var code = currentCode();
    $('paper').innerHTML = Render.fittedPaperHtml({
      step: step, problems: cache.problems, code: code, ansMode: state.showAns
    });
    Render.paintOrder($('paper'));
    var btn = $('btn-ans');
    if (btn) {
      btn.textContent = state.showAns ? '정답 숨기기' : '정답 보기';
      btn.classList.toggle('on', state.showAns);
    }
    var cd = $('codeout');
    if (cd) cd.textContent = code;
    setHash(code);
  }

  /* ---------------- 인쇄 ---------------- */
  function printAs(ansMode) {
    var prev = state.showAns;
    state.showAns = ansMode;
    draw();
    var restore = function () {
      state.showAns = prev;
      draw();
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(function () { window.print(); }, 60);
    setTimeout(restore, 3000);        // afterprint 미지원 브라우저 대비
  }

  /* ---------------- 초기화 (연산문제지 페이지) ---------------- */
  function initCalc() {
    if (!$('paper')) return;
    load();

    var fromHash = null;
    if (location.hash.length > 1) {
      fromHash = Core.decodePaperCode(location.hash.slice(1));
    }
    if (fromHash && Cur.byIndex(fromHash.stepIndex) && fromHash.countIdx < Cur.COUNTS.length) {
      state.stepIndex = fromHash.stepIndex;
      state.countIdx = fromHash.countIdx;
      state.seed = fromHash.seed;
    } else {
      state.seed = Core.randomSeed();
    }

    buildGrades();
    refreshAll();

    $('sel-chapter').onchange = function () {
      var v = this.value.split('/');
      var grp = Cur.findGroup(v[0]);
      var ch = null;
      grp.chapters.forEach(function (c) { if (c.no === Number(v[1])) ch = c; });
      setStep(ch.visible[0].index, true);
    };
    $('sel-step').onchange = function () { setStep(Number(this.value), true); };
    $('sel-count').onchange = function () {
      state.countIdx = Number(this.value);
      cache.key = '';
      save(); draw();
    };
    $('btn-new').onclick = function () {
      state.seed = Core.randomSeed();
      state.showAns = false;
      cache.key = '';
      draw();
      window.scrollTo({ top: $('paper').offsetTop - 70, behavior: 'smooth' });
    };
    $('btn-ans').onclick = function () { state.showAns = !state.showAns; draw(); };
    $('btn-print').onclick = function () { printAs(false); };
    $('btn-print-ans').onclick = function () { printAs(true); };
    $('btn-copy').onclick = function () {
      var code = currentCode();
      var done = function () {
        var b = $('btn-copy'); var old = b.textContent;
        b.textContent = '복사됨 ✓';
        setTimeout(function () { b.textContent = old; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done, function () { window.prompt('문제지번호', code); });
      } else { window.prompt('문제지번호', code); }
    };

    /* 창 크기나 인쇄 배치가 바뀌면 계산 순서 선을 다시 그립니다 */
    var repaintTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(repaintTimer);
      repaintTimer = setTimeout(function () { Render.paintOrder($('paper')); }, 150);
    });
    window.addEventListener('beforeprint', function () { Render.paintOrder($('paper')); });

    window.addEventListener('hashchange', function () {
      var d = Core.decodePaperCode(location.hash.slice(1));
      if (d && Cur.byIndex(d.stepIndex) && d.stepIndex !== state.stepIndex) {
        state.stepIndex = d.stepIndex; state.countIdx = d.countIdx; state.seed = d.seed;
        cache.key = ''; refreshAll();
      }
    });
  }

  /* ---------------- 초기화 (정답지 페이지) ---------------- */
  function initAnswer() {
    var form = $('lookup-form');
    if (!form) return;

    function show(code) {
      var d = Core.decodePaperCode(code);
      var out = $('answer-out'), err = $('lookup-err');
      err.textContent = '';
      out.innerHTML = '';
      if (!d) { err.textContent = '문제지번호 형식이 올바르지 않습니다.'; return; }
      var step = Cur.byIndex(d.stepIndex);
      if (!step || d.countIdx >= Cur.COUNTS.length) {
        err.textContent = '그런 문제지번호는 없습니다. 8자리를 다시 확인해 주세요.';
        return;
      }
      var count = Cur.COUNTS[d.countIdx] || step.dc || 24;
      var problems = Render.buildProblems(step, count, d.seed);
      var canon = Core.encodePaperCode(d.stepIndex, d.countIdx, d.seed);
      out.innerHTML =
        '<div class="actions noprint" style="justify-content:center;margin:0 0 14px">' +
        '<button class="btn primary" id="btn-a-print" type="button">정답지 출력하기</button>' +
        '<a class="btn" href="calc.html#' + canon + '">같은 문제지 다시 보기</a>' +
        '</div>' +
        '<div class="paperbox">' +
        Render.fittedPaperHtml({ step: step, problems: problems, code: canon, ansMode: true }) +
        '</div>';
      Render.paintOrder(out);
      $('btn-a-print').onclick = function () { window.print(); };
      setHash(canon);
    }

    form.onsubmit = function (e) {
      e.preventDefault();
      show($('code-input').value.trim());
    };
    if (location.hash.length > 1) {
      $('code-input').value = location.hash.slice(1).toUpperCase();
      show(location.hash.slice(1));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCalc();
    initAnswer();
  });
})(window);
