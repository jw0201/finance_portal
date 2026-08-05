/**
 * simulate() 독립 검증.
 *
 * 기대값은 구현을 읽어 맞춘 것이 아니라 CLAUDE.md "확정된 계산 가정" 에서
 * 손으로 계산한 값이다. 구현이 가정과 다르면 이 테스트가 실패해야 한다.
 *
 * simulator.test.ts 와 별도 파일로 둔다 (구현 담당과 동시에 작업하므로 충돌을 피한다).
 */

import { describe, expect, it } from 'vitest';

import { HEALTHCARE, MONTHS_PER_YEAR } from '@/domain/retirement/policy';
import { simulate } from '@/domain/retirement/simulator';
import type { RetirementInput, YearlyProjection } from '@/domain/retirement/types';

/**
 * 모든 소득·지출·비율이 0인 입력.
 *
 * 필요한 항목만 켜서 가정을 하나씩 분리해 본다.
 * 기본값이 섞여 있으면 어떤 가정이 결과를 만들었는지 알 수 없다.
 */
const ZERO_INPUT: RetirementInput = {
  currentAge: 55,
  retirementAge: 60,
  lifeExpectancy: 90,
  financialAssets: 0,
  nationalPensionMonthly: 0,
  nationalPensionStartAge: 65,
  privatePensionMonthly: 0,
  privatePensionStartAge: 60,
  otherIncomeMonthly: 0,
  otherIncomeEndAge: 65,
  monthlyLivingCost: 0,
  inflationRate: 0,
  investmentReturnRate: 0,
  includeHealthcareCost: false,
  healthcareMonthlyCost: 0,
};

function withInput(overrides: Partial<RetirementInput>): RetirementInput {
  return { ...ZERO_INPUT, ...overrides };
}

/** 나이로 해당 연도를 찾는다. 없으면 테스트를 실패시킨다. */
function yearAt(projections: readonly YearlyProjection[], age: number): YearlyProjection {
  const found = projections.find((year) => year.age === age);
  if (!found) {
    throw new Error(`age ${age} 연도가 시뮬레이션 결과에 없습니다.`);
  }
  return found;
}

describe('simulate - 시뮬레이션 기간', () => {
  it('현재 나이부터 기대수명까지 매년 한 건씩 만든다', () => {
    const result = simulate(withInput({ currentAge: 55, lifeExpectancy: 90 }));

    // 55세부터 90세까지 양끝 포함 36개.
    expect(result.projections).toHaveLength(36);
    expect(result.projections[0]?.age).toBe(55);
    expect(result.projections[0]?.yearIndex).toBe(0);
    expect(result.projections[35]?.age).toBe(90);
    expect(result.projections[35]?.yearIndex).toBe(35);
  });

  it('은퇴 나이부터 isRetired 가 true 다', () => {
    const result = simulate(withInput({ currentAge: 55, retirementAge: 60 }));

    expect(yearAt(result.projections, 59).isRetired).toBe(false);
    expect(yearAt(result.projections, 60).isRetired).toBe(true);
  });
});

