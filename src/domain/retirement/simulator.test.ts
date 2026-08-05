/**
 * 시뮬레이터 테스트.
 *
 * CLAUDE.md "확정된 계산 가정" 이 실제로 구현되어 있는지 확인한다.
 * 가정을 바꾸면 이 테스트도 함께 고쳐야 한다.
 */

import { describe, expect, it } from 'vitest';
import { simulate } from './simulator';
import { HEALTHCARE, MONTHS_PER_YEAR } from './policy';
import type { RetirementInput } from './types';

/** 테스트용 기본 입력. 각 테스트에서 필요한 값만 덮어쓴다. */
function makeInput(overrides: Partial<RetirementInput> = {}): RetirementInput {
  return {
    currentAge: 60,
    retirementAge: 60,
    lifeExpectancy: 90,
    financialAssets: 500_000_000,
    nationalPensionMonthly: 1_000_000,
    nationalPensionStartAge: 65,
    privatePensionMonthly: 0,
    privatePensionStartAge: 60,
    otherIncomeMonthly: 0,
    otherIncomeEndAge: 65,
    monthlyLivingCost: 3_000_000,
    inflationRate: 0.02,
    investmentReturnRate: 0.03,
    includeHealthcareCost: false,
    healthcareMonthlyCost: HEALTHCARE.defaultMonthlyCost,
    ...overrides,
  };
}

describe('simulate — 기간과 구조', () => {
  it('현재 나이부터 기대수명까지 매년 한 건씩 만든다', () => {
    const result = simulate(makeInput({ currentAge: 60, lifeExpectancy: 90 }));

    expect(result.projections).toHaveLength(31); // 60..90 포함
    expect(result.projections[0]?.age).toBe(60);
    expect(result.projections.at(-1)?.age).toBe(90);
  });

  it('각 해의 연말 자산은 다음 해의 연초 자산이 된다', () => {
    const result = simulate(makeInput());

    for (let i = 1; i < result.projections.length; i += 1) {
      expect(result.projections[i]?.startingAssets).toBe(
        result.projections[i - 1]?.endingAssets,
      );
    }
  });
});

describe('simulate — 은퇴 전 가정', () => {
  it('은퇴 전에는 생활비를 인출하지 않고 투자수익만 반영한다', () => {
    const input = makeInput({
      currentAge: 50,
      retirementAge: 60,
      financialAssets: 100_000_000,
      investmentReturnRate: 0.03,
      monthlyLivingCost: 3_000_000,
    });
    const result = simulate(input);

    const firstYear = result.projections[0];
    expect(firstYear?.isRetired).toBe(false);
    expect(firstYear?.totalExpense).toBe(0);
    expect(firstYear?.investmentReturn).toBeCloseTo(3_000_000, 6);
    expect(firstYear?.endingAssets).toBeCloseTo(103_000_000, 6);
  });

  it('은퇴 전 자산은 복리로만 늘어난다 (추가 저축을 가정하지 않는다)', () => {
    const input = makeInput({
      currentAge: 50,
      retirementAge: 55,
      financialAssets: 100_000_000,
      investmentReturnRate: 0.05,
    });
    const result = simulate(input);

    // 50세부터 54세까지 5년간 복리. 55세 연초 자산이 은퇴 시점 자산이다.
    const expected = 100_000_000 * Math.pow(1.05, 5);
    expect(result.assetsAtRetirement).toBeCloseTo(expected, 4);
  });

  it('은퇴 나이가 현재 나이와 같으면 첫해부터 은퇴 상태다', () => {
    const result = simulate(makeInput({ currentAge: 60, retirementAge: 60 }));

    expect(result.projections[0]?.isRetired).toBe(true);
    expect(result.projections[0]?.totalExpense).toBeGreaterThan(0);
    // 은퇴 시점 자산은 아직 굴리기 전의 현재 자산이다.
    expect(result.assetsAtRetirement).toBe(500_000_000);
  });
});

describe('simulate — 물가상승률 누적 적용', () => {
  it('생활비는 현재 물가 기준으로 보고 매년 누적 상승시킨다', () => {
    const input = makeInput({
      currentAge: 60,
      retirementAge: 60,
      monthlyLivingCost: 1_000_000,
      inflationRate: 0.02,
    });
    const result = simulate(input);

    const yearlyBase = 1_000_000 * MONTHS_PER_YEAR;
    // 첫해(yearIndex 0)는 그대로.
    expect(result.projections[0]?.livingCost).toBeCloseTo(yearlyBase, 6);
    // 10년 뒤는 1.02^10 배.
    expect(result.projections[10]?.livingCost).toBeCloseTo(
      yearlyBase * Math.pow(1.02, 10),
      4,
    );
  });

  it('물가상승률이 0이면 생활비가 변하지 않는다', () => {
    const result = simulate(
      makeInput({ inflationRate: 0, monthlyLivingCost: 2_000_000 }),
    );

    const costs = result.projections.filter((y) => y.isRetired).map((y) => y.livingCost);
    const expected = 2_000_000 * MONTHS_PER_YEAR;
    for (const cost of costs) {
      expect(cost).toBeCloseTo(expected, 6);
    }
  });

  it('물가가 매우 높으면 자산이 빠르게 고갈된다', () => {
    const high = simulate(
      makeInput({ inflationRate: 0.15, financialAssets: 500_000_000 }),
    );
    const low = simulate(
      makeInput({ inflationRate: 0.01, financialAssets: 500_000_000 }),
    );

    expect(high.depletionAge).not.toBeNull();
    expect(high.totalShortfall).toBeGreaterThan(0);
    // 물가가 높을수록 더 이른 나이에 고갈된다.
    if (high.depletionAge !== null && low.depletionAge !== null) {
      expect(high.depletionAge).toBeLessThan(low.depletionAge);
    }
  });
});

