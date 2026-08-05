'use client';

/**
 * 은퇴 계산기 4단계 입력 wizard.
 *
 * 한 화면에서 너무 많은 값을 받지 않도록 단계를 나눈다 (UX 지침).
 * 계산은 하지 않는다. 입력을 모아 검증하고 domain 에 넘긴다.
 */

import { useState } from 'react';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_INPUT,
  HEALTHCARE,
} from '@/domain/retirement/policy';
import {
  findFieldError,
  validateRetirementInput,
} from '@/domain/retirement/validation';
import type { RetirementInput } from '@/domain/retirement/types';
import { formatAge } from '@/lib/format';
import { AgeField, AmountField, RateField, YesNoField } from './AmountField';
import { ActionButton, Card, CardTitle, Notice } from './ui';
import { RetirementResult } from './RetirementResult';

/** 금액 입력의 증감 단위. */
const STEP = {
  assets: 10_000_000,
  monthly: 100_000,
} as const;

/** 처음 화면에 채워둘 입력값. */
function createInitialInput(): RetirementInput {
  return {
    currentAge: DEFAULT_INPUT.currentAge,
    retirementAge: DEFAULT_INPUT.retirementAge,
    lifeExpectancy: DEFAULT_ASSUMPTIONS.lifeExpectancy,
    financialAssets: 0,
    nationalPensionMonthly: 0,
    nationalPensionStartAge: DEFAULT_INPUT.nationalPensionStartAge,
    privatePensionMonthly: 0,
    privatePensionStartAge: DEFAULT_INPUT.privatePensionStartAge,
    otherIncomeMonthly: 0,
    otherIncomeEndAge: DEFAULT_INPUT.otherIncomeEndAge,
    monthlyLivingCost: 0,
    inflationRate: DEFAULT_ASSUMPTIONS.inflationRate,
    investmentReturnRate: DEFAULT_ASSUMPTIONS.investmentReturnRate,
    includeHealthcareCost: true,
    healthcareMonthlyCost: HEALTHCARE.defaultMonthlyCost,
  };
}

/** 각 단계에서 검증할 필드. 그 단계에 없는 필드의 오류는 보여주지 않는다. */
const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof RetirementInput>> = [
  ['currentAge', 'retirementAge', 'lifeExpectancy'],
  ['financialAssets'],
  [
    'nationalPensionMonthly',
    'nationalPensionStartAge',
    'privatePensionMonthly',
    'privatePensionStartAge',
    'otherIncomeMonthly',
    'otherIncomeEndAge',
  ],
  [
    'monthlyLivingCost',
    'healthcareMonthlyCost',
    'inflationRate',
    'investmentReturnRate',
  ],
];

const STEP_TITLES = [
  '1단계 · 나이',
  '2단계 · 금융자산',
  '3단계 · 연금과 기타소득',
  '4단계 · 생활비와 가정',
] as const;

const TOTAL_STEPS = STEP_TITLES.length;