describe('simulate - 은퇴 전 자산 (가정 1)', () => {
  it('은퇴 전에는 생활비를 인출하지 않는다', () => {
    const result = simulate(
      withInput({
        currentAge: 55,
        retirementAge: 60,
        financialAssets: 100_000_000,
        investmentReturnRate: 0.03,
        monthlyLivingCost: 3_000_000,
      }),
    );

    for (const age of [55, 56, 57, 58, 59]) {
      const year = yearAt(result.projections, age);
      expect(year.livingCost).toBe(0);
      expect(year.totalExpense).toBe(0);
      expect(year.shortfall).toBe(0);
    }
  });

  it('은퇴 전 자산은 5년간 복리로 늘어난다 (손계산: 1억 * 1.03^5 = 115,927,407.43)', () => {
    const result = simulate(
      withInput({
        currentAge: 55,
        retirementAge: 60,
        financialAssets: 100_000_000,
        investmentReturnRate: 0.03,
      }),
    );

    // 55,56,57,58,59세 5년간 3% 복리 -> 60세 연초 자산.
    const expected = 100_000_000 * Math.pow(1.03, 5);
    expect(expected).toBeCloseTo(115_927_407.43, 2);

    expect(yearAt(result.projections, 60).startingAssets).toBeCloseTo(expected, 6);
    expect(result.assetsAtRetirement).toBeCloseTo(expected, 6);
  });

  it('은퇴 전 한 해의 투자수익은 연초 자산 * 수익률이다', () => {
    const result = simulate(
      withInput({ financialAssets: 100_000_000, investmentReturnRate: 0.03 }),
    );

    const first = yearAt(result.projections, 55);
    expect(first.startingAssets).toBe(100_000_000);
    expect(first.investmentReturn).toBeCloseTo(3_000_000, 6);
    expect(first.endingAssets).toBeCloseTo(103_000_000, 6);
  });

  it('추가 저축을 가정하지 않는다 (은퇴 전 자산 증가는 수익률로만 설명된다)', () => {
    const rate = 0.04;
    const result = simulate(
      withInput({
        currentAge: 50,
        retirementAge: 65,
        financialAssets: 200_000_000,
        investmentReturnRate: rate,
        // 소득이 있어도 은퇴 전 자산에는 영향이 없어야 한다.
        nationalPensionMonthly: 1_000_000,
        nationalPensionStartAge: 55,
        otherIncomeMonthly: 2_000_000,
        otherIncomeEndAge: 70,
      }),
    );

    for (const year of result.projections) {
      if (year.isRetired) {
        continue;
      }
      expect(year.endingAssets).toBeCloseTo(year.startingAssets * (1 + rate), 6);
    }
  });
});

describe('simulate - 물가상승률 (가정 2)', () => {
  it('yearIndex 0 의 생활비는 부풀리지 않는다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        monthlyLivingCost: 3_000_000,
        inflationRate: 0.02,
      }),
    );

    const first = yearAt(result.projections, 60);
    expect(first.yearIndex).toBe(0);
    // 3,000,000 * 12 = 36,000,000. 물가상승 적용 없음.
    expect(first.livingCost).toBeCloseTo(36_000_000, 6);
  });

  it('N년 뒤 생활비는 정확히 (1+물가상승률)^N 배다', () => {
    const monthly = 3_000_000;
    const inflation = 0.02;
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        monthlyLivingCost: monthly,
        inflationRate: inflation,
      }),
    );

    // 10년 뒤(70세): 36,000,000 * 1.02^10 = 43,883,799.12
    const expectedAt10 = 36_000_000 * Math.pow(1.02, 10);
    expect(expectedAt10).toBeCloseTo(43_883_799.12, 2);
    expect(yearAt(result.projections, 70).livingCost).toBeCloseTo(expectedAt10, 4);

    for (const year of result.projections) {
      expect(year.livingCost).toBeCloseTo(
        monthly * MONTHS_PER_YEAR * Math.pow(1 + inflation, year.yearIndex),
        4,
      );
    }
  });

  it('은퇴 전 기간의 물가상승도 누적된다 (은퇴 첫해 생활비가 이미 부풀려져 있다)', () => {
    // 현재 물가 기준 300만원을 5년 뒤 은퇴 시점에 쓰려면 그때 물가로는 더 많이 든다.
    const result = simulate(
      withInput({
        currentAge: 55,
        retirementAge: 60,
        monthlyLivingCost: 3_000_000,
        inflationRate: 0.02,
      }),
    );

    // 36,000,000 * 1.02^5 = 39,746,908.92
    const expected = 36_000_000 * Math.pow(1.02, 5);
    expect(expected).toBeCloseTo(39_746_908.92, 2);
    expect(yearAt(result.projections, 60).livingCost).toBeCloseTo(expected, 4);
  });

  it('물가상승률이 음수면 생활비가 줄어든다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        monthlyLivingCost: 2_000_000,
        inflationRate: -0.05,
      }),
    );

    // 24,000,000 * 0.95^10 = 14,362,930.09...
    const expected = 24_000_000 * Math.pow(0.95, 10);
    expect(yearAt(result.projections, 70).livingCost).toBeCloseTo(expected, 4);
    expect(expected).toBeLessThan(24_000_000);
  });
});

