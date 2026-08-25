'use client';

/**
 * 은퇴 계산 결과 화면.
 *
 * 계산은 domain 함수가 한다. 이 컴포넌트는 결과를 표시만 한다.
 */

import { useMemo, useState } from 'react';
import {
  compareLivingCostChanges,
  compareRetirementAges,
  compareScenarios,
  findSustainableMonthlyLivingCost,
} from '@/domain/retirement/calculator';
import { simulate } from '@/domain/retirement/simulator';
import { HEALTHCARE } from '@/domain/retirement/policy';
import type { RetirementInput } from '@/domain/retirement/types';
import { savePlan } from '@/services/retirementStorage';
import {
  formatAge,
  formatMonthlyWon,
  formatPercent,
  formatSignedWon,
  formatSignedYears,
  formatSustainability,
  formatWon,
  formatYears,
} from '@/lib/format';
import { AssetChart } from './AssetChart';
import {
  ActionButton,
  ButtonLink,
  Card,
  CardTitle,
  KeyFigure,
  LabeledValue,
  Notice,
  TableWrap,
} from './ui';

/** 표 머리글 칸. */
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="border-b border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-base font-bold text-slate-700"
    >
      {children}
    </th>
  );
}

/** 표 본문 칸. */
function Td({
  children,
  emphasis = false,
}: {
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <td
      className={`tabular border-b border-slate-100 px-4 py-3.5 text-base ${
        emphasis ? 'font-bold text-slate-900' : 'text-slate-700'
      }`}
    >
      {children}
    </td>
  );
}

