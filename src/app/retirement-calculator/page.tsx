import type { Metadata } from 'next';
import { RetirementWizard } from '@/components/RetirementWizard';
import { PageHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: '은퇴 계산기',
  description:
    '나이, 금융자산, 연금, 생활비를 입력하면 은퇴 후 월 현금흐름과 자산 유지 기간을 계산합니다.',
};

export default function RetirementCalculatorPage() {
  return (
    <div>
      <PageHeading
        title="은퇴 계산기"
        description="4단계로 입력하면 은퇴 후 매달 얼마를 쓸 수 있고 자산이 언제까지 유지되는지 계산해 드립니다. 입력한 값은 서버로 전송되지 않습니다."
      />
      <RetirementWizard />
    </div>
  );
}
