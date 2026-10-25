import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { SiteNav } from '@/components/SiteNav';
import { Shell } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '은퇴 금융 포털',
    template: '%s | 은퇴 금융 포털',
  },
  description:
    '현재 자산과 연금으로 은퇴 후 매달 얼마를 쓸 수 있고, 자산이 언제까지 유지되는지 계산합니다.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/** 아래쪽 띠의 바로가기 묶음. */
const FOOTER_LINKS = [
  { href: '/retirement-calculator', label: '은퇴 계산기' },
  { href: '/calculators/tax', label: '세금·건강보험료 계산기' },
  { href: '/my-retirement', label: '내 은퇴 계획' },
  { href: '/pension', label: '연금 안내' },
  { href: '/articles', label: '읽을거리' },
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <Shell>
        <div className="flex min-h-touch flex-wrap items-center gap-x-3 gap-y-2 py-2 sm:gap-x-8 lg:py-3">
          <Link
            href="/"
            className="inline-flex min-h-touch shrink-0 items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900"
          >
            {/* 글자만으로도 알아볼 수 있게 두고, 아이콘은 보조로만 쓴다. */}
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white"
            >
              은
            </span>
            은퇴 금융 포털
          </Link>

          <SiteNav />
        </div>
      </Shell>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand-950 text-slate-300">
      <Shell className="py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div>
            <p className="text-xl font-bold text-white">은퇴 금융 포털</p>
            <p className="mt-4 max-w-prose text-base leading-relaxed">
              가진 자산과 연금으로 은퇴 후 매달 얼마를 쓸 수 있고, 자산이 언제까지
              유지되는지 계산합니다. 종목 추천이나 단기 투자정보를 다루지 않습니다.
            </p>
          </div>

          <nav aria-label="바로가기">
            <p className="text-lg font-bold text-white">바로가기</p>
            <ul className="mt-4 space-y-1">
              {FOOTER_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-touch items-center text-base text-slate-300 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 space-y-4 border-t border-white/10 pt-8 text-base leading-relaxed text-slate-400">
          <p className="text-lg font-bold text-white">안내</p>
          <p className="max-w-prose">
            이 사이트의 계산 결과는 사용자가 입력한 값과 화면에 표시된 가정을 바탕으로 한
            <strong className="text-slate-200"> 참고 자료</strong>입니다. 투자 권유나
            금융상품 추천이 아니며, 세무·법률 자문도 아닙니다.
          </p>
          <p className="max-w-prose">
            실제 연금 수령액과 세금은 개인의 가입 이력과 그때의 제도에 따라 달라집니다.
            중요한 결정을 앞두고 있다면 국민연금공단, 금융감독원 등 공식 기관이나 자격을
            갖춘 전문가와 상담하시기 바랍니다.
          </p>
          <p className="max-w-prose">
            입력한 정보는 서버로 전송되지 않고 사용하시는 기기(브라우저)에만 저장됩니다.
          </p>
        </div>
      </Shell>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/*
       * 배경 띠가 화면 끝까지 닿아야 하므로 main 에는 폭 제한을 두지 않는다.
       * 폭은 각 페이지가 Shell 로 정한다.
       */}
      <body className="flex min-h-screen flex-col bg-white">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {/*
         * 방문자 수·페이지 조회 수 집계 (Vercel Web Analytics, 쿠키 없음).
         * 페이지 주소만 보낸다. 주소에 입력값이 들어가지 않으므로 금융정보는 전송되지 않는다.
         * 사용자 지정 이벤트는 Pro 요금제 전환 후 추가한다. 이벤트에도 금액을 넣지 않는다.
         */}
        <Analytics />
      </body>
    </html>
  );
}
