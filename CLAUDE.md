# Retirement Finance Portal

## Project Goal

대한민국의 **은퇴 예정자와 은퇴자를 위한 금융·노후생활 포털**을 개발한다.

이 서비스는 주식 종목 추천이나 단기 투자정보 제공이 목적이 아니다.

핵심 질문은 다음과 같다.

> **"현재 자산과 연금으로 은퇴 후 매달 얼마를 사용할 수 있으며, 내 자산은 언제까지 유지될 수 있는가?"**

서비스의 중심은 `총자산`보다 **은퇴 후 월 현금흐름과 자산 지속 가능성**이다.

---

## Target Users

주요 사용자는 50~70대이다.

* 50대: 은퇴 준비, 퇴직금, 국민연금, IRP, 연금저축
* 60대: 은퇴 후 생활비, 연금 수령, 자산 인출
* 70대 이상: 의료비, 간병비, 주택연금, 상속·증여, 금융사기 예방

서비스는 금융 지식이 많지 않은 사용자도 쉽게 사용할 수 있어야 한다.

---

## Product Principles

모든 기능은 다음 원칙을 따른다.

1. 투자 수익률보다 **은퇴 생활의 지속 가능성**을 우선한다.
2. 자산 규모보다 **월 소득·월 지출·부족금액**을 강조한다.
3. 복잡한 금융 용어를 쉬운 표현으로 설명한다.
4. 특정 금융상품 매수를 직접 추천하지 않는다.
5. 계산 결과와 사용된 가정을 명확하게 보여준다.
6. 금융·세금·연금 제도처럼 변경 가능한 정보에는 기준일을 관리한다.
7. 50~70대가 편하게 사용할 수 있는 UI를 만든다.
8. 기능을 과도하게 확장하지 말고 MVP 목표를 우선한다.

---

## Core User Experience

가장 중요한 사용자 흐름은 다음과 같다.

```text
사이트 방문
  ↓
현재 나이 / 은퇴 나이 입력
  ↓
금융자산 입력
  ↓
국민연금 / 개인연금 입력
  ↓
예상 생활비 입력
  ↓
은퇴 시뮬레이션
  ↓
예상 월소득
월 부족금액
자산 고갈 예상 나이
  ↓
생활비·은퇴시점 변경 비교
  ↓
결과 저장
```

사용자가 가장 먼저 이해해야 할 숫자는 다음 4개다.

* 예상 은퇴 월소득
* 예상 월 생활비
* 월 부족금액
* 예상 자산 유지 기간

---

## Core Features

우선순위는 다음과 같다.

### P0

* 은퇴자금 계산기
* 자산 고갈 시점 계산
* 은퇴 월 현금흐름 분석
* 생활비 변경 시뮬레이션
* 결과 저장

### P1

* 개인 은퇴 대시보드
* 국민연금 정보 및 시뮬레이션
* 퇴직연금 / IRP
* 주택연금
* 은퇴 생활비 분석
* 세금 계산기

### P2

* 의료비·간병비 시나리오
* 상속·증여
* 금융사기 예방
* AI 은퇴 상담
* 전문가 상담 연결

---

## Main Content Categories

콘텐츠는 다음 영역을 중심으로 구성한다.

* 은퇴 준비
* 국민연금
* 퇴직연금 / IRP / 연금저축
* 은퇴 생활비
* 예금 / 채권 / ETF / 배당
* 세금 / 건강보험료
* 주택연금 / 주거
* 의료비 / 간병비
* 상속 / 증여
* 금융사기 예방

단기 주가 전망이나 종목 추천 중심의 콘텐츠는 만들지 않는다.

질문형 콘텐츠를 우선한다.

예:

* 5억원으로 은퇴할 수 있을까?
* 국민연금 200만원이면 생활이 가능할까?
* 60세에 은퇴하면 얼마가 필요할까?
* 한 달에 얼마까지 사용해도 될까?
* 국민연금을 늦게 받으면 얼마나 유리할까?

---

## Retirement Simulation

은퇴 시뮬레이션은 대략 다음 구조를 따른다.

```text
다음 자산
=
현재 금융자산
+ 투자수익
+ 연금수입
+ 기타소득
- 생활비
- 세금
- 의료비
```

연도별 또는 월별로 반복 계산하여 자산 변화를 추적한다.

반드시 고려할 수 있도록 설계한다.

* 은퇴 시작 나이
* 기대수명
* 금융자산
* 연금 개시 나이
* 국민연금
* 퇴직/개인연금
* 월 생활비
* 물가상승률
* 예상 투자수익률
* 의료비
* 기타소득

