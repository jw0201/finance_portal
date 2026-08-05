/**
 * 파생 계산과 검증 테스트.
 */

import { describe, expect, it } from 'vitest';
import {
  calculateWithdrawalRate,
  compareLivingCostChanges,
  compareRetirementAges,
  compareScenarios,
  findSustainableMonthlyLivingCost,
  yearsUntilRetirement,
} from './calculator';
import { simulate } from './simulator';
import { validateRetirementInput, findFieldError } from './validation';
import { BOUNDS, HEALTHCARE, SCENARIOS } from './policy';
import type { RetirementInput } from './types';

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

describe('findSustainableMonthlyLivingCost', () => {
  it('찾아낸 생활비로는 자산이 고갈되지 않는다', () => {
    const input = makeInput();
    const sustainable = findSustainableMonthlyLivingCost(input);

    const check = simulate({
      ...input,
      monthlyLivingCost: sustainable.monthlyLivingCost,
    });
    expect(check.totalShortfall).toBe(0);
  });

  it('찾아낸 금액보다 조금 더 쓰면 부족금액이 생긴다 (최대값을 찾았는지 확인)', () => {
    const input = makeInput();
    const sustainable = findSustainableMonthlyLivingCost(input);

    // 1만원 단위로 내림했으므로, 2단위 위에서는 반드시 부족해야 한다.
    const tooMuch = simulate({
      ...input,
      monthlyLivingCost: sustainable.monthlyLivingCost + 20_000,
    });
    expect(tooMuch.totalShortfall).toBeGreaterThan(0);
  });

  it('입력한 생활비가 감당 가능한지 알려준다', () => {
    const affordable = findSustainableMonthlyLivingCost(
      makeInput({ financialAssets: 3_000_000_000, monthlyLivingCost: 3_000_000 }),
    );
    expect(affordable.inputIsSustainable).toBe(true);
    expect(affordable.differenceFromInput).toBeGreaterThan(0);

    const tooExpensive = findSustainableMonthlyLivingCost(
      makeInput({ financialAssets: 50_000_000, monthlyLivingCost: 5_000_000 }),
    );
    expect(tooExpensive.inputIsSustainable).toBe(false);
    expect(tooExpensive.differenceFromInput).toBeLessThan(0);
  });

  it('자산이 0원이고 연금만 있으면 연금 범위 안의 생활비를 찾는다', () => {
    const input = makeInput({
      financialAssets: 0,
      nationalPensionMonthly: 2_000_000,
      nationalPensionStartAge: 60,
      privatePensionMonthly: 0,
      inflationRate: 0,
      monthlyLivingCost: 3_000_000,
    });
    const sustainable = findSustainableMonthlyLivingCost(input);

    expect(sustainable.inputIsSustainable).toBe(false);
    // 연금 200만원으로는 그 이상 쓸 수 없다.
    expect(sustainable.monthlyLivingCost).toBeLessThanOrEqual(2_000_000);
    expect(sustainable.monthlyLivingCost).toBeGreaterThan(0);
  });

  it('자산도 소득도 없으면 지속 가능한 생활비는 0원이다', () => {
    const sustainable = findSustainableMonthlyLivingCost(
      makeInput({
        financialAssets: 0,
        nationalPensionMonthly: 0,
        privatePensionMonthly: 0,
        otherIncomeMonthly: 0,
      }),
    );

    expect(sustainable.monthlyLivingCost).toBe(0);
  });

  it('자산이 매우 많으면 상한을 넘지 않는다', () => {
    const sustainable = findSustainableMonthlyLivingCost(
      makeInput({ financialAssets: BOUNDS.financialAssets.max }),
    );

    expect(sustainable.monthlyLivingCost).toBeLessThanOrEqual(
      BOUNDS.monthlyAmount.max,
    );
  });
});

