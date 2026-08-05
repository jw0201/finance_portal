/**
 * calculator.ts 독립 검증.
 *
 * 이분탐색 결과처럼 하드코딩한 숫자로 확인하기 어려운 값은
 * "결과가 실제로 조건을 만족하는가" 를 확인하는 property 테스트로 검증한다.
 * 구현이 바뀌어도 성질은 유지되어야 한다.
 */

import { describe, expect, it } from 'vitest';

import {
  calculateWithdrawalRate,
  compareLivingCostChanges,
  compareRetirementAges,
  compareScenarios,
  findSustainableMonthlyLivingCost,
  yearsUntilRetirement,
} from '@/domain/retirement/calculator';
import { BOUNDS, MONTHS_PER_YEAR, SCENARIOS, SUSTAINABLE_SEARCH } from '@/domain/retirement/policy';
import { simulate } from '@/domain/retirement/simulator';
import type { RetirementInput } from '@/domain/retirement/types';

/** 현실적인 기준 입력. 자산이 기대수명 전에 고갈되는 조건이다. */
const BASE_INPUT: RetirementInput = {
  currentAge: 55,
  retirementAge: 60,
  lifeExpectancy: 90,
  financialAssets: 500_000_000,
  nationalPensionMonthly: 1_000_000,
  nationalPensionStartAge: 65,
  privatePensionMonthly: 300_000,
  privatePensionStartAge: 60,
  otherIncomeMonthly: 0,
  otherIncomeEndAge: 65,
  monthlyLivingCost: 3_000_000,
  inflationRate: 0.02,
  investmentReturnRate: 0.03,
  includeHealthcareCost: false,
  healthcareMonthlyCost: 0,
};

function withInput(overrides: Partial<RetirementInput>): RetirementInput {
  return { ...BASE_INPUT, ...overrides };
}

/** 기대수명까지 부족금액 없이 버티는지. */
function survives(input: RetirementInput): boolean {
  return simulate(input).totalShortfall === 0;
}

