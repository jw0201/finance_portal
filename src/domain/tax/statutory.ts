/**
 * 법령 수치. **이 파일이 유일한 보관 장소다.**
 *
 * CLAUDE.md "법령 수치 규칙" 을 따른다.
 *
 * - 세율·공제액·보험료율·점수표는 추정하거나 기억에 의존해 채우지 않는다.
 * - 확인 전에는 `pending(...)`. 공식 출처로 확인한 뒤에만 `confirmed(...)`.
 * - 하나라도 pending 이면 계산기는 결과를 내지 않고 `status: 'unavailable'` 을 반환한다.
 *
 * 근거는 `docs/statutory-research.md` 에 항목별로 정리되어 있다.
 * 값을 고칠 때는 그 문서와 기준일을 함께 고친다.
 *
 * 주의: 공단·국세청 사이트에도 갱신되지 않은 페이지가 남아 있다.
 * (예: 부과점수당 금액을 195.8원, 보험료율을 10.25% 로 적은 구버전 페이지)
 * 그래서 값마다 `asOf` 와 `appliesTo` 를 붙인다.
 */

import type { DeductionBracket, StatutoryValue, TaxBracket } from './types';

// ---------------------------------------------------------------------------
// 생성자
// ---------------------------------------------------------------------------

/** 공식 출처로 확인한 값을 기록한다. */
function confirmed<T>(
  value: T,
  label: string,
  source: string,
  asOf: string,
  appliesTo: string,
): StatutoryValue<T> {
  return { status: 'confirmed', value, label, source, asOf, appliesTo };
}

/**
 * 확인하지 못한 값을 기록한다.
 *
 * 짐작한 값을 넣지 않는다. 반환된 객체에는 `value` 필드가 아예 없으므로
 * `?? 0` 같은 우회가 타입 수준에서 막힌다.
 */
function pending<T>(
  label: string,
  source: string,
  reason: string,
  officialCalculator: string | null = null,
): StatutoryValue<T> {
  return { status: 'pending', label, source, reason, officialCalculator };
}

// ---------------------------------------------------------------------------
// 출처
// ---------------------------------------------------------------------------

/**
 * 조사에 실제로 열어 확인한 출처 URL.
 *
 * **각 값의 출처는 그 값이 실제로 적혀 있던 페이지여야 한다.**
 * 예를 들어 기본공제 150만원은 종합소득세 "세율" 페이지에 없다.
 * 편의를 위해 한 URL 을 여러 값에 돌려쓰면, 나중에 검증하려는 사람이
 * 링크를 열어도 숫자를 찾지 못한다. 그러면 확인된 값이 아니게 된다.
 *
 * 항목별 근거는 `docs/statutory-research.md` 에 정리되어 있다.
 */
