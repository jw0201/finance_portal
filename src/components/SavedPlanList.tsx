'use client';

/**
 * 저장된 은퇴 계획 목록.
 *
 * localStorage 는 브라우저에만 있으므로 마운트 후에 읽는다.
 * 계산은 domain 함수가 한다.
 */

import { useEffect, useState } from 'react';
import { simulate } from '@/domain/retirement/simulator';
import type { RetirementInput, SavedPlan } from '@/domain/retirement/types';
import { validateRetirementInput } from '@/domain/retirement/validation';
import { deletePlan, listPlans } from '@/services/retirementStorage';
import {
  formatAge,
  formatSavedAt,
  formatSustainability,
  formatWon,
} from '@/lib/format';
import { RetirementWizard } from './RetirementWizard';
import { ActionButton, ButtonLink, Card, CardTitle, LabeledValue, Notice } from './ui';

export function SavedPlanList() {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  // 서버 렌더링 결과와 어긋나지 않도록 불러오기 전 상태를 구분한다.
  const [loaded, setLoaded] = useState(false);
  const [openedPlan, setOpenedPlan] = useState<RetirementInput | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    setPlans(listPlans());
    setLoaded(true);
  }, []);

  const handleDelete = (id: string): void => {
    deletePlan(id);
    setPlans(listPlans());
    setConfirmingId(null);
  };

  // 계획을 열면 계산기를 결과 화면부터 보여준다.
  if (openedPlan) {
    return (
      <div className="space-y-6">
        <ActionButton variant="secondary" onClick={() => setOpenedPlan(null)}>
          저장된 계획 목록으로 돌아가기
        </ActionButton>
        <RetirementWizard initialInput={openedPlan} startAtResult />
      </div>
    );
  }

  if (!loaded) {
    return (
      <Card>
        <p className="text-lg text-slate-600">저장된 계획을 불러오는 중입니다.</p>
      </Card>
    );
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardTitle>저장된 계획이 없습니다</CardTitle>
        <p className="text-lg text-slate-700">
          은퇴 계산기에서 계산한 뒤 결과 화면에서 저장하면 이곳에 표시됩니다.
        </p>
        <div className="mt-6">
          <ButtonLink href="/retirement-calculator">은퇴 계산 시작하기</ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Notice>
        <p>
          저장된 계획은 이 기기의 브라우저에만 있습니다. 다른 기기에서는 보이지 않으며,
          브라우저 데이터를 지우면 함께 삭제됩니다.
        </p>
      </Notice>

      {plans.map((plan) => {
        // 저장된 값이 온전한지 먼저 확인한다.
        //
        // 저장소는 input 이 객체인지만 보고 안쪽 필드는 확인하지 않는다.
        // 그래서 값이 깨진 계획도 불러와진다. 그대로 simulate 에 넣으면
        // 연도별 결과가 비어 depletionAge 가 null 이 되고, 화면에는
        // "자산이 유지됩니다" 라는 안심시키는 문구가 나온다.
        // 깨진 데이터로 잘못된 안심을 주지 않기 위해 계산 전에 막는다.
        const validation = validateRetirementInput(plan.input);

        if (!validation.ok) {
          return (
            <Card key={plan.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-base text-slate-500">
                  {formatSavedAt(plan.savedAt)} 저장
                </p>
              </div>

              <div className="mt-4 rounded-xl border-2 border-caution-600 bg-caution-50 p-5">
                <p className="text-lg font-bold text-caution-700">
                  이 계획의 저장된 값을 읽을 수 없습니다.
                </p>
                <p className="mt-2 text-base text-slate-800">
                  저장된 내용이 손상되어 계산 결과를 보여드릴 수 없습니다. 잘못된 금액을
                  보여드리지 않기 위해 계산하지 않았습니다. 계산기에서 다시 계산해 저장해
                  주세요.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                {confirmingId === plan.id ? (
                  <>
                    <ActionButton
                      variant="danger"
                      onClick={() => handleDelete(plan.id)}
                    >
                      정말 삭제하기
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      onClick={() => setConfirmingId(null)}
                    >
                      취소
                    </ActionButton>
                  </>
                ) : (
                  <ActionButton
                    variant="danger"
                    onClick={() => setConfirmingId(plan.id)}
                  >
                    삭제
                  </ActionButton>
                )}
              </div>
            </Card>
          );
        }

        // 저장된 입력으로 다시 계산한다. 결과를 저장하지 않고 매번 계산한다.
        const result = simulate(plan.input);

        return (
          <Card key={plan.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-base text-slate-500">
                {formatSavedAt(plan.savedAt)} 저장
              </p>
            </div>

            <div className="mt-2">
              <LabeledValue
                label="은퇴 나이"
                value={formatAge(plan.input.retirementAge)}
              />
              <LabeledValue
                label="금융자산"
                value={formatWon(plan.input.financialAssets)}
              />
              <LabeledValue
                label="월 생활비 (현재 물가 기준)"
                value={formatWon(plan.input.monthlyLivingCost)}
              />
              <LabeledValue
                label="예상 은퇴 월소득"
                value={formatWon(result.monthlyIncomeAtRetirement)}
              />
              <LabeledValue
                label="월 부족금액"
                value={
                  result.monthlyShortfallAtRetirement > 0
                    ? formatWon(result.monthlyShortfallAtRetirement)
                    : '없음'
                }
                tone={result.monthlyShortfallAtRetirement > 0 ? 'caution' : 'good'}
              />
              <LabeledValue
                label="예상 자산 유지 기간"
                value={formatSustainability(
                  result.depletionAge,
                  plan.input.lifeExpectancy,
                )}
                tone={result.depletionAge !== null ? 'caution' : 'good'}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <ActionButton onClick={() => setOpenedPlan(plan.input)}>
                자세히 보기
              </ActionButton>
              {confirmingId === plan.id ? (
                <>
                  <ActionButton variant="danger" onClick={() => handleDelete(plan.id)}>
                    정말 삭제하기
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    onClick={() => setConfirmingId(null)}
                  >
                    취소
                  </ActionButton>
                </>
              ) : (
                <ActionButton
                  variant="danger"
                  onClick={() => setConfirmingId(plan.id)}
                >
                  삭제
                </ActionButton>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