describe('findSustainableMonthlyLivingCost - 결과가 실제로 지속 가능한가', () => {
  it('돌려준 생활비로는 자산이 고갈되지 않는다', () => {
    const result = findSustainableMonthlyLivingCost(BASE_INPUT);

    expect(
      survives({ ...BASE_INPUT, monthlyLivingCost: result.monthlyLivingCost }),
    ).toBe(true);
  });

  it('돌려준 금액보다 의미 있게 큰 금액은 자산을 고갈시킨다', () => {
    const result = findSustainableMonthlyLivingCost(BASE_INPUT);

    // 표시 단위(1만원)의 10배를 더하면 확실히 경계를 넘는다.
    const tooMuch = result.monthlyLivingCost + SUSTAINABLE_SEARCH.roundDownTo * 10;
    expect(survives({ ...BASE_INPUT, monthlyLivingCost: tooMuch })).toBe(false);
  });

  it('여러 조건에서 "지속 가능하고, 조금 더 쓰면 안 되는" 경계를 지킨다', () => {
    const cases: RetirementInput[] = [
      withInput({ financialAssets: 100_000_000 }),
      withInput({ financialAssets: 500_000_000 }),
      withInput({ financialAssets: 1_000_000_000 }),
      withInput({ currentAge: 65, retirementAge: 65, financialAssets: 300_000_000 }),
      withInput({ inflationRate: 0.05, investmentReturnRate: 0.01 }),
      withInput({ inflationRate: 0, investmentReturnRate: 0 }),
      withInput({ nationalPensionMonthly: 0, privatePensionMonthly: 0 }),
      withInput({ includeHealthcareCost: true, healthcareMonthlyCost: 500_000 }),
      withInput({ lifeExpectancy: 100 }),
      withInput({ investmentReturnRate: -0.05 }),
    ];

    for (const input of cases) {
      const { monthlyLivingCost } = findSustainableMonthlyLivingCost(input);

      // 상한에 걸린 경우는 경계 검사를 할 수 없다.
      if (monthlyLivingCost >= BOUNDS.monthlyAmount.max) {
        expect(survives({ ...input, monthlyLivingCost })).toBe(true);
        continue;
      }

      expect(survives({ ...input, monthlyLivingCost })).toBe(true);
      expect(
        survives({
          ...input,
          monthlyLivingCost: monthlyLivingCost + SUSTAINABLE_SEARCH.roundDownTo * 10,
        }),
      ).toBe(false);
    }
  });

  it('표시 단위(1만원)로 내림한 값이다 (올림하면 감당할 수 없는 금액이 나온다)', () => {
    const result = findSustainableMonthlyLivingCost(BASE_INPUT);

    expect(result.monthlyLivingCost % SUSTAINABLE_SEARCH.roundDownTo).toBe(0);
  });

  it('자산이 많을수록 지속 가능한 생활비가 크다 (단조성)', () => {
    const amounts = [100_000_000, 300_000_000, 500_000_000, 1_000_000_000];
    const costs = amounts.map(
      (financialAssets) =>
        findSustainableMonthlyLivingCost(withInput({ financialAssets })).monthlyLivingCost,
    );

    for (let i = 1; i < costs.length; i += 1) {
      expect(costs[i]).toBeGreaterThanOrEqual(costs[i - 1] ?? 0);
    }
  });

  it('inputIsSustainable 이 실제 시뮬레이션 결과와 일치한다', () => {
    const tight = withInput({ financialAssets: 50_000_000, monthlyLivingCost: 4_000_000 });
    const loose = withInput({ financialAssets: 3_000_000_000, monthlyLivingCost: 2_000_000 });

    expect(findSustainableMonthlyLivingCost(tight).inputIsSustainable).toBe(false);
    expect(findSustainableMonthlyLivingCost(tight).inputIsSustainable).toBe(survives(tight));

    expect(findSustainableMonthlyLivingCost(loose).inputIsSustainable).toBe(true);
    expect(findSustainableMonthlyLivingCost(loose).inputIsSustainable).toBe(survives(loose));
  });

  it('differenceFromInput 은 결과 - 입력값이다 (음수면 지금 계획이 과하다)', () => {
    const input = withInput({ financialAssets: 200_000_000, monthlyLivingCost: 5_000_000 });
    const result = findSustainableMonthlyLivingCost(input);

    expect(result.differenceFromInput).toBe(
      result.monthlyLivingCost - input.monthlyLivingCost,
    );
    expect(result.differenceFromInput).toBeLessThan(0);
  });

  it('소득이 생활비를 넘어 자산이 계속 늘면 상한을 돌려준다', () => {
    // 연금 1억원/월. 어떤 생활비를 넣어도 자산이 유지된다.
    const input = withInput({
      currentAge: 60,
      retirementAge: 60,
      nationalPensionMonthly: BOUNDS.monthlyAmount.max,
      nationalPensionStartAge: 60,
      privatePensionMonthly: 0,
      financialAssets: 1_000_000_000,
      inflationRate: 0,
    });

    const result = findSustainableMonthlyLivingCost(input);
    expect(result.monthlyLivingCost).toBe(BOUNDS.monthlyAmount.max);
    expect(result.inputIsSustainable).toBe(true);
  });

  it('자산이 0원이고 소득도 없으면 지속 가능한 생활비가 0원이다', () => {
    const input = withInput({
      currentAge: 60,
      retirementAge: 60,
      financialAssets: 0,
      nationalPensionMonthly: 0,
      privatePensionMonthly: 0,
      otherIncomeMonthly: 0,
    });

    const result = findSustainableMonthlyLivingCost(input);
    expect(result.monthlyLivingCost).toBe(0);
    expect(survives({ ...input, monthlyLivingCost: 0 })).toBe(true);
  });

  it('의료비를 켜면 지속 가능한 생활비가 줄어든다', () => {
    const without = findSustainableMonthlyLivingCost(
      withInput({ includeHealthcareCost: false }),
    ).monthlyLivingCost;
    const withHealthcare = findSustainableMonthlyLivingCost(
      withInput({ includeHealthcareCost: true, healthcareMonthlyCost: 500_000 }),
    ).monthlyLivingCost;

    expect(withHealthcare).toBeLessThan(without);
  });
});