const SOURCE = {
  /** 국세청 종합소득세 세율 (귀속연도별 세율표·누진공제). */
  ntsTaxRate:
    'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7667&mi=2227',
  /** 국세청 연금소득 원천징수 (나이별 세율·종신형·분리과세 한도). */
  ntsPension:
    'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6608&cntntsId=7888',
  /** 국세청 연금소득금액 계산방법 (연금소득공제 4구간·한도 900만원). */
  ntsPensionDeduction:
    'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7889&mi=6609',
  /** 국세청 연금소득 개요 (공적연금 과세기준일 2002-01-01). */
  ntsPensionOverview:
    'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6449&cntntsId=7885',
  /** 국세청 원천징수 개요 (지방소득세 = 소득세액의 10%). */
  ntsWithholdingOverview:
    'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2289&cntntsId=7701',
  /** 국세청 국세상담센터 금융소득 (종합과세 기준금액 2,000만원). */
  ntsFinancialIncome:
    'https://call.nts.go.kr/call/qna/selectQnaInfo.do?mi=1441&ctgId=CTG11775',
  /** 법제처 소득세법 제129조 (원천징수세율 — 이자·배당 14%). */
  lawIncomeTaxAct129:
    'https://www.law.go.kr/LSW//lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000821176&lsId=001565&print=print',
  /** 법제처 소득세법 제50조 (기본공제 150만원·소득요건). */
  lawIncomeTaxAct50:
    'https://www.law.go.kr/LSW/lsLawLinkInfo.do?lsJoLnkSeq=1000027481&chrClsCd=010202',
  /** 법제처 소득세법 제51조 (추가공제 — 경로우대 100만원·장애인 200만원). */
  lawIncomeTaxAct51:
    'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1021859449&chrClsCd=010202&ancYnChk=',
  /** 보건복지부 보도자료 "2026년 건강보험료율 7.19%로 결정" (2025-08-28 의결). */
  mohwPremium2026:
    'https://www.mohw.go.kr/board.es?mid=a10503000000&bid=0027&list_no=1487279&act=view',
  /** 국민건강보험공단 2026년도 보험료율 인상 안내 (7.19%·211.5원·0.9448%). */
  nhisPremium2026:
    'https://edi.nhis.or.kr/portal/images/popup/20251204_pop01longdesc.html',
  /** 국민건강보험공단 2026년 달라지는 제도 리플릿 (상한 4,591,740원·하한 20,160원). */
  nhisLeaflet2026:
    'https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html',
  /** 국민건강보험공단 지역가입자 보험료 산정방법 (점수표는 미게재). */
  nhisRegionalMethod: 'https://www.nhis.or.kr/static/html/wbma/b/wbmab0102.html',
  /** 법제처 지방세법 제92조 (개인지방소득세 종합소득 표준세율 — 표가 이미지). */
  lawLocalTax:
    'https://www.law.go.kr/LSW//lsLawLinkInfo.do?lsJoLnkSeq=1000226016&chrClsCd=010202',
  /** 국민연금공단 예상연금액 조회. */
  npsExpect: 'https://www.nps.or.kr/jsppage/app/etc/simpleExpect.jsp',
} as const;

/** 계산이 불가능할 때 안내할 공식 계산기. */
export const OFFICIAL_CALCULATORS = {
  hometax: {
    label: '종합소득세 예상세액 계산 (국세청 홈택스)',
    url: 'https://www.hometax.go.kr',
  },
  nhisPremium: {
    label: '4대 사회보험료 모의계산 (국민건강보험공단)',
    url: 'https://www.nhis.or.kr/nhis/minwon/initCtrbCalcView.do',
  },
  npsExpect: {
    label: '예상연금액 조회 (국민연금공단)',
    url: SOURCE.npsExpect,
  },
} as const;

// ---------------------------------------------------------------------------
// 종합소득세
// ---------------------------------------------------------------------------

/**
 * 종합소득세 기본세율표.
 *
 * 2023~2025년 귀속분이 동일하다. 국세청 안내 페이지에 그렇게 적혀 있다.
 * **"2026년 세율" 이라고 쓰지 않는다.** 2026년 귀속분 개정은 확인되지 않았을 뿐,
 * 없다고 확인된 것이 아니다.
 */
export const INCOME_TAX_BRACKETS: StatutoryValue<readonly TaxBracket[]> = confirmed(
  [
    { upTo: 14_000_000, rate: 0.06, progressiveDeduction: 0 },
    { upTo: 50_000_000, rate: 0.15, progressiveDeduction: 1_260_000 },
    { upTo: 88_000_000, rate: 0.24, progressiveDeduction: 5_760_000 },
    { upTo: 150_000_000, rate: 0.35, progressiveDeduction: 15_440_000 },
    { upTo: 300_000_000, rate: 0.38, progressiveDeduction: 19_940_000 },
    { upTo: 500_000_000, rate: 0.4, progressiveDeduction: 25_940_000 },
    { upTo: 1_000_000_000, rate: 0.42, progressiveDeduction: 35_940_000 },
    { upTo: null, rate: 0.45, progressiveDeduction: 65_940_000 },
  ],
  '종합소득세 기본세율',
  SOURCE.ntsTaxRate,
  '2025-01-01',
  '2025년 귀속',
);

/**
 * 지방소득세 — **원천징수분에 한해** 소득세액의 10%.
 *
 * 확정신고용 표준세율표는 아래에서 pending 이다.
 * 원천징수 10% 규칙을 확정신고 계산에 그대로 전용하지 않는다.
 */
export const LOCAL_INCOME_TAX_WITHHOLDING_RATE: StatutoryValue<number> = confirmed(
  0.1,
  '지방소득세 (원천징수분, 소득세액의 10%)',
  SOURCE.ntsWithholdingOverview,
  '2026-01-01',
  '2026년 (2026-01-01 시행)',
);

