import type { Metadata } from 'next';
import { ButtonLink, Card, Notice, PageHeading, Section, Shell } from '@/components/ui';

export const metadata: Metadata = {
  title: '회원가입',
  description:
    '회원가입은 준비 중입니다. 가입하지 않아도 모든 계산기를 사용할 수 있습니다.',
};

export default function SignupPage() {
  return (
    <>
      <PageHeading eyebrow="회원" title="회원가입" />

      <div className="bg-slate-50">
        <Shell>
          <Section>
            {/* 안내만 있는 화면이라 넓게 늘리지 않고 읽기 좋은 폭으로 둔다. */}
            <div className="mx-auto w-full max-w-3xl">
              <Card>
                <Notice title="회원가입은 아직 준비 중입니다">
                  <p>
                    회원가입 기능은 아직 만들어지지 않았습니다. 동작하지 않는 입력창을
                    보여드리지 않기 위해 폼을 두지 않았습니다.
                  </p>
                </Notice>

                <div className="mt-7 space-y-4 text-lg leading-relaxed text-slate-800">
                  <p>
                    <strong>가입하지 않아도 모든 계산기를 사용할 수 있습니다.</strong>{' '}
                    계산과 저장에 개인정보가 필요하지 않습니다.
                  </p>
                  <p>
                    회원 기능을 만들 때에도 필요한 최소한의 정보만 받을 계획입니다.
                    주민등록번호, 계좌번호, 카드번호, 금융기관 로그인 정보는 요구하지
                    않습니다.
                  </p>
                </div>

                <div className="mt-9 flex flex-wrap gap-4">
                  <ButtonLink href="/retirement-calculator">
                    은퇴 계산 시작하기
                  </ButtonLink>
                  <ButtonLink href="/articles" variant="secondary">
                    읽을거리 보기
                  </ButtonLink>
                </div>
              </Card>
            </div>
          </Section>
        </Shell>
      </div>
    </>
  );
}