describe('compareScenarios', () => {
  it('보수적·기준·낙관적 세 가지를 돌려준다', () => {
    const scenarios = compareScenarios(makeInput());

    expect(scenarios.map((s) => s.kind)).toEqual([
      'conservative',
      'base',
      'optimistic',
    ]);
  });

  it('기준 시나리오는 사용자가 입력한 가정을 그대로 쓴다', () => {
    const input = makeInput({ investmentReturnRate: 0.04, inflationRate: 0.025 });
    const base = compareScenarios(input).find((s) => s.kind === 'base');

    expect(base?.investmentReturnRate).toBe(0.04);
    expect(base?.inflationRate).toBe(0.025);
  });

  it('보수적·낙관적 시나리오는 policy 의 가정을 쓴다', () => {
    const scenarios = compareScenarios(makeInput());
    const conservative = scenarios.find((s) => s.kind === 'conservative');
    const optimistic = scenarios.find((s) => s.kind === 'optimistic');

    expect(conservative?.investmentReturnRate).toBe(
      SCENARIOS.conservative.investmentReturnRate,
    );
    expect(optimistic?.investmentReturnRate).toBe(
      SCENARIOS.optimistic.investmentReturnRate,
    );
  });

  it('자산이 고갈되는 경우, 낙관적 시나리오가 더 늦게 고갈되고 부족금액도 적다', () => {
    // 5억원·월 300만원이면 세 시나리오 모두 기대수명 전에 고갈된다.
    // 이때 시나리오 차이는 남는 자산(모두 0원)이 아니라 고갈 나이로 나타난다.
    const scenarios = compareScenarios(makeInput({ financialAssets: 500_000_000 }));
    const conservative = scenarios.find((s) => s.kind === 'conservative');
    const optimistic = scenarios.find((s) => s.kind === 'optimistic');

    expect(conservative?.result.depletionAge).not.toBeNull();
    expect(optimistic?.result.depletionAge).not.toBeNull();
    if (
      conservative?.result.depletionAge != null &&
      optimistic?.result.depletionAge != null
    ) {
      expect(optimistic.result.depletionAge).toBeGreaterThan(
        conservative.result.depletionAge,
      );
    }
    expect(optimistic?.result.totalShortfall).toBeLessThan(
      conservative?.result.totalShortfall ?? Number.POSITIVE_INFINITY,
    );
  });

  it('자산이 고갈되지 않는 경우, 낙관적 시나리오가 자산이 많이 남는다', () => {
    const scenarios = compareScenarios(makeInput({ financialAssets: 2_000_000_000 }));
    const conservative = scenarios.find((s) => s.kind === 'conservative');
    const optimistic = scenarios.find((s) => s.kind === 'optimistic');

    expect(conservative?.result.depletionAge).toBeNull();
    expect(optimistic?.result.assetsAtLifeExpectancy).toBeGreaterThan(
      conservative?.result.assetsAtLifeExpectancy ?? 0,
    );
  });
});