export const LOCAL_INCOME_TAX_FILING_BRACKETS: StatutoryValue<
  readonly TaxBracket[]
> = pending(
  '지방소득세 종합소득 표준세율표 (확정신고)',
  SOURCE.lawLocalTax,
  '지방세법 제92조 세율표가 이미지로만 제공되어 원문을 대조하지 못했다. 지자체 조례로 ±50% 가감될 수 있어 임의로 채울 수 없다.',
  OFFICIAL_CALCULATORS.hometax.url,
);

// ---------------------------------------------------------------------------
// 연금소득
// ---------------------------------------------------------------------------

/** 연금소득공제 4구간. 한도는 아래 별도 항목. */
export const PENSION_INCOME_DEDUCTION: StatutoryValue<readonly DeductionBracket[]> =
  confirmed(
    [
      { over: 0, upTo: 3_500_000, base: 0, rate: 1.0 },
      { over: 3_500_000, upTo: 7_000_000, base: 3_500_000, rate: 0.4 },
      { over: 7_000_000, upTo: 14_000_000, base: 4_900_000, rate: 0.2 },
      { over: 14_000_000, upTo: null, base: 6_300_000, rate: 0.1 },
    ],
    '연금소득공제 (4구간)',
    SOURCE.ntsPensionDeduction,
    '2026-08-04',
    '2025년 귀속',
  );

export const PENSION_INCOME_DEDUCTION_CAP: StatutoryValue<number> = confirmed(
  9_000_000,
  '연금소득공제 한도 (연 900만원)',
  SOURCE.ntsPensionDeduction,
  '2026-08-04',
  '2025년 귀속',
);

/**
 * 사적연금(연금저축·IRP) 원천징수세율. 연금수령일의 나이에 따라 다르다.
 * `underAge` 미만이면 그 세율을 쓴다. null 은 상한 없음.
 */
export const PRIVATE_PENSION_WITHHOLDING_RATES: StatutoryValue<
  readonly { readonly underAge: number | null; readonly rate: number }[]
> = confirmed(
  [
    { underAge: 70, rate: 0.05 },
    { underAge: 80, rate: 0.04 },
    { underAge: null, rate: 0.03 },
  ],
  '사적연금 원천징수세율 (70세 미만 5% / 70~80세 4% / 80세 이상 3%)',
  SOURCE.ntsPension,
  '2026-01-01',
  '2026년 (2026-01-01 시행)',
);

/** 종신형 연금 원천징수세율. 2026-01-01 이후 3% (종전 4%). */
export const LIFETIME_ANNUITY_WITHHOLDING_RATE: StatutoryValue<number> = confirmed(
  0.03,
  '종신형 연금 원천징수세율',
  SOURCE.ntsPension,
  '2026-01-01',
  '2026년 이후 수령분',
);

/**
 * 사적연금 분리과세 기준금액.
 *
 * **사적연금 전용이다.** 국민연금과 합산해 판정하면 틀린다.
 */
export const PRIVATE_PENSION_SEPARATE_TAX_THRESHOLD: StatutoryValue<number> =
  confirmed(
    15_000_000,
    '사적연금 분리과세 기준금액 (연 1,500만원, 사적연금 전용)',
    SOURCE.ntsPension,
    '2024-01-01',
    '2026년 (2026-01-01 시행)',
  );

/**
 * 국민연금 과세기준금액.
 *
 * 공단이 산정해 개인에게 통보하는 값이다. 자체 산출할 수 없다.
 * "수령액 전액이 과세" 로 가정하면 세금을 과대계상한다.
 */
export const NATIONAL_PENSION_TAXABLE_BASE: StatutoryValue<number> = pending(
  '국민연금 과세기준금액',
  SOURCE.ntsPensionOverview,
  '국민연금 중 세금이 붙는 금액은 2002년 1월 이후 납부한 보험료에 해당하는 부분만입니다. 이 금액은 가입 기간에 따라 사람마다 달라, 국민연금공단이 개인별로 계산해 알려드립니다. 이 계산기가 대신 계산할 수 없습니다. 전액 과세로 가정하면 세금이 실제보다 많게 나옵니다.',
  OFFICIAL_CALCULATORS.npsExpect.url,
);