export function RetirementResult({
  input,
  onEdit,
}: {
  input: RetirementInput;
  onEdit: () => void;
}) {
  const [planName, setPlanName] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // 입력이 바뀔 때만 다시 계산한다.
  const result = useMemo(() => simulate(input), [input]);
  const sustainable = useMemo(() => findSustainableMonthlyLivingCost(input), [input]);
  const scenarios = useMemo(() => compareScenarios(input), [input]);
  const livingCostOptions = useMemo(() => compareLivingCostChanges(input), [input]);
  const retirementAgeOptions = useMemo(() => compareRetirementAges(input), [input]);

  const hasShortfall = result.monthlyShortfallAtRetirement > 0;
  const depletes = result.depletionAge !== null;

  const handleSave = (): void => {
    const outcome = savePlan(planName, input);
    // 실패해도 입력한 금액을 로그나 메시지에 담지 않는다.
    if (outcome.ok) {
      setSaveMessage('저장했습니다. "내 은퇴 계획" 에서 다시 볼 수 있습니다.');
      setPlanName('');
      return;
    }
    const reasons: Record<string, string> = {
      unavailable:
        '이 브라우저에서는 저장 기능을 쓸 수 없습니다. 브라우저 설정에서 저장을 허용해 주세요.',
      quota: '저장 공간이 부족합니다. 저장된 계획을 일부 삭제한 뒤 다시 시도해 주세요.',
      failed: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    };
    setSaveMessage(reasons[outcome.reason] ?? reasons.failed ?? null);
  };

  return (
    <div className="space-y-10">
      {/* 핵심 4개 숫자 */}
      <section>
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
          계산 결과
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <KeyFigure
            label="예상 은퇴 월소득"
            value={formatWon(result.monthlyIncomeAtRetirement)}
            hint={`${formatAge(input.retirementAge)} 기준 연금·기타소득 합계입니다.`}
            tone="brand"
          />
          <KeyFigure
            label="예상 월 생활비"
            value={formatWon(result.monthlyExpenseAtRetirement)}
            hint={`${formatAge(
              input.retirementAge,
            )} 시점의 물가로 계산한 금액입니다.`}
          />
          <KeyFigure
            label="월 부족금액"
            value={
              hasShortfall ? formatWon(result.monthlyShortfallAtRetirement) : '없음'
            }
            hint={
              hasShortfall
                ? '이 금액을 매달 자산에서 꺼내 쓰게 됩니다.'
                : result.monthlyIncomeAtRetirement > 0
                  ? '연금 수입만으로 생활비를 채울 수 있습니다.'
                  : // 소득도 0이면 "연금으로 충당" 이라는 설명이 맞지 않는다.
                    '입력한 생활비가 없어 부족금액도 계산되지 않았습니다.'
            }
            tone={hasShortfall ? 'caution' : 'good'}
          />
          <KeyFigure
            label="예상 자산 유지 기간"
            value={formatSustainability(result.depletionAge, input.lifeExpectancy)}
            hint={
              depletes && result.assetSustainYears !== null
                ? `은퇴 후 약 ${formatYears(result.assetSustainYears)} 동안 유지됩니다.`
                : `${formatAge(input.lifeExpectancy)}까지 자산이 남습니다.`
            }
            tone={depletes ? 'caution' : 'good'}
          />
        </div>
      </section>

      {/* 그래프와 지출 한도를 나란히 둔다. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle>나이에 따른 자산 변화</CardTitle>
          <AssetChart
            projections={result.projections}
            retirementAge={input.retirementAge}
            depletionAge={result.depletionAge}
          />
        </Card>

      {/* 한 달에 얼마까지 쓸 수 있는가 */}
      <Card>
        <CardTitle>한 달에 얼마까지 쓸 수 있을까요?</CardTitle>
        <p className="text-lg text-slate-800">
          {formatAge(input.lifeExpectancy)}까지 자산이 유지되려면 생활비를 매달{' '}
          <strong className="text-brand-700">
            {formatWon(sustainable.monthlyLivingCost)}
          </strong>{' '}
          이내로 쓰는 것이 좋습니다.
        </p>
        <p className="mt-3 text-base text-slate-600">
          현재 물가 기준 금액이며, 의료비는 포함하지 않은 생활비만의 금액입니다.
        </p>

        <div className="mt-5">
          {sustainable.inputIsSustainable ? (
            <Notice tone="good">
              <p>
                지금 계획한 생활비({formatMonthlyWon(input.monthlyLivingCost)})는
                {formatAge(input.lifeExpectancy)}까지 유지할 수 있는 수준입니다.
                여유가 <strong>{formatWon(Math.abs(sustainable.differenceFromInput))}</strong>{' '}
                있습니다.
              </p>
            </Notice>
          ) : (
            <Notice tone="caution">
              <p>
                지금 계획한 생활비({formatMonthlyWon(input.monthlyLivingCost)})는
                기대수명까지 유지하기 어렵습니다. 매달{' '}
                <strong>{formatWon(Math.abs(sustainable.differenceFromInput))}</strong>{' '}
                줄이면 {formatAge(input.lifeExpectancy)}까지 유지할 수 있습니다.
              </p>
            </Notice>
          )}
        </div>
      </Card>
      </div>

      {/* 생활비를 바꾸면 */}
      <Card>
        <CardTitle>생활비를 바꾸면 어떻게 달라질까요?</CardTitle>
        <p className="mb-4 text-base text-slate-700">
          생활비만 바꾸고 나머지 조건은 그대로 두었을 때의 결과입니다.
        </p>
        <TableWrap>
          <table className="w-full min-w-[36rem] border-collapse">
            <thead>
              <tr>
                <Th>월 생활비</Th>
                <Th>변화</Th>
                <Th>자산 소진 시점</Th>
                <Th>{formatAge(input.lifeExpectancy)}에 남는 자산</Th>
              </tr>
            </thead>
            <tbody>
              {livingCostOptions.map((option) => {
                const isCurrent = option.differenceFromInput === 0;
                return (
                  <tr
                    key={option.monthlyLivingCost}
                    className={isCurrent ? 'bg-brand-50' : undefined}
                  >
                    <Td emphasis={isCurrent}>{formatWon(option.monthlyLivingCost)}</Td>
                    <Td>
                      {isCurrent ? '현재 계획' : formatSignedWon(option.differenceFromInput)}
                    </Td>
                    <Td emphasis={isCurrent}>
                      {formatSustainability(option.depletionAge, input.lifeExpectancy)}
                    </Td>
                    <Td>{formatWon(option.assetsAtLifeExpectancy)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {/* 은퇴 시점을 바꾸면 */}
      {retirementAgeOptions.length > 1 ? (
        <Card>
          <CardTitle>은퇴 시점을 바꾸면 어떻게 달라질까요?</CardTitle>
          <p className="mb-4 text-base text-slate-700">
            은퇴를 늦추면 자산을 더 오래 운용하고 꺼내 쓰는 기간이 짧아집니다.
          </p>
          <TableWrap>
            <table className="w-full min-w-[36rem] border-collapse">
              <thead>
                <tr>
                  <Th>은퇴 나이</Th>
                  <Th>변화</Th>
                  <Th>은퇴 시점 자산</Th>
                  <Th>자산 소진 시점</Th>
                </tr>
              </thead>
              <tbody>
                {retirementAgeOptions.map((option) => {
                  const isCurrent = option.differenceFromInput === 0;
                  return (
                    <tr
                      key={option.retirementAge}
                      className={isCurrent ? 'bg-brand-50' : undefined}
                    >
                      <Td emphasis={isCurrent}>{formatAge(option.retirementAge)}</Td>
                      <Td>{formatSignedYears(option.differenceFromInput)}</Td>
                      <Td>{formatWon(option.assetsAtRetirement)}</Td>
                      <Td emphasis={isCurrent}>
                        {formatSustainability(option.depletionAge, input.lifeExpectancy)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      ) : null}

      {/* 시나리오 3종 */}
      <Card>
        <CardTitle>수익률과 물가가 달라지면?</CardTitle>
        <p className="mb-4 text-base text-slate-700">
          투자수익률과 물가상승률은 아무도 정확히 알 수 없습니다. 세 가지 경우를 나누어
          보았습니다.
        </p>
        <TableWrap>
          <table className="w-full min-w-[40rem] border-collapse">
            <thead>
              <tr>
                <Th>구분</Th>
                <Th>투자수익률</Th>
                <Th>물가상승률</Th>
                <Th>자산 소진 시점</Th>
                <Th>{formatAge(input.lifeExpectancy)}에 남는 자산</Th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => {
                const isBase = scenario.kind === 'base';
                return (
                  <tr key={scenario.kind} className={isBase ? 'bg-brand-50' : undefined}>
                    <Td emphasis={isBase}>{scenario.label}</Td>
                    <Td>{formatPercent(scenario.investmentReturnRate)}</Td>
                    <Td>{formatPercent(scenario.inflationRate)}</Td>
                    <Td emphasis={isBase}>
                      {formatSustainability(
                        scenario.result.depletionAge,
                        input.lifeExpectancy,
                      )}
                    </Td>
                    <Td>{formatWon(scenario.result.assetsAtLifeExpectancy)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <ul className="mt-4 space-y-2 text-base text-slate-600">
          {scenarios.map((scenario) => (
            <li key={scenario.kind}>
              <strong className="text-slate-800">{scenario.label}</strong> —{' '}
              {scenario.assumptionText}
            </li>
          ))}
        </ul>
      </Card>

      {/* 사용한 가정 */}
      <Card>
        <CardTitle>계산에 사용한 가정</CardTitle>
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
          <LabeledValue label="현재 나이" value={formatAge(input.currentAge)} />
          <LabeledValue label="은퇴 나이" value={formatAge(input.retirementAge)} />
          <LabeledValue
            label="기대수명 (이 나이까지 계산)"
            value={formatAge(input.lifeExpectancy)}
          />
          <LabeledValue label="현재 금융자산" value={formatWon(input.financialAssets)} />
          <LabeledValue
            label="국민연금"
            value={`${formatMonthlyWon(input.nationalPensionMonthly)} (${formatAge(
              input.nationalPensionStartAge,
            )}부터)`}
          />
          <LabeledValue
            label="퇴직·개인연금"
            value={`${formatMonthlyWon(input.privatePensionMonthly)} (${formatAge(
              input.privatePensionStartAge,
            )}부터)`}
          />
          <LabeledValue
            label="기타소득"
            value={`${formatMonthlyWon(input.otherIncomeMonthly)} (${formatAge(
              input.otherIncomeEndAge,
            )}까지)`}
          />
          <LabeledValue
            label="월 생활비 (현재 물가 기준)"
            value={formatWon(input.monthlyLivingCost)}
          />
          <LabeledValue
            label="물가상승률 (가정)"
            value={`연 ${formatPercent(input.inflationRate)}`}
          />
          <LabeledValue
            label="투자수익률 (가정)"
            value={`연 ${formatPercent(input.investmentReturnRate)}`}
          />
          <LabeledValue
            label="의료비"
            value={
              input.includeHealthcareCost
                ? `${formatMonthlyWon(input.healthcareMonthlyCost)} (${formatAge(
                    HEALTHCARE.startAge,
                  )}부터)`
                : '포함하지 않음'
            }
          />
        </div>

        <div className="mt-6">
          <Notice title="이 계산이 다루지 않는 것">
            <p>
              <strong>세금과 건강보험료는 아직 반영되지 않았습니다.</strong> 실제로 쓸 수
              있는 금액은 계산 결과보다 조금 적을 수 있습니다.
            </p>
            <p>
              연금은 물가가 올라도 금액이 그대로라고 보수적으로 가정했습니다. 실제
              국민연금은 물가에 따라 조정될 수 있어, 결과가 실제보다 불리하게 나올 수
              있습니다.
            </p>
            <p>
              은퇴 전에는 자산을 꺼내 쓰지 않고, 추가 저축도 하지 않는다고 가정했습니다.
            </p>
            <p>
              물가상승률과 투자수익률은 <strong>가정값</strong>입니다. 입력 화면에서
              직접 바꿀 수 있습니다.
            </p>
          </Notice>
        </div>
      </Card>

      {/* 저장 */}
      <Card>
        <CardTitle>결과 저장하기</CardTitle>
        <p className="mb-4 text-base text-slate-700">
          이 계획을 저장하면 나중에 다시 열어 비교할 수 있습니다. 저장한 내용은 서버로
          전송되지 않고 이 기기에만 남습니다.
        </p>
        <label htmlFor="plan-name" className="block text-lg font-bold text-slate-900">
          계획 이름
        </label>
        <input
          id="plan-name"
          type="text"
          value={planName}
          onChange={(event) => setPlanName(event.target.value)}
          placeholder="예) 60세 은퇴 기본안"
          className="mt-2 min-h-touch w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-lg text-slate-900"
        />
        <div className="mt-5 flex flex-wrap gap-4">
          <ActionButton onClick={handleSave}>저장하기</ActionButton>
          <ActionButton variant="secondary" onClick={onEdit}>
            입력값 수정하기
          </ActionButton>
          <ButtonLink href="/my-retirement" variant="secondary">
            저장된 계획 보기
          </ButtonLink>
        </div>
        {saveMessage ? (
          <p className="mt-4 text-lg font-bold text-brand-700" role="status">
            {saveMessage}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