보수적 / 기준 / 낙관적 시나리오 비교를 지원할 수 있는 구조로 만든다.

---

## Financial Calculation Rules

금융 계산은 **LLM이 직접 수행하지 않는다.**

```text
User Input
   ↓
Calculation Engine
   ↓
Structured Result
   ↓
LLM Explanation
```

계산은 deterministic한 애플리케이션 코드에서 수행한다.

LLM은 결과 설명, 비교, 사용자 친화적 표현에 사용한다.

금융 계산 코드에는 반드시 테스트를 작성한다.

세율, 연금 규칙, 공제금액 등의 값은 코드에 흩어놓지 말고 별도의 정책/config 영역에서 관리한다.

최신성이 필요한 금융·세금·연금 정보를 임의로 추정하거나 만들어내지 않는다.

---

## UX Guidelines

50~70대 사용자를 우선 고려한다.

* 본문 글자는 충분히 크게 사용한다.
* 클릭 영역과 버튼은 크게 만든다.
* 작은 아이콘만으로 기능을 표현하지 않는다.
* 한 화면에서 너무 많은 값을 입력받지 않는다.
* 복잡한 입력은 단계별 wizard 형태를 우선한다.
* 중요한 금액은 시각적으로 명확하게 강조한다.
* 그래프와 함께 숫자 설명을 제공한다.
* 전문용어는 가능한 한 쉬운 한국어로 풀어서 표현한다.

예:

`Withdrawal Rate` 대신
`매년 자산에서 꺼내 쓰는 비율`

---

## MVP Pages

초기에는 다음 페이지를 중심으로 한다.

```text
/
/retirement-calculator
/my-retirement
/pension
/calculators
/articles
/articles/[slug]
/login
/signup
```

초기 버전에서는 기능 완성도를 페이지 수보다 우선한다.

---

## Recommended Tech Stack

초기 구현 기준:

### Frontend / Full Stack

* Next.js (App Router) — 사용 중
* React — 사용 중
* TypeScript strict — 사용 중
* Tailwind CSS — 사용 중
* Vitest — 사용 중 (domain 테스트)
* shadcn/ui — 아직 도입하지 않았다. 현재 컴포넌트는 Tailwind로 직접 작성했다.
  도입할 경우 기존 컴포넌트와 스타일이 섞이지 않도록 범위를 정해 진행한다.

### Data

* PostgreSQL — **아직 도입하지 않았다.** 현재 저장은 localStorage만 사용한다.
  서버 저장이 실제로 필요해지는 시점(회원 기능)에 함께 결정한다.

필요성이 명확해지기 전에는 Redis, Elasticsearch, Kafka 등의 인프라를 추가하지 않는다.
차트 라이브러리도 마찬가지다. 현재 그래프는 의존성 없이 SVG로 그리고 있다.

복잡한 MSA보다 **단순한 modular monolith 구조**를 우선한다.

---

## Code Structure

비즈니스 계산과 UI를 분리한다.

현재 구조:

```text
src/
├── app/                    # 페이지 (App Router)
├── components/             # UI. 금융 계산 로직을 넣지 않는다
├── content/                # 콘텐츠 데이터
├── domain/
│   ├── retirement/         # 은퇴 시뮬레이션
│   └── tax/                # 세금·건강보험료
├── services/               # 저장 등 외부 연동
└── lib/                    # 포맷 등 표시용 유틸
```

`pension/` 은 아직 없다. 연금은 현재 `retirement/` 의 입력값으로 다루고 있으며,
국민연금 상세 계산이 필요해지는 시점에 별도 도메인으로 분리한다.

도메인 모듈은 다음 형태를 따른다.

```text
domain/retirement/
├── types.ts
├── policy.ts               # 가정값·상한. magic number는 여기에만 둔다
├── simulator.ts            # 연도별 자산 변화
├── calculator.ts           # 파생 계산 (지속가능 생활비, 비교)
├── validation.ts
└── calculator.test.ts

domain/tax/
├── types.ts
├── statutory.ts            # 법령 수치. 아래 규칙 참고
├── calculator.ts           # 순수 계산 함수
├── estimator.ts            # 수치를 모아 결과 생성
├── validation.ts
├── calculator.test.ts
├── estimator.test.ts
└── estimator.resolved.test.ts
```

React component 내부에 복잡한 금융 계산 로직을 작성하지 않는다.
컴포넌트는 domain 함수를 호출하고 결과를 표시하는 역할만 한다.

---

## Coding Rules

