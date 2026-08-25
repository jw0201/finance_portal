import Link from 'next/link';
import {
  ButtonLink,
  Card,
  CardTitle,
  Notice,
  Section,
  SectionTitle,
  Shell,
} from '@/components/ui';

/** 결과 화면에서 사용자가 가장 먼저 보게 되는 4개의 숫자. */
const KEY_NUMBERS = [
  {
    label: '예상 은퇴 월소득',
    description: '국민연금·퇴직연금·기타소득을 합쳐 매달 들어오는 금액입니다.',
  },
  {
    label: '예상 월 생활비',
    description: '은퇴 후 매달 쓰게 될 금액입니다. 물가상승도 함께 반영합니다.',
  },
  {
    label: '월 부족금액',
    description: '생활비에서 소득을 뺀 금액입니다. 이 금액을 자산에서 꺼내 씁니다.',
  },
  {
    label: '예상 자산 유지 기간',
    description: '지금 계획대로라면 금융자산이 몇 살까지 유지되는지 보여줍니다.',
  },
] as const;

const STEPS = [
  {
    title: '나이를 입력합니다',
    detail: '현재 나이와 은퇴하려는 나이, 그리고 몇 살까지 계산할지 정합니다.',
  },
  {
    title: '금융자산을 입력합니다',
    detail: '예금·펀드·주식처럼 현금으로 바꿀 수 있는 자산의 합계를 넣습니다.',
  },
  {
    title: '연금을 입력합니다',
    detail: '국민연금과 퇴직·개인연금의 월 수령액과 받기 시작하는 나이를 넣습니다.',
  },
  {
    title: '생활비를 입력합니다',
    detail: '은퇴 후 매달 필요한 금액을 넣으면 계산이 끝납니다.',
  },
] as const;

/** 이 사이트가 하지 않는 것. 신뢰의 근거로 앞쪽에 배치한다. */
const PRINCIPLES = [
  {
    title: '종목을 추천하지 않습니다',
    detail:
      '어떤 주식이나 금융상품을 사라고 하지 않습니다. 은퇴 이후의 현금흐름만 다룹니다.',
  },
  {
    title: '법정 수치를 짐작하지 않습니다',
    detail:
      '세율과 연금 산식은 공식 출처로 확인된 값만 씁니다. 확인되지 않으면 계산하지 않고 그 사실을 알려 드립니다.',
  },
  {
    title: '입력값을 보내지 않습니다',
    detail:
      '자산과 연금 정보는 서버로 전송되지 않고 사용하시는 기기에만 저장됩니다.',
  },
] as const;

export default function HomePage() {
  return (
    <>
      {/* 첫 화면. 어두운 띠를 화면 끝까지 채운다. */}
      <div className="grid-texture bg-brand-950">
        <Shell className="py-16 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="mb-5 text-base font-bold tracking-wide text-brand-300">
                은퇴 현금흐름 계산
              </p>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                은퇴 후 매달 얼마를 쓸 수 있고,
                <br />
                자산은 언제까지 유지될까요?
              </h1>
              <p className="mt-6 max-w-prose text-lg leading-relaxed text-slate-300">
                가진 자산과 연금을 입력하면 은퇴 후 월 현금흐름과 자산이 유지되는 기간을
                계산해 드립니다. 종목 추천이나 단기 투자정보를 다루지 않습니다.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <ButtonLink href="/retirement-calculator">은퇴 계산 시작하기</ButtonLink>
                <ButtonLink href="/articles" variant="onDark">
                  읽을거리 보기
                </ButtonLink>
              </div>
              <p className="mt-6 text-base text-slate-400">
                입력값은 이 기기에만 저장되며 서버로 전송되지 않습니다. 회원가입 없이 바로
                사용할 수 있습니다.
              </p>
            </div>

            {/* 계산하면 알 수 있는 4개의 숫자를 먼저 보여준다. */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm lg:p-8">
              <p className="text-lg font-bold text-white">
                계산하면 이 4가지를 알 수 있습니다
              </p>
              <ul className="mt-6 space-y-4">
                {KEY_NUMBERS.map((item, index) => (
                  <li
                    key={item.label}
                    className="flex gap-4 border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
                  >
                    <span
                      aria-hidden="true"
                      className="tabular mt-0.5 shrink-0 text-lg font-bold text-brand-300"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="block text-lg font-bold text-white">
                        {item.label}
                      </span>
                      <span className="mt-1 block text-base leading-relaxed text-slate-400">
                        {item.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Shell>
      </div>

      {/* 4단계 입력 안내 */}
      <div className="border-b border-slate-200 bg-slate-50">
        <Shell>
          <Section>
            <SectionTitle description="한 화면에 모든 값을 넣지 않습니다. 네 단계로 나누어 물어봅니다.">
              4단계로 입력하면 끝납니다
            </SectionTitle>
            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
                >
                  <span className="tabular flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="mt-5 text-lg font-bold text-slate-900">{step.title}</p>
                  <p className="mt-2 text-base leading-relaxed text-slate-600">
                    {step.detail}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-9">
              <ButtonLink href="/retirement-calculator">계산기 열기</ButtonLink>
            </div>
          </Section>
        </Shell>
      </div>

      {/* 이 사이트의 원칙 */}
      <Shell>
        <Section>
          <SectionTitle description="은퇴 이후의 돈은 되돌리기 어려운 결정을 만듭니다. 그래서 다음을 지킵니다.">
            이 사이트가 지키는 것
          </SectionTitle>
          <div className="grid gap-5 lg:grid-cols-3">
            {PRINCIPLES.map((item) => (
              <Card key={item.title}>
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  {item.detail}
                </p>
              </Card>
            ))}
          </div>
        </Section>
      </Shell>

      {/* 다음에 볼 곳 */}
      <div className="border-t border-slate-200 bg-slate-50">
        <Shell>
          <Section>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardTitle>연금 제도를 알고 싶다면</CardTitle>
                <p className="text-base leading-relaxed text-slate-600">
                  국민연금과 퇴직연금·IRP가 각각 어떤 제도인지 쉬운 말로 정리했습니다.
                  정확한 예상 수령액은 공식 기관에서 확인하는 방법을 함께 안내합니다.
                </p>
                <p className="mt-6">
                  <Link
                    href="/pension"
                    className="inline-flex min-h-touch items-center text-lg font-bold text-brand-700 hover:underline"
                  >
                    연금 안내 보기 →
                  </Link>
                </p>
              </Card>
              <Card>
                <CardTitle>이미 계산해 두셨다면</CardTitle>
                <p className="text-base leading-relaxed text-slate-600">
                  저장한 은퇴 계획을 다시 열어 생활비나 은퇴 시점을 바꿔보고 결과를 비교할
                  수 있습니다.
                </p>
                <p className="mt-6">
                  <Link
                    href="/my-retirement"
                    className="inline-flex min-h-touch items-center text-lg font-bold text-brand-700 hover:underline"
                  >
                    내 은퇴 계획 보기 →
                  </Link>
                </p>
              </Card>
            </div>

            <div className="mt-8">
              <Notice title="계산에 대해 알아두실 점">
                <p>
                  이 계산기는 투자수익률과 물가상승률을 <strong>가정</strong>해서
                  계산합니다. 가정값은 화면에 표시되고 직접 바꿀 수 있습니다.
                </p>
                <p>
                  세금과 건강보험료는 아직 은퇴 시뮬레이션에 반영되지 않았습니다. 실제로
                  쓸 수 있는 금액은 계산 결과보다 조금 적을 수 있습니다.
                </p>
              </Notice>
            </div>
          </Section>
        </Shell>
      </div>
    </>
  );
}
