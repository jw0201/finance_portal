/**
 * 연도별 자산 변화 시뮬레이션.
 *
 * CLAUDE.md "확정된 계산 가정" 을 그대로 구현한다. 바꿀 때는 테스트를 함께 고친다.
 *
 * - 은퇴 전에는 자산을 인출하지 않고 투자수익만 반영한다. 추가 저축은 가정하지 않는다.
 * - 생활비·의료비 입력값은 현재 물가 기준으로 보고 매년 물가상승률을 누적 적용한다.
 * - 연금은 개시 나이부터 발생하며, 물가에 연동되지 않는 명목액으로 본다 (보수적 가정).
 * - 자산은 0 미만으로 내려가지 않는다. 채우지 못한 금액은 shortfall 로 기록한다.
 * - 의료비는 HEALTHCARE.startAge 이후부터 생활비에 더해진다.
 * - 세금·건강보험료는 아직 포함하지 않는다. 결과 화면에 이 사실을 표시한다.
 */

import { HEALTHCARE, MONTHS_PER_YEAR } from './policy';
import type { RetirementInput, SimulationResult, YearlyProjection } from './types';

/** 월 금액을 연 금액으로 바꾼다. */
function toYearly(monthlyAmount: number): number {
  return monthlyAmount * MONTHS_PER_YEAR;
}

/**
 * 현재 물가 기준 금액에 누적 물가상승률을 적용한다.
 *
 * yearIndex 0 (올해) 은 그대로 두고, 이후 해마다 복리로 올린다.
 */
function inflated(todayAmount: number, inflationRate: number, yearIndex: number): number {
  return todayAmount * Math.pow(1 + inflationRate, yearIndex);
}

/**
 * 해당 나이에 받는 연금의 연간 금액.
 *
 * 개시 나이 이전에는 0원이다. 개시 후에는 물가에 연동하지 않고
 * 입력한 명목액을 그대로 쓴다 (보수적 가정).
 */
function pensionForAge(monthlyAmount: number, startAge: number, age: number): number {
  return age >= startAge ? toYearly(monthlyAmount) : 0;
}

/** 한 해를 계산한다. 이 함수는 자산 상태를 받아 다음 해 자산을 만든다. */
function projectYear(
  input: RetirementInput,
  age: number,
  yearIndex: number,
  startingAssets: number,
): YearlyProjection {
  const isRetired = age >= input.retirementAge;

  // 은퇴 전에도 자산은 계속 운용된다고 본다.
  const investmentReturn = startingAssets * input.investmentReturnRate;

  const nationalPension = pensionForAge(
    input.nationalPensionMonthly,
    input.nationalPensionStartAge,
    age,
  );
  const privatePension = pensionForAge(
    input.privatePensionMonthly,
    input.privatePensionStartAge,
    age,
  );
  // 기타소득은 입력한 종료 나이까지만 발생한다.
  const otherIncome =
    age <= input.otherIncomeEndAge ? toYearly(input.otherIncomeMonthly) : 0;

  // 은퇴 전에는 생활비를 자산에서 꺼내 쓰지 않는다 (근로소득으로 충당한다고 본다).
  const livingCost = isRetired
    ? inflated(toYearly(input.monthlyLivingCost), input.inflationRate, yearIndex)
    : 0;

  const healthcareApplies =
    isRetired && input.includeHealthcareCost && age >= HEALTHCARE.startAge;
  const healthcareCost = healthcareApplies
    ? inflated(toYearly(input.healthcareMonthlyCost), input.inflationRate, yearIndex)
    : 0;

  // 은퇴 전에는 연금·기타소득도 자산에 더하지 않는다.
  // 추가 저축을 가정하지 않으므로, 그 소득은 은퇴 전 생활에 쓰인다고 본다.
  const totalIncome = isRetired
    ? nationalPension + privatePension + otherIncome
    : 0;
  const totalExpense = livingCost + healthcareCost;

  const availableAssets = startingAssets + investmentReturn + totalIncome;
  const balanceAfterExpense = availableAssets - totalExpense;

  // 자산은 0 미만으로 내려가지 않는다. 못 채운 금액은 shortfall 로 남긴다.
  const endingAssets = Math.max(0, balanceAfterExpense);
  const shortfall = balanceAfterExpense < 0 ? -balanceAfterExpense : 0;

  return {
    age,
    yearIndex,
    isRetired,
    startingAssets,
    investmentReturn,
    totalIncome,
    nationalPension: isRetired ? nationalPension : 0,
    privatePension: isRetired ? privatePension : 0,
    otherIncome: isRetired ? otherIncome : 0,
    totalExpense,
    livingCost,
    healthcareCost,
    endingAssets,
    shortfall,
  };
}

/**
 * 현재 나이부터 기대수명까지 연도별 자산 변화를 계산한다.
 *
 * 순수 함수다. 같은 입력이면 항상 같은 결과가 나온다.
 */
export function simulate(input: RetirementInput): SimulationResult {
  const projections: YearlyProjection[] = [];

  let assets = input.financialAssets;
  const totalYears = input.lifeExpectancy - input.currentAge;

  for (let yearIndex = 0; yearIndex <= totalYears; yearIndex += 1) {
    const age = input.currentAge + yearIndex;
    const projection = projectYear(input, age, yearIndex, assets);
    projections.push(projection);
    assets = projection.endingAssets;
  }

  return summarize(input, projections);
}

/** 시뮬레이션 결과에서 화면이 필요한 요약 숫자를 뽑는다. */
function summarize(
  input: RetirementInput,
  projections: YearlyProjection[],
): SimulationResult {
  // 자산이 처음 0 이 된 해. 지출이 있는 해에만 "고갈" 로 본다.
  // (자산 0원으로 시작해 은퇴 전인 경우를 고갈로 부르지 않기 위함)
  const depletedYear = projections.find(
    (year) => year.endingAssets === 0 && year.totalExpense > 0,
  );
  const depletionAge = depletedYear ? depletedYear.age : null;

  const retirementYear = projections.find((year) => year.isRetired);
  const lastYear = projections[projections.length - 1];

  // 은퇴 시점의 자산은 은퇴 첫해의 연초 자산이다.
  const assetsAtRetirement = retirementYear
    ? retirementYear.startingAssets
    : (lastYear?.endingAssets ?? input.financialAssets);

  const monthlyIncomeAtRetirement = retirementYear
    ? retirementYear.totalIncome / MONTHS_PER_YEAR
    : 0;
  const monthlyExpenseAtRetirement = retirementYear
    ? retirementYear.totalExpense / MONTHS_PER_YEAR
    : 0;
  const monthlyShortfallAtRetirement = Math.max(
    0,
    monthlyExpenseAtRetirement - monthlyIncomeAtRetirement,
  );

  const totalShortfall = projections.reduce((sum, year) => sum + year.shortfall, 0);

  // 은퇴 후 자산이 유지된 기간. 고갈 나이가 없으면 null.
  const assetSustainYears =
    depletionAge === null ? null : Math.max(0, depletionAge - input.retirementAge);

  return {
    projections,
    depletionAge,
    assetsAtRetirement,
    assetsAtLifeExpectancy: lastYear?.endingAssets ?? 0,
    monthlyIncomeAtRetirement,
    monthlyExpenseAtRetirement,
    monthlyShortfallAtRetirement,
    totalShortfall,
    assetSustainYears,
  };
}