* TypeScript strict mode를 사용한다.
* 불필요한 `any` 사용을 피한다.
* 컴포넌트와 함수는 하나의 책임을 갖도록 작성한다.
* UI와 domain logic을 분리한다.
* 금융 계산 로직에는 unit test를 작성한다.
* magic number를 사용하지 않는다.
* 입력 데이터 validation을 수행한다.
* 민감한 금융정보를 로그에 기록하지 않는다.
* 기능 추가 전에 기존 구조와 재사용 가능한 코드를 먼저 확인한다.
* 불필요한 dependency를 추가하지 않는다.
* 요구되지 않은 대규모 refactoring을 하지 않는다.

---

## Security & Privacy

초기 서비스에서는 필요한 최소한의 개인정보만 저장한다.

가능하면 다음 정보는 수집하지 않는다.

* 주민등록번호
* 계좌번호
* 카드번호
* 금융기관 로그인 정보

사용자가 직접 입력한 자산 총액과 연금 정보 중심으로 서비스를 구성한다.

민감정보를 console, application log, analytics 등에 남기지 않는다.

---

## Monetization Direction

초기 목표는 수익화보다 **사용자 신뢰와 트래픽 확보**다.

향후 수익화 후보:

* Premium 은퇴 시뮬레이션
* 개인 은퇴 분석 보고서
* AI 은퇴 상담
* 전문가 상담 연결
* 세무 / 상속 / 실버타운 등의 제휴
* 관련 콘텐츠 광고

금융상품 판매 또는 추천 기능은 관련 규제 검토 없이 구현하지 않는다.

---

## Current Implementation State

기준일: 2026-08-05

이 섹션은 이미 내려진 결정을 기록한다.
작업을 시작하기 전에 여기를 먼저 확인하고, 여기 있는 결정을 되돌리는 변경은
요청받지 않은 한 하지 않는다.

검증 상태: `npm test` 364건 통과, `npx tsc --noEmit` 오류 0, `npm run build` 성공,
`npm audit` 취약점 0. 감사 결과는 `docs/verification-report.md` 에 있다.

### 구현 완료

* 은퇴 계산기 (4단계 wizard) — `/retirement-calculator`
* 자산 고갈 시점, 월 부족금액, 지속가능 월 생활비
* 생활비·은퇴시점 변경 비교, 시나리오 3종 비교
* 결과 저장·불러오기, 저장된 계획 대시보드 — `/my-retirement`
* 세금·건강보험료 계산기 — `/calculators/tax`
  확인된 법령 수치로 계산하고, 확인되지 않은 6개 항목은 계산을 거부한다.
  근거는 `docs/statutory-research.md`.
* 콘텐츠 9편, MVP 페이지 10개
* 자산 변화 그래프 — 의존성 없이 SVG 로 직접 그린다 (`components/AssetChart.tsx`)

### 미구현

* 회원 기능 — `/login`, `/signup` 은 "준비 중" 안내 화면이다.
  동작하지 않는 폼을 동작하는 것처럼 보이게 만들지 않는다.
* PostgreSQL — 아직 도입하지 않았다. 서버 저장이 실제로 필요해지는 시점에 넣는다.
* 국민연금 상세 시뮬레이션, 주택연금 수령액 계산
* 은퇴 시뮬레이터에 세금·보험료 반영 (`statutory.ts` 확정 후 연결)

### 되돌리지 말아야 할 결정

작업하다 "고칠 것" 처럼 보이지만 의도적으로 그렇게 둔 것들이다.

* **세금 계산기가 6개 항목을 계산하지 않는다.** 버그가 아니다.
  재산 부과점수표·연금소득 반영 비율·국민연금 과세기준금액·지방소득세 표준세율표·
  표준세액공제·비과세 연금소득 열거는 공식 1차 출처로 확인하지 못해 `pending()` 이다.
  기본값이나 `?? 0` 으로 채우지 않는다. `types.ts` 의 `StatutoryValue` 는
  `pending` 에 `value` 필드가 아예 없어 그런 우회가 컴파일되지 않는다. 이 설계를 유지한다.
* **`depletionAge` 와 `assetSustainYears` 의 `null` 은 "자산이 유지됨" 이다.**
  가장 좋은 결과다. `0` 은 즉시 고갈, 최악이다. 표시는 반드시
  `lib/format.ts` 의 `formatSustainability()` 를 거친다. null 을 "0년" 으로 표시하면 안 된다.
* **저장된 계획은 `simulate()` 전에 반드시 검증한다** (`SavedPlanList.tsx`).
  저장소는 `input` 이 객체인지만 확인하므로 깨진 계획도 로드된다. 검증 없이 계산하면
  `projections` 가 비어 `depletionAge` 가 null 이 되고, 화면이 깨진 데이터를
  "자산이 유지됩니다" 로 표시한다. 회귀 테스트는 `simulator.corrupt.test.ts`.
