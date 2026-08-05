import { ButtonLink, Card, CardTitle, Notice } from '@/components/ui';
import Link from 'next/link';

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
  '현재 나이와 은퇴 나이를 입력합니다.',
  '가진 금융자산을 입력합니다.',
  '국민연금과 개인·퇴직연금을 입력합니다.',
  '은퇴 후 예상 생활비를 입력합니다.',
] as const;

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl font-bold leading-snug text-slate-900 sm:text-4xl">
          은퇴 후 매달 얼마를 쓸 수 있고,
          <br />
          자산은 언제까지 유지될까요?
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-slate-700">
          가진 자산과 연금을 입력하면 은퇴 후 월 현금흐름과 자산이 유지되는 기간을
          계산해 드립니다. 종목 추천이나 단기 투자정보를 다루지 않습니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <ButtonLink href="/retirement-calculator">은퇴 계산 시작하기</ButtonLink>
          <ButtonLink href="/articles" variant="secondary">
            읽을거리 보기
          </ButtonLink>
        </div>
        <p className="mt-4 text-base text-slate-600">
          입력값은 이 기기에만 저장되며 서버로 전송되지 않습니다. 회원가입 없이 바로
          사용할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold text-slate-900">
          계산하면 이 4가지를 알 수 있습니다
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {KEY_NUMBERS.map((item) => (
            <Card key={item.label}>
              <p className="text-xl font-bold text-brand-700">{item.label}</p>
              <p className="mt-2 text-base text-slate-700">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold text-slate-900">
          4단계로 입력하면 끝납니다
        </h2>
        <Card>
          <ol className="space-y-4">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {index + 1}
                </span>
                <span className="pt-1 text-lg text-slate-800">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <ButtonLink href="/retirement-calculator">계산기 열기</ButtonLink>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>연금 제도를 알고 싶다면</CardTitle>
          <p className="text-base text-slate-700">
            국민연금과 퇴직연금·IRP가 각각 어떤 제도인지 쉬운 말로 정리했습니다. 정확한
            예상 수령액은 공식 기관에서 확인하는 방법을 함께 안내합니다.
          </p>
          <p className="mt-4">
            <Link
              href="/pension"
              className="text-lg font-bold text-brand-700 underline"
            >
              연금 안내 보기
            </Link>
          </p>
        </Card>
        <Card>
          <CardTitle>이미 계산해 두셨다면</CardTitle>
          <p className="text-base text-slate-700">
            저장한 은퇴 계획을 다시 열어 생활비나 은퇴 시점을 바꿔보고 결과를 비교할 수
            있습니다.
          </p>
          <p className="mt-4">
            <Link
              href="/my-retirement"
              className="text-lg font-bold text-brand-700 underline"
            >
              내 은퇴 계획 보기
            </Link>
          </p>
        </Card>
      </section>

      <Notice title="계산에 대해 알아두실 점">
        <p>
          이 계산기는 투자수익률과 물가상승률을 <strong>가정</strong>해서 계산합니다.
          가정값은 화면에 표시되고 직접 바꿀 수 있습니다.
        </p>
        <p>
          세금과 건강보험료는 아직 은퇴 시뮬레이션에 반영되지 않았습니다. 실제로 쓸 수
          있는 금액은 계산 결과보다 조금 적을 수 있습니다.
        </p>
      </Notice>
    </div>
  );
}
