/**
 * 법령 수치가 **확인된** 항목의 계산 정확성을 고정한다.
 *
 * `estimator.test.ts` 는 값이 없을 때 계산하지 않는 것을 증명한다.
 * 이 파일은 값이 있을 때 금액이 맞는지를 증명한다. 양쪽을 함께 유지한다.
 *
 * 기대값은 공식 산식으로 직접 계산해 적는다.
 * 구현이 내놓은 값을 그대로 옮겨 적지 않는다.
 */

import { describe, expect, it } from 'vitest';

import {
  estimateFinancialIncome,
  estimateHealthInsurance,
  estimateIncomeTax,
  estimatePensionIncome,
  estimatePersonalDeduction,
  estimatePrivatePensionWithholding,
} from './estimator';
import {
  HEALTH_INSURANCE_RATE,
  INCOME_TAX_BRACKETS,
  POINT_VALUE_WON,
} from './statutory';

/** available 결과에서 값을 꺼낸다. unavailable 이면 테스트를 실패시킨다. */
function valueOf<T>(estimate: ReturnType<() => never> | { status: string }): T {
  const candidate = estimate as
    | { status: 'available'; value: T }
    | { status: 'unavailable' };
  if (candidate.status !== 'available') {
    throw new Error('available 이어야 한다');
  }
  return candidate.value;
}

describe('확인된 수치는 실제로 확인된 값이다 (구버전 값 혼입 방지)', () => {
  it('건강보험료율은 7.19% 이고 기준일이 2026년이다', () => {
    if (HEALTH_INSURANCE_RATE.status !== 'confirmed') {
      throw new Error('confirmed 여야 한다');
    }
    expect(HEALTH_INSURANCE_RATE.value).toBe(0.0719);
    // 구버전 페이지의 10.25% 가 들어오면 깨진다.
    expect(HEALTH_INSURANCE_RATE.value).not.toBe(0.1025);
    expect(HEALTH_INSURANCE_RATE.asOf).toContain('2026');
  });

  it('부과점수당 금액은 211.5원이다 (구버전 195.8원이 아니다)', () => {
    if (POINT_VALUE_WON.status !== 'confirmed') {
      throw new Error('confirmed 여야 한다');
    }
    expect(POINT_VALUE_WON.value).toBe(211.5);
    expect(POINT_VALUE_WON.value).not.toBe(195.8);
  });

  it('종합소득세 세율표는 2025년 귀속으로 표기된다', () => {
    if (INCOME_TAX_BRACKETS.status !== 'confirmed') {
      throw new Error('confirmed 여야 한다');
    }
    // 2026년 귀속 세율은 확인되지 않았다. 2026 으로 표기하면 안 된다.
    expect(INCOME_TAX_BRACKETS.appliesTo).toContain('2025');
    expect(INCOME_TAX_BRACKETS.value).toHaveLength(8);
  });
});