describe('simulate - 연금 (가정 3)', () => {
  it('개시 나이 직전 해는 0원, 개시 나이부터 명목액 전액이다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        nationalPensionMonthly: 1_200_000,
        nationalPensionStartAge: 65,
      }),
    );

    expect(yearAt(result.projections, 64).nationalPension).toBe(0);
    // 1,200,000 * 12 = 14,400,000
    expect(yearAt(result.projections, 65).nationalPension).toBe(14_400_000);
  });

  it('연금은 물가에 연동되지 않는다 (개시 후 기대수명까지 명목액이 그대로다)', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 90,
        nationalPensionMonthly: 1_200_000,
        nationalPensionStartAge: 65,
        inflationRate: 0.03,
      }),
    );

    for (let age = 65; age <= 90; age += 1) {
      expect(yearAt(result.projections, age).nationalPension).toBe(14_400_000);
    }
  });

  it('국민연금과 개인연금의 개시 나이를 각각 따른다', () => {
    const result = simulate(
      withInput({
        currentAge: 58,
        retirementAge: 58,
        nationalPensionMonthly: 1_000_000,
        nationalPensionStartAge: 65,
        privatePensionMonthly: 500_000,
        privatePensionStartAge: 60,
      }),
    );

    const at59 = yearAt(result.projections, 59);
    expect(at59.nationalPension).toBe(0);
    expect(at59.privatePension).toBe(0);

    const at60 = yearAt(result.projections, 60);
    expect(at60.nationalPension).toBe(0);
    expect(at60.privatePension).toBe(6_000_000);
    expect(at60.totalIncome).toBe(6_000_000);

    const at65 = yearAt(result.projections, 65);
    expect(at65.nationalPension).toBe(12_000_000);
    expect(at65.privatePension).toBe(6_000_000);
    expect(at65.totalIncome).toBe(18_000_000);
  });

  it('기타소득은 종료 나이까지 발생하고 그 다음 해부터 0이다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        otherIncomeMonthly: 800_000,
        otherIncomeEndAge: 65,
      }),
    );

    // types.ts: "이 나이까지 발생한다" -> 65세 포함.
    expect(yearAt(result.projections, 64).otherIncome).toBe(9_600_000);
    expect(yearAt(result.projections, 65).otherIncome).toBe(9_600_000);
    expect(yearAt(result.projections, 66).otherIncome).toBe(0);
  });

  it('연금·기타소득 합계가 totalIncome 과 일치한다', () => {
    const result = simulate(
      withInput({
        currentAge: 65,
        retirementAge: 65,
        nationalPensionMonthly: 1_000_000,
        nationalPensionStartAge: 65,
        privatePensionMonthly: 400_000,
        privatePensionStartAge: 65,
        otherIncomeMonthly: 300_000,
        otherIncomeEndAge: 70,
      }),
    );

    for (const year of result.projections) {
      expect(year.totalIncome).toBeCloseTo(
        year.nationalPension + year.privatePension + year.otherIncome,
        6,
      );
    }
  });
});

