import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, PageHeading, Section, Shell } from '@/components/ui';

export const metadata: Metadata = {
  title: '계산기',
  description: '은퇴 계산기와 세금·건강보험료 계산기를 모아 두었습니다.',
};

const CALCULATORS = [
  {
    href: '/retirement-calculator',
    title: '은퇴 계산기',
    description:
      '나이, 금융자산, 연금, 생활비를 입력하면 은퇴 후 월 현금흐름과 자산이 유지되는 기간을 계산합니다.',
    detail: '예상 은퇴 월소득, 월 부족금액, 자산 소진 예상 나이를 함께 보여줍니다.',
  },
  {
    href: '/calculators/tax',
    title: '세금·건강보험료 계산기',
    description:
      '연금 소득에 붙는 세금과 건강보험료를 계산합니다. 법으로 정해진 수치를 확인해 반영하는 중입니다.',
    detail:
      '세율과 보험료율은 짐작하지 않습니다. 공식 출처로 확인되기 전에는 결과를 내지 않고 부족한 항목을 알려 드립니다.',
  },
] as const;

export default function CalculatorsPage() {
  return (
    <>
      <PageHeading
        eyebrow="도구"
        title="계산기"
        description="은퇴 이후의 돈을 계산해 보는 도구입니다. 계산에 사용한 가정은 결과 화면에 함께 표시됩니다."
      />

      <div className="bg-slate-50">
        <Shell>
          <Section>
            <div className="grid gap-6 lg:grid-cols-2">
              {CALCULATORS.map((item) => (
                <Card key={item.href} className="flex flex-col">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {item.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">
                    {item.detail}
                  </p>
                  <p className="mt-auto pt-7">
                    <Link
                      href={item.href}
                      className="inline-flex min-h-touch items-center rounded-xl bg-brand-600 px-8 text-lg font-bold text-white shadow-card transition-colors hover:bg-brand-700"
                    >
                      {item.title} 열기
                    </Link>
                  </p>
                </Card>
              ))}
            </div>
          </Section>
        </Shell>
      </div>
    </>
  );
}