describe('simulate — 연금 가정', () => {
  it('연금은 개시 나이 전에는 발생하지 않는다', () => {
    const result = simulate(
      makeInput({
        currentAge: 60,
        retirementAge: 60,
        nationalPensionMonthly: 1_000_000,
        nationalPensionStartAge: 65,
      }),
    );

    const at62 = result.projections.find((y) => y.age === 62);
    const at65 = result.projections.find((y) => y.age === 65);

    expect(at62?.nationalPension).toBe(0);
    expect(at65?.nationalPension).toBe(1_000_000 * MONTHS_PER_YEAR);
  });

  it('연금은 물가에 연동되지 않는 명목액으로 본다 (보수적 가정)', () => {
    const result = simulate(
      makeInput({
        nationalPensionMonthly: 1_000_000,
        nationalPensionStartAge: 60,
        inflationRate: 0.05,
      }),
    );

    const yearly = 1_000_000 * MONTHS_PER_YEAR;
    // 개시 후 어느 해든 같은 금액이어야 한다.
    expect(result.projections[0]?.nationalPension).toBe(yearly);
    expect(result.projections[20]?.nationalPension).toBe(yearly);
  });

  it('개인연금과 국민연금을 각각 다른 개시 나이로 더한다', () => {
    const result = simulate(
      makeInput({
        currentAge: 60,
        retirementAge: 60,
        nationalPensionMonthly: 1_000_000,
        nationalPensionStartAge: 65,
        privatePensionMonthly: 500_000,
        privatePensionStartAge: 60,
      }),
    );

    const at60 = result.projections.find((y) => y.age === 60);
    const at65 = result.projections.find((y) => y.age === 65);

    expect(at60?.totalIncome).toBe(500_000 * MONTHS_PER_YEAR);
    expect(at65?.totalIncome).toBe(1_500_000 * MONTHS_PER_YEAR);
  });

  it('기타소득은 종료 나이까지만 발생한다', () => {
    const result = simulate(
      makeInput({
        currentAge: 60,
        retirementAge: 60,
        otherIncomeMonthly: 800_000,
        otherIncomeEndAge: 65,
      }),
    );

    expect(result.projections.find((y) => y.age === 65)?.otherIncome).toBe(
      800_000 * MONTHS_PER_YEAR,
    );
    expect(result.projections.find((y) => y.age === 66)?.otherIncome).toBe(0);
  });

  it('연금이 전혀 없으면 자산만으로 생활한다', () => {
    const result = simulate(
      makeInput({
        nationalPensionMonthly: 0,
        privatePensionMonthly: 0,
        otherIncomeMonthly: 0,
        financialAssets: 300_000_000,
        monthlyLivingCost: 3_000_000,
      }),
    );

    expect(result.monthlyIncomeAtRetirement).toBe(0);
    expect(result.monthlyShortfallAtRetirement).toBeCloseTo(3_000_000, 6);
    expect(result.depletionAge).not.toBeNull();
  });
});

describe('simulate — 의료비 가정', () => {
  it('의료비는 HEALTHCARE.startAge 이후부터 생활비에 더해진다', () => {
    const result = simulate(
      makeInput({
        currentAge: 60,
        retirementAge: 60,
        includeHealthcareCost: true,
        healthcareMonthlyCost: 300_000,
        inflationRate: 0,
      }),
    );

    const before = result.projections.find((y) => y.age === HEALTHCARE.startAge - 1);
    const after = result.projections.find((y) => y.age === HEALTHCARE.startAge);

    expect(before?.healthcareCost).toBe(0);
    expect(after?.healthcareCost).toBeCloseTo(300_000 * MONTHS_PER_YEAR, 6);
  });

  it('의료비를 끄면 어느 나이에도 더해지지 않는다', () => {
    const result = simulate(
      makeInput({ includeHealthcareCost: false, healthcareMonthlyCost: 500_000 }),
    );

    for (const year of result.projections) {
      expect(year.healthcareCost).toBe(0);
    }
  });

  it('의료비도 물가상승률을 누적 적용받는다', () => {
    const input = makeInput({
      currentAge: 60,
      retirementAge: 60,
      includeHealthcareCost: true,
      healthcareMonthlyCost: 300_000,
      inflationRate: 0.02,
    });
    const result = simulate(input);

    const startYear = result.projections.find((y) => y.age === HEALTHCARE.startAge);
    const yearIndex = HEALTHCARE.startAge - input.currentAge;
    expect(startYear?.healthcareCost).toBeCloseTo(
      300_000 * MONTHS_PER_YEAR * Math.pow(1.02, yearIndex),
      3,
    );
  });
});

