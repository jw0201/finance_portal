'use client';

/**
 * 상단 메뉴.
 *
 * 화면 폭에 따라 세 가지로 보인다. 어느 폭에서도 메뉴를 가로로 밀어 보게 하지 않는다.
 * - 휴대폰: "메뉴" 버튼을 누르면 항목이 세로로 펼쳐진다.
 * - 태블릿: 로고 아래 줄에 항목을 나열하고, 넘치면 다음 줄로 감싼다.
 * - PC: 로고 옆 한 줄에 둔다.
 */

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';

/** 항목을 적게 두고 글자를 크게 쓴다. */
const NAV_ITEMS = [
  { href: '/retirement-calculator', label: '은퇴 계산기' },
  { href: '/my-retirement', label: '내 은퇴 계획' },
  { href: '/pension', label: '연금 안내' },
  { href: '/calculators', label: '계산기' },
  { href: '/articles', label: '읽을거리' },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // 펼친 메뉴는 Esc 로도 닫을 수 있게 한다.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {/* 태블릿·PC 메뉴 */}
      <nav
        aria-label="주요 메뉴"
        className="order-last hidden w-full sm:block lg:order-none lg:w-auto"
      >
        <ul className="flex flex-wrap items-center gap-1 pb-1 lg:pb-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex min-h-touch items-center whitespace-nowrap rounded-lg px-4 text-lg font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/retirement-calculator"
          className="hidden min-h-touch items-center rounded-lg bg-brand-600 px-6 text-lg font-bold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
        >
          계산 시작
        </Link>

        {/* 휴대폰 메뉴 버튼. 아이콘만으로 두지 않고 "메뉴" 글자를 함께 쓴다. */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex min-h-touch shrink-0 items-center gap-2 rounded-lg border-2 border-slate-300 px-3 text-lg font-bold text-slate-800 transition-colors hover:bg-slate-50 sm:hidden"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {open ? '✕' : '☰'}
          </span>
          {open ? '닫기' : '메뉴'}
        </button>
      </div>

      {/* 휴대폰 메뉴 펼침 영역 */}
      <nav
        id={panelId}
        hidden={!open}
        aria-label="주요 메뉴"
        className="order-last w-full sm:hidden"
      >
        <ul className="divide-y divide-slate-200 border-t border-slate-200 pb-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                className="flex min-h-touch items-center px-1 text-xl font-medium text-slate-800 hover:text-brand-700"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li className="pt-3">
            <Link
              href="/retirement-calculator"
              onClick={close}
              className="flex min-h-touch items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white hover:bg-brand-700"
            >
              계산 시작
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