describe('simulate - 은퇴 전에 개시되는 연금 (판단이 필요한 지점)', () => {
  /**
   * privatePensionStartAge(60) < retirementAge(65) 인 경우.
   *
   * CLAUDE.md 의 관련 가정은 두 개다.
   *   - "은퇴 전에는 자산을 인출하지 않고 투자수익만 반영한다. 추가 저축은 가정하지 않는다."
   *   - "연금은 개시 나이부터 발생하며, 물가에 연동되지 않는 명목액으로 본다."
   *
   * 자산에 쌓이지 않는 것 자체는 "추가 저축을 가정하지 않는다" 로 설명된다.
   * 문제는 연도별 결과에서도 0원으로 보고되어 사용자가 입력한 값이
   * 어디에도 나타나지 않는다는 점이다. 리포트에서 판단을 밝힌다.
   */
  it('은퇴 전 개시된 연금은 자산에 더해지지 않는다', () => {
    const result = simulate(
      withInput({
        currentAge: 55,
        retirementAge: 65,
        financialAssets: 100_000_000,
        privatePensionMonthly: 1_000_000,
        privatePensionStartAge: 60,
        investmentReturnRate: 0,
      }),
    );

    // 수익률 0% 이므로 연금이 자산에 더해진다면 자산이 늘어야 한다.
    expect(yearAt(result.projections, 65).startingAssets).toBe(100_000_000);
  });

  it('은퇴 전 연금은 연도별 결과에도 0원으로 보고된다 (화면에 드러나지 않는다)', () => {
    const result = simulate(
      withInput({
        currentAge: 55,
        retirementAge: 65,
        privatePensionMonthly: 1_000_000,
        privatePensionStartAge: 60,
      }),
    );

    // 60~64세: 개시 나이는 지났지만 은퇴 전이다.
    for (const age of [60, 61, 62, 63, 64]) {
      const year = yearAt(result.projections, age);
      expect(year.isRetired).toBe(false);
      expect(year.privatePension).toBe(0);
      expect(year.totalIncome).toBe(0);
    }

    expect(yearAt(result.projections, 65).privatePension).toBe(12_000_000);
  });

  it('은퇴 전 개시 연금은 은퇴 나이를 늦춰도 총액에 반영되지 않는다', () => {
    const base = withInput({
      currentAge: 60,
      retirementAge: 60,
      lifeExpectancy: 90,
      financialAssets: 100_000_000,
      privatePensionMonthly: 1_000_000,
      privatePensionStartAge: 60,
      monthlyLivingCost: 2_000_000,
    });

    // 60세 은퇴: 60세부터 연금을 받아 쓴다.
    const retireAt60 = simulate(base);
    // 65세 은퇴: 60~64세 연금 6,000만원(=1,000만원*5년... 실제로는 연 1,200만원*5=6,000만원)이 사라진다.
    const retireAt65 = simulate({ ...base, retirementAge: 65 });

    const incomeUntil64 = retireAt65.projections
      .filter((year) => year.age < 65)
      .reduce((sum, year) => sum + year.totalIncome, 0);

    // 5년치 연금 6,000만원이 어디에도 나타나지 않는다.
    expect(incomeUntil64).toBe(0);
    expect(retireAt60.projections.filter((y) => y.age < 65).reduce((s, y) => s + y.totalIncome, 0)).toBe(
      60_000_000,
    );
  });

  it('개시 나이를 은퇴 전으로 당겨도 결과가 전혀 달라지지 않는다', () => {
    // 55세, 은퇴 65세, 개인연금 월 100만원.
    // 개시를 60세로 당기면 5년치 6,000만원을 더 받는데도 결과가 같다.
    // 사용자 입장에서는 "연금을 5년 일찍 받겠다" 는 선택이 아무 효과가 없어 보인다.
    const input = withInput({
      currentAge: 55,
      retirementAge: 65,
      lifeExpectancy: 90,
      financialAssets: 500_000_000,
      privatePensionMonthly: 1_000_000,
      privatePensionStartAge: 60,
      monthlyLivingCost: 3_000_000,
      inflationRate: 0.02,
      investmentReturnRate: 0.03,
    });

    const startsBeforeRetirement = simulate(input);
    const startsAtRetirement = simulate({ ...input, privatePensionStartAge: 65 });

    expect(startsBeforeRetirement.depletionAge).toBe(startsAtRetirement.depletionAge);
    expect(startsBeforeRetirement.assetsAtLifeExpectancy).toBe(
      startsAtRetirement.assetsAtLifeExpectancy,
    );
    expect(startsBeforeRetirement.totalShortfall).toBe(startsAtRetirement.totalShortfall);
  });

  it('기타소득이 은퇴 전에 끝나면 은퇴 후에는 전혀 반영되지 않는다', () => {
    const result = simulate(
      withInput({
        currentAge: 55,
        retirementAge: 65,
        otherIncomeMonthly: 2_000_000,
        otherIncomeEndAge: 60,
      }),
    );

    // otherIncomeEndAge(60) < retirementAge(65) 이므로 모든 해에서 0이다.
    for (const year of result.projections) {
      expect(year.otherIncome).toBe(0);
      expect(year.totalIncome).toBe(0);
    }
  });
});

