# 검증 보고서 (Verification Report)

감사 시각: 2026-08-04
감사 대상: `/Users/jiwon/IdeaProjects/finance_portal2`
기준 문서: `CLAUDE.md`

## 감사 시점의 코드 상태 (중요한 전제)

감사 시점에 존재한 소스 파일은 **8개뿐**이다.

```
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/domain/retirement/calculator.ts
src/domain/retirement/calculator.test.ts
src/domain/retirement/policy.ts
src/domain/retirement/simulator.ts
src/domain/retirement/types.ts
src/domain/retirement/validation.ts
```

즉 `CLAUDE.md`의 "Current Implementation State > 구현 완료"가 서술하는 내용 중
**대부분이 아직 코드로 존재하지 않는다.** 다음은 전부 미존재다.

- `src/domain/tax/` 전체 (`statutory.ts` 포함)
- `src/components/` 전체
- `src/services/` (`retirementStorage.ts` 포함)
- `src/content/`, `src/lib/`
- `/retirement-calculator`, `/my-retirement`, `/pension`, `/calculators`,
  `/articles`, `/articles/[slug]`, `/login`, `/signup` 페이지 전부

`dev` / `test` 에이전트가 동시 작업 중이므로 위 항목은 **"진행 중"** 으로 분류하고
위반으로 보지 않았다. 단, 이미 존재하는 코드의 하드 룰 위반은 완성도와 무관하게 지적했다.

`CLAUDE.md`의 "구현 완료" 섹션이 현재 코드와 크게 어긋나 있다는 점 자체는
별도 항목(MEDIUM)으로 기록한다.

---

## 규칙별 감사 결과

### 1. 법령 수치 규칙 (가장 중요) — PASS (조건부)

**날조된 법령 수치는 하나도 발견되지 않았다.** `src/` 전체를 다음 패턴으로 훑었다.

- 세율/공제/보험료율/증액률/감액률/주택연금/statutory/taxRate/deduction/premium
- 3자리 이상 숫자 리터럴 및 모든 `0.x` 소수 리터럴

법령 수치로 오인될 값이 실제로 존재하지 않는다. 유일한 언급은 금지를 재확인하는
주석이다.

- `src/domain/retirement/policy.ts:4-6` — "이 파일의 값은 모두 **가정**이다. 법령 수치가
  아니다. 세율·공제액·보험료율·국민연금 증액률처럼 법으로 정해진 값은 이 파일에 넣지
  않는다."

**가정값은 규칙대로 가정으로 표기되어 있다.**

- `src/domain/retirement/policy.ts:17-24` — `DEFAULT_ASSUMPTIONS` (물가 2%, 수익률 3%,
  기대수명 90세). 주석에 "화면에 '가정'으로 표시하고 사용자가 바꿀 수 있게 한다" 명시.
- `src/domain/retirement/types.ts:39-42` — `inflationRate` / `investmentReturnRate` 모두
  "가정값이며 사용자가 바꿀 수 있다"로 문서화.
- `src/domain/retirement/policy.ts:44-49` — `HEALTHCARE` 도 "특정 질병이나 간병 비용을
  추정하지 않는다"고 범위를 스스로 제한.

**미검증 항목 (기능이 아직 없어 확인 불가):**

`domain/tax/statutory.ts`가 존재하지 않으므로 다음은 **검증하지 못했다.**

- `pending()` / `confirmed(값, 라벨, 출처, 기준일)` 헬퍼의 구현
- 하나라도 `null`일 때 `status: 'unavailable'` 반환하는지
- 기본값 대체(fallback) 우회 경로가 없는지

→ `dev`가 `domain/tax/`를 올리는 즉시 **재감사가 반드시 필요하다.** 현재의 PASS는
"위반이 없다"는 뜻이며 "규칙이 구현·검증되었다"는 뜻이 **아니다.**

### 2. UI / domain 분리 — PASS

`src/app/` 안에 금융 계산이 전혀 없다.

- `src/app/page.tsx:1-3` — 단일 `<main>` 반환. 산술 없음.
- `src/app/layout.tsx` — metadata / viewport / html 골격만.

계산은 전부 `src/domain/retirement/` 안의 순수 함수에 있다. `src/components/`는 아직 없다.

### 3. magic number — PASS

`policy.ts` 밖의 숫자 리터럴은 다음이 전부이며, 모두 **표시 단위 변환용 명명 상수**다.
금액·비율 정책값이 아니다.

- `src/domain/retirement/validation.ts:12` — `PERCENT_MULTIPLIER = 100`
- `src/domain/retirement/validation.ts:15` — `MAN_WON = 10_000`
- `src/domain/retirement/validation.ts:23` — `EOK = 100_000_000`

`simulator.ts` / `calculator.ts`에는 숫자 리터럴이 없고, 전부 `policy.ts`에서 import한다
(`MONTHS_PER_YEAR`, `HEALTHCARE`, `BOUNDS`, `SCENARIOS`, `SUSTAINABLE_SEARCH`,
`COMPARISON_STEPS`).

경미한 지적(정보): `EOK`는 함수 본문 안(`validation.ts:23`)에 있고 `MAN_WON`은 모듈
스코프에 있다. 위반은 아니지만 일관성 차원에서 한 곳에 모으는 편이 낫다.

### 4. TypeScript strictness — PASS (설정), 단 실제 타입 오류 2건 존재 (아래 11번 참조)

금지 패턴 스캔 결과 **모두 0건**이다: `any`, `as any`, `as unknown`, `@ts-ignore`,
`@ts-expect-error`, 위험한 non-null `!`.

설정도 규칙보다 엄격하다.

- `tsconfig.json:11` — `"strict": true`
- `tsconfig.json:20` — `"noUncheckedIndexedAccess": true` (추가 강화)

코드가 이 엄격함을 실제로 존중한다: `simulator.ts:144,149,172`에서
`projections[projections.length - 1]`을 `lastYear?.` / `?? 0`로 안전하게 다룬다.

다만 `npm run build`는 **타입 오류로 실패한다.** 11번에 상세 기록.

### 5. Privacy / logging — PASS (부분 검증)

- `console.*` — `src/` 전체 **0건**.
- `fetch(` / `XMLHttpRequest` / `axios` / `navigator.sendBeacon` — **0건**.
- `localStorage` / `sessionStorage` — **0건** (저장 계층 자체가 아직 없음).

`services/retirementStorage.ts`가 없으므로 "localStorage만 사용하고 서버로 전송하지
않는지"는 **검증 불가**다. 파일이 생기면 재감사 대상이다.

### 6. 동작하지 않는 기능을 동작하는 것처럼 보이게 하지 않기 — 검증 불가 (위반 없음)

`/login`, `/signup` 페이지가 **아직 존재하지 않는다.** 가짜로 동작하는 인증 폼도 당연히
없다. 위반 없음이지만, 페이지 생성 시 "준비 중" 안내만 두는지 재확인이 필요하다.