describe('compareScenarios - 시나리오 비교', () => {
  it('보수적·기준·낙관적 세 건을 순서대로 돌려준다', () => {
    const results = compareScenarios(BASE_INPUT);

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.kind)).toEqual(['conservative', 'base', 'optimistic']);
  });

  it('보수적 시나리오가 낙관적 시나리오보다 오래 버티지 못한다', () => {
    const [conservative, , optimistic] = compareScenarios(BASE_INPUT);

    expect(conservative).toBeDefined();
    expect(optimistic).toBeDefined();
    if (!conservative || !optimistic) {
      return;
    }

    const conservativeAge = conservative.result.depletionAge;
    const optimisticAge = optimistic.result.depletionAge;

    // 낙관적이 고갈되면 보수적도 반드시 고갈된다.
    if (optimisticAge !== null) {
      expect(conservativeAge).not.toBeNull();
    }
    if (conservativeAge !== null && optimisticAge !== null) {
      expect(conservativeAge).toBeLessThanOrEqual(optimisticAge);
    }

    expect(conservative.result.totalShortfall).toBeGreaterThanOrEqual(
      optimistic.result.totalShortfall,
    );
    expect(conservative.result.assetsAtLifeExpectancy).toBeLessThanOrEqual(
      optimistic.result.assetsAtLifeExpectancy,
    );
  });

  it('여러 자산 규모에서 보수적 <= 낙관적 관계가 유지된다', () => {
    const assetAmounts = [50_000_000, 200_000_000, 500_000_000, 1_500_000_000, 5_000_000_000];

    for (const financialAssets of assetAmounts) {
      const [conservative, , optimistic] = compareScenarios(withInput({ financialAssets }));
      if (!conservative || !optimistic) {
        throw new Error('시나리오 비교 결과가 3건이 아닙니다.');
      }

      const c = conservative.result.depletionAge;
      const o = optimistic.result.depletionAge;

      if (o !== null) {
        expect(c).not.toBeNull();
      }
      if (c !== null && o !== null) {
        expect(c).toBeLessThanOrEqual(o);
      }
      expect(conservative.result.assetsAtLifeExpectancy).toBeLessThanOrEqual(
        optimistic.result.assetsAtLifeExpectancy,
      );
    }
  });

  it('기준 시나리오는 사용자가 입력한 가정을 그대로 쓴다', () => {
    const input = withInput({ investmentReturnRate: 0.045, inflationRate: 0.025 });
    const base = compareScenarios(input).find((r) => r.kind === 'base');

    expect(base?.investmentReturnRate).toBe(0.045);
    expect(base?.inflationRate).toBe(0.025);
    // 입력을 그대로 돌린 결과와 같아야 한다.
    expect(base?.result).toEqual(simulate(input));
  });

  it('보수적·낙관적 시나리오는 policy 의 가정값을 쓴다', () => {
    const input = withInput({ investmentReturnRate: 0.045, inflationRate: 0.025 });
    const results = compareScenarios(input);

    const conservative = results.find((r) => r.kind === 'conservative');
    expect(conservative?.investmentReturnRate).toBe(SCENARIOS.conservative.investmentReturnRate);
    expect(conservative?.inflationRate).toBe(SCENARIOS.conservative.inflationRate);

    const optimistic = results.find((r) => r.kind === 'optimistic');
    expect(optimistic?.investmentReturnRate).toBe(SCENARIOS.optimistic.investmentReturnRate);
    expect(optimistic?.inflationRate).toBe(SCENARIOS.optimistic.inflationRate);
  });

  it('시나리오는 수익률·물가 외의 입력을 바꾸지 않는다', () => {
    const results = compareScenarios(BASE_INPUT);

    for (const scenario of results) {
      const first = scenario.result.projections[0];
      expect(first?.age).toBe(BASE_INPUT.currentAge);
      expect(first?.startingAssets).toBe(BASE_INPUT.financialAssets);
      expect(scenario.result.projections.at(-1)?.age).toBe(BASE_INPUT.lifeExpectancy);
    }
  });

  it('화면에 표시할 이름과 가정 설명이 비어 있지 않다', () => {
    for (const scenario of compareScenarios(BASE_INPUT)) {
      expect(scenario.label.length).toBeGreaterThan(0);
      expect(scenario.assumptionText.length).toBeGreaterThan(0);
    }
  });
});

