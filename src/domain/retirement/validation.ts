/**
 * 사용자 입력 검증.
 *
 * 허용 범위는 policy.ts 의 BOUNDS 에서 가져온다.
 * 메시지는 화면에 그대로 표시되므로 쉬운 한국어로 쓴다.
 */

import { BOUNDS } from './policy';
import type { FieldError, RetirementInput, ValidationResult } from './types';

/** 퍼센트로 표시하기 위한 변환. 0.02 -> 2 */
const PERCENT_MULTIPLIER = 100;

/** 만원 단위 표시를 위한 변환. */
const MAN_WON = 10_000;

function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/** 금액을 "1억원" / "1,000만원" 같은 읽기 쉬운 문구로 바꾼다. */
function describeAmount(amount: number): string {
  const EOK = 100_000_000;
  if (amount >= EOK) {
    return `${(amount / EOK).toLocaleString('ko-KR')}억원`;
  }
  return `${(amount / MAN_WON).toLocaleString('ko-KR')}만원`;
}

/**
 * 한국어 주제 조사(은/는)를 붙인다.
 *
 * 마지막 글자에 종성이 있으면 "은", 없으면 "는" 이다.
 * ("월 생활비은" 처럼 어색한 문장이 사용자에게 보이지 않게 한다)
 */
function withTopicParticle(label: string): string {
  const lastChar = label.at(-1) ?? '';
  const code = lastChar.charCodeAt(0);

  // 한글 음절 영역(가~힣) 밖이면 조사를 판단하지 않고 "는" 을 쓴다.
  const HANGUL_START = 0xac00;
  const HANGUL_END = 0xd7a3;
  if (code < HANGUL_START || code > HANGUL_END) {
    return `${label}는`;
  }

  const JONGSEONG_COUNT = 28;
  const hasFinalConsonant = (code - HANGUL_START) % JONGSEONG_COUNT !== 0;
  return `${label}${hasFinalConsonant ? '은' : '는'}`;
}

/** 정수 나이 필드를 검증한다. */
function checkAge(
  field: keyof RetirementInput,
  label: string,
  value: number,
  bounds: { min: number; max: number },
): FieldError | null {
  if (!isFiniteNumber(value)) {
    return { field, message: `${label}를 숫자로 입력해 주세요.` };
  }
  if (!Number.isInteger(value)) {
    return { field, message: `${label}는 소수점 없이 입력해 주세요.` };
  }
  if (value < bounds.min || value > bounds.max) {
    return {
      field,
      message: `${label}는 ${bounds.min}세부터 ${bounds.max}세 사이로 입력해 주세요.`,
    };
  }
  return null;
}

/** 금액 필드를 검증한다. */
function checkAmount(
  field: keyof RetirementInput,
  label: string,
  value: number,
  bounds: { min: number; max: number },
): FieldError | null {
  if (!isFiniteNumber(value)) {
    return { field, message: `${label}을 숫자로 입력해 주세요.` };
  }
  if (value < bounds.min) {
    // 하한이 0원인 필드와 그렇지 않은 필드(생활비)의 안내를 구분한다.
    const message =
      bounds.min > 0
        ? `${withTopicParticle(label)} ${describeAmount(bounds.min)} 이상으로 입력해 주세요.`
        : `${withTopicParticle(label)} 0원보다 작을 수 없습니다.`;
    return { field, message };
  }
  if (value > bounds.max) {
    return {
      field,
      message: `${withTopicParticle(label)} ${describeAmount(bounds.max)}까지 입력할 수 있습니다.`,
    };
  }
  return null;
}

/** 비율 필드를 검증한다. 화면에는 퍼센트로 보여준다. */
function checkRate(
  field: keyof RetirementInput,
  label: string,
  value: number,
  bounds: { min: number; max: number },
): FieldError | null {
  if (!isFiniteNumber(value)) {
    return { field, message: `${label}을 숫자로 입력해 주세요.` };
  }
  if (value < bounds.min || value > bounds.max) {
    return {
      field,
      message: `${label}은 ${bounds.min * PERCENT_MULTIPLIER}%부터 ${
        bounds.max * PERCENT_MULTIPLIER
      }% 사이로 입력해 주세요.`,
    };
  }
  return null;
}

