import type { Metadata } from 'next';
import { SavedPlanList } from '@/components/SavedPlanList';
import { PageHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: '내 은퇴 계획',
  description: '저장한 은퇴 계획을 다시 열어 결과를 확인하고 비교합니다.',
};

export default function MyRetirementPage() {
  return (
    <div>
      <PageHeading
        title="내 은퇴 계획"
        description="저장한 계획을 다시 열어 결과를 확인할 수 있습니다. 저장된 내용은 이 기기에만 있습니다."
      />
      <SavedPlanList />
    </div>
  );
}
