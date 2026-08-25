'use client';

import { useId, useMemo, useState } from 'react';

import { Card, CardTitle, LabeledValue, Notice } from '@/components/ui';
import {
  estimateHealthInsurance,
  estimateNationalPensionTax,
  estimatePensionIncome,
  estimatePrivatePensionWithholding,
  estimateRegionalPremiumWithProperty,
} from '@/domain/tax/estimator';
import { BOUNDS } from '@/domain/tax/policy';
import type { Estimate, MissingStatutoryItem } from '@/domain/tax/types';
import { formatWon } from '@/lib/format';

/** 입력 한 칸. 글자와 클릭 영역을 크게 둔다. */
function AmountField({
  label,
  hint,
  value,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id} className="block text-lg font-bold text-slate-800">
        {label}
      </label>
      {hint !== undefined ? (
        <p id={hintId} className="mt-1 text-base text-slate-600">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        // 상한을 두지 않으면 보조기기가 최대값을 0 으로 읽는다.
        max={max}
        step={100_000}
        value={value}
        aria-describedby={hint !== undefined ? hintId : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 min-h-touch w-full rounded-xl border-2 border-slate-300 px-4 text-lg text-slate-900"
      />
      <p className="mt-1 text-base text-slate-600">{formatWon(value)}</p>
    </div>
  );
}

/** 계산할 수 없는 항목을 정직하게 보여준다. */
function MissingItems({ items }: { items: readonly MissingStatutoryItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border-2 border-caution-600 bg-caution-50 p-5"
        >
          <p className="text-lg font-bold text-caution-700">{item.label}</p>
          <p className="mt-2 text-base text-slate-800">{item.reason}</p>
          <p className="mt-3 text-base text-slate-700">
            확인해야 할 곳:{' '}
            <a
              href={item.source}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-brand-700 underline"
            >
              공식 자료 열기
            </a>
          </p>
          {item.officialCalculator !== null ? (
            <p className="mt-2 text-base text-slate-700">
              지금 정확한 값이 필요하시면{' '}
              <a
                href={item.officialCalculator}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-brand-700 underline"
              >
                공식 계산기
              </a>
              를 이용해 주세요.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** 계산 결과 또는 계산할 수 없는 이유를 보여준다. */
function EstimateBlock<T>({
  title,
  estimate,
  render,
}: {
  title: string;
  estimate: Estimate<T>;
  render: (value: T) => React.ReactNode;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {estimate.status === 'available' ? (
        <>
          {render(estimate.value)}
          <div className="mt-5 border-t-2 border-slate-200 pt-4">
            <p className="text-base font-bold text-slate-700">계산에 사용한 기준</p>
            <ul className="mt-2 space-y-1">
              {estimate.basis.map((basis) => (
                <li key={basis.label} className="text-base text-slate-600">
                  {basis.label} — {basis.appliesTo} (기준일 {basis.asOf}){' '}
                  <a
                    href={basis.source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 underline"
                  >
                    출처
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          <p className="mb-4 text-lg text-slate-800">
            이 항목은 <strong>계산해 드릴 수 없습니다.</strong> 아래 수치를 공식
            자료로 확인하지 못했기 때문입니다. 짐작한 값으로 금액을 만들지 않습니다.
          </p>
          <MissingItems items={estimate.missing} />
        </>
      )}
    </Card>
  );
}

export function TaxCalculatorClient() {
  const [monthlyIncome, setMonthlyIncome] = useState(2_000_000);
  const [privatePensionYearly, setPrivatePensionYearly] = useState(6_000_000);
  const [publicPensionYearly, setPublicPensionYearly] = useState(12_000_000);
  const [age, setAge] = useState(65);

  const health = useMemo(
    () => estimateHealthInsurance(monthlyIncome, 'regional'),
    [monthlyIncome],
  );
  const withProperty = useMemo(() => estimateRegionalPremiumWithProperty(), []);
  const pensionIncome = useMemo(
    () => estimatePensionIncome(privatePensionYearly),
    [privatePensionYearly],
  );
  const withholding = useMemo(
    () => estimatePrivatePensionWithholding(privatePensionYearly, age, false),
    [privatePensionYearly, age],
  );
  const publicPensionTax = useMemo(
    () => estimateNationalPensionTax(publicPensionYearly),
    [publicPensionYearly],
  );

  const ageId = useId();

  return (
    /*
     * 넓은 화면에서는 입력 칸을 왼쪽에 붙여 두고 결과만 오른쪽에서 바뀌게 한다.
     * 값을 바꿀 때마다 위아래로 오갈 필요가 없다.
     */
    <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[26rem_minmax(0,1fr)] xl:gap-10">
      <Card className="lg:sticky lg:top-28 lg:self-start">
        <CardTitle>값을 입력해 주세요</CardTitle>
        <div className="space-y-6">
          <div>
            <label htmlFor={ageId} className="block text-lg font-bold text-slate-800">
              나이
            </label>
            <input
              id={ageId}
              type="number"
              inputMode="numeric"
              min={BOUNDS.age.min}
              max={BOUNDS.age.max}
              value={age}
              onChange={(event) => setAge(Number(event.target.value))}
              className="mt-2 min-h-touch w-full rounded-xl border-2 border-slate-300 px-4 text-lg text-slate-900"
            />
          </div>

          <AmountField
            label="건강보험료 계산 기준이 되는 월 소득"
            hint="연금·이자 등을 합한 월 소득입니다. 재산은 아래에서 따로 설명합니다."
            value={monthlyIncome}
            max={BOUNDS.monthlyAmount.max}
            onChange={setMonthlyIncome}
          />

          <AmountField
            label="연간 사적연금 수령액 (연금저축·IRP)"
            hint="국민연금은 여기에 넣지 않습니다. 세금 규칙이 다릅니다."
            value={privatePensionYearly}
            max={BOUNDS.annualAmount.max}
            onChange={setPrivatePensionYearly}
          />

          <AmountField
            label="연간 국민연금 수령액"
            hint="국민연금 세금은 아래에서 따로 안내합니다."
            value={publicPensionYearly}
            max={BOUNDS.annualAmount.max}
            onChange={setPublicPensionYearly}
          />
        </div>
      </Card>

      <div className="space-y-6">
      <EstimateBlock
        title="건강보험료 (지역가입자 · 소득 기준)"
        estimate={health}
        render={(value) => (
          <div className="space-y-3">
            <LabeledValue
              label="건강보험료 (월)"
              value={formatWon(value.healthInsuranceOwnShare)}
            />
            <LabeledValue
              label="장기요양보험료 (월)"
              value={formatWon(value.longTermCareOwnShare)}
            />
            <LabeledValue
              label="합계 (월)"
              value={formatWon(value.totalOwnShare)}
              tone="brand"
            />
            <Notice title="이 금액에 빠진 것">
              <p>
                <strong>재산에 매겨지는 보험료가 빠져 있습니다.</strong> 지역가입자
                보험료는 소득분과 재산분을 더해 정해지는데, 재산 점수표를 공식 자료로
                확인하지 못했습니다. 실제 보험료는 이 금액보다 많을 수 있습니다.
              </p>
              <p>
                지역가입자는 보험료를 <strong>전액 본인이 부담</strong>합니다. 직장에
                다닐 때처럼 절반만 내는 것이 아닙니다.
              </p>
            </Notice>
          </div>
        )}
      />

      <EstimateBlock
        title="재산까지 포함한 지역가입자 보험료"
        estimate={withProperty}
        render={() => null}
      />

      <EstimateBlock
        title="연금소득공제"
        estimate={pensionIncome}
        render={(value) => (
          <div className="space-y-3">
            <LabeledValue label="총연금액 (연)" value={formatWon(value.totalPension)} />
            <LabeledValue label="연금소득공제" value={formatWon(value.deduction)} />
            <LabeledValue
              label="연금소득금액"
              value={formatWon(value.pensionIncome)}
              tone="brand"
            />
            {value.deductionCapped ? (
              <p className="text-base text-slate-700">
                공제 한도(연 900만원)에 걸려 그 이상은 공제되지 않았습니다.
              </p>
            ) : null}
          </div>
        )}
      />

      <EstimateBlock
        title="사적연금 원천징수 세금"
        estimate={withholding}
        render={(value) => (
          <div className="space-y-3">
            <LabeledValue
              label="연간 사적연금"
              value={formatWon(value.annualPrivatePension)}
            />
            <LabeledValue
              label="원천징수 소득세"
              value={formatWon(value.withheldTax)}
            />
            <LabeledValue
              label="지방소득세"
              value={formatWon(value.localIncomeTax)}
            />
            <LabeledValue
              label="합계"
              value={formatWon(value.totalWithheld)}
              tone="brand"
            />
            <p className="text-base text-slate-700">{value.rateReason}</p>
            {value.exceedsSeparateTaxationLimit ? (
              <Notice title="분리과세 한도를 넘었습니다">
                <p>
                  사적연금이 연 {formatWon(value.separateTaxationLimit)}을 넘으면
                  종합과세 대상이 될 수 있습니다. 이 경우 위 원천징수액만으로 세금이
                  끝나지 않습니다. 정확한 금액은 홈택스에서 확인해 주세요.
                </p>
              </Notice>
            ) : null}
          </div>
        )}
      />

      <EstimateBlock
        title="국민연금에 붙는 세금"
        estimate={publicPensionTax}
        render={() => null}
      />

      <Notice title="이 계산기에 대해">
        <p>
          이 계산기는 공식 자료로 확인한 세율·공제액만 사용합니다. 확인하지 못한
          수치는 짐작해서 채우지 않고, 계산할 수 없다고 알려 드립니다. 그럴듯해
          보이는 틀린 금액이 연금 개시 시점처럼 되돌리기 어려운 결정의 근거가 되지
          않도록 하기 위한 것입니다.
        </p>
        <p>
          실제 세금과 보험료는 개인의 가입 이력과 다른 소득에 따라 달라집니다. 신고나
          납부를 앞두고 있다면 홈택스와 국민건강보험공단의 공식 계산기를 함께 확인해
          주세요.
        </p>
      </Notice>
      </div>
    </div>
  );
}
