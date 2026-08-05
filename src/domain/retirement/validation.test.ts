/**
 * 입력 검증 테스트.
 *
 * 허용 범위는 policy.ts 의 BOUNDS 를 기준으로 확인한다.
 * 메시지는 화면에 그대로 표시되므로 한국어인지도 확인한다.
 */

import { describe, expect, it } from 'vitest';

import { BOUNDS } from '@/domain/retirement/policy';
import type { RetirementInput } from '@/domain/retirement/types';
import {
  findFieldError,
  validateRetirementInput,
} from '@/domain/retirement/validation';

/** 모든 값이 정상인 입력. 테스트마다 한 필드만 어긋나게 만든다. */
const VALID_INPUT: RetirementInput = {
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
  return { ...VALID_INPUT, ...overrides };
}

/** 한글이 포함된 메시지인지. 화면에 그대로 표시되므로 확인한다. */
function isKorean(message: string): boolean {
  return /[가-힣]/.test(message);
}

describe('validateRetirementInput - 정상 입력', () => {
  it('정상 입력은 오류가 없다', () => {
    const result = validateRetirementInput(VALID_INPUT);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('경계값(최소·최대)은 허용한다', () => {
    const atMin = withInput({
      currentAge: BOUNDS.age.min,
      retirementAge: BOUNDS.retirementAge.min,
      lifeExpectancy: BOUNDS.lifeExpectancy.min,
      nationalPensionStartAge: BOUNDS.pensionStartAge.min,
      privatePensionStartAge: BOUNDS.pensionStartAge.min,
      otherIncomeEndAge: BOUNDS.otherIncomeEndAge.min,
      financialAssets: BOUNDS.financialAssets.min,
      nationalPensionMonthly: BOUNDS.monthlyAmount.min,
      privatePensionMonthly: BOUNDS.monthlyAmount.min,
      otherIncomeMonthly: BOUNDS.monthlyAmount.min,
      monthlyLivingCost: BOUNDS.monthlyLivingCost.min,
      healthcareMonthlyCost: BOUNDS.monthlyAmount.min,
      inflationRate: BOUNDS.inflationRate.min,
      investmentReturnRate: BOUNDS.investmentReturnRate.min,
    });
    expect(validateRetirementInput(atMin).ok).toBe(true);

    const atMax = withInput({
      currentAge: BOUNDS.age.max,
      retirementAge: BOUNDS.retirementAge.max,
      lifeExpectancy: BOUNDS.lifeExpectancy.max,
      nationalPensionStartAge: BOUNDS.pensionStartAge.max,
      privatePensionStartAge: BOUNDS.pensionStartAge.max,
      otherIncomeEndAge: BOUNDS.otherIncomeEndAge.max,
      financialAssets: BOUNDS.financialAssets.max,
      nationalPensionMonthly: BOUNDS.monthlyAmount.max,
      privatePensionMonthly: BOUNDS.monthlyAmount.max,
      otherIncomeMonthly: BOUNDS.monthlyAmount.max,
      monthlyLivingCost: BOUNDS.monthlyLivingCost.max,
      healthcareMonthlyCost: BOUNDS.monthlyAmount.max,
      inflationRate: BOUNDS.inflationRate.max,
      investmentReturnRate: BOUNDS.investmentReturnRate.max,
    });
    expect(validateRetirementInput(atMax).ok).toBe(true);
  });
});

describe('validateRetirementInput - 나이 범위', () => {
  it('현재 나이가 범위를 벗어나면 거부한다', () => {
    for (const currentAge of [BOUNDS.age.min - 1, BOUNDS.age.max + 1]) {
      const result = validateRetirementInput(withInput({ currentAge }));
      expect(result.ok).toBe(false);
      const message = findFieldError(result, 'currentAge');
      expect(message).not.toBeNull();
      expect(isKorean(message ?? '')).toBe(true);
    }
  });

  it('은퇴 나이가 범위를 벗어나면 거부한다', () => {
    const result = validateRetirementInput(
      withInput({ retirementAge: BOUNDS.retirementAge.min - 1, currentAge: 30 }),
    );

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'retirementAge')).not.toBeNull();
  });

  it('기대수명이 범위를 벗어나면 거부한다', () => {
    const result = validateRetirementInput(
      withInput({ lifeExpectancy: BOUNDS.lifeExpectancy.max + 1 }),
    );

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'lifeExpectancy')).not.toBeNull();
  });

  it('연금 개시 나이가 범위를 벗어나면 거부한다', () => {
    const national = validateRetirementInput(
      withInput({ nationalPensionStartAge: BOUNDS.pensionStartAge.min - 1 }),
    );
    expect(findFieldError(national, 'nationalPensionStartAge')).not.toBeNull();

    const priv = validateRetirementInput(
      withInput({ privatePensionStartAge: BOUNDS.pensionStartAge.max + 1 }),
    );
    expect(findFieldError(priv, 'privatePensionStartAge')).not.toBeNull();
  });

  it('기타소득 종료 나이가 범위를 벗어나면 거부한다', () => {
    const result = validateRetirementInput(
      withInput({ otherIncomeEndAge: BOUNDS.otherIncomeEndAge.max + 1 }),
    );

    expect(findFieldError(result, 'otherIncomeEndAge')).not.toBeNull();
  });

  it('나이에 소수점을 넣으면 거부한다', () => {
    const result = validateRetirementInput(withInput({ currentAge: 55.5 }));

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'currentAge')).toContain('소수점');
  });

  it('나이가 숫자가 아니면 거부한다', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = validateRetirementInput(withInput({ currentAge: value }));
      expect(result.ok).toBe(false);
      expect(findFieldError(result, 'currentAge')).not.toBeNull();
    }
  });
});