export const TAX_EXEMPT_PENSION_TYPES: StatutoryValue<readonly string[]> = pending(
  '비과세 연금소득 열거',
  SOURCE.ntsPensionOverview,
  '어떤 연금에 세금이 붙지 않는지(장애연금·유족연금 등) 공식 출처에서 항목을 확인하지 못했습니다. 짐작해서 안내하지 않습니다.',
  OFFICIAL_CALCULATORS.hometax.url,
);

// ---------------------------------------------------------------------------
// 건강보험료
// ---------------------------------------------------------------------------

/**
 * 건강보험료율 7.19% (2026년).
 *
 * **직장가입자는 가입자·사용자가 각 50% 씩 부담하지만, 지역가입자는 전액 본인 부담이다.**
 * 은퇴자 계산기의 기본 대상은 지역가입자다. 50% 를 잘못 적용하면
 * 보험료를 절반으로 과소계상한다.
 */
export const HEALTH_INSURANCE_RATE: StatutoryValue<number> = confirmed(
  0.0719,
  '건강보험료율',
  SOURCE.mohwPremium2026,
  '2026-01-01',
  '2026년',
);

/** 직장가입자 본인부담 비율. **지역가입자에게는 적용하지 않는다.** */
export const EMPLOYED_OWN_SHARE_RATE: StatutoryValue<number> = confirmed(
  0.5,
  '직장가입자 본인부담 비율 (가입자·사용자 각 50%)',
  SOURCE.nhisPremium2026,
  '2026-01-01',
  '2026년',
);

/** 지역가입자 재산 부과점수당 금액 (2026년). */
export const POINT_VALUE_WON: StatutoryValue<number> = confirmed(
  211.5,
  '지역가입자 부과점수당 금액',
  SOURCE.nhisPremium2026,
  '2026-01-01',
  '2026년',
);

/**
 * 장기요양보험료율.
 *
 * **소득이 아니라 건강보험료에 곱한다.**
 * 산식: `장기요양보험료 = 건강보험료 × 0.9448 / 7.19`
 */
export const LONG_TERM_CARE_RATE: StatutoryValue<number> = confirmed(
  0.009448,
  '장기요양보험료율',
  SOURCE.nhisPremium2026,
  '2026-01-01',
  '2026년',
);

/** 장기요양보험료 산식의 분모로 쓰는 건강보험료율. */
export const LONG_TERM_CARE_DIVISOR_RATE: StatutoryValue<number> = confirmed(
  0.0719,
  '장기요양보험료 산식의 건강보험료율 (건강보험료 × 0.9448 / 7.19)',
  SOURCE.nhisPremium2026,
  '2026-01-01',
  '2026년',
);

export const REGIONAL_PREMIUM_CAP: StatutoryValue<number> = confirmed(
  4_591_740,
  '지역가입자 월 보험료 상한',
  SOURCE.nhisLeaflet2026,
  '2026-01-01',
  '2026년',
);

export const REGIONAL_PREMIUM_FLOOR: StatutoryValue<number> = confirmed(
  20_160,
  '지역가입자 월 보험료 하한',
  SOURCE.nhisLeaflet2026,
  '2026-01-01',
  '2026년',
);

/**
 * 지역가입자 재산 부과점수표.
 *
 * 점수표 자체가 공개 페이지에 게재되지 않았다.
 * 산식(소득 × 7.19% + 재산점수 × 211.5원)만으로는 재산보험료를 계산할 수 없다.
 * 근사하면 틀린 금액이 나온다.
 */
export const PROPERTY_POINT_TABLE: StatutoryValue<
  readonly { readonly upTo: number | null; readonly points: number }[]
> = pending(
  '지역가입자 재산 부과점수표',
  SOURCE.nhisRegionalMethod,
  '국민건강보험법 시행령 별표가 이미지·첨부파일 형태로만 제공되어 추출하지 못했다. 점수표 없이는 재산보험료를 계산할 수 없다.',
  OFFICIAL_CALCULATORS.nhisPremium.url,
);