describe('compareLivingCostChanges - 생활비 변경 비교', () => {
  it('기준 생활비를 포함해 오름차순으로 돌려준다', () => {
    const results = compareLivingCostChanges(BASE_INPUT, [-500_000, 500_000]);

    expect(results.map((r) => r.monthlyLivingCost)).toEqual([
      2_500_000, 3_000_000, 3_500_000,
    ]);
  });

  it('생활비를 늘리면 더 이른 나이에 고갈되고 부족금액이 커진다 (단조성)', () => {
    const results = compareLivingCostChanges(BASE_INPUT);

    for (let i = 1; i < results.length; i += 1) {
      const lower = results[i - 1];
      const higher = results[i];
      if (!lower || !higher) {
        continue;
      }

      expect(higher.monthlyLivingCost).toBeGreaterThan(lower.monthlyLivingCost);
      expect(higher.assetsAtLifeExpectancy).toBeLessThanOrEqual(
        lower.assetsAtLifeExpectancy,
      );
      expect(higher.totalShortfall).toBeGreaterThanOrEqual(lower.totalShortfall);

      if (higher.depletionAge !== null && lower.depletionAge !== null) {
        expect(higher.depletionAge).toBeLessThanOrEqual(lower.depletionAge);
      }
      // 생활비가 적은 쪽이 고갈되면 많은 쪽도 반드시 고갈된다.
      if (lower.depletionAge !== null) {
        expect(higher.depletionAge).not.toBeNull();
      }
    }
  });

  it('생활비가 0원 미만이 되는 후보는 제외한다', () => {
    const results = compareLivingCostChanges(
      withInput({ monthlyLivingCost: 200_000 }),
      [-500_000, 300_000],
    );

    expect(results.every((r) => r.monthlyLivingCost >= BOUNDS.monthlyAmount.min)).toBe(true);
    expect(results.map((r) => r.monthlyLivingCost)).toEqual([200_000, 500_000]);
  });

  it('상한을 넘는 후보도 제외한다', () => {
    const results = compareLivingCostChanges(
      withInput({ monthlyLivingCost: BOUNDS.monthlyAmount.max }),
      [-500_000, 500_000],
    );

    expect(results.every((r) => r.monthlyLivingCost <= BOUNDS.monthlyAmount.max)).toBe(true);
  });

  it('중복된 생활비는 한 번만 나온다', () => {
    const results = compareLivingCostChanges(BASE_INPUT, [0, 0, 300_000]);

    const costs = results.map((r) => r.monthlyLivingCost);
    expect(new Set(costs).size).toBe(costs.length);
  });

  it('differenceFromInput 이 기준값과의 차액이다', () => {
    const results = compareLivingCostChanges(BASE_INPUT, [-300_000, 300_000]);

    for (const row of results) {
      expect(row.differenceFromInput).toBe(
        row.monthlyLivingCost - BASE_INPUT.monthlyLivingCost,
      );
    }
    expect(results.find((r) => r.differenceFromInput === 0)).toBeDefined();
  });

  it('각 행이 그 생활비로 돌린 시뮬레이션과 일치한다', () => {
    for (const row of compareLivingCostChanges(BASE_INPUT, [-300_000, 300_000])) {
      const direct = simulate({ ...BASE_INPUT, monthlyLivingCost: row.monthlyLivingCost });
      expect(row.depletionAge).toBe(direct.depletionAge);
      expect(row.assetsAtLifeExpectancy).toBe(direct.assetsAtLifeExpectancy);
      expect(row.totalShortfall).toBe(direct.totalShortfall);
    }
  });
});