describe('simulate - 자산 0원 하한과 shortfall (가정 4)', () => {
  it('자산이 음수로 내려가지 않고 못 채운 금액이 shortfall 이 된다', () => {
    // 자산 1,000만원, 연 생활비 3,600만원, 수익률·물가 0%, 소득 없음.
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 62,
        financialAssets: 10_000_000,
        monthlyLivingCost: 3_000_000,
      }),
    );

    const first = yearAt(result.projections, 60);
    expect(first.totalExpense).toBe(36_000_000);
    expect(first.endingAssets).toBe(0);
    // 10,000,000 - 36,000,000 = -26,000,000 -> shortfall 26,000,000
    expect(first.shortfall).toBe(26_000_000);

    // 자산이 0이 된 다음 해부터는 지출 전액이 shortfall 이다.
    expect(yearAt(result.projections, 61).shortfall).toBe(36_000_000);
    expect(yearAt(result.projections, 62).shortfall).toBe(36_000_000);

    for (const year of result.projections) {
      expect(year.endingAssets).toBeGreaterThanOrEqual(0);
    }

    // 26,000,000 + 36,000,000 + 36,000,000 = 98,000,000
    expect(result.totalShortfall).toBe(98_000_000);
  });

  it('자산이 충분하면 shortfall 이 전혀 없다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 90,
        financialAssets: 3_000_000_000,
        monthlyLivingCost: 3_000_000,
        inflationRate: 0.02,
        investmentReturnRate: 0.03,
      }),
    );

    expect(result.totalShortfall).toBe(0);
    expect(result.depletionAge).toBeNull();
    expect(result.assetsAtLifeExpectancy).toBeGreaterThan(0);
  });

  it('소득이 지출보다 많으면 자산이 늘어난다', () => {
    const result = simulate(
      withInput({
        currentAge: 65,
        retirementAge: 65,
        lifeExpectancy: 70,
        financialAssets: 50_000_000,
        nationalPensionMonthly: 3_000_000,
        nationalPensionStartAge: 65,
        monthlyLivingCost: 2_000_000,
      }),
    );

    // 매년 3,600만원 수입 - 2,400만원 지출 = 1,200만원 흑자.
    expect(yearAt(result.projections, 65).endingAssets).toBe(62_000_000);
    expect(result.totalShortfall).toBe(0);
  });
});

describe('simulate - 의료비 (가정 5)', () => {
  it('HEALTHCARE.startAge 직전 해에는 없고 그 나이부터 생활비에 더해진다', () => {
    const startAge = HEALTHCARE.startAge;
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 90,
        monthlyLivingCost: 2_000_000,
        includeHealthcareCost: true,
        healthcareMonthlyCost: 300_000,
      }),
    );

    const before = yearAt(result.projections, startAge - 1);
    expect(before.healthcareCost).toBe(0);
    expect(before.totalExpense).toBe(before.livingCost);

    const at = yearAt(result.projections, startAge);
    // 300,000 * 12 = 3,600,000 (물가상승률 0%)
    expect(at.healthcareCost).toBe(3_600_000);
    expect(at.totalExpense).toBe(24_000_000 + 3_600_000);
  });

  it('의료비도 현재 물가 기준이고 매년 물가상승률이 누적된다', () => {
    const startAge = HEALTHCARE.startAge;
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 90,
        includeHealthcareCost: true,
        healthcareMonthlyCost: 300_000,
        inflationRate: 0.02,
      }),
    );

    // 70세는 yearIndex 10. 3,600,000 * 1.02^10 = 4,388,379.91
    const expected = 3_600_000 * Math.pow(1.02, 10);
    expect(expected).toBeCloseTo(4_388_379.91, 2);
    expect(yearAt(result.projections, startAge).healthcareCost).toBeCloseTo(expected, 4);
  });

  it('은퇴 전에는 의료비도 자산에서 나가지 않는다', () => {
    // 은퇴 나이(75)가 의료비 시작 나이(70)보다 늦은 경우.
    const result = simulate(
      withInput({
        currentAge: 68,
        retirementAge: 75,
        lifeExpectancy: 90,
        includeHealthcareCost: true,
        healthcareMonthlyCost: 300_000,
      }),
    );

    for (const age of [70, 71, 72, 73, 74]) {
      expect(yearAt(result.projections, age).healthcareCost).toBe(0);
    }
    expect(yearAt(result.projections, 75).healthcareCost).toBe(3_600_000);
  });
});