describe('simulate — 자산 하한과 부족금액', () => {
  it('자산은 0 미만으로 내려가지 않는다', () => {
    const result = simulate(
      makeInput({ financialAssets: 10_000_000, monthlyLivingCost: 3_000_000 }),
    );

    for (const year of result.projections) {
      expect(year.endingAssets).toBeGreaterThanOrEqual(0);
    }
  });

  it('채우지 못한 금액을 shortfall 로 기록한다', () => {
    const result = simulate(
      makeInput({
        financialAssets: 0,
        nationalPensionMonthly: 0,
        privatePensionMonthly: 0,
        otherIncomeMonthly: 0,
        monthlyLivingCost: 2_000_000,
        inflationRate: 0,
      }),
    );

    // 자산도 소득도 없으므로 첫해부터 생활비 전액이 부족하다.
    expect(result.projections[0]?.shortfall).toBeCloseTo(2_000_000 * MONTHS_PER_YEAR, 6);
    expect(result.totalShortfall).toBeGreaterThan(0);
  });

  it('자산이 0원이어도 연금이 생활비를 넘으면 부족금액이 없다', () => {
    const result = simulate(
      makeInput({
        financialAssets: 0,
        nationalPensionMonthly: 3_000_000,
        nationalPensionStartAge: 60,
        monthlyLivingCost: 2_000_000,
        inflationRate: 0,
      }),
    );

    expect(result.totalShortfall).toBe(0);
    expect(result.depletionAge).toBeNull();
  });
});

describe('simulate — 고갈 시점', () => {
  it('기대수명 전에 고갈되면 그 나이를 알려준다', () => {
    const result = simulate(
      makeInput({
        financialAssets: 100_000_000,
        nationalPensionMonthly: 0,
        privatePensionMonthly: 0,
        monthlyLivingCost: 3_000_000,
        investmentReturnRate: 0,
        inflationRate: 0,
      }),
    );

    // 1억원 / 연 3,600만원 => 3년 조금 안 되어 고갈. 62세 또는 63세.
    expect(result.depletionAge).not.toBeNull();
    expect(result.depletionAge).toBeGreaterThanOrEqual(62);
    expect(result.depletionAge).toBeLessThanOrEqual(63);
  });

  it('고갈되지 않으면 depletionAge 가 null 이고 자산이 남는다', () => {
    const result = simulate(
      makeInput({
        financialAssets: 3_000_000_000,
        monthlyLivingCost: 3_000_000,
      }),
    );

    expect(result.depletionAge).toBeNull();
    expect(result.assetSustainYears).toBeNull();
    expect(result.assetsAtLifeExpectancy).toBeGreaterThan(0);
    expect(result.totalShortfall).toBe(0);
  });

  it('은퇴 후 자산이 유지된 기간을 계산한다', () => {
    const result = simulate(
      makeInput({
        currentAge: 60,
        retirementAge: 60,
        financialAssets: 100_000_000,
        nationalPensionMonthly: 0,
        privatePensionMonthly: 0,
        monthlyLivingCost: 3_000_000,
        investmentReturnRate: 0,
        inflationRate: 0,
      }),
    );

    expect(result.depletionAge).not.toBeNull();
    if (result.depletionAge !== null) {
      expect(result.assetSustainYears).toBe(result.depletionAge - 60);
    }
  });

  it('자산이 0원으로 시작하고 은퇴 전이면 그 해를 고갈로 보지 않는다', () => {
    const result = simulate(
      makeInput({ currentAge: 50, retirementAge: 60, financialAssets: 0 }),
    );

    // 50~59세는 지출이 없으므로 고갈이 아니다. 은퇴 후에 고갈로 잡혀야 한다.
    expect(result.depletionAge).toBeGreaterThanOrEqual(60);
  });
});

describe('simulate — 요약 숫자', () => {
  it('은퇴 첫해의 월소득·월지출·월부족금액을 계산한다', () => {
    const result = simulate(
      makeInput({
        currentAge: 60,
        retirementAge: 60,
        nationalPensionMonthly: 1_000_000,
        nationalPensionStartAge: 60,
        monthlyLivingCost: 3_000_000,
        inflationRate: 0,
      }),
    );

    expect(result.monthlyIncomeAtRetirement).toBeCloseTo(1_000_000, 6);
    expect(result.monthlyExpenseAtRetirement).toBeCloseTo(3_000_000, 6);
    expect(result.monthlyShortfallAtRetirement).toBeCloseTo(2_000_000, 6);
  });

  it('소득이 지출보다 많으면 월 부족금액은 0이다', () => {
    const result = simulate(
      makeInput({
        retirementAge: 60,
        currentAge: 60,
        nationalPensionMonthly: 5_000_000,
        nationalPensionStartAge: 60,
        monthlyLivingCost: 2_000_000,
      }),
    );

    expect(result.monthlyShortfallAtRetirement).toBe(0);
  });
});