describe('compareLivingCostChanges', () => {
  it('기준 생활비를 포함해 오름차순으로 돌려준다', () => {
    const input = makeInput({ monthlyLivingCost: 3_000_000 });
    const comparisons = compareLivingCostChanges(input);

    const costs = comparisons.map((c) => c.monthlyLivingCost);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    expect(costs).toContain(3_000_000);
  });

  it('기준 생활비 항목의 차액은 0원이다', () => {
    const comparisons = compareLivingCostChanges(makeInput());
    const base = comparisons.find((c) => c.differenceFromInput === 0);

    expect(base).toBeDefined();
  });

  it('생활비를 줄이면 고갈 시점이 늦춰진다', () => {
    const input = makeInput({ financialAssets: 300_000_000, monthlyLivingCost: 3_000_000 });
    const comparisons = compareLivingCostChanges(input, [-1_000_000]);

    const cheaper = comparisons.find((c) => c.differenceFromInput < 0);
    const base = comparisons.find((c) => c.differenceFromInput === 0);

    expect(cheaper?.depletionAge).not.toBeNull();
    expect(base?.depletionAge).not.toBeNull();
    if (cheaper?.depletionAge != null && base?.depletionAge != null) {
      expect(cheaper.depletionAge).toBeGreaterThan(base.depletionAge);
    }
  });

  it('생활비가 0원 미만이 되는 경우는 제외한다', () => {
    const comparisons = compareLivingCostChanges(
      makeInput({ monthlyLivingCost: 200_000 }),
      [-500_000],
    );

    for (const comparison of comparisons) {
      expect(comparison.monthlyLivingCost).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('compareRetirementAges', () => {
  it('은퇴를 늦추면 은퇴 시점 자산이 늘어난다', () => {
    const input = makeInput({ currentAge: 55, retirementAge: 60 });
    const comparisons = compareRetirementAges(input, [5]);

    const base = comparisons.find((c) => c.retirementAge === 60);
    const later = comparisons.find((c) => c.retirementAge === 65);

    expect(later?.assetsAtRetirement).toBeGreaterThan(base?.assetsAtRetirement ?? 0);
  });

  it('자산이 넉넉하면 은퇴를 늦출 때 기대수명 시점에 자산이 더 남는다', () => {
    const input = makeInput({ currentAge: 55, retirementAge: 60, financialAssets: 2_000_000_000 });
    const comparisons = compareRetirementAges(input, [5]);

    const base = comparisons.find((c) => c.retirementAge === 60);
    const later = comparisons.find((c) => c.retirementAge === 65);

    expect(later?.assetsAtLifeExpectancy).toBeGreaterThan(
      base?.assetsAtLifeExpectancy ?? 0,
    );
  });

  it('자산이 고갈되는 경우 은퇴를 늦추면 고갈 시점이 늦춰진다', () => {
    // 고갈되는 계획에서는 남는 자산이 양쪽 다 0원이므로 고갈 나이로 비교한다.
    const input = makeInput({ currentAge: 55, retirementAge: 60, financialAssets: 500_000_000 });
    const comparisons = compareRetirementAges(input, [5]);

    const base = comparisons.find((c) => c.retirementAge === 60);
    const later = comparisons.find((c) => c.retirementAge === 65);

    expect(base?.depletionAge).not.toBeNull();
    expect(later?.depletionAge).not.toBeNull();
    if (base?.depletionAge != null && later?.depletionAge != null) {
      expect(later.depletionAge).toBeGreaterThan(base.depletionAge);
    }
  });

  it('현재 나이보다 이른 은퇴 나이는 제외한다', () => {
    const comparisons = compareRetirementAges(
      makeInput({ currentAge: 60, retirementAge: 60 }),
      [-3, -1, 3],
    );

    for (const comparison of comparisons) {
      expect(comparison.retirementAge).toBeGreaterThanOrEqual(60);
    }
  });

  it('기대수명을 넘는 은퇴 나이는 제외한다', () => {
    const comparisons = compareRetirementAges(
      makeInput({ currentAge: 60, retirementAge: 88, lifeExpectancy: 90 }),
      [5],
    );

    for (const comparison of comparisons) {
      expect(comparison.retirementAge).toBeLessThanOrEqual(90);
    }
  });
});

describe('calculateWithdrawalRate', () => {
  it('은퇴 첫해에 자산에서 꺼내 쓰는 비율을 계산한다', () => {
    const input = makeInput({
      currentAge: 60,
      retirementAge: 60,
      financialAssets: 500_000_000,
      nationalPensionMonthly: 0,
      privatePensionMonthly: 0,
      monthlyLivingCost: 2_000_000,
      inflationRate: 0,
    });

    // 연 2,400만원 / 5억원 = 4.8%
    expect(calculateWithdrawalRate(input)).toBeCloseTo(0.048, 6);
  });

  it('은퇴 시점 자산이 0원이면 계산할 수 없다', () => {
    expect(calculateWithdrawalRate(makeInput({ financialAssets: 0 }))).toBeNull();
  });

  it('연금이 생활비를 모두 덮으면 인출 비율은 0이다', () => {
    const rate = calculateWithdrawalRate(
      makeInput({
        currentAge: 60,
        retirementAge: 60,
        nationalPensionMonthly: 5_000_000,
        nationalPensionStartAge: 60,
        monthlyLivingCost: 2_000_000,
      }),
    );

    expect(rate).toBe(0);
  });
});

describe('yearsUntilRetirement', () => {
  it('은퇴까지 남은 기간을 계산한다', () => {
    expect(yearsUntilRetirement(makeInput({ currentAge: 55, retirementAge: 60 }))).toBe(5);
  });

  it('이미 은퇴했으면 0이다', () => {
    expect(yearsUntilRetirement(makeInput({ currentAge: 65, retirementAge: 60 }))).toBe(0);
  });
});

describe('validateRetirementInput', () => {
  it('정상 입력은 통과한다', () => {
    const result = validateRetirementInput(makeInput());

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('은퇴 나이가 현재 나이보다 앞서면 오류다', () => {
    const result = validateRetirementInput(
      makeInput({ currentAge: 65, retirementAge: 60 }),
    );

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'retirementAge')).toBeTruthy();
  });

  it('은퇴 나이가 현재 나이와 같으면 통과한다 (이미 은퇴한 경우)', () => {
    const result = validateRetirementInput(
      makeInput({ currentAge: 60, retirementAge: 60 }),
    );

    expect(result.ok).toBe(true);
  });

  it('기대수명이 현재 나이보다 적으면 오류다', () => {
    const result = validateRetirementInput(
      makeInput({ currentAge: 70, retirementAge: 70, lifeExpectancy: 65 }),
    );

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'lifeExpectancy')).toBeTruthy();
  });

  it('금액이 음수면 오류다', () => {
    const result = validateRetirementInput(makeInput({ financialAssets: -1 }));

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'financialAssets')).toContain('0원');
  });

  it('금액이 상한을 넘으면 오류다', () => {
    const result = validateRetirementInput(
      makeInput({ financialAssets: BOUNDS.financialAssets.max + 1 }),
    );

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'financialAssets')).toBeTruthy();
  });

  it('나이에 소수점이 있으면 오류다', () => {
    const result = validateRetirementInput(makeInput({ currentAge: 60.5 }));

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'currentAge')).toContain('소수점');
  });

  it('숫자가 아닌 값(NaN)은 오류다', () => {
    const result = validateRetirementInput(makeInput({ monthlyLivingCost: Number.NaN }));

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'monthlyLivingCost')).toBeTruthy();
  });

  it('물가상승률이 허용 범위를 넘으면 오류다', () => {
    const result = validateRetirementInput(makeInput({ inflationRate: 0.9 }));

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'inflationRate')).toBeTruthy();
  });

  it('자산이 0원이어도 입력 자체는 통과한다 (계산은 가능하다)', () => {
    const result = validateRetirementInput(makeInput({ financialAssets: 0 }));

    expect(result.ok).toBe(true);
  });

  it('여러 필드가 잘못되면 오류를 모두 모아서 돌려준다', () => {
    const result = validateRetirementInput(
      makeInput({ financialAssets: -1, monthlyLivingCost: -1, currentAge: 5 }),
    );

    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
