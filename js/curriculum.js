/* ============================================================
   매일연산 - curriculum.js
   초등 1~6학년 연산 유형 트리.
   학년 → 학기 → 단원 → 세부 유형. 각 유형은 생성기 함수를 가집니다.
   ============================================================ */
(function (global) {
  'use strict';
  var C = global.Core, G = global.Gen;
  var N = G.node, ri = C.ri, pick = C.pick;

  /* S(고유번호, 제목, 생성기, 옵션)
     고유번호는 문제지번호에 들어갑니다. 한 번 정한 번호는 바꾸지 마세요.
     새 유형은 Curriculum.nextId 가 알려 주는 번호부터 이어서 쓰면 됩니다. */
  function S(id, title, maker, opt) {
    var s = { id: id, t: title, m: maker };
    if (opt) for (var k in opt) s[k] = opt[k];
    return s;
  }

  /* 혼합계산 템플릿 헬퍼 -------------------------------------- */
  function divisorOf(r, v) {                 // v의 약수 중 2 이상 v 미만
    var ds = C.divisorsOf(v).filter(function (x) { return x > 1 && x < v; });
    return ds.length ? pick(r, ds) : 1;
  }
  var TPL = {
    addSub: [
      function (r) { return N('-', N('+', ri(r, 20, 90), ri(r, 10, 70)), ri(r, 10, 60)); },
      function (r) { return N('+', N('-', ri(r, 50, 99), ri(r, 10, 45)), ri(r, 10, 60)); },
      function (r) { return N('-', N('-', ri(r, 60, 99), ri(r, 10, 30)), ri(r, 5, 30)); }
    ],
    mulDiv: [
      function (r) { var a = ri(r, 2, 15), b = ri(r, 2, 9); return N('÷', N('×', a, b), divisorOf(r, a * b)); },
      function (r) { var b = ri(r, 2, 9), q = ri(r, 2, 15); return N('×', N('÷', b * q, b), ri(r, 2, 9)); }
    ],
    addSubMul: [
      function (r) { return N('+', ri(r, 10, 60), N('×', ri(r, 2, 9), ri(r, 2, 9))); },
      function (r) { return N('-', N('×', ri(r, 3, 12), ri(r, 3, 9)), ri(r, 5, 30)); },
      function (r) { return N('-', ri(r, 60, 120), N('×', ri(r, 2, 7), ri(r, 2, 7))); }
    ],
    addSubDiv: [
      function (r) { var b = ri(r, 2, 9), q = ri(r, 2, 12); return N('+', ri(r, 10, 60), N('÷', b * q, b)); },
      function (r) { var b = ri(r, 2, 9), q = ri(r, 5, 20); return N('-', N('÷', b * q, b), ri(r, 2, 15)); },
      function (r) { var b = ri(r, 2, 9), q = ri(r, 2, 9); return N('-', ri(r, 40, 90), N('÷', b * q, b)); }
    ],
    four: [
      function (r) {
        var b = ri(r, 2, 9), q = ri(r, 2, 9);
        return N('-', N('+', ri(r, 10, 40), N('×', ri(r, 2, 9), ri(r, 2, 8))), N('÷', b * q, b));
      },
      function (r) {
        var b = ri(r, 2, 9), q = ri(r, 3, 12);
        return N('+', N('÷', b * q, b), N('-', N('×', ri(r, 2, 9), ri(r, 2, 8)), ri(r, 3, 20)));
      }
    ],
    parenAddSub: [
      function (r) { return N('-', ri(r, 60, 120), N('+', ri(r, 10, 30), ri(r, 10, 30))); },
      function (r) { return N('-', ri(r, 70, 130), N('-', ri(r, 30, 60), ri(r, 5, 25))); },
      function (r) { return N('+', ri(r, 20, 60), N('-', ri(r, 40, 90), ri(r, 10, 35))); }
    ],
    parenMulDiv: [
      function (r) { var b = ri(r, 2, 6), c = ri(r, 2, 6); return N('÷', ri(r, 2, 9) * b * c, N('×', b, c)); },
      function (r) { var b = ri(r, 2, 9), q = ri(r, 2, 6); return N('×', ri(r, 2, 9), N('÷', b * q, b)); }
    ],
    parenAddSubMul: [
      function (r) { return N('×', N('+', ri(r, 5, 25), ri(r, 5, 25)), ri(r, 2, 9)); },
      function (r) { return N('×', ri(r, 2, 9), N('-', ri(r, 20, 60), ri(r, 5, 18))); },
      function (r) { return N('-', ri(r, 80, 200), N('×', N('+', ri(r, 2, 9), ri(r, 2, 9)), ri(r, 2, 7))); }
    ],
    parenAddSubDiv: [
      function (r) { var b = ri(r, 2, 9); return N('÷', N('+', ri(r, 2, 9) * b, ri(r, 1, 9) * b), b); },
      function (r) { var d = ri(r, 2, 9), q = ri(r, 2, 9), y = ri(r, 1, 20); return N('+', ri(r, 10, 60), N('÷', N('-', d * q + y, y), d)); },
      function (r) { var b = ri(r, 2, 9); return N('÷', N('-', ri(r, 6, 15) * b, ri(r, 1, 5) * b), b); }
    ],
    parenFour: [
      function (r) { var b = ri(r, 2, 9); return N('-', N('×', N('+', ri(r, 3, 12), ri(r, 3, 12)), ri(r, 2, 6)), N('÷', ri(r, 2, 9) * b, b)); },
      function (r) { var b = ri(r, 2, 6); return N('+', N('÷', N('-', ri(r, 6, 15) * b, ri(r, 1, 4) * b), b), N('×', ri(r, 2, 9), ri(r, 2, 8))); }
    ],
    brace: [
      function (r) { var b = ri(r, 2, 6); return N('÷', N('×', ri(r, 2, 8), N('+', ri(r, 2, 9), N('-', ri(r, 10, 20), ri(r, 2, 9)))), b * 1); },
      function (r) { return N('×', ri(r, 2, 8), N('+', ri(r, 5, 20), N('-', ri(r, 20, 40), ri(r, 5, 18)))); },
      function (r) { var b = ri(r, 2, 6); return N('÷', N('+', ri(r, 2, 9) * b, N('×', N('-', ri(r, 6, 15), ri(r, 1, 5)), b)), b); }
    ]
  };

  /* ============================================================
     교육과정 트리
     ============================================================ */
  var CURRICULUM = [
    /* ---------------- 1학년 1학기 ---------------- */
    {
      key: '11', grade: 1, sem: 1, chapters: [
        {
          no: 3, title: '덧셈과 뺄셈', steps: [
            S(0, '두 수로 가르기 (한 자리 수)', G.split({ min: 3, max: 9 }), { cols: 5, dc: 30 }),
            S(1, '두 수를 모으기 (한 자리 수)', G.merge({ min: 3, max: 9 }), { cols: 5, dc: 30 }),
            S(2, '몇 + 몇 (합이 9 이하)', G.hAdd({ a: [1, 8], b: [1, 8], maxSum: 9 }), { cols: 3 }),
            S(3, '몇 - 몇 (차가 9 이하)', G.hSub({ a: [2, 9], b: [1, 8], minDiff: 1 }), { cols: 3 }),
            S(4, '덧셈과 뺄셈의 관계 (한 자리 수)', G.relAddToSub({ a: [1, 5], b: [1, 4] }), { cols: 3, dc: 18 }),
            S(5, '뺄셈과 덧셈의 관계 (한 자리 수)', G.relSubToAdd({ a: [4, 9], b: [1, 5] }), { cols: 3, dc: 18 }),
            S(6, '한 자리 수 덧셈·뺄셈에서 □ 찾기', G.boxFind({ a: [1, 5], b: [1, 4], maxSum: 9 }), { cols: 3 })
          ]
        }
      ]
    },
    /* ---------------- 1학년 2학기 ---------------- */
    {
      key: '12', grade: 1, sem: 2, chapters: [
        {
          no: 2, title: '덧셈과 뺄셈(1)', steps: [
            S(7, '몇십 + 몇 (받아올림 없음)', G.vAdd({ a: { form: 'tens' }, b: [1, 9], carries: 0 })),
            S(8, '몇십몇 + 몇 (받아올림 없음)', G.vAdd({ a: { d: 2 }, b: [1, 9], carries: 0 })),
            S(9, '몇십 + 몇십 (받아올림 없음)', G.vAdd({ a: { form: 'tens' }, b: { form: 'tens' }, carries: 0 })),
            S(10, '몇십몇 + 몇십몇 (받아올림 없음)', G.vAdd({ a: { d: 2 }, b: { d: 2 }, carries: 0 })),
            S(11, '몇십 - 몇십', G.vSub({ a: { form: 'tens' }, b: { form: 'tens' }, borrows: 0 })),
            S(12, '몇십몇 - 몇 (받아내림 없음)', G.vSub({ a: { d: 2 }, b: [1, 9], borrows: 0 })),
            S(13, '몇십몇 - 몇십몇 (받아내림 없음)', G.vSub({ a: { d: 2 }, b: { d: 2 }, borrows: 0 })),
            S(14, '두 자리 수 덧셈과 뺄셈의 관계', G.relAddToSub({ a: { d: 2, max: 50 }, b: { d: 2, max: 40 } }), { cols: 3, dc: 18 })
          ]
        },
        {
          no: 4, title: '덧셈과 뺄셈(2)', steps: [
            S(15, '몇 + 몇 + 몇 (합이 9 이하)', G.three({ a: [1, 5], b: [1, 4], c: [1, 4], ops: ['++'], max: 9 }), { cols: 3 }),
            S(16, '몇 - 몇 - 몇', G.three({ a: [5, 9], b: [1, 4], c: [1, 3], ops: ['--'], min: 0 }), { cols: 3 }),
            S(17, '몇 + 몇 - 몇 / 몇 - 몇 + 몇', G.three({ a: [2, 9], b: [1, 5], c: [1, 5], ops: ['+-', '-+'], max: 9, min: 0 }), { cols: 3 }),
            S(18, '10을 두 수로 가르기', G.split({ fixed: 10 }), { cols: 5, dc: 30 }),
            S(19, '10이 되도록 두 수를 모으기', G.merge({ fixed: 10 }), { cols: 5, dc: 30 }),
            S(20, '10이 되는 더하기', G.makeTenAdd(), { cols: 3 }),
            S(21, '10에서 빼기', G.makeTenSub(), { cols: 3 }),
            S(22, '두 수의 합이 10이 되는 세 수의 덧셈', G.threeMakeTen(), { cols: 3 })
          ]
        },
        {
          no: 5, title: '시계 보기', steps: [
            S(23, '몇 시 읽기', G.clock('oclock'), { cols: 4, dc: 20, tall: true }),
            S(24, '몇 시 30분 읽기', G.clock('half'), { cols: 4, dc: 20, tall: true }),
            S(25, '몇 시 / 몇 시 30분 읽기', G.clock('both'), { cols: 4, dc: 20, tall: true }),
            S(26, '시각을 시계에 나타내기', G.clockDraw('both'), { cols: 4, dc: 20, tall: true })
          ]
        },
        {
          no: 6, title: '덧셈과 뺄셈(3)', steps: [
            S(27, '몇 + 몇 (받아올림 있음)', G.hAdd({ a: [2, 9], b: [2, 9], carries: 1 }), { cols: 3 }),
            S(28, '몇 + 몇 + 몇 (받아올림 있음)', G.three({ a: [2, 9], b: [2, 9], c: [2, 9], ops: ['++'], minMid: 10 }), { cols: 3 }),
            S(29, '십몇 - 몇 (받아내림 있음)', G.hSub({ a: [11, 18], b: [2, 9], borrows: 1 }), { cols: 3 }),
            S(30, '십몇 - 몇 - 몇', G.three({ a: [12, 18], b: [3, 9], c: [1, 5], ops: ['--'], min: 1 }), { cols: 3 }),
            S(31, '몇 + 몇 / 십몇 - 몇 (섞어서)', G.hAddSub({ a: [2, 9], b: [2, 9], carries: 1 }, { a: [11, 18], b: [2, 9], borrows: 1 }), { cols: 3 })
          ]
        }
      ]
    },
    /* ---------------- 2학년 1학기 ---------------- */
    {
      key: '21', grade: 2, sem: 1, chapters: [
        {
          no: 3, title: '덧셈과 뺄셈', steps: [
            S(32, '몇십몇 + 몇 (받아올림 있음)', G.vAdd({ a: { d: 2 }, b: [2, 9], carries: 1 })),
            S(33, '몇십몇 + 몇십몇 (받아올림 1번)', G.vAdd({ a: { d: 2 }, b: { d: 2 }, carries: 1 })),
            S(34, '몇십몇 + 몇십몇 (받아올림 2번)', G.vAdd({ a: { d: 2 }, b: { d: 2 }, carries: 2 })),
            S(35, '몇십몇 - 몇 (받아내림 있음)', G.vSub({ a: { d: 2 }, b: [2, 9], borrows: 1 })),
            S(36, '몇십몇 - 몇십몇 (받아내림 1번)', G.vSub({ a: { d: 2 }, b: { d: 2 }, borrows: 1 })),
            S(37, '몇십몇 ± 몇 (받아올림/내림 있음)', G.vAddSub({ a: { d: 2 }, b: [2, 9], carries: 1 }, { a: { d: 2 }, b: [2, 9], borrows: 1 })),
            S(38, '몇십몇 ± 몇십몇', G.vAddSub({ a: { d: 2 }, b: { d: 2 } }, { a: { d: 2 }, b: { d: 2 } })),
            S(39, '몇십몇 + 몇 + 몇 (받아올림 있음)', G.three({ a: { d: 2, max: 79 }, b: [2, 9], c: [2, 9], ops: ['++'], max: 99 }), { cols: 3 }),
            S(40, '몇십몇 - 몇 - 몇 (받아내림 있음)', G.three({ a: { d: 2, min: 30 }, b: [3, 9], c: [3, 9], ops: ['--'], min: 1 }), { cols: 3 }),
            S(41, '몇십몇 ± 몇 ± 몇', G.three({ a: { d: 2 }, b: [2, 9], c: [2, 9], ops: ['++', '--', '+-', '-+'], max: 99, min: 1 }), { cols: 3 }),
            S(42, '몇십몇 ± 몇십몇 ± 몇십몇', G.three({ a: { d: 2 }, b: { d: 2 }, c: { d: 2 }, ops: ['++', '+-', '-+'], max: 199, min: 1 }), { cols: 2, dc: 22 })
          ]
        }
      ]
    },
    /* ---------------- 2학년 2학기 ---------------- */
    {
      key: '22', grade: 2, sem: 2, chapters: [
        {
          no: 1, title: '네 자리 수', steps: [
            S(216, '네 자리 수 알아보기', G.fourBundle(),
              { cols: 2, dc: 16, inst: '□ 안에 수를 쓰고, 읽기도 써 보세요.' }),
            /* 한 문제가 한 줄에 들어가야 읽기 좋아서 1단으로 두고, 열을 늘리지 않습니다 */
            S(217, '네 자리 수를 묶음으로 가르기', G.fourSplit(),
              { cols: 1, fixedCols: true, dc: 12, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            S(218, '자릿값 덧셈식', G.placeSum(),
              { cols: 2, dc: 24, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            S(219, '돈으로 네 자리 수 만들기', G.moneyFour(),
              { cols: 2, dc: 12, inst: '문제를 읽고 답을 구하세요.' }),
            S(220, '자릿값이 나타내는 값', G.placeValue(),
              { cols: 1, fixedCols: true, dc: 12, inst: '다음을 구하세요.' }),
            S(221, '뛰어 세기', G.skipCount(),
              { cols: 1, fixedCols: true, dc: 12,
                inst: '뛰어 세는 규칙을 찾아 □ 안에 알맞은 수를 써넣으세요.' })
          ]
        },
        {
          no: 2, title: '곱셈구구', steps: [
            S(43, '2, 5의 단 곱셈구구', G.times([2, 5]), { cols: 4, dc: 30 }),
            S(44, '3, 4의 단 곱셈구구', G.times([3, 4]), { cols: 4, dc: 30 }),
            S(45, '6, 7의 단 곱셈구구', G.times([6, 7]), { cols: 4, dc: 30 }),
            S(46, '8, 9의 단 곱셈구구', G.times([8, 9]), { cols: 4, dc: 30 }),
            S(47, '1의 단, 0의 단 포함 곱셈구구', G.times([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], { min: 0 }), { cols: 4, dc: 30 }),
            S(48, '곱셈구구 (2~9단 전체)', G.times([2, 3, 4, 5, 6, 7, 8, 9]), { cols: 4, dc: 30 }),
            S(49, '곱셈구구에서 □ 안의 수 찾기', G.timesBox([2, 3, 4, 5, 6, 7, 8, 9]), { cols: 3 })
          ]
        },
        {
          no: 3, title: '길이 재기', steps: [
            S(207, '1 m = 100 cm', G.timeUnit('mcm'),
              { cols: 2, fixedCols: true, dc: 15, maxCount: 16, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            /* 2학년은 받아올림·받아내림이 없는 계산까지만 다룹니다.
               100 cm 를 넘어가는 계산은 3학년 1학기 '길이와 시간' 에 있습니다. */
            S(208, '길이의 합 (m, cm)', G.vUnit({
              op: '+', units: ['m', 'cm'], bases: [100], ranges: [[1, 20], [0, 99]], carries: 0
            }), { cols: 4, dc: 24 }),
            S(209, '길이의 차 (m, cm)', G.vUnit({
              op: '-', units: ['m', 'cm'], bases: [100], ranges: [[1, 20], [0, 99]], borrows: 0
            }), { cols: 4, dc: 24 }),
            S(210, '길이의 합과 차 (m, cm)', G.vUnit({
              op: ['+', '-'], units: ['m', 'cm'], bases: [100], ranges: [[1, 20], [0, 99]],
              carries: 0, borrows: 0
            }), { cols: 4, dc: 24 })
          ]
        },
        {
          no: 4, title: '시각과 시간', steps: [
            S(182, '몇 시 몇 분 읽기 (5분 단위)', G.clock('m5'), { cols: 4, dc: 20, tall: true }),
            S(183, '몇 시 몇 분 읽기 (1분 단위)', G.clock('m1'), { cols: 4, dc: 20, tall: true }),
            S(184, '시각을 시계에 나타내기 (5분 단위)', G.clockDraw('m5'), { cols: 4, dc: 20, tall: true }),
            S(185, '몇 시 몇 분 전으로 읽기', G.clockBefore(),
              { cols: 2, dc: 20, inst: '몇 시 몇 분 전으로 나타내세요.' }),
            S(186, '시간과 분 (1시간 = 60분)', G.timeUnit('hm'),
              { cols: 2, fixedCols: true, dc: 24, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            /* 시간의 덧셈·뺄셈(걸린 시간)은 3학년 1학기 '길이와 시간' 내용이라
               2학년 목록에서는 뺐습니다. 번호 자리는 남겨 둡니다. */
            S(187, '걸린 시간 구하기', G.clockSpan('elapsed'),
              { cols: 2, dc: 20, inst: '걸린 시간을 구하세요.', retired: true }),
            S(188, '끝난 시각 구하기', G.clockSpan('after'),
              { cols: 2, dc: 20, inst: '끝난 시각을 구하세요.', retired: true }),
            /* 단위 관계만 익히면 되는 유형이라 문항 수를 적게 둡니다 */
            S(189, '하루의 시간 (1일 = 24시간)', G.timeUnit('dh'),
              { cols: 2, fixedCols: true, dc: 15, maxCount: 16, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            S(190, '1주일 = 7일', G.timeUnit('wd'),
              { cols: 2, fixedCols: true, dc: 15, maxCount: 16, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            S(191, '1년 = 12개월', G.timeUnit('ym'),
              { cols: 2, fixedCols: true, dc: 15, maxCount: 16, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            S(192, '걸린 시간 구하기 (문장제)', G.wordTime('elapsed'),
              { cols: 2, dc: 12, inst: '문제를 읽고 답을 구하세요.' }),
            S(193, '끝난 시각 구하기 (문장제)', G.wordTime('end'),
              { cols: 2, dc: 12, inst: '문제를 읽고 답을 구하세요.' }),
            S(194, '시작한 시각 구하기 (문장제)', G.wordTime('start'),
              { cols: 2, dc: 12, inst: '문제를 읽고 답을 구하세요.' })
          ]
        }
      ]
    },
    /* ---------------- 3학년 1학기 ---------------- */
    {
      key: '31', grade: 3, sem: 1, chapters: [
        {
          no: 1, title: '덧셈과 뺄셈', steps: [
            S(50, '몇백 / 몇백몇십의 덧셈 (받아올림 없음)', G.vAdd({ a: { form: 'ht' }, b: { form: 'ht' }, carries: 0 })),
            S(51, '세 자리 수의 덧셈 (받아올림 없음)', G.vAdd({ a: { d: 3 }, b: { d: 3 }, carries: 0 })),
            S(52, '세 자리 수의 덧셈 (받아올림 1번)', G.vAdd({ a: { d: 3 }, b: { d: 3 }, carries: 1 })),
            S(53, '세 자리 수의 덧셈 (받아올림 2번)', G.vAdd({ a: { d: 3 }, b: { d: 3 }, carries: 2 })),
            S(54, '세 자리 수의 덧셈 (받아올림 3번)', G.vAdd({ a: { d: 3 }, b: { d: 3 }, carries: 3 })),
            S(55, '네 자리 수 + 세 자리 수', G.vAdd({ a: { d: 4 }, b: { d: 3 } })),
            S(56, '네 자리 수 + 네 자리 수', G.vAdd({ a: { d: 4 }, b: { d: 4 } })),
            S(57, '몇백 / 몇백몇십의 뺄셈 (받아내림 없음)', G.vSub({ a: { form: 'ht' }, b: { form: 'ht' }, borrows: 0 })),
            S(58, '세 자리 수의 뺄셈 (받아내림 없음)', G.vSub({ a: { d: 3 }, b: { d: 3 }, borrows: 0 })),
            S(59, '세 자리 수의 뺄셈 (받아내림 1번)', G.vSub({ a: { d: 3 }, b: { d: 3 }, borrows: 1 })),
            S(60, '세 자리 수의 뺄셈 (받아내림 2번)', G.vSub({ a: { d: 3 }, b: { d: 3 }, borrows: 2 })),
            S(61, '네 자리 수 - 세 자리 수', G.vSub({ a: { d: 4 }, b: { d: 3 } })),
            S(62, '네 자리 수 - 네 자리 수', G.vSub({ a: { d: 4 }, b: { d: 4 } })),
            S(63, '세 자리 수 ± 세 자리 수', G.vAddSub({ a: { d: 3 }, b: { d: 3 } })),
            S(64, '네 자리 수 ± 네 자리 수', G.vAddSub({ a: { d: 4 }, b: { d: 4 } })),
            S(65, '세 수의 덧셈·뺄셈 (세 자리 수)', G.three({ a: { d: 3 }, b: { d: 3 }, c: { d: 3 }, ops: ['++', '+-', '-+'], min: 1 }), { cols: 2, dc: 22 }),
            S(66, '세 수의 덧셈·뺄셈 (네 자리 수)', G.three({ a: { d: 4 }, b: { d: 4 }, c: { d: 4 }, ops: ['++', '+-', '-+'], min: 1 }), { cols: 2, dc: 22 })
          ]
        },
        {
          no: 3, title: '나눗셈', steps: [
            S(67, '나눗셈의 기초', G.hDiv({ b: [2, 5], q: [2, 5] }), { cols: 3 }),
            S(68, '곱셈과 나눗셈의 관계', G.relMulDiv(), { cols: 3, dc: 18 }),
            S(69, '나눗셈과 곱셈의 관계', G.relDivMul(), { cols: 3, dc: 18 }),
            S(70, '곱셈구구 내에서의 나눗셈', G.hDiv({ b: [2, 9], q: [2, 9] }), { cols: 3, dc: 30 })
          ]
        },
        {
          no: 4, title: '곱셈', steps: [
            S(71, '몇십 × 몇', G.vMul({ a: { form: 'tens' }, b: [2, 9] })),
            S(72, '몇십몇 × 몇 (올림 없음)', G.vMul({ a: { d: 2 }, b: [2, 9], carries: 0 })),
            S(73, '몇십몇 × 몇 (일의 자리에서 올림)', G.vMul({ a: { d: 2 }, b: [2, 9], onesCarry: true, tensCarry: false })),
            S(74, '몇십몇 × 몇 (십의 자리에서 올림)', G.vMul({ a: { d: 2 }, b: [2, 9], onesCarry: false, tensCarry: true })),
            S(75, '몇십몇 × 몇 (올림 2번)', G.vMul({ a: { d: 2 }, b: [2, 9], onesCarry: true, tensCarry: true })),
            S(76, '몇십몇 × 몇 (종합)', G.vMul({ a: { d: 2 }, b: [2, 9] }))
          ]
        },
        {
          no: 5, title: '길이와 시간', steps: [
            S(195, '길이 단위 바꾸기 (mm, cm, m)', G.timeUnit(['cmm', 'mcm']),
              { cols: 2, fixedCols: true, dc: 18, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            S(196, '1 km = 1000 m', G.timeUnit('kmm'),
              { cols: 2, fixedCols: true, dc: 15, maxCount: 16, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            S(197, '1분 = 60초', G.timeUnit('ms'),
              { cols: 2, fixedCols: true, dc: 15, maxCount: 16, inst: '□ 안에 알맞은 수를 써넣으세요.' }),
            S(198, '길이의 덧셈 (받아올림 없음)', G.vUnit({
              op: '+', units: ['m', 'cm'], bases: [100], ranges: [[1, 8], [0, 49]], carries: 0
            }), { cols: 4, dc: 24 }),
            S(199, '길이의 덧셈 (받아올림 있음)', G.vUnit({
              op: '+', units: ['m', 'cm'], bases: [100], ranges: [[1, 8], [10, 99]], carries: 1
            }), { cols: 4, dc: 24 }),
            S(200, '길이의 뺄셈 (받아내림 없음)', G.vUnit({
              op: '-', units: ['m', 'cm'], bases: [100], ranges: [[1, 9], [0, 99]], borrows: 0
            }), { cols: 4, dc: 24 }),
            S(201, '길이의 뺄셈 (받아내림 있음)', G.vUnit({
              op: '-', units: ['m', 'cm'], bases: [100], ranges: [[1, 9], [0, 99]], borrows: 1
            }), { cols: 4, dc: 24 }),
            S(202, '길이의 덧셈 (km, m)', G.vUnit({
              op: '+', units: ['km', 'm'], bases: [1000], ranges: [[1, 8], [0, 999]]
            }), { cols: 4, dc: 24 }),
            /* 분·초만 따로 다루는 유형은 목록에서 뺐습니다.
               시·분·초를 한꺼번에 하는 아래 유형으로 충분합니다. 번호 자리는 남겨 둡니다. */
            S(203, '시간의 덧셈 (분, 초)', G.vUnit({
              op: '+', units: ['분', '초'], bases: [60], ranges: [[1, 30], [0, 59]]
            }), { cols: 4, dc: 24, retired: true }),
            S(204, '시간의 뺄셈 (분, 초)', G.vUnit({
              op: '-', units: ['분', '초'], bases: [60], ranges: [[1, 45], [0, 59]]
            }), { cols: 4, dc: 24, retired: true }),
            S(205, '시간의 덧셈 (시간, 분, 초)', G.vUnit({
              op: '+', units: ['시간', '분', '초'], bases: [60, 60],
              ranges: [[1, 4], [0, 59], [0, 59]]
            }), { cols: 3, dc: 18 }),
            S(206, '시간의 뺄셈 (시간, 분, 초)', G.vUnit({
              op: '-', units: ['시간', '분', '초'], bases: [60, 60],
              ranges: [[1, 9], [0, 59], [0, 59]]
            }), { cols: 3, dc: 18 })
          ]
        }
      ]
    },
    /* ---------------- 3학년 2학기 ---------------- */
    {
      key: '32', grade: 3, sem: 2, chapters: [
        {
          no: 1, title: '곱셈', steps: [
            S(77, '세 자리 수 × 한 자리 수 (올림 없음)', G.vMul({ a: { d: 3 }, b: [2, 9], carries: 0 })),
            S(78, '세 자리 수 × 한 자리 수 (올림 있음)', G.vMul({ a: { d: 3 }, b: [2, 9] })),
            S(79, '몇십 × 몇십', G.vMul({ a: { form: 'tens' }, b: { form: 'tens' } })),
            S(80, '두 자리 수 × 몇십', G.vMul({ a: { d: 2 }, b: { form: 'tens' } })),
            S(81, '두 자리 수 × 두 자리 수', G.vMul({ a: { d: 2 }, b: { d: 2 } }), { dc: 20 })
          ]
        },
        {
          no: 2, title: '나눗셈', steps: [
            S(82, '몇십 ÷ 몇 (내림·나머지 없음)', G.longDiv({ b: [2, 9], q: { form: 'tens', max: 4 }, rem: false, carryDown: false }), { cols: 4, dc: 16, work: true }),
            S(83, '몇십몇 ÷ 몇 (내림·나머지 없음)', G.longDiv({ b: [2, 9], q: [11, 49], rem: false, carryDown: false, aDigits: 2 }), { cols: 4, dc: 16, work: true }),
            S(84, '몇십몇 ÷ 몇 (내림 있음, 나머지 없음)', G.longDiv({ b: [2, 9], q: [11, 49], rem: false, carryDown: true, aDigits: 2 }), { cols: 4, dc: 16, work: true }),
            S(85, '몇십몇 ÷ 몇 (내림·나머지 있음)', G.longDiv({ b: [3, 9], q: [11, 33], rem: true, carryDown: true, aDigits: 2 }), { cols: 4, dc: 16, work: true }),
            S(86, '세 자리 수 ÷ 한 자리 수', G.longDiv({ b: [3, 9], q: [30, 300], rem: true, aDigits: 3 }), { cols: 4, dc: 16, work: true }),
            S(87, '나눗셈의 몫과 나머지', G.hDivR({ b: [2, 9], q: [2, 30], forceRem: true }), { cols: 2, fixedCols: true, dc: 24 }),
            S(88, '나눗셈의 검산', G.divCheck(), { cols: 2, dc: 16 })
          ]
        },
        {
          no: 4, title: '분수', steps: [
            S(89, '대분수를 가분수로 나타내기', G.mixedToImproper(), { cols: 4, dc: 32 }),
            S(90, '가분수를 대분수로 나타내기', G.improperToMixed(), { cols: 4, dc: 32 }),
            /* 91번은 답이 늘 > 아니면 < 였습니다. '=' 도 나오는 213번으로 바꿨습니다.
               번호 자리는 남겨 두어 예전 문제지의 정답 조회가 그대로 됩니다. */
            S(91, '분모가 같은 분수의 크기 비교', G.compareSameDen(), { cols: 4, dc: 32, retired: true }),
            S(213, '분모가 같은 분수의 크기 비교', G.compareSameDenEq(), { cols: 4, dc: 32 })
          ]
        }
      ]
    },
    /* ---------------- 4학년 1학기 ---------------- */
    {
      key: '41', grade: 4, sem: 1, chapters: [
        {
          no: 3, title: '곱셈과 나눗셈', steps: [
            S(92, '몇백 / 몇천의 곱', G.vMul({ a: { form: 'hundreds' }, b: { form: 'tens' } })),
            S(93, '두 자리 수 × 몇백', G.vMul({ a: { d: 2 }, b: { form: 'hundreds' } })),
            S(94, '세 자리 수 × 두 자리 수', G.vMul({ a: { d: 3 }, b: { d: 2 } }), { dc: 20 }),
            S(95, '네 자리 수 × 두 자리 수', G.vMul({ a: { d: 4 }, b: { d: 2 } }), { dc: 20 }),
            S(96, '몇십으로 나누기 (나머지 없음)', G.longDiv({ b: { form: 'tens' }, q: [2, 9], rem: false }), { cols: 4, dc: 24, work: true }),
            S(97, '몇십으로 나누기 (나머지 있음)', G.longDiv({ b: { form: 'tens' }, q: [2, 9], rem: true }), { cols: 4, dc: 24, work: true }),
            S(98, '두 자리 수 ÷ 두 자리 수 (나머지 없음)', G.longDiv({ b: [11, 49], q: [2, 8], rem: false, aDigits: 2 }), { cols: 4, dc: 24, work: true }),
            S(99, '두 자리 수 ÷ 두 자리 수 (나머지 있음)', G.longDiv({ b: [11, 45], q: [2, 8], rem: true, aDigits: 2 }), { cols: 4, dc: 24, work: true }),
            S(100, '세 자리 수 ÷ 두 자리 수 (몫이 한 자리)', G.longDiv({ b: [12, 99], q: [2, 9], rem: true, aDigits: 3, qDigits: 1 }), { cols: 4, dc: 24, work: true }),
            S(101, '세 자리 수 ÷ 두 자리 수 (몫이 두 자리)', G.longDiv({ b: [12, 45], q: [10, 60], rem: true, aDigits: 3, qDigits: 2 }), { cols: 4, dc: 16, work: true })
          ]
        }
      ]
    },
    /* ---------------- 4학년 2학기 ---------------- */
    {
      key: '42', grade: 4, sem: 2, chapters: [
        {
          no: 1, title: '분수의 덧셈과 뺄셈', steps: [
            S(102, '분모가 같은 진분수의 덧셈 (합이 진분수)', G.fracAddSame({ sumProper: true }), { cols: 3, fixedCols: true, dc: 32 }),
            S(103, '분모가 같은 진분수의 덧셈 (합이 가분수)', G.fracAddSame({ sumProper: false }), { cols: 3, fixedCols: true, dc: 32 }),
            S(104, '분모가 같은 대분수의 덧셈 (받아올림 없음)', G.fracAddSame({ mixed: true, sumProper: true }), { cols: 3, fixedCols: true, dc: 32 }),
            S(105, '분모가 같은 대분수의 덧셈 (받아올림 있음)', G.fracAddSame({ mixed: true, sumProper: false }), { cols: 3, fixedCols: true, dc: 32 }),
            S(106, '분모가 같은 진분수의 뺄셈', G.fracSubSame({}), { cols: 3, fixedCols: true, dc: 32 }),
            S(107, '자연수 - 진분수', G.natMinusFrac(), { cols: 4, dc: 32 }),
            S(108, '분모가 같은 대분수의 뺄셈 (받아내림 없음)', G.fracSubSame({ mixed: true, borrow: false }), { cols: 3, fixedCols: true, dc: 32 }),
            S(109, '분모가 같은 대분수의 뺄셈 (받아내림 있음)', G.fracSubSame({ mixed: true, borrow: true }), { cols: 3, fixedCols: true, dc: 32 }),
            S(110, '대분수와 진분수의 덧셈', G.fracAddSame({ mixed: true, mixed2: false }), { cols: 3, fixedCols: true, dc: 32 }),
            S(111, '대분수와 진분수의 뺄셈', G.fracSubSame({ mixed: true, mixed2: false }), { cols: 3, fixedCols: true, dc: 32 })
          ]
        },
        {
          no: 3, title: '소수의 덧셈과 뺄셈', steps: [
            S(112, '소수 한 자리 수의 덧셈 (자연수 없음)', G.decVert('+', { intDigits: 0, ka: 1, kb: 1 })),
            S(113, '소수 두 자리 수의 덧셈 (자연수 없음)', G.decVert('+', { intDigits: 0, ka: 2, kb: 2 })),
            S(114, '소수 두 자리 수의 덧셈 (자연수 있음)', G.decVert('+', { intDigits: 1, ka: 2, kb: 2 })),
            S(115, '소수 세 자리 수의 덧셈', G.decVert('+', { intDigits: 1, ka: 3, kb: 3 })),
            S(116, '자릿수가 다른 소수의 덧셈 (세로셈)', G.decVert('+', { intDigits: 1, kMin: 1, kMax: 3 })),
            S(211, '자릿수가 다른 소수의 덧셈 (가로셈)', G.decHorz('+', { intDigits: 1, kMin: 1, kMax: 3 }),
              { cols: 3, dc: 27 }),
            S(117, '소수 한 자리 수의 뺄셈', G.decVert('-', { intDigits: 0, ka: 1, kb: 1 })),
            S(118, '소수 두 자리 수의 뺄셈 (자연수 없음)', G.decVert('-', { intDigits: 0, ka: 2, kb: 2 })),
            S(119, '소수 두 자리 수의 뺄셈 (자연수 있음)', G.decVert('-', { intDigits: 1, ka: 2, kb: 2 })),
            S(120, '소수 세 자리 수의 뺄셈', G.decVert('-', { intDigits: 1, ka: 3, kb: 3 })),
            S(121, '자릿수가 다른 소수의 뺄셈 (세로셈)', G.decVert('-', { intDigits: 1, kMin: 1, kMax: 3 })),
            S(212, '자릿수가 다른 소수의 뺄셈 (가로셈)', G.decHorz('-', { intDigits: 1, kMin: 1, kMax: 3 }),
              { cols: 3, dc: 27 })
          ]
        }
      ]
    },
    /* ---------------- 5학년 1학기 ---------------- */
    {
      key: '51', grade: 5, sem: 1, chapters: [
        {
          no: 1, title: '자연수의 혼합 계산', steps: [
            S(122, '덧셈과 뺄셈의 혼합 계산', G.mixedCalc(TPL.addSub), { cols: 2, dc: 22 }),
            S(123, '곱셈과 나눗셈의 혼합 계산', G.mixedCalc(TPL.mulDiv), { cols: 2, dc: 22 }),
            S(124, '덧셈, 뺄셈, 곱셈의 혼합 계산', G.mixedCalc(TPL.addSubMul), { cols: 2, dc: 22 }),
            S(125, '덧셈, 뺄셈, 나눗셈의 혼합 계산', G.mixedCalc(TPL.addSubDiv), { cols: 2, dc: 22 }),
            S(126, '사칙연산의 혼합 계산', G.mixedCalc(TPL.four), { cols: 2, dc: 20 }),
            S(127, '( )가 있는 덧셈·뺄셈의 혼합 계산', G.mixedCalc(TPL.parenAddSub), { cols: 2, dc: 22 }),
            S(128, '( )가 있는 곱셈·나눗셈의 혼합 계산', G.mixedCalc(TPL.parenMulDiv), { cols: 2, dc: 22 }),
            S(129, '( )가 있는 덧셈·뺄셈·곱셈의 혼합 계산', G.mixedCalc(TPL.parenAddSubMul), { cols: 2, dc: 20 }),
            S(130, '( )가 있는 덧셈·뺄셈·나눗셈의 혼합 계산', G.mixedCalc(TPL.parenAddSubDiv), { cols: 2, dc: 20 }),
            S(131, '( )가 있는 사칙연산의 혼합 계산', G.mixedCalc(TPL.parenFour), { cols: 2, dc: 20 }),
            /* { } 를 쓰는 혼합 계산은 2022 개정 교육과정에서 초등 범위를 벗어나
               중등으로 옮겨졌습니다. 목록에서는 빼되, 뒤 유형들의 번호가 밀리지
               않도록 자리는 남겨 둡니다 (이미 뽑아 둔 문제지번호 보호). */
            S(132, '{ }가 있는 혼합 계산', G.mixedCalc(TPL.brace), { cols: 2, dc: 20, retired: true })
          ]
        },
        {
          no: 2, title: '약수와 배수', steps: [
            S(133, '약수 구하기', G.divisorList({ min: 12, max: 72 }), { cols: 2, dc: 20 }),
            S(134, '배수 구하기', G.multipleList({ min: 3, max: 15, count: 5 }), { cols: 1, fixedCols: true, dc: 18 }),
            S(135, '공약수 구하기', G.commonDivisor({}), { cols: 2, dc: 20 }),
            S(136, '최대공약수 구하기', G.commonDivisor({ gcdOnly: true }), { cols: 2, dc: 22 }),
            S(137, '공배수 구하기', G.commonMultiple({}), { cols: 1, fixedCols: true, dc: 18 }),
            S(138, '최소공배수 구하기', G.commonMultiple({ lcmOnly: true }), { cols: 2, dc: 22 })
          ]
        },
        {
          no: 4, title: '약분과 통분', steps: [
            S(139, '크기가 같은 분수 만들기', G.equivFrac(), { cols: 2, dc: 20 }),
            S(140, '기약분수로 나타내기 (약분)', G.reduceFrac(), { cols: 4, dc: 32 }),
            S(141, '분수의 통분 (분모의 곱)', G.commonDenom(false), { cols: 2, dc: 20 }),
            S(142, '분수의 통분 (최소공배수)', G.commonDenom(true), { cols: 2, dc: 20 }),
            S(143, '분수의 크기 비교', G.compareFrac(), { cols: 4, dc: 32, retired: true }),
            S(214, '분수의 크기 비교', G.compareFracEq(), { cols: 4, dc: 32 }),
            S(144, '분수를 소수로 나타내기', G.fracToDec(), { cols: 4, dc: 32 }),
            S(145, '소수를 분수로 나타내기', G.decToFrac(), { cols: 4, dc: 32 }),
            S(146, '분수와 소수의 크기 비교', G.compareFracDec(), { cols: 4, dc: 32, retired: true }),
            S(215, '분수와 소수의 크기 비교', G.compareFracDecEq(), { cols: 4, dc: 32 })
          ]
        },
        {
          no: 5, title: '분수의 덧셈과 뺄셈', steps: [
            S(147, '진분수의 덧셈 (분모가 다름)', G.fracDiffDen('+', {}), { cols: 3, fixedCols: true, dc: 32 }),
            S(148, '대분수의 덧셈 (받아올림 없음)', G.fracDiffDen('+', { mixed: true, carry: false }), { cols: 3, fixedCols: true, dc: 32 }),
            S(149, '대분수의 덧셈 (받아올림 있음)', G.fracDiffDen('+', { mixed: true, carry: true }), { cols: 3, fixedCols: true, dc: 32 }),
            S(150, '진분수의 뺄셈 (분모가 다름)', G.fracDiffDen('-', {}), { cols: 3, fixedCols: true, dc: 32 }),
            S(151, '대분수의 뺄셈 (받아내림 없음)', G.fracDiffDen('-', { mixed: true, borrow: false }), { cols: 3, fixedCols: true, dc: 32 }),
            S(152, '대분수의 뺄셈 (받아내림 있음)', G.fracDiffDen('-', { mixed: true, borrow: true }), { cols: 3, fixedCols: true, dc: 32 })
          ]
        }
      ]
    },
    /* ---------------- 5학년 2학기 ---------------- */
    {
      key: '52', grade: 5, sem: 2, chapters: [
        {
          no: 1, title: '수의 범위와 어림하기', steps: [
            /* 이상·이하·초과·미만을 한 유형에 섞습니다. 넷을 갈라 놓으면
               경계를 고르는 연습이 빠집니다. 나중에 나누고 싶으면 한 줄씩 끼우면 됩니다. */
            S(222, '수의 범위 (이상·이하·초과·미만)', G.numRange(),
              { cols: 1, fixedCols: true, dc: 12, inst: '다음을 구하세요.' }),
            S(223, '올림·버림·반올림', G.roundNum(),
              { cols: 2, dc: 20, inst: '어림하여 나타내세요.' }),
            S(224, '어림하면 그 수가 되는 범위', G.roundBack(),
              { cols: 1, fixedCols: true, dc: 12, inst: '수의 범위를 구하세요.' }),
            S(225, '올림·버림 문장제', G.roundWord(),
              { cols: 2, dc: 12, inst: '문제를 읽고 답을 구하세요.' })
          ]
        },
        {
          no: 2, title: '분수의 곱셈', steps: [
            S(153, '분수 × 자연수', G.fracMulGen('fn'), { cols: 4, dc: 32 }),
            S(154, '자연수 × 분수', G.fracMulGen('nf'), { cols: 4, dc: 32 }),
            S(155, '진분수 × 진분수', G.fracMulGen('ff'), { cols: 3, fixedCols: true, dc: 32 }),
            S(156, '대분수 × 대분수', G.fracMulGen('kk'), { cols: 3, fixedCols: true, dc: 32 }),
            S(157, '세 분수의 곱셈 (진분수)', G.fracMul3(false), { cols: 2, dc: 20 }),
            S(158, '세 분수의 곱셈 (대분수 포함)', G.fracMul3(true), { cols: 2, dc: 20 })
          ]
        },
        {
          no: 4, title: '소수의 곱셈', steps: [
            S(159, '소수 × 자연수', G.decMul('nat'), { cols: 3, dc: 27 }),
            S(160, '곱의 소수점의 위치', G.decMul('point'), { cols: 3, dc: 27 }),
            S(161, '소수 × 소수', G.decMul('dec'), { cols: 3, dc: 27 }),
            S(162, '세 소수의 곱셈', G.decMul3(), { cols: 2, dc: 20 })
          ]
        }
      ]
    },
    /* ---------------- 6학년 1학기 ---------------- */
    {
      key: '61', grade: 6, sem: 1, chapters: [
        {
          no: 1, title: '분수의 나눗셈', steps: [
            S(163, '분수 ÷ 자연수', G.fracDivGen('fn'), { cols: 4, dc: 32 }),
            S(164, '분수의 곱셈과 나눗셈 혼합', G.fracMulDivMix(), { cols: 2, dc: 22 })
          ]
        },
        {
          no: 3, title: '소수의 나눗셈', steps: [
            S(165, '소수 ÷ 자연수', G.decDiv('decByNat'), { cols: 3, dc: 27 }),
            S(166, '자연수 ÷ 자연수 (몫을 소수로)', G.decDiv('natByNat'), { cols: 3, dc: 27 }),
            S(167, '몫을 반올림하여 나타내기', G.decDiv('round', { k: 2 }), { cols: 2, dc: 22 })
          ]
        },
        {
          no: 4, title: '비와 비율', steps: [
            S(168, '비율을 분수로 나타내기', G.ratioValue('frac'), { cols: 2, dc: 22 }),
            S(169, '백분율로 나타내기', G.ratioValue('pct'), { cols: 2, dc: 22 })
          ]
        }
      ]
    },
    /* ---------------- 6학년 2학기 ---------------- */
    {
      key: '62', grade: 6, sem: 2, chapters: [
        {
          no: 1, title: '분수의 나눗셈', steps: [
            S(170, '분모가 같은 분수의 나눗셈', G.fracDivGen('same'), { cols: 3, fixedCols: true, dc: 32 }),
            S(171, '분모가 다른 분수의 나눗셈', G.fracDivGen('diff'), { cols: 3, fixedCols: true, dc: 32 }),
            S(172, '대분수의 나눗셈', G.fracDivGen('kk'), { cols: 3, fixedCols: true, dc: 32 })
          ]
        },
        {
          no: 2, title: '소수의 나눗셈', steps: [
            S(173, '소수 한 자리 ÷ 소수 한 자리', G.decDiv('decByDec', { kA: 1, kB: 1 }), { cols: 3, dc: 27 }),
            S(174, '소수 두 자리 ÷ 소수 두 자리', G.decDiv('decByDec', { kA: 2, kB: 2 }), { cols: 3, dc: 27 }),
            S(175, '자연수 ÷ 소수', G.decDiv('natByDec', { kB: 1 }), { cols: 3, dc: 27 }),
            S(176, '소수의 나눗셈에서 나머지 구하기', G.decDivRem(), { cols: 2, dc: 22 }),
            S(177, '분수와 소수의 혼합 계산 (연산자 2~3개)', G.fracDecMix(false), { cols: 2, dc: 20 }),
            S(178, '분수와 소수의 혼합 계산 (연산자 4개)', G.fracDecMix(true), { cols: 2, dc: 20 })
          ]
        },
        {
          no: 4, title: '비례식과 비례배분', steps: [
            S(179, '가장 간단한 자연수의 비로 나타내기', G.simplestRatio(), { cols: 2, dc: 22 }),
            S(180, '비례식에서 □ 안의 수 구하기', G.proportionBox(), { cols: 2, dc: 22 }),
            S(181, '비례배분', G.proportionalShare(), { cols: 1, fixedCols: true, dc: 18 })
          ]
        }
      ]
    }
  ];

  /* ---------- 유형 평탄화 ----------
     유형의 번호(index)는 S() 에 적힌 고유번호를 그대로 씁니다.
     파일에서의 위치가 아니라 고유번호를 쓰므로, 유형을 어디에 끼워 넣든
     이미 뽑아 둔 문제지번호가 그대로 살아 있습니다. */
  var FLAT = [], BY_ID = {}, VISIBLE = 0, MAX_ID = -1, DUP = [];
  CURRICULUM.forEach(function (g) {
    g.chapters.forEach(function (ch) {
      ch.steps = ch.steps.filter(function (s) { return !s.hidden; });
      ch.steps.forEach(function (st) {
        st.index = st.id;
        if (BY_ID[st.id]) DUP.push(st.id + ' : ' + BY_ID[st.id].t + ' / ' + st.t);
        BY_ID[st.id] = st;
        if (st.id > MAX_ID) MAX_ID = st.id;
        st.gradeKey = g.key;
        st.grade = g.grade;
        st.sem = g.sem;
        st.chapterNo = ch.no;
        st.chapterTitle = ch.title;
        FLAT.push(st);
      });
      /* retired 유형은 고르는 목록에서만 빠집니다. 번호(index)는 그대로 살아 있어서
         예전 문제지번호를 넣으면 그 문제지가 그대로 다시 만들어집니다. */
      ch.visible = ch.steps.filter(function (s) { return !s.retired; });
      /* 목록에 보이는 순서대로 1번부터. 뺀 유형은 뒤 번호를 받아 두기만 합니다. */
      var k = 0;
      ch.visible.forEach(function (st) { st.no = ++k; });
      ch.steps.forEach(function (st) { if (st.retired) st.no = ++k; });
      VISIBLE += ch.visible.length;
    });
    g.visibleChapters = g.chapters.filter(function (c) { return c.visible.length > 0; });
  });

  if (DUP.length && global.console) {
    console.error('[매일연산] 유형 고유번호가 겹칩니다. 문제지번호가 엉킵니다: ' + DUP.join(' / '));
  }

  function byIndex(i) { return BY_ID[i] || null; }
  function findGroup(key) {
    for (var i = 0; i < CURRICULUM.length; i++) if (CURRICULUM[i].key === key) return CURRICULUM[i];
    return null;
  }
  function gradeKeys(grade) {
    return CURRICULUM.filter(function (g) { return g.grade === grade; });
  }

  /* 문항 수 선택지 (0 = 유형별 기본값) */
  var COUNTS = [0, 12, 16, 20, 24, 30, 40];

  global.Curriculum = {
    tree: CURRICULUM, flat: FLAT, byIndex: byIndex,
    findGroup: findGroup, gradeKeys: gradeKeys, COUNTS: COUNTS,
    total: VISIBLE, indexed: FLAT.length,
    nextId: MAX_ID + 1        // 새 유형에 붙일 다음 고유번호
  };
})(window);