* **월 생활비는 0원을 허용하지 않는다** (`BOUNDS.monthlyLivingCost`, 하한 10만원).
  0원이면 부족금액도 0이 되어 잘못된 안내가 나온다.
  연금·기타소득·의료비는 0원을 계속 허용한다.

### 확정된 계산 가정

`domain/retirement/simulator.ts` 에 구현되어 있다. 바꿀 때는 테스트를 함께 수정한다.

* 은퇴 전에는 자산을 인출하지 않고 투자수익만 반영한다. 추가 저축은 가정하지 않는다.
* 생활비·의료비 입력값은 현재 물가 기준으로 보고 매년 물가상승률을 누적 적용한다.
* 연금은 개시 나이부터 발생하며, 물가에 연동되지 않는 명목액으로 본다 (보수적 가정).
* 자산은 0 미만으로 내려가지 않는다. 채우지 못한 금액은 `shortfall` 로 기록한다.
* 의료비는 `HEALTHCARE.startAge` 이후부터 생활비에 더해진다.
* 세금·건강보험료는 은퇴 시뮬레이션에 아직 포함되지 않는다.
  이 사실을 결과 화면에 명시하고 있으므로, 반영하게 되면 그 문구도 함께 고친다.

### 법령 수치 규칙 (중요)

**가정과 사실을 구분한다.**

투자수익률 3% 는 가정이다. 화면에 가정으로 표시되고 사용자가 바꿀 수 있다.
세율과 보험료율은 사실이다. 짐작한 값은 그럴듯해 보이는 틀린 금액을 만들고,
사용자는 그것을 근거로 연금 개시 시점처럼 되돌리기 어려운 결정을 한다.

따라서 세율·공제액·보험료율·점수표는 **추정하거나 기억에 의존해 채우지 않는다.**

* 법령 수치는 `domain/tax/statutory.ts` 한 곳에만 둔다.
* 확인 전에는 `pending()`, 공식 출처로 확인한 뒤에만 `confirmed(값, 라벨, 출처, 기준일)`.
* 하나라도 `null` 이면 계산기는 결과를 내지 않고 `status: 'unavailable'` 을 반환한다.
  이 동작을 우회하거나 기본값으로 대체하지 않는다.
* 화면에는 부족한 항목과 출처, 공식 계산기 링크를 표시한다.

같은 원칙을 다른 제도 수치에도 적용한다 (국민연금 증액률, 주택연금 수령액 산식 등).

### 저장 방식

* 사용자 입력은 `localStorage` 에만 저장한다 (`services/retirementStorage.ts`).
* 서버로 전송하지 않는다. 저장 실패 시에도 금융정보를 로그에 남기지 않는다.
* 이 방침을 바꾸는 것은 회원 기능·DB 도입과 함께 결정할 사안이다.

### 검증

변경 후 아래를 통과해야 한다.

```bash
npm test        # domain 계산 테스트
npm run build   # 타입 체크 포함
```

* 금융 계산을 수정하거나 추가하면 테스트를 함께 쓴다.
* 법령 수치가 채워지기 전의 동작(`estimator.test.ts`)과
  채워진 뒤의 동작(`estimator.resolved.test.ts`) 양쪽을 유지한다.
* UI 변경은 실제로 실행해 확인한다. 페이지가 열리는 것과
  입력·결과가 동작하는 것은 다르다.

---

## Development Priorities

새로운 기능을 개발할 때 다음 순서로 판단한다.

1. 은퇴자의 실제 의사결정에 도움이 되는가?
2. 현재 MVP 핵심 흐름과 관련 있는가?
3. 계산 근거가 명확한가?
4. 사용자가 쉽게 이해할 수 있는가?
5. 기존 기능으로 해결할 수 없는가?

우선순위가 불분명하면 기능을 추가하기보다 기존 핵심 흐름을 개선한다.

---

## Product Vision

이 프로젝트는 장기적으로 단순 금융정보 사이트가 아니라

> **은퇴 이후의 돈과 생활을 관리하는 Retirement OS**

를 지향한다.

장기 확장 영역은 금융 → 연금 → 세금 → 건강 → 주거 → 상속 → 여가 → 재취업 순으로 고려한다.

그러나 현재의 최우선 목표는 하나다.

> **사용자가 자신의 자산과 연금을 입력하면, 은퇴 후 매달 얼마를 사용할 수 있고 자산이 언제까지 유지되는지를 쉽게 이해할 수 있게 만든다.**


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