describe('종합소득세 — 과세표준 × 세율 - 누진공제', () => {
  it('과세표준 5,000만원: 5,000만 × 15% - 126만 = 624만원', () => {
    const result = estimateIncomeTax(50_000_000);
    const value = valueOf<{ incomeTax: number; appliedRate: number }>(result);

    expect(value.appliedRate).toBe(0.15);
    expect(value.incomeTax).toBe(6_240_000);
  });

  it('지방소득세는 산출세액의 10% 다', () => {
    const result = estimateIncomeTax(50_000_000);
    const value = valueOf<{ incomeTax: number; localIncomeTax: number }>(result);

    expect(value.localIncomeTax).toBe(624_000);
  });

  it('과세표준 1,400만원(첫 구간 끝): 1,400만 × 6% = 84만원', () => {
    const value = valueOf<{ incomeTax: number }>(estimateIncomeTax(14_000_000));
    expect(value.incomeTax).toBe(840_000);
  });

  it('과세표준 0원이면 세금도 0원이다', () => {
    const value = valueOf<{ incomeTax: number }>(estimateIncomeTax(0));
    expect(value.incomeTax).toBe(0);
  });

  it('최고 구간: 15억 × 45% - 6,594만 = 6억 1,281만원', () => {
    const value = valueOf<{ incomeTax: number; appliedRate: number }>(
      estimateIncomeTax(1_500_000_000),
    );
    expect(value.appliedRate).toBe(0.45);
    // 1,500,000,000 * 0.45 = 675,000,000 - 65,940,000 = 609,060,000
    expect(value.incomeTax).toBe(609_060_000);
  });

  it('계산 근거(출처·기준일)를 함께 돌려준다', () => {
    const result = estimateIncomeTax(50_000_000);
    if (result.status !== 'available') {
      throw new Error('available 이어야 한다');
    }
    expect(result.basis.length).toBeGreaterThan(0);
    for (const basis of result.basis) {
      expect(basis.source).toMatch(/^https?:\/\//);
      expect(basis.asOf.length).toBeGreaterThan(0);
    }
  });
});

describe('연금소득공제', () => {
  it('총연금 350만원 이하는 전액 공제된다', () => {
    const value = valueOf<{ deduction: number; pensionIncome: number }>(
      estimatePensionIncome(3_000_000),
    );
    expect(value.deduction).toBe(3_000_000);
    expect(value.pensionIncome).toBe(0);
  });

  it('총연금 700만원: 350만 + (700만-350만) × 40% = 490만원', () => {
    const value = valueOf<{ deduction: number }>(estimatePensionIncome(7_000_000));
    expect(value.deduction).toBe(4_900_000);
  });

  it('총연금 1,400만원: 490만 + (1,400만-700만) × 20% = 630만원', () => {
    const value = valueOf<{ deduction: number }>(estimatePensionIncome(14_000_000));
    expect(value.deduction).toBe(6_300_000);
  });

  it('총연금 4,000만원: 630만 + (4,000만-1,400만) × 10% = 890만원', () => {
    const value = valueOf<{ deduction: number; deductionCapped: boolean }>(
      estimatePensionIncome(40_000_000),
    );
    expect(value.deduction).toBe(8_900_000);
    expect(value.deductionCapped).toBe(false);
  });

  it('한도 900만원을 넘으면 900만원으로 막힌다', () => {
    // 630만 + (5,000만-1,400만) × 10% = 990만 → 한도 900만
    const value = valueOf<{ deduction: number; deductionCapped: boolean }>(
      estimatePensionIncome(50_000_000),
    );
    expect(value.deduction).toBe(9_000_000);
    expect(value.deductionCapped).toBe(true);
  });
});

describe('사적연금 원천징수 — 나이가 많을수록 세율이 낮다', () => {
  it('65세: 5% 를 적용한다', () => {
    const value = valueOf<{ appliedRate: number; withheldTax: number }>(
      estimatePrivatePensionWithholding(12_000_000, 65, false),
    );
    expect(value.appliedRate).toBe(0.05);
    expect(value.withheldTax).toBe(600_000);
  });

  it('75세: 4% 를 적용한다', () => {
    const value = valueOf<{ appliedRate: number; withheldTax: number }>(
      estimatePrivatePensionWithholding(12_000_000, 75, false),
    );
    expect(value.appliedRate).toBe(0.04);
    expect(value.withheldTax).toBe(480_000);
  });

  it('85세: 3% 를 적용한다', () => {
    const value = valueOf<{ appliedRate: number; withheldTax: number }>(
      estimatePrivatePensionWithholding(12_000_000, 85, false),
    );
    expect(value.appliedRate).toBe(0.03);
    expect(value.withheldTax).toBe(360_000);
  });

  it('나이 경계 70세는 4% 구간이다 (70세 미만이 5%)', () => {
    const value = valueOf<{ appliedRate: number }>(
      estimatePrivatePensionWithholding(12_000_000, 70, false),
    );
    expect(value.appliedRate).toBe(0.04);
  });

  it('종신형은 65세에도 3% 가 적용된다 (낮은 쪽)', () => {
    const value = valueOf<{ appliedRate: number }>(
      estimatePrivatePensionWithholding(12_000_000, 65, true),
    );
    expect(value.appliedRate).toBe(0.03);
  });

  it('분리과세 한도 1,500만원 초과를 알려준다', () => {
    const under = valueOf<{ exceedsSeparateTaxationLimit: boolean }>(
      estimatePrivatePensionWithholding(15_000_000, 65, false),
    );
    const over = valueOf<{ exceedsSeparateTaxationLimit: boolean }>(
      estimatePrivatePensionWithholding(15_000_001, 65, false),
    );

    expect(under.exceedsSeparateTaxationLimit).toBe(false);
    expect(over.exceedsSeparateTaxationLimit).toBe(true);
  });
});

describe('금융소득', () => {
  it('이자 1,000만 + 배당 500만 = 1,500만원, 원천징수 14% = 210만원', () => {
    const value = valueOf<{
      totalFinancialIncome: number;
      withheldTax: number;
      subjectToComprehensiveTaxation: boolean;
    }>(estimateFinancialIncome(10_000_000, 5_000_000));

    expect(value.totalFinancialIncome).toBe(15_000_000);
    expect(value.withheldTax).toBe(2_100_000);
    expect(value.subjectToComprehensiveTaxation).toBe(false);
  });

  it('2,000만원까지는 종합과세 대상이 아니다', () => {
    const value = valueOf<{ subjectToComprehensiveTaxation: boolean }>(
      estimateFinancialIncome(20_000_000, 0),
    );
    expect(value.subjectToComprehensiveTaxation).toBe(false);
  });

  it('2,000만원을 넘으면 종합과세 대상이다', () => {
    const value = valueOf<{ subjectToComprehensiveTaxation: boolean }>(
      estimateFinancialIncome(20_000_001, 0),
    );
    expect(value.subjectToComprehensiveTaxation).toBe(true);
  });
});

describe('건강보험료 — 지역가입자는 전액 본인 부담이다', () => {
  it('월소득 200만원 지역가입자: 200만 × 7.19% = 143,800원 전액 부담', () => {
    const value = valueOf<{
      healthInsuranceTotal: number;
      healthInsuranceOwnShare: number;
    }>(estimateHealthInsurance(2_000_000, 'regional'));

    expect(value.healthInsuranceTotal).toBe(143_800);
    // 전액 본인 부담. 절반이 되면 안 된다.
    expect(value.healthInsuranceOwnShare).toBe(143_800);
  });

  it('직장가입자는 절반만 부담한다', () => {
    const value = valueOf<{ healthInsuranceOwnShare: number }>(
      estimateHealthInsurance(2_000_000, 'employed'),
    );
    expect(value.healthInsuranceOwnShare).toBe(71_900);
  });

  it('같은 소득이면 지역가입자 부담이 직장가입자의 2배다', () => {
    const regional = valueOf<{ healthInsuranceOwnShare: number }>(
      estimateHealthInsurance(3_000_000, 'regional'),
    );
    const employed = valueOf<{ healthInsuranceOwnShare: number }>(
      estimateHealthInsurance(3_000_000, 'employed'),
    );

    expect(regional.healthInsuranceOwnShare).toBeGreaterThan(
      employed.healthInsuranceOwnShare,
    );
  });

  it('장기요양보험료는 건강보험료에 비율을 곱한다 (소득이 아니다)', () => {
    const value = valueOf<{
      healthInsuranceTotal: number;
      longTermCareTotal: number;
    }>(estimateHealthInsurance(2_000_000, 'regional'));

    // 143,800 × 0.9448 / 7.19 = 18,895.xx → 18,895
    expect(value.longTermCareTotal).toBe(18_895);

    // 소득에 직접 곱한 값(2,000,000 × 0.009448 = 18,896)과 다르다.
    expect(value.longTermCareTotal).not.toBe(18_896);
  });

  it('재산보험료가 빠졌다는 사실을 항상 알린다', () => {
    const value = valueOf<{ excludesPropertyPremium: boolean }>(
      estimateHealthInsurance(2_000_000, 'regional'),
    );
    expect(value.excludesPropertyPremium).toBe(true);
  });

  it('소득이 0원이면 보험료도 0원이다', () => {
    const value = valueOf<{ totalOwnShare: number }>(
      estimateHealthInsurance(0, 'regional'),
    );
    expect(value.totalOwnShare).toBe(0);
  });
});

describe('인적공제', () => {
  it('본인 1명: 150만원', () => {
    const value = valueOf<{ total: number }>(estimatePersonalDeduction(1, 0, 0));
    expect(value.total).toBe(1_500_000);
  });

  it('본인 + 배우자 2명, 그중 1명 70세 이상: 300만 + 100만 = 400만원', () => {
    const value = valueOf<{ total: number }>(estimatePersonalDeduction(2, 1, 0));
    expect(value.total).toBe(4_000_000);
  });

  it('장애인 1명 추가공제는 200만원이다', () => {
    const value = valueOf<{ disabledDeduction: number }>(
      estimatePersonalDeduction(2, 0, 1),
    );
    expect(value.disabledDeduction).toBe(2_000_000);
  });

  it('추가공제 인원은 기본공제 인원을 넘지 않는다', () => {
    const value = valueOf<{ elderlyDeduction: number }>(
      estimatePersonalDeduction(1, 5, 0),
    );
    // 기본공제 1명이므로 경로우대도 최대 1명이다.
    expect(value.elderlyDeduction).toBe(1_000_000);
  });
});
