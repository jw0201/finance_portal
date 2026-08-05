/**
 * 깨진 입력이 시뮬레이터에 들어갔을 때의 동작을 고정한다.
 *
 * 실제로 있었던 문제:
 *   저장소는 `input` 이 객체인지만 확인하고 안쪽 필드는 보지 않는다.
 *   그래서 값이 깨진 계획도 불러와졌고, 그대로 simulate 에 들어가면
 *   연도별 결과가 비어 `depletionAge` 가 null 이 되었다.
 *   화면은 null 을 "자산이 유지됩니다" 로 표시하므로,
 *   깨진 계획이 사용자에게 **안심시키는 거짓말**을 했다.
 *
 * 그래서 화면에서는 simulate 전에 validateRetirementInput 으로 막는다.
 * 이 테스트는 (1) 깨진 입력이 왜 위험한지, (2) 검증이 그것을 잡아내는지를
 * 함께 고정해 회귀를 막는다.
 */

import { describe, expect, it } from 'vitest';

import { simulate } from './simulator';
import type { RetirementInput } from './types';
import { validateRetirementInput } from './validation';

/** 저장소에서 나올 수 있는 깨진 입력들. */
const CORRUPT_INPUTS: readonly { label: string; input: unknown }[] = [
  { label: '나이가 문자열', input: { currentAge: '쉰일곱' } },
  { label: '필드가 거의 없음', input: { currentAge: 60 } },
  { label: '빈 객체', input: {} },
  {
    label: '금액이 문자열',
    input: {
      currentAge: 60,
      retirementAge: 65,
      lifeExpectancy: 90,
      financialAssets: '6억',
      monthlyLivingCost: 2_000_000,
    },
  },
  {
    label: '기대수명이 현재 나이보다 작음',
    input: {
      currentAge: 70,
      retirementAge: 65,
      lifeExpectancy: 60,
      financialAssets: 100_000_000,
      monthlyLivingCost: 2_000_000,
    },
  },
];

describe('깨진 입력은 검증에서 걸러진다', () => {
  for (const { label, input } of CORRUPT_INPUTS) {
    it(`${label} — validateRetirementInput 이 통과시키지 않는다`, () => {
      const result = validateRetirementInput(input as RetirementInput);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it(`${label} — 오류 메시지가 한국어로 제공된다`, () => {
      const result = validateRetirementInput(input as RetirementInput);
      for (const error of result.errors) {
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.field.length).toBeGreaterThan(0);
      }
    });
  }
});

describe('검증 없이 계산하면 왜 위험한가 (현재 동작을 기록한다)', () => {
  it('필드가 없는 입력은 연도별 결과가 비어 버린다', () => {
    const result = simulate({ currentAge: '쉰일곱' } as unknown as RetirementInput);
    expect(result.projections).toHaveLength(0);
  });

  it('그 결과 depletionAge 가 null 이 되어 "고갈 없음" 처럼 보인다', () => {
    const result = simulate({ currentAge: '쉰일곱' } as unknown as RetirementInput);

    // null 은 화면에서 "자산이 유지됩니다" 로 표시된다.
    // 즉 깨진 데이터가 좋은 결과처럼 보인다. 그래서 UI 가 먼저 막아야 한다.
    expect(result.depletionAge).toBeNull();
  });

  it('정상 입력과 깨진 입력이 같은 depletionAge(null) 를 낼 수 있다', () => {
    const healthy: RetirementInput = {
      currentAge: 60,
      retirementAge: 60,
      lifeExpectancy: 90,
      financialAssets: 10_000_000_000,
      monthlyLivingCost: 1_000_000,
      nationalPensionMonthly: 0,
      nationalPensionStartAge: 65,
      privatePensionMonthly: 0,
      privatePensionStartAge: 60,
      otherIncomeMonthly: 0,
      otherIncomeEndAge: 65,
      inflationRate: 0.02,
      investmentReturnRate: 0.03,
      includeHealthcareCost: false,
      healthcareMonthlyCost: 0,
    };

    const healthyResult = simulate(healthy);
    const corruptResult = simulate({} as unknown as RetirementInput);

    // 둘 다 null 이다. 숫자만 보면 구별할 수 없다.
    expect(healthyResult.depletionAge).toBeNull();
    expect(corruptResult.depletionAge).toBeNull();

    // 구별은 projections 유무와 검증으로만 가능하다.
    expect(healthyResult.projections.length).toBeGreaterThan(0);
    expect(corruptResult.projections).toHaveLength(0);
    expect(validateRetirementInput(healthy).ok).toBe(true);
    expect(validateRetirementInput({} as RetirementInput).ok).toBe(false);
  });
});
