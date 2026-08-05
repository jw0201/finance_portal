/**
 * 순수 계산 함수 테스트.
 *
 * 이 파일은 법령 수치를 **인자로 넣어** 산식 자체를 검증한다.
 * statutory.ts 의 실제 값에 의존하지 않으므로, 값이 바뀌어도 산식 검증은 유지된다.
 *
 * 아래 세 개의 describe 는 회귀 방지용이다.
 * `docs/statutory-research.md` "계산 설계상 놓치기 쉬운 점" 에서 온 것으로,
 * 각각 실제로 틀리기 쉬운 지점이며 틀리면 사용자에게 직접 해를 끼친다.
 */

import { describe, expect, it } from 'vitest';

import {
  calculateFinancialIncome,
  calculateHealthInsurance,
  calculateIncomeTax,
  calculatePensionIncome,
  calculatePersonalDeduction,
  calculatePrivatePensionWithholding,
} from './calculator';
import type { DeductionBracket, TaxBracket } from './types';

/** 테스트용 세율표. 실제 값과 같지만 인자로 주입한다. */
const BRACKETS: readonly TaxBracket[] = [
  { upTo: 14_000_000, rate: 0.06, progressiveDeduction: 0 },
  { upTo: 50_000_000, rate: 0.15, progressiveDeduction: 1_260_000 },
  { upTo: null, rate: 0.45, progressiveDeduction: 65_940_000 },
];

const PENSION_BRACKETS: readonly DeductionBracket[] = [
  { over: 0, upTo: 3_500_000, base: 0, rate: 1.0 },
  { over: 3_500_000, upTo: 7_000_000, base: 3_500_000, rate: 0.4 },
  { over: 7_000_000, upTo: 14_000_000, base: 4_900_000, rate: 0.2 },
  { over: 14_000_000, upTo: null, base: 6_300_000, rate: 0.1 },
];

const AGE_RATES = [
  { underAge: 70, rate: 0.05 },
  { underAge: 80, rate: 0.04 },
  { underAge: null, rate: 0.03 },
] as const;

const HEALTH_RATE = 0.0719;
const LTC_RATE = 0.009448;
const LOCAL_RATE = 0.1;

// ---------------------------------------------------------------------------
// 회귀 방지 1: 지역가입자는 전액 본인 부담
// ---------------------------------------------------------------------------

describe('회귀 방지 — 지역가입자 보험료를 절반으로 깎으면 안 된다', () => {
  /**
   * 50% 분담은 직장가입자에게만 적용된다.
   * 은퇴자 계산기의 기본 대상은 지역가입자이므로, 여기에 50% 를 적용하면
   * 보험료가 절반으로 과소계상되고 사용자는 실제보다 여유 있다고 오판한다.
   */
  it('지역가입자 본인부담은 전액과 같다', () => {
    const result = calculateHealthInsurance(
      'regional',
      2_000_000,
      HEALTH_RATE,
      0.5, // 직장가입자용 분담률을 넣어도
      LTC_RATE,
      HEALTH_RATE,
    );

    // 지역가입자에게는 적용되지 않아야 한다.
    expect(result.healthInsuranceOwnShare).toBe(result.healthInsuranceTotal);
    expect(result.healthInsuranceOwnShare).toBe(143_800);
  });

  it('지역가입자 부담은 직장가입자 부담의 2배다', () => {
    const regional = calculateHealthInsurance(
      'regional',
      2_000_000,
      HEALTH_RATE,
      0.5,
      LTC_RATE,
      HEALTH_RATE,
    );
    const employed = calculateHealthInsurance(
      'employed',
      2_000_000,
      HEALTH_RATE,
      0.5,
      LTC_RATE,
      HEALTH_RATE,
    );

    expect(regional.healthInsuranceOwnShare).toBe(
      employed.healthInsuranceOwnShare * 2,
    );
  });

  it('장기요양보험료도 지역가입자는 전액 부담한다', () => {
    const result = calculateHealthInsurance(
      'regional',
      2_000_000,
      HEALTH_RATE,
      0.5,
      LTC_RATE,
      HEALTH_RATE,
    );
    expect(result.longTermCareOwnShare).toBe(result.longTermCareTotal);
  });
});