export function RetirementWizard({
  initialInput,
  startAtResult = false,
}: {
  initialInput?: RetirementInput;
  startAtResult?: boolean;
}) {
  const [input, setInput] = useState<RetirementInput>(
    initialInput ?? createInitialInput,
  );
  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(startAtResult);
  // 아직 넘어가려 하지 않은 단계에서는 오류를 미리 보여주지 않는다.
  const [validateNow, setValidateNow] = useState(false);

  const validation = validateRetirementInput(input);

  /** 한 필드만 바꾼다. */
  const update = <K extends keyof RetirementInput>(
    field: K,
    value: RetirementInput[K],
  ): void => {
    setInput((previous) => ({ ...previous, [field]: value }));
  };

  /** 현재 단계에 오류가 있는지. */
  const currentStepFields = STEP_FIELDS[step] ?? [];
  const stepHasError = currentStepFields.some(
    (field) => findFieldError(validation, field) !== null,
  );

  /** 검증을 요청한 뒤에만 오류 메시지를 돌려준다. */
  const errorFor = (field: keyof RetirementInput): string | null =>
    validateNow ? findFieldError(validation, field) : null;

  const goNext = (): void => {
    if (stepHasError) {
      setValidateNow(true);
      return;
    }
    setValidateNow(false);
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    // 마지막 단계에서는 전체 입력을 다시 확인한다.
    if (!validation.ok) {
      setValidateNow(true);
      return;
    }
    setShowResult(true);
  };

  const goBack = (): void => {
    setValidateNow(false);
    setStep(Math.max(0, step - 1));
  };

  if (showResult) {
    return (
      <RetirementResult
        input={input}
        onEdit={() => {
          setShowResult(false);
          setStep(0);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 진행 상황 */}
      <div>
        <p className="text-lg font-bold text-brand-700">
          {STEP_TITLES[step]} (전체 {TOTAL_STEPS}단계)
        </p>
        <div
          className="mt-3 flex gap-2"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-label={`전체 ${TOTAL_STEPS}단계 중 ${step + 1}단계`}
        >
          {STEP_TITLES.map((title, index) => (
            <span
              key={title}
              className={`h-3 flex-1 rounded-full ${
                index <= step ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      <Card>
        {step === 0 ? (
          <>
            <CardTitle>나이를 입력해 주세요</CardTitle>
            <AgeField
              label="현재 나이"
              hint="만 나이로 입력해 주세요."
              value={input.currentAge}
              onChange={(next) => update('currentAge', next)}
              error={errorFor('currentAge')}
            />
            <AgeField
              label="은퇴 나이"
              hint="이미 은퇴하셨다면 현재 나이와 같게 입력해 주세요."
              value={input.retirementAge}
              onChange={(next) => update('retirementAge', next)}
              error={errorFor('retirementAge')}
            />
            <AgeField
              label="기대수명"
              hint="이 나이까지 자산이 유지되는지 계산합니다. 넉넉하게 잡는 것이 안전합니다."
              value={input.lifeExpectancy}
              onChange={(next) => update('lifeExpectancy', next)}
              error={errorFor('lifeExpectancy')}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <CardTitle>지금 가진 금융자산을 입력해 주세요</CardTitle>
            <Notice>
              <p>
                예금·적금, 펀드, 주식, 채권, 퇴직금 등 <strong>현금으로 바꿀 수 있는
                자산</strong>의 합계를 넣어 주세요.
              </p>
              <p>
                살고 계신 집은 포함하지 않습니다. 생활비로 바로 쓸 수 없기 때문입니다.
              </p>
            </Notice>
            <div className="mt-6">
              <AmountField
                label="금융자산 합계"
                hint="정확하지 않아도 됩니다. 대략적인 금액으로 시작해 보세요."
                value={input.financialAssets}
                onChange={(next) => update('financialAssets', next)}
                error={errorFor('financialAssets')}
                step={STEP.assets}
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <CardTitle>받으실 연금과 기타소득을 입력해 주세요</CardTitle>
            <Notice>
              <p>
                정확한 국민연금 예상액은 국민연금공단에서 확인할 수 있습니다. 모르시면
                0원으로 두고 나중에 다시 계산해도 됩니다.
              </p>
            </Notice>

            <div className="mt-6">
              <AmountField
                label="국민연금 월 예상 수령액"
                value={input.nationalPensionMonthly}
                onChange={(next) => update('nationalPensionMonthly', next)}
                error={errorFor('nationalPensionMonthly')}
                step={STEP.monthly}
              />
              <AgeField
                label="국민연금 받기 시작하는 나이"
                value={input.nationalPensionStartAge}
                onChange={(next) => update('nationalPensionStartAge', next)}
                error={errorFor('nationalPensionStartAge')}
              />
              <AmountField
                label="퇴직연금·개인연금 월 수령액"
                hint="IRP, 연금저축, 퇴직연금을 합쳐서 넣어 주세요."
                value={input.privatePensionMonthly}
                onChange={(next) => update('privatePensionMonthly', next)}
                error={errorFor('privatePensionMonthly')}
                step={STEP.monthly}
              />
              <AgeField
                label="퇴직·개인연금 받기 시작하는 나이"
                value={input.privatePensionStartAge}
                onChange={(next) => update('privatePensionStartAge', next)}
                error={errorFor('privatePensionStartAge')}
              />
              <AmountField
                label="기타 월 소득"
                hint="임대소득, 은퇴 후 근로소득 등이 있으면 넣어 주세요."
                value={input.otherIncomeMonthly}
                onChange={(next) => update('otherIncomeMonthly', next)}
                error={errorFor('otherIncomeMonthly')}
                step={STEP.monthly}
              />
              <AgeField
                label="기타소득이 끝나는 나이"
                hint="기타소득이 없으면 그대로 두셔도 됩니다."
                value={input.otherIncomeEndAge}
                onChange={(next) => update('otherIncomeEndAge', next)}
                error={errorFor('otherIncomeEndAge')}
              />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <CardTitle>은퇴 후 생활비를 입력해 주세요</CardTitle>
            <AmountField
              label="월 생활비"
              hint="지금 물가로 매달 얼마가 필요할지 넣어 주세요. 물가상승은 자동으로 반영합니다."
              value={input.monthlyLivingCost}
              onChange={(next) => update('monthlyLivingCost', next)}
              error={errorFor('monthlyLivingCost')}
              step={STEP.monthly}
            />

            <YesNoField
              label="의료비를 따로 반영할까요?"
              hint={`${formatAge(
                HEALTHCARE.startAge,
              )} 이후부터 생활비에 더해 계산합니다.`}
              value={input.includeHealthcareCost}
              onChange={(next) => update('includeHealthcareCost', next)}
            />

            {input.includeHealthcareCost ? (
              <AmountField
                label="월 의료비"
                hint={`${formatAge(HEALTHCARE.startAge)} 이후에 더해질 금액입니다.`}
                value={input.healthcareMonthlyCost}
                onChange={(next) => update('healthcareMonthlyCost', next)}
                error={errorFor('healthcareMonthlyCost')}
                step={STEP.monthly}
              />
            ) : null}

            <hr className="my-8 border-slate-200" />

            <h3 className="mb-2 text-xl font-bold text-slate-900">계산에 쓰는 가정</h3>
            <p className="mb-5 text-base text-slate-600">
              아래 두 값은 <strong>정해진 수치가 아니라 가정</strong>입니다. 생각하시는
              값으로 바꿔서 계산해 보실 수 있습니다.
            </p>

            <RateField
              label="물가상승률 (연)"
              hint="물가가 매년 얼마나 오를지 가정하는 값입니다."
              value={input.inflationRate}
              onChange={(next) => update('inflationRate', next)}
              error={errorFor('inflationRate')}
            />
            <RateField
              label="투자수익률 (연)"
              hint="남은 자산을 굴려 매년 얼마를 벌지 가정하는 값입니다. 은퇴 자산은 낮게 잡는 것이 안전합니다."
              value={input.investmentReturnRate}
              onChange={(next) => update('investmentReturnRate', next)}
              error={errorFor('investmentReturnRate')}
            />
          </>
        ) : null}

        {/* 오류 안내 */}
        {validateNow && stepHasError ? (
          <div className="mt-4">
            <Notice tone="caution" title="입력을 확인해 주세요">
              <ul className="list-inside list-disc space-y-1">
                {currentStepFields
                  .map((field) => findFieldError(validation, field))
                  .filter((message): message is string => message !== null)
                  .map((message) => (
                    <li key={message}>{message}</li>
                  ))}
              </ul>
            </Notice>
          </div>
        ) : null}

        {/* 이동 버튼 */}
        <div className="mt-8 flex flex-wrap gap-4">
          {step > 0 ? (
            <ActionButton variant="secondary" onClick={goBack}>
              이전
            </ActionButton>
          ) : null}
          <ActionButton onClick={goNext}>
            {step === TOTAL_STEPS - 1 ? '결과 보기' : '다음'}
          </ActionButton>
        </div>
      </Card>
    </div>
  );
}