describe('simulate - 자산 고갈 나이 (요구사항 6)', () => {
  it('은퇴 중간에 고갈되면 처음 0이 된 나이를 돌려준다 (손계산)', () => {
    // 자산 1억, 연 생활비 3,600만원, 수익률·물가 0%, 소득 없음.
    // 65세: 100,000,000 - 36,000,000 = 64,000,000
    // 66세:  64,000,000 - 36,000,000 = 28,000,000
    // 67세:  28,000,000 - 36,000,000 -> 0 (shortfall 8,000,000)
    const result = simulate(
      withInput({
        currentAge: 65,
        retirementAge: 65,
        lifeExpectancy: 90,
        financialAssets: 100_000_000,
        monthlyLivingCost: 3_000_000,
      }),
    );

    expect(yearAt(result.projections, 65).endingAssets).toBe(64_000_000);
    expect(yearAt(result.projections, 66).endingAssets).toBe(28_000_000);
    expect(yearAt(result.projections, 67).endingAssets).toBe(0);
    expect(yearAt(result.projections, 67).shortfall).toBe(8_000_000);

    expect(result.depletionAge).toBe(67);
    expect(result.assetsAtLifeExpectancy).toBe(0);
  });

  it('고갈되지 않으면 null 이다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 90,
        financialAssets: 5_000_000_000,
        monthlyLivingCost: 3_000_000,
        investmentReturnRate: 0.03,
        inflationRate: 0.02,
      }),
    );

    expect(result.depletionAge).toBeNull();
    expect(result.assetSustainYears).toBeNull();
  });

  it('고갈 나이는 shortfall 이 처음 생기는 해와 같다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 65,
        lifeExpectancy: 90,
        financialAssets: 200_000_000,
        monthlyLivingCost: 3_000_000,
        inflationRate: 0.02,
        investmentReturnRate: 0.03,
      }),
    );

    const firstShortfallYear = result.projections.find((year) => year.shortfall > 0);
    expect(firstShortfallYear).toBeDefined();
    expect(result.depletionAge).toBe(firstShortfallYear?.age);
  });

  it('은퇴 후 유지 기간은 고갈 나이 - 은퇴 나이 다', () => {
    const result = simulate(
      withInput({
        currentAge: 65,
        retirementAge: 65,
        lifeExpectancy: 90,
        financialAssets: 100_000_000,
        monthlyLivingCost: 3_000_000,
      }),
    );

    // 위 손계산과 같은 조건: 67세에 고갈. 67 - 65 = 2년.
    expect(result.depletionAge).toBe(67);
    expect(result.assetSustainYears).toBe(2);
  });

  it('은퇴 첫해에 바로 고갈되면 유지 기간은 0년이다 ("영원히 유지"의 null 과 구분된다)', () => {
    const result = simulate(
      withInput({
        currentAge: 65,
        retirementAge: 65,
        lifeExpectancy: 90,
        financialAssets: 1_000_000,
        monthlyLivingCost: 3_000_000,
      }),
    );

    expect(result.depletionAge).toBe(65);
    expect(result.assetSustainYears).toBe(0);
    expect(result.assetSustainYears).not.toBeNull();
  });

  it('자산이 처음부터 0원이고 은퇴 전이면 그 해를 고갈로 부르지 않는다', () => {
    // 55~59세는 지출이 없으므로 endingAssets 0 이어도 "고갈" 이 아니다.
    const result = simulate(
      withInput({
        currentAge: 55,
        retirementAge: 60,
        lifeExpectancy: 90,
        financialAssets: 0,
        monthlyLivingCost: 3_000_000,
      }),
    );

    expect(result.depletionAge).toBe(60);
    expect(result.assetSustainYears).toBe(0);
  });

  it('정확히 0원으로 끝나는 해도 고갈로 본다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 90,
        financialAssets: 600_000_000,
        monthlyLivingCost: 2_000_000,
      }),
    );

    // 600,000,000 / 24,000,000 = 25회 인출.
    // 첫 인출이 60세(yearIndex 0)이므로 25번째 인출은 84세에 이뤄진다.
    expect(yearAt(result.projections, 83).endingAssets).toBe(24_000_000);
    expect(yearAt(result.projections, 84).endingAssets).toBe(0);
    // 딱 맞게 떨어졌으므로 부족금액은 없다.
    expect(yearAt(result.projections, 84).shortfall).toBe(0);
    expect(result.depletionAge).toBe(84);
  });

  it('은퇴 전에 지출이 없으므로 assetSustainYears 는 음수가 될 수 없다', () => {
    // 수익률 -10% 로 자산이 크게 줄어도 은퇴 전에는 0에 닿지 않는다.
    const result = simulate(
      withInput({
        currentAge: 40,
        retirementAge: 65,
        lifeExpectancy: 90,
        financialAssets: 10_000_000,
        monthlyLivingCost: 3_000_000,
        investmentReturnRate: -0.1,
      }),
    );

    for (const year of result.projections.filter((y) => !y.isRetired)) {
      expect(year.endingAssets).toBeGreaterThan(0);
    }
    expect(result.depletionAge).toBeGreaterThanOrEqual(65);
    expect(result.assetSustainYears).toBeGreaterThanOrEqual(0);
  });
});

