import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, Card, CardTitle, Notice, PageHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: '연금 안내',
  description:
    '국민연금, 퇴직연금, IRP, 연금저축이 어떤 제도인지 쉬운 말로 정리했습니다.',
};

/**
 * 공식 기관 링크.
 *
 * 예상 수령액과 제도 수치는 이 사이트에서 추정하지 않고 공식 기관으로 안내한다.
 */
const OFFICIAL_LINKS = [
  {
    href: 'https://www.nps.or.kr',
    label: '국민연금공단',
    description:
      '내 예상 연금액 조회, 가입 내역 확인, 예상 수령액 모의계산을 할 수 있습니다.',
  },
  {
    href: 'https://www.fss.or.kr',
    label: '금융감독원',
    description: '퇴직연금·연금저축 관련 정보와 금융 상담을 제공합니다.',
  },
  {
    href: 'https://www.moel.go.kr',
    label: '고용노동부',
    description: '퇴직연금 제도에 관한 안내를 제공합니다.',
  },
] as const;

export default function PensionPage() {
  return (
    <div className="space-y-8">
      <PageHeading
        title="연금 안내"
        description="은퇴 소득의 바탕이 되는 연금 제도를 쉬운 말로 정리했습니다. 예상 수령액은 공식 기관에서 확인하는 방법을 안내합니다."
      />

      <Notice title="이 사이트가 연금액을 계산하지 않는 이유" tone="brand">
        <p>
          국민연금 예상 수령액은 가입 기간, 낸 보험료, 그동안의 소득에 따라 사람마다
          다르게 계산됩니다. 계산식과 각종 비율은 법으로 정해져 있고 바뀔 수 있습니다.
        </p>
        <p>
          짐작한 값으로 계산하면 <strong>그럴듯해 보이는 틀린 금액</strong>이 나옵니다.
          연금 개시 시점처럼 되돌리기 어려운 결정을 그 숫자로 하시면 안 됩니다.
        </p>
        <p>
          그래서 이 사이트는 연금액을 추정하지 않습니다. 대신 공식 기관에서 확인한 금액을
          은퇴 계산기에 입력하시면 그 금액으로 자산 흐름을 계산해 드립니다.
        </p>
      </Notice>

      <Card>
        <CardTitle>국민연금</CardTitle>
        <div className="space-y-3 text-lg text-slate-800">
          <p>
            국민연금은 소득이 있는 동안 보험료를 내고, 정해진 나이가 되면 평생 매달 받는
            공적연금입니다.
          </p>
          <p>은퇴 계획에서 국민연금이 중요한 이유는 두 가지입니다.</p>
        </div>
        <ul className="mt-4 space-y-3 text-lg text-slate-800">
          <li className="flex gap-3">
            <span aria-hidden="true">•</span>
            <span>
              <strong>평생 받습니다.</strong> 오래 사실수록 받는 총액이 늘어납니다. 자산이
              소진되어도 연금은 계속 나옵니다.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true">•</span>
            <span>
              <strong>물가에 따라 조정될 수 있습니다.</strong> 시간이 지나도 실질 가치가
              유지되는 편입니다.
            </span>
          </li>
        </ul>

        <div className="mt-6">
          <Notice>
            <p>
              받는 시기를 앞당기거나 늦출 수 있고, 그에 따라 금액이 달라집니다. 다만
              구체적인 증감 비율은 법으로 정해진 수치이므로 이 사이트에 적지 않았습니다.
              국민연금공단에서 본인 조건으로 확인하시기 바랍니다.
            </p>
          </Notice>
        </div>
      </Card>

      <Card>
        <CardTitle>퇴직연금</CardTitle>
        <div className="space-y-3 text-lg text-slate-800">
          <p>
            회사가 근로자의 퇴직급여를 금융기관에 적립해 두는 제도입니다. 퇴직할 때
            일시금으로 받거나 연금 형태로 나눠 받을 수 있습니다.
          </p>
          <p>
            운용 방식에 따라 회사가 정해진 금액을 보장하는 형태와, 근로자가 직접 운용해
            결과에 따라 금액이 달라지는 형태가 있습니다. 본인이 어느 쪽인지는 회사나
            가입한 금융기관에서 확인할 수 있습니다.
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle>IRP (개인형 퇴직연금)</CardTitle>
        <div className="space-y-3 text-lg text-slate-800">
          <p>
            개인이 직접 만드는 은퇴 전용 계좌입니다. 퇴직할 때 받은 퇴직금을 옮겨 담을 수
            있고, 본인이 추가로 넣을 수도 있습니다.
          </p>
          <p>
            은퇴 후 연금으로 나눠 받는 것을 전제로 만든 계좌라서, 중간에 꺼내 쓰면
            불이익이 있을 수 있습니다.
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle>연금저축</CardTitle>
        <div className="space-y-3 text-lg text-slate-800">
          <p>
            노후를 위해 개인이 스스로 넣는 상품입니다. 퇴직과 관계없이 가입할 수
            있습니다.
          </p>
          <p>
            IRP와 연금저축에는 세액공제 혜택이 있고, 연금으로 받을 때의 세금 규정도 따로
            있습니다. 한도와 세율은 법으로 정해져 있고 바뀔 수 있어 이 사이트에 적지
            않았습니다.
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle>주택연금</CardTitle>
        <div className="space-y-3 text-lg text-slate-800">
          <p>
            살고 있는 집을 담보로 맡기고 매달 일정 금액을 받는 제도입니다. 집에 계속
            거주하면서 생활비를 받을 수 있습니다.
          </p>
          <p>
            받는 금액은 집값, 나이, 지급 방식에 따라 정해진 산식으로 계산됩니다. 이
            산식은 제도로 정해진 것이므로 이 사이트에서 추정하지 않습니다. 한국주택금융
            공사에서 확인하시기 바랍니다.
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle>예상 수령액은 여기서 확인하세요</CardTitle>
        <ul className="space-y-5">
          {OFFICIAL_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-bold text-brand-700 underline"
              >
                {link.label} (새 창으로 열림)
              </a>
              <p className="mt-1 text-base text-slate-700">{link.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>확인한 금액으로 계산해 보세요</CardTitle>
        <p className="text-lg text-slate-800">
          공식 기관에서 확인한 예상 연금액을 은퇴 계산기에 입력하시면, 그 금액으로 은퇴
          후 월 현금흐름과 자산이 유지되는 기간을 계산해 드립니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <ButtonLink href="/retirement-calculator">은퇴 계산기 열기</ButtonLink>
          <ButtonLink href="/articles" variant="secondary">
            연금 관련 글 보기
          </ButtonLink>
        </div>
        <p className="mt-4 text-base text-slate-600">
          연금 제도에 관한 글은{' '}
          <Link href="/articles" className="font-bold text-brand-700 underline">
            읽을거리
          </Link>{' '}
          에서 더 보실 수 있습니다.
        </p>
      </Card>
    </div>
  );
}