### 7. 금융상품 추천 / 단기 주가 전망 없음 — PASS (해당 콘텐츠 없음)

`src/content/`와 기사 페이지가 아직 없다. 현재 존재하는 텍스트에 특정 상품 추천이나
주가 전망은 없다. `src/app/layout.tsx:9-10`의 description도 제품 목표에 부합한다
("은퇴 후 매달 얼마를 쓸 수 있고, 자산이 언제까지 유지되는지 계산합니다").

### 8. 가정 공개 (세금·건보료 미포함 명시) — 검증 불가 / 진행 중

도메인 계층은 이 요구를 지킬 준비가 되어 있다.

- `src/domain/retirement/simulator.ts:11` — "세금·건강보험료는 아직 포함하지 않는다.
  결과 화면에 이 사실을 표시한다."
- `src/domain/retirement/types.ts:131-140` — `ScenarioComparison`이
  `assumptionText`, `investmentReturnRate`, `inflationRate`를 결과에 실어 보내므로
  화면이 가정을 표시할 데이터가 확보되어 있다.
- `src/domain/retirement/policy.ts:62,68,74` — 시나리오별 `assumptionText`가 쉬운
  한국어로 작성됨.

그러나 **결과 화면이 없으므로 실제 표시 여부는 검증할 수 없다.** 결과 UI가 생기면
"세금·건강보험료 미포함" 문구의 존재를 반드시 확인해야 한다.

### 9. 50~70대 UX — PASS (기반 설정), 화면 검증 불가

기반 토큰이 규칙에 맞게 준비되어 있다.

- `tailwind.config.ts:11-18` — 본문 `base`를 **1.125rem(18px)** 로 상향, 이하 스케일 확대.
- `tailwind.config.ts:19-21` — `minHeight.touch = 3.5rem(56px)` 터치 타깃 토큰.
- `src/app/globals.css:14-17` — `:focus-visible`에 `ring-4` 초점 표시. 접근성 양호.
- `src/app/layout.tsx:20` — `<html lang="ko">` 확인.
- `src/app/layout.tsx:13-16` — viewport `width=device-width, initialScale=1`,
  `globals.css:6-8`의 `-webkit-text-size-adjust: 100%` — 사용자 확대를 막지 않는다. 양호.

**평문 한국어 사용이 도메인 코드에서도 지켜진다.**

- `src/domain/retirement/calculator.ts:177-179` — 함수명은 `calculateWithdrawalRate`지만
  주석에 "화면에서는 '매년 자산에서 꺼내 쓰는 비율'로 표시한다"고 명시. `CLAUDE.md`의
  용어 지침을 정확히 따랐다.