describe('validateRetirementInput - 금액 범위', () => {
  it('금융자산이 음수면 거부한다', () => {
    const result = validateRetirementInput(withInput({ financialAssets: -1 }));

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'financialAssets')).toContain('0원');
  });

  it('금융자산이 상한을 넘으면 거부한다', () => {
    const result = validateRetirementInput(
      withInput({ financialAssets: BOUNDS.financialAssets.max + 1 }),
    );

    expect(result.ok).toBe(false);
    const message = findFieldError(result, 'financialAssets');
    expect(message).not.toBeNull();
    expect(isKorean(message ?? '')).toBe(true);
  });

  it('월 금액 필드들이 각각 검증된다', () => {
    const fields: Array<keyof RetirementInput> = [
      'nationalPensionMonthly',
      'privatePensionMonthly',
      'otherIncomeMonthly',
      'monthlyLivingCost',
      'healthcareMonthlyCost',
    ];

    for (const field of fields) {
      const negative = validateRetirementInput(withInput({ [field]: -1 }));
      expect(findFieldError(negative, field)).not.toBeNull();

      const tooLarge = validateRetirementInput(
        withInput({ [field]: BOUNDS.monthlyAmount.max + 1 }),
      );
      expect(findFieldError(tooLarge, field)).not.toBeNull();
    }
  });

  it('금액이 숫자가 아니면 거부한다', () => {
    const result = validateRetirementInput(withInput({ monthlyLivingCost: Number.NaN }));

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'monthlyLivingCost')).not.toBeNull();
  });
});

describe('validateRetirementInput - 비율 범위', () => {
  it('물가상승률이 범위를 벗어나면 거부한다', () => {
    for (const rate of [BOUNDS.inflationRate.min - 0.01, BOUNDS.inflationRate.max + 0.01]) {
      const result = validateRetirementInput(withInput({ inflationRate: rate }));
      expect(result.ok).toBe(false);
      const message = findFieldError(result, 'inflationRate');
      expect(message).not.toBeNull();
      // 화면에는 퍼센트로 보여준다.
      expect(message).toContain('%');
    }
  });

  it('투자수익률이 범위를 벗어나면 거부한다', () => {
    for (const rate of [
      BOUNDS.investmentReturnRate.min - 0.01,
      BOUNDS.investmentReturnRate.max + 0.01,
    ]) {
      const result = validateRetirementInput(withInput({ investmentReturnRate: rate }));
      expect(result.ok).toBe(false);
      expect(findFieldError(result, 'investmentReturnRate')).not.toBeNull();
    }
  });

  it('음수 물가상승률(-5%)은 허용 범위 안이다', () => {
    const result = validateRetirementInput(withInput({ inflationRate: -0.05 }));

    expect(result.ok).toBe(true);
  });
});

describe('validateRetirementInput - 필드 사이의 관계', () => {
  it('은퇴 나이가 현재 나이보다 앞서면 거부한다', () => {
    const result = validateRetirementInput(
      withInput({ currentAge: 65, retirementAge: 60 }),
    );

    expect(result.ok).toBe(false);
    const message = findFieldError(result, 'retirementAge');
    expect(message).not.toBeNull();
    expect(isKorean(message ?? '')).toBe(true);
  });

  it('은퇴 나이 == 현재 나이는 허용한다 (이미 은퇴한 경우)', () => {
    const result = validateRetirementInput(
      withInput({ currentAge: 65, retirementAge: 65 }),
    );

    expect(result.ok).toBe(true);
  });

  it('기대수명이 현재 나이와 같거나 적으면 거부한다', () => {
    for (const lifeExpectancy of [70, 69]) {
      const result = validateRetirementInput(
        withInput({ currentAge: 70, retirementAge: 70, lifeExpectancy }),
      );
      expect(result.ok).toBe(false);
      expect(findFieldError(result, 'lifeExpectancy')).not.toBeNull();
    }
  });

  it('기대수명이 은퇴 나이보다 적으면 거부한다', () => {
    const result = validateRetirementInput(
      withInput({ currentAge: 55, retirementAge: 85, lifeExpectancy: 80 }),
    );

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'lifeExpectancy')).not.toBeNull();
  });

  it('개별 필드가 이미 걸린 경우 관계 검증을 중복해서 붙이지 않는다', () => {
    // currentAge 가 범위를 벗어났으므로 retirementAge 와의 관계는 판단하지 않는다.
    const result = validateRetirementInput(
      withInput({ currentAge: 200, retirementAge: 60 }),
    );

    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'currentAge')).not.toBeNull();
    expect(findFieldError(result, 'retirementAge')).toBeNull();
  });
});

