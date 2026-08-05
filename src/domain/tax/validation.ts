/**
 * 세금·건강보험료 계산기의 입력 검증.
 *
 * 메시지는 화면에 그대로 표시되므로 쉬운 한국어로 쓴다.
 * 전문용어보다 사용자가 무엇을 고쳐야 하는지를 알려주는 문장을 쓴다.
 */

import { BOUNDS } from './policy';
import type { TaxFieldError, TaxValidationResult } from './types';

function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/** 1억원. 금액 상한 안내에 쓴다. */
const EOK = 100_000_000;
/** 1만원. */
const MAN_WON = 10_000;

/** 금액을 "1억원" / "1,000만원" 같은 읽기 쉬운 문구로 바꾼다. */
function describeAmount(amount: number): string {
  if (amount >= EOK) {
    return `${(amount / EOK).toLocaleString('ko-KR')}억원`;
  }
  return `${(amount / MAN_WON).toLocaleString('ko-KR')}만원`;
}

/** 금액 필드를 검증한다. */
function checkAmount(
  field: string,
  label: string,
  value: number,
  bounds: { min: number; max: number },
): TaxFieldError | null {
  if (!isFiniteNumber(value)) {
    return { field, message: `${label}을 숫자로 입력해 주세요.` };
  }
  if (value < bounds.min) {
    return { field, message: `${label}은 0원보다 작을 수 없습니다.` };
  }
  if (value > bounds.max) {
    return {
      field,
      message: `${label}은 ${describeAmount(bounds.max)}까지 입력할 수 있습니다.`,
    };
  }
  return null;
}

/** 나이 필드를 검증한다. */
function checkAge(
  field: string,
  label: string,
  value: number,
  bounds: { min: number; max: number },
): TaxFieldError | null {
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

/** 인원 수 필드를 검증한다. */
function checkCount(
  field: string,
  label: string,
  value: number,
  bounds: { min: number; max: number },
): TaxFieldError | null {
  if (!isFiniteNumber(value)) {
    return { field, message: `${label}를 숫자로 입력해 주세요.` };
  }
  if (!Number.isInteger(value)) {
    return { field, message: `${label}는 소수점 없이 입력해 주세요.` };
  }
  if (value < bounds.min || value > bounds.max) {
    return {
      field,
      message: `${label}는 ${bounds.min}명부터 ${bounds.max}명 사이로 입력해 주세요.`,
    };
  }
  return null;
}

/** 종합소득세 과세표준을 검증한다. */
export function validateTaxBase(taxBase: number): TaxValidationResult {
  const errors: TaxFieldError[] = [];
  const error = checkAmount('taxBase', '과세표준', taxBase, BOUNDS.annualAmount);
  if (error) {
    errors.push(error);
  }
  return { ok: errors.length === 0, errors };
}

/** 연금소득 입력을 검증한다. */
export function validatePensionIncome(totalPension: number): TaxValidationResult {
  const errors: TaxFieldError[] = [];
  const error = checkAmount(
    'totalPension',
    '연간 연금 수령액',
    totalPension,
    BOUNDS.annualAmount,
  );
  if (error) {
    errors.push(error);
  }
  return { ok: errors.length === 0, errors };
}

/** 사적연금 원천징수 입력을 검증한다. */
export function validatePrivatePensionWithholding(
  annualPrivatePension: number,
  age: number,
): TaxValidationResult {
  const errors: TaxFieldError[] = [];

  const amountError = checkAmount(
    'annualPrivatePension',
    '연간 사적연금 수령액',
    annualPrivatePension,
    BOUNDS.annualAmount,
  );
  if (amountError) {
    errors.push(amountError);
  }

  const ageError = checkAge('age', '연금을 받는 나이', age, BOUNDS.age);
  if (ageError) {
    errors.push(ageError);
  }

  return { ok: errors.length === 0, errors };
}

/** 금융소득 입력을 검증한다. */
export function validateFinancialIncome(
  interestIncome: number,
  dividendIncome: number,
): TaxValidationResult {
  const errors: TaxFieldError[] = [];

  const interestError = checkAmount(
    'interestIncome',
    '연간 이자소득',
    interestIncome,
    BOUNDS.annualAmount,
  );
  if (interestError) {
    errors.push(interestError);
  }

  const dividendError = checkAmount(
    'dividendIncome',
    '연간 배당소득',
    dividendIncome,
    BOUNDS.annualAmount,
  );
  if (dividendError) {
    errors.push(dividendError);
  }

  return { ok: errors.length === 0, errors };
}

/** 건강보험료 입력을 검증한다. */
export function validateHealthInsurance(monthlyIncome: number): TaxValidationResult {
  const errors: TaxFieldError[] = [];
  const error = checkAmount(
    'monthlyIncome',
    '보험료 계산에 쓰는 월 소득',
    monthlyIncome,
    BOUNDS.monthlyAmount,
  );
  if (error) {
    errors.push(error);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * 인적공제 입력을 검증한다.
 *
 * 경로우대·장애인 인원은 기본공제 대상자 중에서 세는 값이므로
 * 기본공제 인원 수를 넘을 수 없다.
 */
export function validatePersonalDeduction(
  basicCount: number,
  elderlyCount: number,
  disabledCount: number,
): TaxValidationResult {
  const errors: TaxFieldError[] = [];

  const basicError = checkCount(
    'basicCount',
    '기본공제 대상 인원',
    basicCount,
    BOUNDS.personCount,
  );
  if (basicError) {
    errors.push(basicError);
  }

  const elderlyError = checkCount(
    'elderlyCount',
    '70세 이상 인원',
    elderlyCount,
    BOUNDS.personCount,
  );
  if (elderlyError) {
    errors.push(elderlyError);
  }

  const disabledError = checkCount(
    'disabledCount',
    '장애인 인원',
    disabledCount,
    BOUNDS.personCount,
  );
  if (disabledError) {
    errors.push(disabledError);
  }

  // 개별 필드가 정상일 때만 관계를 확인한다.
  const failed = new Set(errors.map((error) => error.field));

  if (!failed.has('basicCount') && !failed.has('elderlyCount')) {
    if (elderlyCount > basicCount) {
      errors.push({
        field: 'elderlyCount',
        message:
          '70세 이상 인원은 기본공제 대상 인원보다 많을 수 없습니다. 70세 이상인 분도 기본공제 대상에 포함해서 세어 주세요.',
      });
    }
  }

  if (!failed.has('basicCount') && !failed.has('disabledCount')) {
    if (disabledCount > basicCount) {
      errors.push({
        field: 'disabledCount',
        message:
          '장애인 인원은 기본공제 대상 인원보다 많을 수 없습니다. 장애인인 분도 기본공제 대상에 포함해서 세어 주세요.',
      });
    }
  }

  return { ok: errors.length === 0, errors };
}

/** 특정 필드의 첫 오류 메시지를 찾는다. 폼에서 사용한다. */
export function findTaxFieldError(
  result: TaxValidationResult,
  field: string,
): string | null {
  return result.errors.find((error) => error.field === field)?.message ?? null;
}