describe('compareRetirementAges - 은퇴 시점 비교', () => {
  it('은퇴를 늦추면 은퇴 시점 자산이 늘어난다 (수익률이 양수일 때)', () => {
    const results = compareRetirementAges(
      withInput({ investmentReturnRate: 0.03 }),
      [-3, 0, 3, 5],
    );

    for (let i = 1; i < results.length; i += 1) {
      const earlier = results[i - 1];
      const later = results[i];
      if (!earlier || !later) {
        continue;
      }
      expect(later.retirementAge).toBeGreaterThan(earlier.retirementAge);
      expect(later.assetsAtRetirement).toBeGreaterThan(earlier.assetsAtRetirement);
    }
  });

  it('은퇴를 늦추면 자산이 더 오래 유지된다', () => {
    const results = compareRetirementAges(BASE_INPUT);

    for (let i = 1; i < results.length; i += 1) {
      const earlier = results[i - 1];
      const later = results[i];
      if (!earlier || !later) {
        continue;
      }
      expect(later.assetsAtLifeExpectancy).toBeGreaterThanOrEqual(
        earlier.assetsAtLifeExpectancy,
      );
      expect(later.totalShortfall).toBeLessThanOrEqual(earlier.totalShortfall);
    }
  });

  it('현재 나이보다 이른 은퇴 나이는 제외한다', () => {
    const results = compareRetirementAges(
      withInput({ currentAge: 60, retirementAge: 60 }),
      [-5, -1, 0, 3],
    );

    expect(results.every((r) => r.retirementAge >= 60)).toBe(true);
    expect(results.map((r) => r.retirementAge)).toEqual([60, 63]);
  });

  it('기대수명을 넘는 은퇴 나이는 제외한다', () => {
    const results = compareRetirementAges(
      withInput({ currentAge: 60, retirementAge: 88, lifeExpectancy: 90 }),
      [0, 5],
    );

    expect(results.every((r) => r.retirementAge <= 90)).toBe(true);
    expect(results.map((r) => r.retirementAge)).toEqual([88]);
  });

  it('BOUNDS.retirementAge 범위를 벗어나는 후보는 제외한다', () => {
    const results = compareRetirementAges(
      withInput({ currentAge: 40, retirementAge: 41, lifeExpectancy: 90 }),
      [-3, 0],
    );

    // 41-3 = 38 은 BOUNDS.retirementAge.min(40) 미만이므로 빠진다.
    expect(results.every((r) => r.retirementAge >= BOUNDS.retirementAge.min)).toBe(true);
    expect(results.map((r) => r.retirementAge)).toEqual([41]);
  });

  it('기준 은퇴 나이가 항상 포함된다', () => {
    const results = compareRetirementAges(BASE_INPUT);

    expect(results.find((r) => r.retirementAge === BASE_INPUT.retirementAge)).toBeDefined();
    expect(results.find((r) => r.differenceFromInput === 0)).toBeDefined();
  });

  it('각 행이 그 은퇴 나이로 돌린 시뮬레이션과 일치한다', () => {
    for (const row of compareRetirementAges(BASE_INPUT, [0, 3])) {
      const direct = simulate({ ...BASE_INPUT, retirementAge: row.retirementAge });
      expect(row.depletionAge).toBe(direct.depletionAge);
      expect(row.assetsAtRetirement).toBe(direct.assetsAtRetirement);
      expect(row.totalShortfall).toBe(direct.totalShortfall);
    }
  });
});

describe('calculateWithdrawalRate - 매년 자산에서 꺼내 쓰는 비율', () => {
  it('은퇴 첫해 부족금액 / 은퇴 시점 자산이다 (손계산)', () => {
    // 자산 5억, 연금 없음, 월 생활비 200만원, 물가·수익률 0%.
    // 연 인출 2,400만원 / 5억 = 0.048
    const input = withInput({
      currentAge: 60,
      retirementAge: 60,
      financialAssets: 500_000_000,
      nationalPensionMonthly: 0,
      privatePensionMonthly: 0,
      monthlyLivingCost: 2_000_000,
      inflationRate: 0,
      investmentReturnRate: 0,
    });

    expect(calculateWithdrawalRate(input)).toBeCloseTo(0.048, 10);
  });

  it('연금이 생활비를 모두 덮으면 0이다', () => {
    const input = withInput({
      currentAge: 60,
      retirementAge: 60,
      financialAssets: 500_000_000,
      nationalPensionMonthly: 4_000_000,
      nationalPensionStartAge: 60,
      privatePensionMonthly: 0,
      monthlyLivingCost: 2_000_000,
      inflationRate: 0,
    });

    expect(calculateWithdrawalRate(input)).toBe(0);
  });

  it('은퇴 시점 자산이 0원이면 null 이다 (0으로 나누지 않는다)', () => {
    const input = withInput({
      currentAge: 60,
      retirementAge: 60,
      financialAssets: 0,
      monthlyLivingCost: 2_000_000,
    });

    expect(calculateWithdrawalRate(input)).toBeNull();
  });

  it('연 인출액 / 은퇴 시점 자산 관계가 항상 성립한다', () => {
    const input = withInput({ financialAssets: 800_000_000 });
    const rate = calculateWithdrawalRate(input);
    const result = simulate(input);

    expect(rate).not.toBeNull();
    expect(rate).toBeCloseTo(
      (result.monthlyShortfallAtRetirement * MONTHS_PER_YEAR) / result.assetsAtRetirement,
      10,
    );
  });
});

describe('yearsUntilRetirement', () => {
  it('은퇴까지 남은 기간을 돌려준다', () => {
    expect(yearsUntilRetirement(withInput({ currentAge: 55, retirementAge: 60 }))).toBe(5);
  });

  it('이미 은퇴했으면 0이다', () => {
    expect(yearsUntilRetirement(withInput({ currentAge: 60, retirementAge: 60 }))).toBe(0);
  });

  it('은퇴 나이가 현재 나이보다 이르면 음수가 아니라 0이다', () => {
    expect(yearsUntilRetirement(withInput({ currentAge: 65, retirementAge: 60 }))).toBe(0);
  });
});