describe('validateRetirementInput - 오류 여러 건', () => {
  it('여러 필드가 잘못되면 모두 보고한다', () => {
    const result = validateRetirementInput(
      withInput({
        currentAge: 10,
        financialAssets: -100,
        monthlyLivingCost: -1,
        inflationRate: 5,
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);

    const fields = result.errors.map((error) => error.field);
    expect(fields).toContain('currentAge');
    expect(fields).toContain('financialAssets');
    expect(fields).toContain('monthlyLivingCost');
    expect(fields).toContain('inflationRate');
  });

  it('모든 오류 메시지가 한국어다', () => {
    const result = validateRetirementInput(
      withInput({
        currentAge: 200,
        retirementAge: 1,
        lifeExpectancy: 1,
        nationalPensionStartAge: 1,
        privatePensionStartAge: 200,
        otherIncomeEndAge: 200,
        financialAssets: -1,
        nationalPensionMonthly: -1,
        privatePensionMonthly: BOUNDS.monthlyAmount.max + 1,
        otherIncomeMonthly: -1,
        monthlyLivingCost: -1,
        healthcareMonthlyCost: -1,
        inflationRate: 9,
        investmentReturnRate: -9,
      }),
    );

    expect(result.errors.length).toBeGreaterThan(0);
    for (const error of result.errors) {
      expect(isKorean(error.message)).toBe(true);
      expect(error.message.length).toBeGreaterThan(0);
    }
  });

  it('오류의 field 는 RetirementInput 의 키다', () => {
    const result = validateRetirementInput(
      withInput({ currentAge: 200, financialAssets: -1 }),
    );

    for (const error of result.errors) {
      expect(Object.prototype.hasOwnProperty.call(VALID_INPUT, error.field)).toBe(true);
    }
  });
});

describe('findFieldError', () => {
  it('해당 필드의 첫 오류 메시지를 돌려준다', () => {
    const result = validateRetirementInput(withInput({ financialAssets: -1 }));

    expect(findFieldError(result, 'financialAssets')).not.toBeNull();
  });

  it('오류가 없는 필드는 null 이다', () => {
    const result = validateRetirementInput(withInput({ financialAssets: -1 }));

    expect(findFieldError(result, 'currentAge')).toBeNull();
    expect(findFieldError(result, 'monthlyLivingCost')).toBeNull();
  });

  it('정상 입력이면 모든 필드가 null 이다', () => {
    const result = validateRetirementInput(VALID_INPUT);

    const fields: Array<keyof RetirementInput> = [
      'currentAge',
      'retirementAge',
      'lifeExpectancy',
      'financialAssets',
      'monthlyLivingCost',
      'inflationRate',
      'investmentReturnRate',
    ];
    for (const field of fields) {
      expect(findFieldError(result, field)).toBeNull();
    }
  });
});

describe('월 생활비 0원은 허용하지 않는다', () => {
  /**
   * 생활비가 0원이면 부족금액도 0이 되어, 결과 화면이
   * "연금 수입만으로 생활비를 채울 수 있습니다" 라는 잘못된 안내를 냈다.
   * 은퇴 후 생활비가 0원인 경우는 없으므로 입력 단계에서 막는다.
   */
  it('0원이면 오류를 돌려준다', () => {
    const result = validateRetirementInput(withInput({ monthlyLivingCost: 0 }));
    expect(result.ok).toBe(false);
    expect(findFieldError(result, 'monthlyLivingCost')).not.toBeNull();
  });

  it('하한(10만원) 미만이면 오류다', () => {
    const result = validateRetirementInput(
      withInput({ monthlyLivingCost: BOUNDS.monthlyLivingCost.min - 1 }),
    );
    expect(result.ok).toBe(false);
  });

  it('하한과 같으면 통과한다', () => {
    const result = validateRetirementInput(
      withInput({ monthlyLivingCost: BOUNDS.monthlyLivingCost.min }),
    );
    expect(findFieldError(result, 'monthlyLivingCost')).toBeNull();
  });

  it('연금·기타소득·의료비는 여전히 0원을 허용한다', () => {
    const result = validateRetirementInput(
      withInput({
        nationalPensionMonthly: 0,
        privatePensionMonthly: 0,
        otherIncomeMonthly: 0,
        healthcareMonthlyCost: 0,
      }),
    );
    for (const field of [
      'nationalPensionMonthly',
      'privatePensionMonthly',
      'otherIncomeMonthly',
      'healthcareMonthlyCost',
    ] as const) {
      expect(findFieldError(result, field)).toBeNull();
    }
  });
});