/**
 * 건강보험료 소득 점수의 연금소득 반영 비율.
 *
 * 30% 로 적은 페이지를 찾았으나 부과점수당 금액을 195.8원으로 적은 구버전이었다.
 * 은퇴자는 연금소득이 소득의 대부분이므로 이 비율이 결과를 지배한다.
 */
export const PENSION_INCOME_RECOGNITION_RATE: StatutoryValue<number> = pending(
  '건강보험료 소득 점수의 연금소득 반영 비율',
  SOURCE.nhisRegionalMethod,
  '발견한 출처가 부과점수당 금액을 195.8원으로 적은 과거 연도 페이지다. 은퇴자에게는 이 비율이 결과를 좌우하므로 확인 전에는 사용할 수 없다.',
  OFFICIAL_CALCULATORS.nhisPremium.url,
);

// ---------------------------------------------------------------------------
// 금융소득
// ---------------------------------------------------------------------------

export const FINANCIAL_INCOME_AGGREGATION_THRESHOLD: StatutoryValue<number> =
  confirmed(
    20_000_000,
    '금융소득종합과세 기준금액 (연 2,000만원)',
    SOURCE.ntsFinancialIncome,
    '2026-08-04',
    '2025년 귀속',
  );

export const INTEREST_INCOME_WITHHOLDING_RATE: StatutoryValue<number> = confirmed(
  0.14,
  '이자소득 원천징수세율 (지방소득세 별도)',
  SOURCE.lawIncomeTaxAct129,
  '2026-01-01',
  '2026년 (2026-01-01 시행)',
);

export const DIVIDEND_INCOME_WITHHOLDING_RATE: StatutoryValue<number> = confirmed(
  0.14,
  '배당소득 원천징수세율 (지방소득세 별도)',
  SOURCE.lawIncomeTaxAct129,
  '2026-01-01',
  '2026년 (2026-01-01 시행)',
);

// ---------------------------------------------------------------------------
// 인적공제
// ---------------------------------------------------------------------------

export const BASIC_DEDUCTION_PER_PERSON: StatutoryValue<number> = confirmed(
  1_500_000,
  '기본공제 (1명당 연 150만원)',
  SOURCE.lawIncomeTaxAct50,
  '2026-01-01',
  '2025년 귀속',
);

/** 기본공제 대상자의 연간 소득금액 요건 100만원. */
export const DEPENDENT_INCOME_LIMIT: StatutoryValue<number> = confirmed(
  1_000_000,
  '기본공제 대상자 연간 소득금액 요건 (100만원 이하)',
  SOURCE.lawIncomeTaxAct50,
  '2026-01-01',
  '2025년 귀속',
);

/** 경로우대 추가공제 (70세 이상). */
export const ELDERLY_ADDITIONAL_DEDUCTION: StatutoryValue<number> = confirmed(
  1_000_000,
  '경로우대 추가공제 (70세 이상, 1명당 연 100만원)',
  SOURCE.lawIncomeTaxAct51,
  '2026-07-01',
  '2025년 귀속',
);

/** 장애인 추가공제. */
export const DISABLED_ADDITIONAL_DEDUCTION: StatutoryValue<number> = confirmed(
  2_000_000,
  '장애인 추가공제 (1명당 연 200만원)',
  SOURCE.lawIncomeTaxAct51,
  '2026-07-01',
  '2025년 귀속',
);

export const STANDARD_TAX_CREDIT: StatutoryValue<number> = pending(
  '표준세액공제',
  'https://www.law.go.kr/LSW/lsInfoP.do?lsId=001565&ancYnChk=0',
  '표준세액공제 금액을 공식 출처(소득세법 제59조의4 제9항)에서 확인하지 못했습니다. 근로소득이 없는 종합소득 신고자(은퇴자 다수)는 근로자와 공제액이 달라 짐작해서 적용하지 않습니다.',
  OFFICIAL_CALCULATORS.hometax.url,
);

/** 경로우대 공제 기준 나이. 위 공제 항목과 함께 확인한 값이다. */
export const ELDERLY_DEDUCTION_AGE: StatutoryValue<number> = confirmed(
  70,
  '경로우대 추가공제 기준 나이 (70세 이상)',
  SOURCE.lawIncomeTaxAct51,
  '2026-07-01',
  '2025년 귀속',
);
