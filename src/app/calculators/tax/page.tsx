import type { Metadata } from 'next';

import { PageHeading } from '@/components/ui';

import { TaxCalculatorClient } from './TaxCalculatorClient';

export const metadata: Metadata = {
  title: '세금·건강보험료 계산기',
  description:
    '은퇴 후 연금과 소득에 붙는 세금과 건강보험료를 공식 자료로 확인한 수치만으로 계산합니다.',
};

export default function TaxCalculatorPage() {
  return (
    <div>
      <PageHeading
        title="세금·건강보험료 계산기"
        description="연금과 소득에 붙는 세금, 그리고 건강보험료를 계산합니다. 공식 자료로 확인한 수치만 사용하며, 확인하지 못한 항목은 계산하지 않고 그 이유를 알려 드립니다."
      />
      <TaxCalculatorClient />
    </div>
  );
}