// ---------------------------------------------------------------------------
// 회귀 방지 2: 장기요양보험료는 건강보험료에 곱한다
// ---------------------------------------------------------------------------

describe('회귀 방지 — 장기요양보험료는 소득이 아니라 건강보험료에 곱한다', () => {
  it('건강보험료 × (0.9448 / 7.19) 로 계산된다', () => {
    const result = calculateHealthInsurance(
      'regional',
      2_000_000,
      HEALTH_RATE,
      0.5,
      LTC_RATE,
      HEALTH_RATE,
    );

    // 건강보험료 143,800 × 0.009448 / 0.0719 = 18,895.xx → 18,895
    expect(result.longTermCareTotal).toBe(18_895);
  });

  it('소득에 직접 요율을 곱한 값과 다르다', () => {
    const result = calculateHealthInsurance(
      'regional',
      2_000_000,
      HEALTH_RATE,
      0.5,
      LTC_RATE,
      HEALTH_RATE,
    );

    // 잘못된 계산: 2,000,000 × 0.009448 = 18,896
    const wrong = Math.floor(2_000_000 * LTC_RATE);
    expect(result.longTermCareTotal).not.toBe(wrong);
  });

  it('건강보험료가 0원이면 장기요양보험료도 0원이다', () => {
    const result = calculateHealthInsurance(
      'regional',
      0,
      HEALTH_RATE,
      0.5,
      LTC_RATE,
      HEALTH_RATE,
    );
    expect(result.longTermCareTotal).toBe(0);
  });

  it('건강보험료율이 0이면 산식이 성립하지 않으므로 예외를 던진다', () => {
    expect(() =>
      calculateHealthInsurance('regional', 2_000_000, HEALTH_RATE, 0.5, LTC_RATE, 0),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 회귀 방지 3: 분리과세 한도는 사적연금 전용
// ---------------------------------------------------------------------------

describe('회귀 방지 — 분리과세 1,500만원 한도는 사적연금에만 적용한다', () => {
  const LIMIT = 15_000_000;

  it('사적연금만으로 판정한다', () => {
    const result = calculatePrivatePensionWithholding(
      14_000_000,
      65,
      false,
      AGE_RATES,
      0.03,
      LIMIT,
      LOCAL_RATE,
    );
    expect(result.exceedsSeparateTaxationLimit).toBe(false);
  });

  it('국민연금을 합산해 판정하면 안 된다 (합산 시 초과가 될 금액)', () => {
    // 사적연금 1,400만원 + 국민연금 1,200만원 = 2,600만원.
    // 합산 판정이면 초과지만, 사적연금 기준으로는 초과가 아니다.
    const result = calculatePrivatePensionWithholding(
      14_000_000,
      65,
      false,
      AGE_RATES,
      0.03,
      LIMIT,
      LOCAL_RATE,
    );
    expect(result.exceedsSeparateTaxationLimit).toBe(false);
    expect(result.annualPrivatePension).toBe(14_000_000);
  });

  it('한도와 정확히 같으면 초과가 아니다', () => {
    const result = calculatePrivatePensionWithholding(
      LIMIT,
      65,
      false,
      AGE_RATES,
      0.03,
      LIMIT,
      LOCAL_RATE,
    );
    expect(result.exceedsSeparateTaxationLimit).toBe(false);
  });

  it('1원만 넘어도 초과다', () => {
    const result = calculatePrivatePensionWithholding(
      LIMIT + 1,
      65,
      false,
      AGE_RATES,
      0.03,
      LIMIT,
      LOCAL_RATE,
    );
    expect(result.exceedsSeparateTaxationLimit).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 일반 산식
// ---------------------------------------------------------------------------

describe('calculateIncomeTax', () => {
  it('과세표준 × 세율 - 누진공제', () => {
    const result = calculateIncomeTax(50_000_000, BRACKETS, LOCAL_RATE);
    expect(result.incomeTax).toBe(6_240_000);
    expect(result.localIncomeTax).toBe(624_000);
    expect(result.totalTax).toBe(6_864_000);
  });

  it('음수 과세표준은 0으로 본다', () => {
    const result = calculateIncomeTax(-1_000_000, BRACKETS, LOCAL_RATE);
    expect(result.incomeTax).toBe(0);
    expect(result.taxBase).toBe(0);
  });

  it('세액이 음수가 되지 않는다', () => {
    // 누진공제가 산출세액보다 큰 경계에서도 0 미만이 되지 않는다.
    const result = calculateIncomeTax(14_000_001, BRACKETS, LOCAL_RATE);
    expect(result.incomeTax).toBeGreaterThanOrEqual(0);
  });

  it('세율표가 비어 있으면 0원으로 넘기지 않고 예외를 던진다', () => {
    expect(() => calculateIncomeTax(10_000_000, [], LOCAL_RATE)).toThrow();
  });

  it('구간 경계값은 아래 구간에 속한다', () => {
    const boundary = calculateIncomeTax(14_000_000, BRACKETS, LOCAL_RATE);
    expect(boundary.appliedRate).toBe(0.06);

    const above = calculateIncomeTax(14_000_001, BRACKETS, LOCAL_RATE);
    expect(above.appliedRate).toBe(0.15);
  });
});

describe('calculatePensionIncome', () => {
  it('구간별 공제액을 계산한다', () => {
    expect(
      calculatePensionIncome(7_000_000, PENSION_BRACKETS, 9_000_000).deduction,
    ).toBe(4_900_000);
  });

  it('공제액은 총연금액을 넘지 않는다', () => {
    const result = calculatePensionIncome(1_000_000, PENSION_BRACKETS, 9_000_000);
    expect(result.deduction).toBe(1_000_000);
    expect(result.pensionIncome).toBe(0);
  });

  it('한도를 적용한다', () => {
    const result = calculatePensionIncome(50_000_000, PENSION_BRACKETS, 9_000_000);
    expect(result.deduction).toBe(9_000_000);
    expect(result.deductionCapped).toBe(true);
  });

  it('연금이 0원이면 공제도 0원이다', () => {
    const result = calculatePensionIncome(0, PENSION_BRACKETS, 9_000_000);
    expect(result.deduction).toBe(0);
    expect(result.pensionIncome).toBe(0);
  });
});

describe('calculateFinancialIncome', () => {
  it('이자와 배당을 합산한다', () => {
    const result = calculateFinancialIncome(
      10_000_000,
      5_000_000,
      0.14,
      20_000_000,
      LOCAL_RATE,
    );
    expect(result.totalFinancialIncome).toBe(15_000_000);
    expect(result.withheldTax).toBe(2_100_000);
  });

  it('기준금액 초과 여부를 판정한다', () => {
    expect(
      calculateFinancialIncome(20_000_000, 0, 0.14, 20_000_000, LOCAL_RATE)
        .subjectToComprehensiveTaxation,
    ).toBe(false);
    expect(
      calculateFinancialIncome(20_000_001, 0, 0.14, 20_000_000, LOCAL_RATE)
        .subjectToComprehensiveTaxation,
    ).toBe(true);
  });

  it('음수 입력은 0으로 본다', () => {
    const result = calculateFinancialIncome(
      -100,
      -200,
      0.14,
      20_000_000,
      LOCAL_RATE,
    );
    expect(result.totalFinancialIncome).toBe(0);
  });
});

describe('calculatePersonalDeduction', () => {
  it('기본공제는 인원수에 비례한다', () => {
    const result = calculatePersonalDeduction(2, 0, 0, 1_500_000, 1_000_000, 2_000_000);
    expect(result.basicDeduction).toBe(3_000_000);
  });

  it('추가공제 인원은 기본공제 인원을 넘지 않는다', () => {
    const result = calculatePersonalDeduction(1, 5, 5, 1_500_000, 1_000_000, 2_000_000);
    expect(result.elderlyDeduction).toBe(1_000_000);
    expect(result.disabledDeduction).toBe(2_000_000);
  });

  it('음수 인원은 0으로 본다', () => {
    const result = calculatePersonalDeduction(
      -1,
      -1,
      -1,
      1_500_000,
      1_000_000,
      2_000_000,
    );
    expect(result.total).toBe(0);
  });
});