describe('simulate - 요약 숫자', () => {
  it('은퇴 첫해의 월소득·월지출·월부족금액을 돌려준다', () => {
    const result = simulate(
      withInput({
        currentAge: 65,
        retirementAge: 65,
        lifeExpectancy: 90,
        financialAssets: 300_000_000,
        nationalPensionMonthly: 1_200_000,
        nationalPensionStartAge: 65,
        privatePensionMonthly: 300_000,
        privatePensionStartAge: 65,
        monthlyLivingCost: 2_500_000,
      }),
    );

    expect(result.monthlyIncomeAtRetirement).toBeCloseTo(1_500_000, 6);
    expect(result.monthlyExpenseAtRetirement).toBeCloseTo(2_500_000, 6);
    // 2,500,000 - 1,500,000 = 1,000,000
    expect(result.monthlyShortfallAtRetirement).toBeCloseTo(1_000_000, 6);
  });

  it('월 부족금액은 음수가 되지 않는다', () => {
    const result = simulate(
      withInput({
        currentAge: 65,
        retirementAge: 65,
        nationalPensionMonthly: 4_000_000,
        nationalPensionStartAge: 65,
        monthlyLivingCost: 2_000_000,
      }),
    );

    expect(result.monthlyShortfallAtRetirement).toBe(0);
  });

  it('assetsAtLifeExpectancy 는 마지막 해의 연말 자산이다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 65,
        financialAssets: 500_000_000,
        monthlyLivingCost: 2_000_000,
      }),
    );

    // 60~65세 6년간 매년 2,400만원 지출. 500,000,000 - 6*24,000,000 = 356,000,000
    expect(result.assetsAtLifeExpectancy).toBe(356_000_000);

    const last = result.projections[result.projections.length - 1];
    expect(last?.age).toBe(65);
    expect(result.assetsAtLifeExpectancy).toBe(last?.endingAssets);
  });
});

describe('simulate - 극단 입력 (요구사항 9)', () => {
  it('금융자산 0원', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 90,
        financialAssets: 0,
        monthlyLivingCost: 2_000_000,
        investmentReturnRate: 0.03,
      }),
    );

    expect(result.assetsAtRetirement).toBe(0);
    expect(result.depletionAge).toBe(60);
    expect(result.totalShortfall).toBeGreaterThan(0);
    for (const year of result.projections) {
      expect(year.endingAssets).toBe(0);
      expect(Number.isFinite(year.shortfall)).toBe(true);
    }
  });

  it('연금이 전혀 없으면 자산만으로 생활한다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 90,
        financialAssets: 600_000_000,
        monthlyLivingCost: 2_000_000,
      }),
    );

    for (const year of result.projections) {
      expect(year.totalIncome).toBe(0);
    }
    expect(result.monthlyIncomeAtRetirement).toBe(0);
  });

  it('retirementAge == currentAge 면 모든 해가 은퇴 상태다', () => {
    const result = simulate(
      withInput({
        currentAge: 62,
        retirementAge: 62,
        lifeExpectancy: 90,
        financialAssets: 300_000_000,
        monthlyLivingCost: 2_000_000,
      }),
    );

    expect(result.projections[0]?.isRetired).toBe(true);
    // 은퇴 시점 자산은 아직 굴리기 전의 현재 자산이다.
    expect(result.assetsAtRetirement).toBe(300_000_000);
    expect(result.projections.every((year) => year.isRetired)).toBe(true);
  });

  it('물가상승률 20% (BOUNDS 상한) 에서도 계산이 유한하다', () => {
    const result = simulate(
      withInput({
        currentAge: 60,
        retirementAge: 60,
        lifeExpectancy: 90,
        financialAssets: 500_000_000,
        monthlyLivingCost: 2_000_000,
        inflationRate: 0.2,
      }),
    );

    // 24,000,000 * 1.2^30
    const expectedLast = 24_000_000 * Math.pow(1.2, 30);
    expect(yearAt(result.projections, 90).livingCost).toBeCloseTo(expectedLast, 0);

    for (const year of result.projections) {
      expect(Number.isFinite(year.endingAssets)).toBe(true);
      expect(Number.isFinite(year.shortfall)).toBe(true);
    }
    expect(result.depletionAge).not.toBeNull();
  });

  it('lifeExpectancy == currentAge + 1 이면 두 해만 계산한다', () => {
    const result = simulate(
      withInput({
        currentAge: 89,
        retirementAge: 89,
        lifeExpectancy: 90,
        financialAssets: 100_000_000,
        monthlyLivingCost: 2_000_000,
      }),
    );

    expect(result.projections).toHaveLength(2);
    expect(result.assetsAtLifeExpectancy).toBe(100_000_000 - 2 * 24_000_000);
  });

  it('lifeExpectancy == currentAge 면 한 해만 계산한다 (검증에서 걸리는 입력이지만 깨지지 않아야 한다)', () => {
    const result = simulate(
      withInput({
        currentAge: 90,
        retirementAge: 90,
        lifeExpectancy: 90,
        financialAssets: 100_000_000,
        monthlyLivingCost: 2_000_000,
      }),
    );

    expect(result.projections).toHaveLength(1);
    expect(result.projections[0]?.age).toBe(90);
    expect(result.assetsAtLifeExpectancy).toBe(100_000_000 - 24_000_000);
  });

  it('투자수익률이 음수면 자산이 은퇴 전에도 줄어든다 (손계산: 1억 * 0.9^5 = 59,049,000)', () => {
    const result = simulate(
      withInput({
        currentAge: 55,
        retirementAge: 60,
        lifeExpectancy: 90,
        financialAssets: 100_000_000,
        investmentReturnRate: -0.1,
      }),
    );

    const first = yearAt(result.projections, 55);
    expect(first.investmentReturn).toBeCloseTo(-10_000_000, 6);
    expect(first.endingAssets).toBeCloseTo(90_000_000, 6);

    expect(yearAt(result.projections, 60).startingAssets).toBeCloseTo(59_049_000, 4);
    expect(result.assetsAtRetirement).toBeCloseTo(59_049_000, 4);
  });
});

