import type { Metadata } from 'next';
import { ButtonLink, Card, Notice, PageHeading, Section, Shell } from '@/components/ui';

export const metadata: Metadata = {
  title: '로그인',
  description: '회원 기능은 준비 중입니다. 로그인 없이 모든 계산기를 사용할 수 있습니다.',
};

export default function LoginPage() {
  return (
    <>
      <PageHeading eyebrow="회원" title="로그인" />

      <div className="bg-slate-50">
        <Shell>
          <Section>
            {/* 안내만 있는 화면이라 넓게 늘리지 않고 읽기 좋은 폭으로 둔다. */}
            <div className="mx-auto w-full max-w-3xl">
              <Card>
                <Notice title="회원 기능은 아직 준비 중입니다">
                  <p>
                    로그인 기능은 아직 만들어지지 않았습니다. 동작하지 않는 입력창을
                    보여드리지 않기 위해 폼을 두지 않았습니다.
                  </p>
                </Notice>

                <div className="mt-7 space-y-4 text-lg leading-relaxed text-slate-800">
                  <p>
                    <strong>로그인하지 않아도 모든 계산기를 사용할 수 있습니다.</strong>
                  </p>
                  <p>
                    계산 결과는 지금도 저장할 수 있습니다. 저장된 계획은 서버가 아니라
                    사용하시는 기기(브라우저)에 보관되며, &quot;내 은퇴 계획&quot; 에서
                    다시 볼 수 있습니다.
                  </p>
                  <p className="text-base text-slate-600">
                    여러 기기에서 같은 계획을 보시려면 회원 기능이 필요합니다. 준비되면 이
                    화면을 통해 안내하겠습니다.
                  </p>
                </div>

                <div className="mt-9 flex flex-wrap gap-4">
                  <ButtonLink href="/retirement-calculator">
                    은퇴 계산 시작하기
                  </ButtonLink>
                  <ButtonLink href="/my-retirement" variant="secondary">
                    저장된 계획 보기
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