/**
 * 은퇴 계획 입력 전체를 검증한다.
 *
 * 개별 필드 범위를 먼저 확인하고, 그다음 필드 사이의 관계를 확인한다.
 * (관계 검증은 각 필드 값이 정상일 때만 의미가 있다)
 */
export function validateRetirementInput(input: RetirementInput): ValidationResult {
  const errors: FieldError[] = [];

  const push = (error: FieldError | null): void => {
    if (error) {
      errors.push(error);
    }
  };

  push(checkAge('currentAge', '현재 나이', input.currentAge, BOUNDS.age));
  push(
    checkAge('retirementAge', '은퇴 나이', input.retirementAge, BOUNDS.retirementAge),
  );
  push(
    checkAge('lifeExpectancy', '기대수명', input.lifeExpectancy, BOUNDS.lifeExpectancy),
  );
  push(
    checkAge(
      'nationalPensionStartAge',
      '국민연금 받기 시작하는 나이',
      input.nationalPensionStartAge,
      BOUNDS.pensionStartAge,
    ),
  );
  push(
    checkAge(
      'privatePensionStartAge',
      '개인·퇴직연금 받기 시작하는 나이',
      input.privatePensionStartAge,
      BOUNDS.pensionStartAge,
    ),
  );
  push(
    checkAge(
      'otherIncomeEndAge',
      '기타소득이 끝나는 나이',
      input.otherIncomeEndAge,
      BOUNDS.otherIncomeEndAge,
    ),
  );

  push(
    checkAmount(
      'financialAssets',
      '금융자산',
      input.financialAssets,
      BOUNDS.financialAssets,
    ),
  );
  push(
    checkAmount(
      'nationalPensionMonthly',
      '국민연금 월 수령액',
      input.nationalPensionMonthly,
      BOUNDS.monthlyAmount,
    ),
  );
  push(
    checkAmount(
      'privatePensionMonthly',
      '개인·퇴직연금 월 수령액',
      input.privatePensionMonthly,
      BOUNDS.monthlyAmount,
    ),
  );
  push(
    checkAmount(
      'otherIncomeMonthly',
      '기타 월 소득',
      input.otherIncomeMonthly,
      BOUNDS.monthlyAmount,
    ),
  );
  push(
    checkAmount(
      'monthlyLivingCost',
      '월 생활비',
      input.monthlyLivingCost,
      BOUNDS.monthlyLivingCost,
    ),
  );
  push(
    checkAmount(
      'healthcareMonthlyCost',
      '월 의료비',
      input.healthcareMonthlyCost,
      BOUNDS.monthlyAmount,
    ),
  );

  push(
    checkRate('inflationRate', '물가상승률', input.inflationRate, BOUNDS.inflationRate),
  );
  push(
    checkRate(
      'investmentReturnRate',
      '투자수익률',
      input.investmentReturnRate,
      BOUNDS.investmentReturnRate,
    ),
  );

  // 필드 사이의 관계. 위에서 걸린 필드는 값이 신뢰할 수 없으므로 건너뛴다.
  const failed = new Set(errors.map((error) => error.field));

  if (!failed.has('currentAge') && !failed.has('retirementAge')) {
    if (input.retirementAge < input.currentAge) {
      errors.push({
        field: 'retirementAge',
        message: '은퇴 나이는 현재 나이보다 앞설 수 없습니다. 이미 은퇴하셨다면 현재 나이와 같게 입력해 주세요.',
      });
    }
  }

  if (!failed.has('currentAge') && !failed.has('lifeExpectancy')) {
    if (input.lifeExpectancy <= input.currentAge) {
      errors.push({
        field: 'lifeExpectancy',
        message: '기대수명은 현재 나이보다 많아야 합니다.',
      });
    }
  }

  if (!failed.has('retirementAge') && !failed.has('lifeExpectancy')) {
    if (input.lifeExpectancy < input.retirementAge) {
      errors.push({
        field: 'lifeExpectancy',
        message: '기대수명은 은퇴 나이보다 많아야 합니다.',
      });
    }
  }

  return { ok: errors.length === 0, errors };
}

/** 특정 필드의 첫 오류 메시지를 찾는다. 폼에서 사용한다. */
export function findFieldError(
  result: ValidationResult,
  field: keyof RetirementInput,
): string | null {
  return result.errors.find((error) => error.field === field)?.message ?? null;
}
