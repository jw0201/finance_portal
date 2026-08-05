import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
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

/** 상단 메뉴. 항목을 적게 두고 글자를 크게 쓴다. */
const NAV_ITEMS = [
  { href: '/retirement-calculator', label: '은퇴 계산기' },
  { href: '/my-retirement', label: '내 은퇴 계획' },
  { href: '/pension', label: '연금 안내' },
  { href: '/calculators', label: '계산기' },
  { href: '/articles', label: '읽을거리' },
] as const;

function SiteHeader() {
  return (
    <header className="border-b-2 border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-touch items-center text-xl font-bold text-brand-700 sm:text-2xl"
          >
            은퇴 금융 포털
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-touch items-center rounded-xl border-2 border-slate-300 px-6 text-lg font-bold text-slate-700 hover:bg-slate-50"
          >
            로그인
          </Link>
        </div>

        <nav aria-label="주요 메뉴" className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-touch items-center rounded-xl px-5 text-lg font-medium text-slate-800 hover:bg-brand-50 hover:text-brand-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 text-base text-slate-600">
        <p className="text-lg font-bold text-slate-800">안내</p>
        <p>
          이 사이트의 계산 결과는 사용자가 입력한 값과 화면에 표시된 가정을 바탕으로 한
          <strong className="text-slate-800"> 참고 자료</strong>입니다. 투자 권유나
          금융상품 추천이 아니며, 세무·법률 자문도 아닙니다.
        </p>
        <p>
          실제 연금 수령액과 세금은 개인의 가입 이력과 그때의 제도에 따라 달라집니다.
          중요한 결정을 앞두고 있다면 국민연금공단, 금융감독원 등 공식 기관이나 자격을
          갖춘 전문가와 상담하시기 바랍니다.
        </p>
        <p>
          입력한 정보는 서버로 전송되지 않고 사용하시는 기기(브라우저)에만 저장됩니다.
        </p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