describe('simulate - 순수 함수', () => {
  it('같은 입력이면 같은 결과가 나온다', () => {
    const input = withInput({
      currentAge: 55,
      retirementAge: 62,
      lifeExpectancy: 90,
      financialAssets: 450_000_000,
      nationalPensionMonthly: 1_100_000,
      nationalPensionStartAge: 65,
      monthlyLivingCost: 2_800_000,
      inflationRate: 0.02,
      investmentReturnRate: 0.03,
      includeHealthcareCost: true,
      healthcareMonthlyCost: 300_000,
    });

    expect(simulate(input)).toEqual(simulate(input));
  });

  it('입력 객체를 변경하지 않는다', () => {
    const input = withInput({
      currentAge: 60,
      retirementAge: 60,
      financialAssets: 300_000_000,
      monthlyLivingCost: 2_000_000,
    });
    const snapshot = { ...input };

    simulate(input);

    expect(input).toEqual(snapshot);
  });

  it('연말 자산이 다음 해 연초 자산으로 이어진다', () => {
    const result = simulate(
      withInput({
        currentAge: 55,
        retirementAge: 60,
        lifeExpectancy: 90,
        financialAssets: 400_000_000,
        monthlyLivingCost: 2_500_000,
        inflationRate: 0.02,
        investmentReturnRate: 0.03,
        nationalPensionMonthly: 1_000_000,
        nationalPensionStartAge: 65,
      }),
    );

    for (let i = 1; i < result.projections.length; i += 1) {
      expect(result.projections[i]?.startingAssets).toBe(
        result.projections[i - 1]?.endingAssets,
      );
    }
  });

  it('연말 자산 = 연초 + 수익 + 소득 - 지출 (부족하지 않은 해)', () => {
    const result = simulate(
      withInput({
        currentAge: 65,
        retirementAge: 65,
        lifeExpectancy: 85,
        financialAssets: 800_000_000,
        nationalPensionMonthly: 1_200_000,
        nationalPensionStartAge: 65,
        monthlyLivingCost: 3_000_000,
        inflationRate: 0.02,
        investmentReturnRate: 0.03,
      }),
    );

    for (const year of result.projections) {
      expect(year.shortfall).toBe(0);
      expect(year.endingAssets).toBeCloseTo(
        year.startingAssets + year.investmentReturn + year.totalIncome - year.totalExpense,
        4,
      );
    }
  });
});