- `validation.ts`의 오류 메시지가 전부 쉬운 한국어 존댓말이다
  (예: `validation.ts:210` "은퇴 나이는 현재 나이보다 앞설 수 없습니다. 이미
  은퇴하셨다면 현재 나이와 같게 입력해 주세요.").

**검증 불가:** wizard 단계 입력, 아이콘 단독 컨트롤 부재, label-input 연결, button vs div
— 해당 컴포넌트가 아직 없다.

### 10. 의존성 — PASS

`package.json`에 허용 범위를 벗어난 패키지가 **없다.**

- dependencies (`package.json:13-17`): `next` ^16.3.0, `react` ^19.2.8,
  `react-dom` ^19.2.8 — 3개뿐.
- devDependencies (`package.json:18-27`): `@types/node`, `@types/react`,
  `@types/react-dom`, `autoprefixer`, `postcss`, `tailwindcss`, `typescript`, `vitest`.

차트 라이브러리 없음. shadcn/ui 없음. DB 클라이언트 없음. 상태관리 라이브러리 없음.
Redis/ES/Kafka 없음. 규칙 그대로다.

### 11. 금융 계산 코드의 테스트 존재 — 부분 PASS, 그러나 `npm test`와 `npm run build` 모두 실패

테스트 파일은 `src/domain/retirement/calculator.test.ts` 하나이며, `calculator.ts`,
`simulator.ts`, `validation.ts` 세 모듈을 함께 커버한다(59개 케이스). 커버리지 자체는
얕지 않다. 다만 `simulator.test.ts` / `validation.test.ts`로의 분리는 없다
(`test` 에이전트 작업 중일 수 있음).

**검증 명령 결과는 아래 별도 섹션에 그대로 기록한다.**

---

## 검증 명령 실행 결과

> **주의: 감사 중 `dev`/`test` 에이전트가 동시에 파일을 수정했다.**
> 아래는 시간순 기록이며, 최종 상태는 "재실행 결과 (최종)" 절을 보라.
> 연속 실행 사이에 실패 수가 2건 → 4건 → 1건 → 0건으로 변했다.

### `npm test` — 1차 실행: 실패 (2 failed / 57 passed, 총 59)

```
 ❯ src/domain/retirement/calculator.test.ts (34 tests | 2 failed) 58ms
     × 낙관적 시나리오가 보수적 시나리오보다 자산이 많이 남는다 5ms
     × 은퇴를 늦추면 기대수명 시점에 자산이 더 남는다 1ms

 FAIL  src/domain/retirement/calculator.test.ts > compareScenarios > 낙관적 시나리오가 보수적 시나리오보다 자산이 많이 남는다
AssertionError: expected 0 to be greater than 0
 ❯ src/domain/retirement/calculator.test.ts:156:55
    154|     const optimistic = scenarios.find((s) => s.kind === 'optimistic');
    155|
    156|     expect(optimistic?.result.assetsAtLifeExpectancy).toBeGreaterThan(
       |                                                       ^
    157|       conservative?.result.assetsAtLifeExpectancy ?? 0,
    158|     );

 FAIL  src/domain/retirement/calculator.test.ts > compareRetirementAges > 은퇴를 늦추면 기대수명 시점에 자산이 더 남는다
AssertionError: expected 0 to be greater than 0
 ❯ src/domain/retirement/calculator.test.ts:223:43
    221|     const later = comparisons.find((c) => c.retirementAge === 65);
    222|
    223|     expect(later?.assetsAtLifeExpectancy).toBeGreaterThan(
       |                                           ^
    224|       base?.assetsAtLifeExpectancy ?? 0,
    225|     );

 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 57 passed (59)
```

주: `Test Files 1 failed | 1 passed (2)`로 파일이 2개로 집계되지만, 감사 시점 `src/`에는
`calculator.test.ts` 하나만 있었다. 두 번째 파일은 `test` 에이전트가 동시에 추가하는 중일
가능성이 높다.

**원인 분석 — 이 2건은 simulator 버그가 아니라 테스트 설계 오류다.**

계측 결과 (`makeInput()` 기본값: 60세 은퇴, 자산 5억, 생활비 월 300만, 기대수명 90):

```
conservative end=0 depl=74 short=947101717
base         end=0 depl=79 short=545301791
optimistic   end=0 depl=87 short=144661357

retAge=60 atRet=579637037 end=0 depl=79 short=589182791
retAge=65 atRet=671958190 end=0 depl=87 short=200992814
```

세 시나리오 모두 기대수명 전에 자산이 **고갈**된다. `simulator.ts:89`가
`endingAssets = Math.max(0, ...)`로 하한을 0에 두므로 `assetsAtLifeExpectancy`는
세 경우 모두 **정확히 0**이다. `0 > 0`은 거짓 → 실패.

시뮬레이터는 정상이며, 낙관 우위는 다른 지표에 제대로 나타난다.
고갈 나이 74 → 79 → 87, 부족금액 9.47억 → 5.45억 → 1.45억. 은퇴 연기도 마찬가지로
`depl` 79 → 87, `short` 5.89억 → 2.01억, `atRet` 5.80억 → 6.72억으로 우위가 드러난다.

→ **수정 방향(코드 수정은 하지 않았다):** 자산이 고갈되는 입력에서
`assetsAtLifeExpectancy`를 비교 지표로 쓰면 안 된다. `depletionAge` 또는
`totalShortfall`로 단조성을 검증하거나, 고갈되지 않는 입력(자산 상향/생활비 하향)으로
`makeInput`을 조정해야 한다. 참고로 `calculator.test.ts:213`의 형제 테스트는
`assetsAtRetirement`를 비교해 통과한다 — 지표 선택 차이가 원인임을 뒷받침한다.

**simulator.ts를 이 테스트에 맞추려고 고치면 안 된다.** 현재 동작은 `CLAUDE.md`
"확정된 계산 가정"("자산은 0 미만으로 내려가지 않는다")과 정확히 일치한다.

### `npm run build` — 실패 (타입 오류 2건)

```
> finance-portal@0.1.0 build
> next build

▲ Next.js 16.3.0 (Turbopack)
⚠ Warning: Next.js ignored package-lock.json in /Users/jiwon because it would include your home directory (/Users/jiwon).
 To use this directory, set `turbopack.root` in your Next.js config.

✓ Running next.config.mjs took 20ms

  Creating an optimized production build ...
✓ Compiled successfully in 758ms
  Running TypeScript ...
src/domain/retirement/calculator.ts(60,7): error TS2322: Type 'number' is not assignable to type '0'.
src/domain/retirement/calculator.ts(62,7): error TS2322: Type 'number' is not assignable to type '100000000'.
Failed to type check.
```

**원인 분석 (실제 타입 버그다):**

`policy.ts:82,92`의 `BOUNDS`가 `as const`이므로 `BOUNDS.monthlyAmount.min`의 타입은
`number`가 아니라 리터럴 `0`, `.max`는 리터럴 `100000000`이다.

`calculator.ts:45-46`이 `let low = BOUNDS.monthlyAmount.min;`,
`let high = BOUNDS.monthlyAmount.max;`로 선언하므로 `low`는 `0` 타입, `high`는
`100000000` 타입으로 추론된다. 이후 이분탐색 루프가 임의의 `number`를 대입한다.

- `calculator.ts:60` — `low = mid;` → `number`를 `0`에 대입 (TS2322)
- `calculator.ts:62` — `high = mid;` → `number`를 `100000000`에 대입 (TS2322)

즉 **이분탐색이 타입 수준에서 성립하지 않는다.** `low`/`high`에 명시적 `: number`
주석을 붙이는 것이 최소 수정이다. 런타임 로직 자체는 옳다 (테스트 57건 통과에 포함).

또한 위 경고 — `package-lock.json`이 홈 디렉터리(`/Users/jiwon`)에서 발견되어 Next가
무시한다는 내용 — 은 빌드 실패 원인은 아니지만 프로젝트 루트 인식 문제이므로
`next.config.mjs`에 `turbopack.root` 설정을 권한다.

### 재실행 결과 (최종) — `npm test` 통과, `npm run build` 여전히 실패

감사 중 `test` 에이전트가 테스트를 추가·수정했다. 최종 상태는 다음과 같다.

```
 Test Files  6 passed (6)
      Tests  194 passed (194)
```

1차에서 지적한 테스트 실패 2건은 `test` 에이전트가 감사 도중 자체 수정했다.
중간 실행에서 새로 나타났던 4건(`simulator.assumptions.test.ts` 등)도 함께 해소되었다.
예를 들어 `simulator.assumptions.test.ts:667-671`의 "정확히 0원으로 끝나는 해도 고갈로
본다"는 단정 나이가 84/85세에서 83/84세로 교정되었다.

→ **`npm test`는 최종적으로 PASS다.** 아래 "반드시 고쳐야 할 것"의 CRITICAL 2번은
해소되었다(기록 목적으로 남긴다).

**`npm run build`는 재실행에서도 동일하게 실패한다. 이 오류는 수정되지 않았다.**

```
src/domain/retirement/calculator.ts(60,7): error TS2322: Type 'number' is not assignable to type '0'.
src/domain/retirement/calculator.ts(62,7): error TS2322: Type 'number' is not assignable to type '100000000'.
Failed to type check.
```

**감사 중 추가된 파일에 대한 보강 감사:**

- `src/services/retirementStorage.ts` — **PASS.** HIGH 5번 항목이 해소되었다.
  `localStorage`만 사용하며 `fetch`/XHR/`sendBeacon`이 전혀 없다. 서버 전송 없음.
  `getStorage()`(27-40행)가 SSR·쿠키 차단 환경을 걸러내고, 모든 `catch` 블록
  (37, 81, 95, 140행)이 **오류 객체를 로그로 남기지 않는다** — 금융정보 로깅 금지
  규칙을 정확히 지켰다. 4-5행 주석이 방침을 명시하고, `isSavedPlan()`(43-55행)으로
  읽어온 값의 형식을 검증한다. `STORAGE_KEY`·`MAX_PLANS`는 명명 상수다.
- `src/lib/format.ts` — **PASS.** 표시 전용이며 금융 계산이 없다(4행 "계산은 하지
  않는다"). 단위 상수 `MAN`/`EOK`/`PERCENT`(9-13행)는 모두 명명 상수다.
  `formatSustainability()`(126-134행)가 고갈되지 않는 경우를 "0년"으로 표시하지 않고
  별도 문구를 쓰는 처리는 오해 방지 측면에서 좋다.
- 신규 파일 전체에 `console.*`, `fetch(`, `any`, `@ts-ignore` **0건** 재확인.

### 2차 보강 감사 — `src/components/` (감사 중 추가됨)

`ui.tsx`, `AmountField.tsx`, `AssetChart.tsx` 세 파일이 추가되어 감사했다. **모두 PASS.**

**UI/domain 분리 — PASS.** 세 파일 모두 금융 계산이 없다.

- `ui.tsx:4` — "금융 계산을 하지 않는다. domain 이 계산한 값을 받아 표시만 한다."
  실제로 전부 `string`으로 받은 값을 표시한다 (`KeyFigure`의 `value: string`,
  `LabeledValue`의 `value: string`) — 컴포넌트가 숫자를 만질 여지 자체를 없앴다. 좋은 설계다.
- `AssetChart.tsx:5` — "계산은 하지 않는다. simulate() 결과를 받아 좌표로만 바꾼다."
  `toX`/`toY`(50-55행)는 좌표 변환이며 금융 계산이 아니다. 정당하다.
- `AmountField.tsx:14-21` `parseNumeric` — 입력 문자열 파싱이며 금융 계산이 아니다.

**차트 라이브러리 미사용 — PASS.** `AssetChart.tsx`는 `<svg>`/`<polyline>`/`<polygon>`으로
직접 그린다(4행 "차트 라이브러리를 쓰지 않고 SVG 로 직접 그린다"). `package.json`에
차트 의존성이 없다는 점과 일치한다.

**magic number — PASS (경계선상이나 정당).** `AssetChart.tsx:14-20`의 `CHART` 상수는
`width`/`padding`/`yTicks` 등 **그래프 좌표값**이며 금융 정책값이 아니므로 `policy.ts`에
둘 대상이 아니다. 한 곳에 모아 `as const`로 관리한 점도 좋다. SVG 색상 리터럴
(`#e2e8f0`, `#1d4ed8` 등)은 `tailwind.config.ts`의 brand/caution/good 팔레트와 중복되므로
토큰화하면 더 좋겠지만 위반은 아니다.

**50~70대 UX / 접근성 — PASS. 이 부분은 특히 잘 되어 있다.**

- 터치 영역: `min-h-touch`(56px)가 모든 대화형 요소에 적용됨 —
  `ui.tsx:130`(ButtonLink), `ui.tsx:164`(ActionButton),
  `AmountField.tsx:61,78,88`(±버튼과 입력), `135,150,158`, `233,245`, `288,298`.
- **아이콘 단독 컨트롤 없음 — PASS.** `+`/`−` 버튼은 시각적으로 기호만 보이지만
  모두 `aria-label`에 완전한 한국어 설명이 있다
  (`AmountField.tsx:60` `` `${label} ${formatWon(step)} 줄이기` ``, `87`, `134`, `157`,
  `216`, `244`). 스크린리더 사용자에게 기능이 온전히 전달된다.
- **label-input 연결 — PASS.** `useId()`로 생성한 id를 `htmlFor`/`id`로 묶는다
  (`AmountField.tsx:45,50,68` / `120,125,139` / `193,207,222`).
  `YesNoField`는 입력이 아닌 버튼 쌍이므로 `<fieldset>`+`<legend>`(280-281행)로 묶고
  `aria-pressed`(286,296행)로 선택 상태를 노출한다. 올바른 패턴이다.
- **오류 메시지 연결 — PASS.** `aria-invalid`와 `aria-describedby`가 오류 문단 id를
  가리킨다 (`AmountField.tsx:76-77,98` / `148-149,165` / `231-232,252`).
- **button vs div — PASS.** 모든 클릭 요소가 실제 `<button type="button">` 또는
  `next/link`의 `<Link>`다. 클릭 가능한 `div`는 없다.
- 금액 입력 보조: `AmountField.tsx:95`가 입력값을 "1억 2,340만원"으로 되짚어 보여준다.
  26-27행 주석의 "0이 몇 개인지 세지 않아도 되게 하려는 것" — 대상 사용자층을 정확히
  겨눈 배려다.
- **그래프와 숫자 설명 동시 제공 — PASS (UX 지침 명시 항목).**
  `AssetChart.tsx:86-92`가 `role="img"` + 서술형 `aria-label`을 달고,
  `202-222`의 `<figcaption>`이 최고 잔액·고갈 나이를 문장으로 다시 설명한다.
  그래프를 못 읽는 사용자도 결론을 얻을 수 있다.
- 평문 한국어: `ui.tsx:196-199`의 `TermHint`가 "매년 자산에서 꺼내 쓰는 비율" 예시를
  주석에 들고 있고, `AssetChart.tsx:217-219`는 "자산이 모두 소진될 것으로 계산됩니다"처럼
  쉬운 말을 쓴다.

**경미한 지적 (위반 아님, 정보):**

- `ui.tsx:153-166` — `ActionButton`의 `styles`가 `Record<string, string>`으로 선언되어
  `styles[variant] ?? styles.primary`의 `??` fallback이 필요해졌다. `Record<Tone,...>`
  처럼 `Record<'primary'|'secondary'|'danger', string>`으로 좁히면 fallback 없이
  타입으로 보장된다. 같은 파일 `TONE_VALUE`/`TONE_BOX`(54-66행)는 이미 그렇게 되어 있어
  일관성 차원의 지적이다. **법령 수치와 무관하므로 위험은 없다.**
- `AmountField.tsx:195` — `const PERCENT = 100;`이 컴포넌트 본문 안에 있다.
  `lib/format.ts:13`에 동일한 상수가 이미 있으므로 중복이다. 표시용 변환이라
  magic number 위반은 아니지만 정리 여지가 있다.
- `AmountField.tsx:74,146,229` — 파싱 실패 시 `onChange(0)`으로 되돌린다. 입력 중간
  상태(빈 문자열)에서 값이 0으로 튀어 지우고 다시 입력하기가 불편할 수 있다.
  기능·규칙 위반은 아니나 대상 사용자층을 고려하면 실제 기기 확인을 권한다.

### 3차: 법령 수치 교차검증 기준선 (`docs/statutory-research.md` 확인)

`docs/statutory-research.md`가 감사 중 추가되었다. `statutory.ts`가 등장하면 **아래 표를
그대로 대조 기준으로 쓴다.** 연구 문서 자체의 품질은 양호하다 — 항목마다 값·적용연도·
출처기관·URL·기준일·확인방법·신뢰도를 분리해 기록했고, 확인 못 한 것을 `UNVERIFIED`로
정직하게 남겼다.

**`confirmed(...)` 이 허용되는 값 (13종) — 이 값과 다르면 CRITICAL:**

| 항목 | 허용 값 | 기준일/라벨 주의 |
| --- | --- | --- |
| 종합소득세 기본세율표 | 6/15/24/35/38/40/42/45%, 누진공제 0·126만·576만·1,544만·1,994만·2,594만·3,594만·6,594만원 | **"2025년 귀속"으로 라벨링.** "2026년 세율"로 쓰면 위반 |
| 지방소득세 (원천징수분) | 소득세액의 10% | 원천징수 한정. 확정신고에 전용 금지 |
| 연금소득공제 | 350만/700만/1,400만 4구간, 한도 900만원 | |
| 사적연금 나이별 원천징수 | 70세 미만 5% / 70~80세 4% / 80세 이상 3% | |
| 종신형 연금 | 3% | 기준일 2026-01-01. **종전 4% 쓰면 위반** |
| 이연퇴직소득 | 70% / 60% / 50% | 기준일 2026-01-01. 20년 초과 50% 구간은 신설 |
| 사적연금 분리과세 기준 | 1,500만원 | 사적연금 전용. 국민연금 합산 판정 금지 |
| 건강보험료율 | 7.19% | 50% 분담은 **직장가입자만** |
| 지역 부과점수당 금액 | 211.5원 | **195.8원은 구버전 값 — 나오면 위반** |
| 장기요양보험료율 | 0.9448% | **산식 `건보료 × 0.9448 / 7.19`.** 소득에 직접 곱하면 위반 |
| 금융소득종합과세 기준 | 2,000만원 | |
| 이자·배당 원천징수 | 14% (지방세 포함 15.4%) | |
| 인적공제 | 기본 150만원 / 경로우대 100만 / 장애인 200만 / 부녀자 50만 / 한부모 100만원 | |
| 지역가입자 상·하한 | 4,591,740원 / 20,160원 | **13,980원·3,322,170원은 구버전 — 나오면 위반** |

**반드시 `pending()` 이어야 하는 값 (6종) — `confirmed()`면 CRITICAL:**

1. 지역가입자 **재산 부과점수표** — 점수표 자체가 미게재. 근사·보간 금지.
2. 소득 점수의 **연금소득 반영 비율(30%?)** — 출처가 195.8원을 적은 **구버전 페이지**다.
   은퇴자는 연금이 소득의 대부분이라 이 비율이 결과를 지배한다. 특히 주시할 값.
3. **국민연금 과세기준금액** — 공단 통보 개인별 값. "전액 과세" 가정은 세금 과대계상.
4. **지방소득세 종합소득 표준세율표** — 미확인 + 조례로 ±50% 가감 가능.
5. **표준세액공제** — 미확인.
6. **비과세 연금소득 열거** — 미확인. 장애·유족연금 임의 비과세 처리 금지.

교차검증 시 특히 볼 것: 연구 문서가 지적한 **연도 혼용 위험**(공단 사이트 자체가
갱신되지 않은 페이지에서 195.8원/10.25%/하한 13,980원을 노출한다)이 실재하므로,
`statutory.ts`의 각 값에 붙은 기준일이 위 표와 일치하는지 값과 함께 확인한다.

### 4차: `src/domain/tax/` 감사 — `types.ts` + `statutory.ts`

`types.ts`와 `statutory.ts`가 도착해 감사했다. `calculator.ts`/`estimator.ts`/테스트는
아직 없다 (진행 중).

#### 4-1. 법령 수치 교차검증 — **모든 값 PASS. 날조된 수치 0건.**

`statutory.ts`의 `confirmed()` **19개 전부**를 `docs/statutory-research.md`와 1:1 대조했다.
**값이 어긋난 항목은 하나도 없다.** 특히 연구 문서가 경고한 구버전 값
(195.8원 / 10.25% / 하한 13,980원 / 상한 3,322,170원 / 종신형 4%)이
**단 하나도 코드에 들어오지 않았다.**

| 항목 | statutory.ts | 연구 문서 | 판정 |
| --- | --- | --- | --- |
| 종합소득세 8구간 세율 | 6/15/24/35/38/40/42/45% (113-123행) | 동일 | PASS |
| 누진공제 | 0·126만·576만·1,544만·1,994만·2,594만·3,594만·6,594만 | 동일 | PASS |
| 세율표 라벨 | `'종합소득세 기본세율 (2025년 귀속)'` (124행) | "2025년 귀속으로 라벨링" 요구 | **PASS — 요구대로 지킴** |
| 지방소득세 원천징수 | 0.1 (136행) | 10% | PASS |
| 연금소득공제 4구간 | 350만/700만/1,400만, 40%/20%/10% (168-171행) | 동일 | PASS |
| 연금소득공제 한도 | 9,000,000 (179행) | 900만원 | PASS |
| 사적연금 나이별 | 70미만 5%/70~80 4%/80이상 3% (193-195행) | 동일 | PASS |
| 종신형 연금 | 0.03, asOf `2026-01-01` (204-207행) | 3%, 2026-01-01 (종전 4%) | **PASS — 구값 4% 미유입** |
| 사적연금 분리과세 기준 | 15,000,000 (217행) | 1,500만원 | PASS |
| 건강보험료율 | 0.0719 (253행) | 7.19% | PASS |
| 직장 본인부담 비율 | 0.5 (261행) | 각 50% | PASS |
| 부과점수당 금액 | **211.5** (269행) | 211.5원 | **PASS — 구값 195.8 미유입** |
| 장기요양보험료율 | 0.009448 (281행) | 0.9448% | PASS |
| 장기요양 산식 분모 | 0.0719 (288행) | `건보료 × 0.9448 / 7.19` | **PASS — 산식 구조 정확** |
| 지역 상한 | 4,591,740 (296행) | 4,591,740원 | **PASS — 구값 미유입** |
| 지역 하한 | 20,160 (303행) | 20,160원 | **PASS — 구값 13,980 미유입** |
| 금융소득종합과세 기준 | 20,000,000 (341행) | 2,000만원 | PASS |
| 이자·배당 원천징수 | 0.14 / 0.14 (348, 355행) | 14% | PASS |
| 기본공제 | 1,500,000 (366행) | 1명당 150만원 | PASS |
| 경로우대 추가공제 | 1,000,000 (374행) | 1명당 100만원 | PASS |

**`pending()` 6종 — 연구 문서가 요구한 항목과 정확히 일치. PASS.**

1. 지방소득세 확정신고 표준세율표 (142-148행) — 조례 ±50% 가감 사유까지 기록
2. 국민연금 과세기준금액 (229-233행) — "공단 통보 개인별 값" 명시
3. 비과세 연금소득 열거 (235-239행)
4. 지역 재산 부과점수표 (315-321행) — "점수표 없이는 계산할 수 없다"
5. **연금소득 반영 비율 (329-333행)** — 가장 위험한 값. `reason`에 "부과점수당 금액을
   195.8원으로 적은 과거 연도 페이지" 라고 근거까지 남겼다. **정확한 판단이다.**
6. 표준세액공제 (380-384행)

#### 4-2. 우회 경로 차단 — **PASS. 타입 수준에서 막았다.**

`types.ts:22-44`의 `StatutoryValue<T>` 판별 유니온에서 **`pending` 변이에는 `value`
필드가 아예 없다.** 주석(18-20행)이 의도를 명시한다: "타입 수준에서 `status` 를 확인하지
않고 값을 꺼내는 코드가 컴파일되지 않게 하기 위한 것이다. 기본값으로 대체하거나
`?? 0` 으로 우회하지 않는다." 이는 규칙을 문서가 아니라 **컴파일러가 강제**하게 만든
설계로, CLAUDE.md 요구를 넘어선다.

`types.ts:65-76`의 `Estimate<T>`도 `available`일 때만 `value`를 갖고, `unavailable`일 때는
`missing: MissingStatutoryItem[]`만 갖는다. **부분 계산 결과를 답처럼 내놓을 수 없는
구조다** (63행 주석이 이를 명시).

추가로 잘한 점:

- `types.ts:244` — `excludesPropertyPremium: true` 를 **리터럴 `true` 타입**으로 선언했다.
  재산보험료 미포함 사실을 결과 객체가 항상 들고 다니게 만들어, 화면이 이 사실을
  누락하기 어렵게 했다.
- `types.ts:210-213` — `monthlyIncome` 을 "이미 반영 비율이 적용된 소득월액" 으로 정의하고
  "반영 비율을 이 도메인에서 임의로 적용하지 않는다" 고 명시. `pending` 상태인 연금소득
  30% 를 몰래 적용하지 않겠다는 선언이며, 실제로 그런 코드가 없다.
- `types.ts:143-146` — 1,500만원 판정에 국민연금을 합산하지 말라는 경고를 입력 타입
  주석에 박아두었다. 연구 문서가 지적한 함정을 그대로 반영했다.
- `statutory.ts:14-16` — 파일 상단에 구버전 페이지(195.8원) 주의를 남겨 연도 혼용을 경계.

**`isConfirmed()` 구현 주의 (위반 아님, 관찰):** `statutory.ts:55-59`는
`entry.value !== null` 로 좁힌다. `statutory.ts`의 로컬 `PendingValue`(28-35행)는
`value: null` 을 갖고 있어 이 구현이 성립한다. 다만 `types.ts`의 `StatutoryValue`
(`pending` 에 `value` 없음)와 **형태가 다른 두 정의가 공존한다.** 아래 4-4 참조.

#### 4-3. 발견한 문제

**(1) MEDIUM — `source` URL이 연구 문서의 실제 출처와 다른 항목이 있다.**

값은 전부 옳지만, 근거 URL 일부가 그 값을 확인한 페이지를 가리키지 않는다.
CLAUDE.md는 `confirmed(값, 라벨, **출처**, 기준일)` 로 출처 기록을 요구하고,
화면에 출처를 표시하므로 사용자가 검증할 수 없게 된다.

- `statutory.ts:343,350,357` — 금융소득종합과세 기준·이자·배당 세율의 출처가
  `SOURCE.ntsTaxRate`(종합소득세 세율 안내 페이지)다. 연구 문서는 이 값들을
  국세상담센터(`call.nts.go.kr/.../CTG11775`)와 법제처 소득세법 제129조에서 확인했다
  (문서 243, 253, 263행). 세율표 페이지에는 이 값이 없다.
- `statutory.ts:368,376` — 기본공제·경로우대 공제의 출처도 `SOURCE.ntsTaxRate`다.
  연구 문서는 법제처 소득세법 제50조·제51조에서 확인했다 (문서 279, 289행).
- `statutory.ts:263,271,298,305` — `SOURCE.nhisPremium2026`이
  `nhis.or.kr/nhis/together/wbhaea01000m01.do?...articleNo=11008009` 인데, 연구 문서가
  실제로 인용한 URL은 `edi.nhis.or.kr/portal/images/popup/20251204_pop01longdesc.html`
  및 `nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html` 이다 (문서 180, 229행).
  코드의 URL은 연구 문서에 등장하지 않는다.
- `statutory.ts:71` — `mohwPremium2026`의 `mid` 파라미터가 `a10503010100`인데
  연구 문서(170행)는 `a10503000000`이다. 같은 게시물일 수 있으나 확인이 필요하다.

→ 값 자체는 위험하지 않으므로 CRITICAL이 아니다. 그러나 **출처는 이 프로젝트에서
값과 동등한 성분**이므로 연구 문서의 URL로 교정해야 한다.

**(2) MEDIUM — 장애인 추가공제가 `statutory.ts`에 없는데 `types.ts`는 요구한다.**

`types.ts:254,264`가 `disabledCount` / `disabledDeduction` 을 정의하지만,
`statutory.ts`에 `DISABLED_ADDITIONAL_DEDUCTION` 이 **없다** (`장애`로 검색해도
238행 비과세 연금 주석만 나온다). 연구 문서(297행)는 장애인 추가공제 200만원을
**CONFIRMED** 로 확보해 두었다.

부녀자 50만원·한부모 100만원도 마찬가지로 CONFIRMED인데 `statutory.ts`에 없다.

→ 아직 `calculator.ts`가 없어 실제 위반은 발생하지 않았다. 다만 **인적공제 계산을
구현할 때 이 값을 `statutory.ts` 밖에서 하드코딩하면 즉시 CRITICAL**이 된다.
`confirmed(2_000_000, ...)` 로 `statutory.ts`에 추가하는 것이 올바른 경로다.
`estimator` 구현 시 최우선 재감사 대상.

#### 4-4. HIGH — `StatutoryValue` 타입이 두 곳에 서로 다른 형태로 정의되어 있다

- `types.ts:22-44` — `pending` 변이에 **`value` 필드 없음** (우회를 타입으로 차단)
- `statutory.ts:28-37` — `PendingValue` 에 **`value: null` 있음**

두 정의가 이름은 같고 형태는 다르다. `statutory.ts`는 자기 정의를 쓰고 `types.ts`를
import 하지 않는다. 문제는 **`statutory.ts` 쪽 정의가 더 약하다**는 점이다:
`value: null` 이 존재하므로 `POINT_VALUE_WON.value ?? 0` 같은 코드가
**타입 검사를 통과한다.** `types.ts`가 세운 방어를 `statutory.ts`가 무력화한다.

또한 `types.ts`의 `pending` 은 `officialCalculator` 필드를 갖지만 `statutory.ts`의
`pending()` 은 3개 인자(label, source, reason)만 받아 그 필드를 만들지 않는다.
`MissingStatutoryItem`(types.ts:52-57)을 채우려면 이 값이 필요하다.

→ **`estimator.ts` 작성 전에 정리해야 한다.** `statutory.ts`가 `types.ts`의
`StatutoryValue` 를 import 해 쓰고, `pending()` 이 `officialCalculator` 를 받도록
통일하는 것이 맞다. 지금 상태로 `estimator` 를 쓰면 `?? 0` 우회가 컴파일되는
경로가 열려 있다. **CLAUDE.md가 명시적으로 금지한 우회다.**

#### 4-5. 아직 검증 못 한 것 (진행 중)

- `domain/tax/calculator.ts`, `estimator.ts`, `validation.ts` — 미존재.
  `status: 'unavailable'` 반환 동작을 **실제로 확인하지 못했다.** 타입은 준비되었으나
  런타임 동작은 별개다.
- `estimator.test.ts` / `estimator.resolved.test.ts` — **양쪽 모두 미존재.**
  CLAUDE.md가 두 파일을 명시적으로 요구한다.
- `/calculators/tax` 페이지 — 미존재. 부족 항목·출처·공식 계산기 링크 표시 미검증.
  (`statutory.ts:80-93`의 `OFFICIAL_CALCULATORS` 는 준비됨. 연구 문서 권고대로
  홈택스는 딥링크 대신 `https://www.hometax.go.kr` 메인을 쓴 것도 적절하다.)

### 부가 사항 (실패 아님)

`vitest.config.ts:1`이 CommonJS로 로드되는 파일에서 ESM 문법을 쓴다는 Vite 경고가
매 실행마다 출력된다. 향후 Vite 메이저에서 기본값이 바뀌면 깨질 수 있다.
`vitest.config.mts`로 확장자를 바꾸거나 `package.json`에 `"type": "module"`을 추가하면
해소된다.

---

## 반드시 고쳐야 할 것

### CRITICAL

1. **`npm run build` 실패 — `calculator.ts:60,62` TS2322 타입 오류.**
   `CLAUDE.md` "검증"은 빌드 통과를 필수로 규정한다. 현재 배포 불가 상태다.
   `BOUNDS`의 `as const` 리터럴 타입 때문에 `calculator.ts:45-46`의 `low`/`high`가
   리터럴 타입으로 추론되어 이분탐색 대입이 거부된다. `let low: number = ...`,
   `let high: number = ...`로 고친다. **`BOUNDS`에서 `as const`를 떼지 말 것** —
   그러면 magic number 관리가 느슨해진다.

2. ~~**`npm test` 실패 — `calculator.test.ts:156`, `calculator.test.ts:223`.**~~
   **→ 해소됨 (감사 중 `test` 에이전트가 수정, 최종 194/194 통과).**
   기록: 두 단정 모두 자산이 고갈되는 입력에서 `assetsAtLifeExpectancy`(항상 0)를
   비교해 실패했다. 향후 유사 테스트를 쓸 때 `simulator.ts:89`의 0 하한 때문에
   고갈 입력에서는 이 지표가 무의미하다는 점을 기억할 것 —
   `depletionAge` / `totalShortfall`을 쓴다. `simulator.ts:89`의 0 하한은
   `CLAUDE.md` 확정 가정이므로 변경 금지.

### HIGH

3. **`domain/tax/statutory.ts` 미존재 — 최중요 규칙이 아직 검증 불가.**
   현재 날조된 법령 수치는 없지만, 그것은 세금 기능이 없기 때문이다.
   `dev`가 `domain/tax/`를 올리는 즉시 다음을 재감사해야 한다.
   `pending()`/`confirmed(값,라벨,출처,기준일)` 구현, 값이 하나라도 `null`일 때
   `status: 'unavailable'` 반환, **기본값 대체나 우회 경로가 없는지.**
   `/calculators/tax` 화면에 부족 항목·출처·공식 계산기 링크가 표시되는지도 확인 대상.

4. ~~**결과 화면의 "세금·건강보험료 미포함" 문구 — 아직 존재 여부 확인 불가.**~~
   **→ 해소됨. PASS.** `RetirementResult.tsx:386` 에
   `<strong>세금과 건강보험료는 아직 반영되지 않았습니다.</strong>` 가 있고,
   "이 계산이 다루지 않는 것" 안내 상자(384행) 안에 CLAUDE.md 「확정된 계산 가정」의
   나머지 항목도 함께 공개된다 — 연금 명목액 보수 가정(390-393행),
   은퇴 전 인출·추가저축 없음(395행), 물가·투자수익률이 **가정값**이며 변경 가능(398-399행).
   또한 `LabeledValue` 라벨이 `'물가상승률 (가정)'`·`'투자수익률 (가정)'`(364, 368행)로
   가정임을 명시한다. **가정과 사실의 구분이 화면에서도 지켜졌다.**

5. ~~**`services/retirementStorage.ts` 미존재 — 저장 경로 검증 불가.**~~
   **→ 해소됨.** 감사 중 파일이 추가되어 검증했고 **PASS**다. localStorage 전용,
   서버 전송 없음, `catch` 블록에서 오류를 로그로 남기지 않음. 상세는
   "재실행 결과 (최종)" 절 참조.

### MEDIUM

6. **`CLAUDE.md` "Current Implementation State > 구현 완료"가 실제 코드와 크게 불일치.**
   계산기 wizard, `/my-retirement`, 세금 계산기, 콘텐츠 9편, MVP 10페이지가
   "구현 완료"로 적혀 있으나 코드에 없다. `CLAUDE.md`는 "작업을 시작하기 전에 여기를
   먼저 확인"하라고 규정하므로, 부정확한 상태 기록은 후속 작업자를 오도한다.
   작업이 안정되면 실제 상태로 갱신할 것.

7. **`/login`, `/signup` 생성 시 "준비 중" 안내만 둘 것.**
   현재 미존재이므로 위반은 없다. 동작하지 않는 폼을 동작하는 것처럼 보이게 만드는 것은
   `CLAUDE.md`의 명시적 금지사항이다.

8. **`next.config.mjs`에 `turbopack.root` 설정.**
   빌드 시 Next가 홈 디렉터리(`/Users/jiwon`)의 `package-lock.json`을 발견해 무시한다는
   경고가 나온다. 빌드 실패 원인은 아니지만 프로젝트 루트 인식이 어긋나 있다.

9. **`vitest.config.ts` ESM/CJS 경고.**
   `vitest.config.mts`로 변경하거나 `package.json`에 `"type": "module"` 추가.

10. **테스트 파일 구성 (`test` 에이전트 작업 중일 수 있음).**
    `calculator.test.ts` 하나가 `calculator` / `simulator` / `validation` 세 모듈을
    모두 커버한다. `CLAUDE.md`의 도메인 모듈 구조에 맞춰 분리를 권한다.
    표시 단위 상수 `EOK`(`validation.ts:23`, 함수 내부)와 `MAN_WON`(모듈 스코프)의
    배치 일관성도 함께 정리하면 좋다.

---

## 요약

날조된 법령 수치, `any`, 금융정보 로깅, 서버 전송, 무단 의존성, UI 내 금융 계산,
가짜 인증 폼, 상품 추천 — **하드 룰 위반은 하나도 발견되지 않았다.** 존재하는 도메인
코드의 품질은 규칙에 충실하다(가정/사실 분리, `policy.ts` 단일 관리, 평문 한국어,
`noUncheckedIndexedAccess`까지 적용). 감사 중 추가된
`services/retirementStorage.ts`와 `lib/format.ts`도 각각 저장 방침과 UI/domain 분리
규칙을 정확히 지켰다.

**최종 검증 상태:**

- `npm test` — **통과 (194/194).** 1차 실패 2건은 감사 도중 `test` 에이전트가 수정했다.
- `npm run build` — **실패.** `calculator.ts:60,62` TS2322. 유일하게 남은 CRITICAL이며
  `CLAUDE.md`는 빌드 통과를 필수로 규정한다. `BOUNDS`의 `as const` 리터럴 타입 때문에
  이분탐색의 `low`/`high` 대입이 거부되는 실제 타입 버그다.

가장 중요한 규칙(법령 수치)의 PASS는 **"세금 기능이 아직 없다"는 사실에 기댄 것**이며,
`domain/tax/`가 등장하면 재감사가 필수다. 결과 화면의 "세금·건강보험료 미포함" 문구와
`/login`·`/signup`의 "준비 중" 처리도 해당 UI가 생긴 뒤에야 검증할 수 있다.

---

# 최종 감사 (2026-08-05, 이어서 마무리)

`dev`·`test`·`verify`·조사 agent 4개가 모두 session limit 으로 중단된 뒤,
남은 감사 항목(콘텐츠·연금 페이지·a11y·핵심 흐름)을 직접 수행하고 결과를 기록한다.

## 최종 검증 수치

- `npm test` — **364 passed (12 files)**
- `npx tsc --noEmit` — **0 errors**
- `npm run build` — **성공. 20개 페이지 prerender** (MVP 10 + 콘텐츠 9 + _not-found)
- `npm audit` — **0 vulnerabilities**

## 7. 상품 추천·단기 전망 — PASS

`src/content/articles.ts` 전수 검사. `추천|매수|매도|종목|주가|전망|오를|내릴` 패턴의
실질적 위반 0건. 검색된 2건은 파일 자체의 금지 주석(8행)과
사칭 경고 문구(421행: "이 사이트는 금융상품을 판매하거나 추천하지 않습니다")다.

## 1-b. 콘텐츠 내 법령 수치 — PASS

본문의 백분율은 모두 (a) 가정으로 명시된 값(물가 2%, 수익률 3%) 또는
(b) 사용자 입력에서 파생된 산술(4.8% = 2,400만÷5억)이다. 날조된 세율·공제액 0건.
223행·299행은 오히려 "확인되지 않은 수치를 임의로 쓰지 않는다" 고 명시하고
국민연금공단·국세청 확인을 안내한다.

## `/pension` — PASS (수치 0건)

페이지 전체에 **숫자가 하나도 없다.** 증액률·감액률·수령액 산식 없음.
개념 설명 + `nps.or.kr` 공식 링크만 제공한다. 이 페이지에서 임의 수치는
가장 위험하므로 이 상태가 옳다.

## 9. UX·a11y — 9개 페이지 자동 검사 후 2건 수정

검사 결과(전 페이지): 라벨 없는 입력 **0**, 접근명 없는 컨트롤 **0**,
클릭 가능한 div **0**, `h1` 각 1개, `lang="ko"`.
`/login`·`/signup` 은 입력 요소 **0개** — 가짜 폼 없음(하드룰 준수 재확인).

수정한 2건:
1. **`body` 기본 글자 크기가 16px 였다.** Tailwind `text-base` 를 18px 로 넓혀두고
   `body` 에 적용하지 않아, 크기 클래스가 없는 요소가 브라우저 기본값으로 떨어졌다.
   → `globals.css` 에서 `body` 에 `text-base` 적용. 실측 18px 확인.
2. **헤더 로고 링크 높이가 38px 였다** (44px 미만). → `min-h-touch` 적용.
   실측 결과 상호작용 요소 17개 중 44px 미만 **0개**.

## 핵심 흐름 — 브라우저로 4단계 완주 확인

`/retirement-calculator` 를 실제로 1→4단계 입력하고 결과까지 확인했다.
표시값을 손계산과 대조해 일치를 확인했다.

- 60세 자산 `5억 × 1.03^5 = 579,637,037` → 화면 "5억 7,963만원" ✓
- 60세 월 생활비 `300만 × 1.02^5 = 3,312,242` → 화면 "331만 2,242원" ✓
- 60세 월소득 0원 (국민연금 65세 개시) ✓

결과 화면 필수 요소 전부 확인: 4개 핵심 숫자, 세금·건강보험료 미포함 문구,
SVG 그래프(`role="img"` + 숫자 `figcaption`), 가정 표시, 생활비·은퇴시점 비교,
시나리오 3종, 저장. `NaN` 없음.

## 이번에 발견해 고친 버그 3건

### (A) 깨진 저장 계획이 "자산이 유지됩니다" 로 표시됨 — 최고 심각도

`isSavedPlan` 이 `input` 안쪽 필드를 검증하지 않아 손상된 계획도 로드된다.
그대로 `simulate()` 에 넣으면 `projections: []` → `depletionAge: null` →
화면은 null 을 "◯◯세 이후까지 유지" (좋은 결과) 로 표시한다.
즉 **깨진 데이터가 사용자를 안심시켰다.** NaN 노출보다 위험하다.

→ `SavedPlanList.tsx` 에서 `simulate()` 전에 `validateRetirementInput()` 으로 차단.
검증 실패 시 숫자를 만들지 않고 "값을 읽을 수 없습니다" + 삭제 버튼을 보여준다.
브라우저에서 정상/깨진 계획을 나란히 두고 확인했다.
회귀 테스트 `simulator.corrupt.test.ts` 13건 추가.

### (B) 월 생활비 0원으로 결과 도달 가능

0원이면 부족금액도 0이 되어 "연금 수입만으로 생활비를 채울 수 있습니다" 라는
잘못된 안내가 나왔다(소득도 0원인데). 은퇴 후 생활비 0원은 실재하지 않는다.

→ `BOUNDS.monthlyLivingCost = { min: 100_000, ... }` 를 별도로 두고
   `validation.ts` 가 이 하한을 쓰게 했다. 연금·기타소득·의료비는 0원을 계속 허용한다.
   `RetirementResult.tsx` 의 안내 문구도 소득 0원인 경우를 구분하게 고쳤다.
   테스트 4건 추가. 브라우저에서 4단계 진행 차단 확인.

### (C) 오류 메시지의 조사·하한이 틀림

"월 생활비**은** **0원**보다 작을 수 없습니다" — 조사가 어색하고, 실제 하한은 10만원인데
0원이라고 안내했다.

→ 한글 종성을 판별해 은/는 을 붙이는 `withTopicParticle()` 추가,
   메시지가 실제 `bounds.min` 을 쓰게 수정.
   결과: "월 생활비는 10만원 이상으로 입력해 주세요."

## 남은 사항 (기능 아님)

- `estimateNationalPensionTax` 의 `_annualPublicPension` 인자는 현재 쓰이지 않는다.
  과세기준금액이 `confirmed` 되면 사용된다. 시그니처를 미리 맞춰 둔 것이다.
- 세금 계산기는 여전히 6개 항목을 계산하지 않는다. 이는 설계이며
  `statutory-research.md` 의 근거에 따른 것이다. 미완성으로 보고하지 않는다.
