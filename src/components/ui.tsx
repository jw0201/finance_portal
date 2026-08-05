/**
 * 공통 UI 조각.
 *
 * 금융 계산을 하지 않는다. domain 이 계산한 값을 받아 표시만 한다.
 * 50~70대 사용자를 위해 글자와 터치 영역을 크게 둔다.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

/** 페이지 제목과 설명. 모든 페이지가 같은 형태를 쓴다. */
export function PageHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
      {description ? (
        <p className="mt-3 max-w-3xl text-lg text-slate-700">{description}</p>
      ) : null}
    </header>
  );
}

/** 흰 배경 카드. 관련 있는 내용을 한데 모아 보여준다. */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

/** 카드 안의 소제목. */
export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-xl font-bold text-slate-900">{children}</h2>;
}

/** 강조 색상 종류. 부족·경고는 caution, 여유는 good 을 쓴다. */
export type Tone = 'neutral' | 'brand' | 'caution' | 'good';

const TONE_VALUE: Record<Tone, string> = {
  neutral: 'text-slate-900',
  brand: 'text-brand-700',
  caution: 'text-caution-700',
  good: 'text-good-700',
};

const TONE_BOX: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-slate-50',
  brand: 'border-brand-100 bg-brand-50',
  caution: 'border-caution-600/30 bg-caution-50',
  good: 'border-good-600/30 bg-good-50',
};

/**
 * 핵심 숫자 하나를 크게 보여준다.
 *
 * 결과 화면의 4개 숫자(월소득·월 생활비·부족금액·유지 기간)에 쓴다.
 * 숫자만 두지 않고 항상 설명을 함께 보여준다.
 */
export function KeyFigure({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border p-6 ${TONE_BOX[tone]}`}>
      <p className="text-lg font-medium text-slate-700">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${TONE_VALUE[tone]}`}>{value}</p>
      {hint ? <p className="mt-2 text-base text-slate-600">{hint}</p> : null}
    </div>
  );
}

/** 이름과 값을 한 줄로 보여준다. */
export function LabeledValue({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-lg text-slate-700">{label}</span>
      <span className={`text-lg font-bold ${TONE_VALUE[tone]}`}>{value}</span>
    </div>
  );
}

/** 버튼 모양 링크. 터치 영역을 충분히 크게 둔다. */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const style =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'border-2 border-brand-600 bg-white text-brand-700 hover:bg-brand-50';

  return (
    <Link
      href={href}
      className={`inline-flex min-h-touch items-center justify-center rounded-xl px-8 text-lg font-bold transition-colors ${style}`}
    >
      {children}
    </Link>
  );
}

/** 동작 버튼. 터치 영역을 충분히 크게 둔다. */
export function ActionButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  fullWidth = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    danger: 'border-2 border-caution-600 bg-white text-caution-700 hover:bg-caution-50',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-touch items-center justify-center rounded-xl px-8 text-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        styles[variant] ?? styles.primary
      } ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

/**
 * 안내 문구 상자.
 *
 * 가정 설명, 계산에 포함되지 않은 항목 안내 등에 쓴다.
 */
export function Notice({
  title,
  children,
  tone = 'neutral',
}: {
  title?: string;
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-xl border p-5 ${TONE_BOX[tone]}`}>
      {title ? <p className="mb-2 text-lg font-bold text-slate-900">{title}</p> : null}
      <div className="space-y-2 text-base text-slate-700">{children}</div>
    </div>
  );
}

/**
 * 어려운 용어를 쉬운 한국어로 풀어 보여준다.
 *
 * 예) "매년 자산에서 꺼내 쓰는 비율" 처럼 용어 자체를 쉬운 말로 쓰고,
 * 필요하면 원래 용어를 괄호로 덧붙인다.
 */
export function TermHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-base text-slate-600">{children}</p>;
}

/** 표 형태의 비교 결과를 감싼다. 좁은 화면에서 가로 스크롤을 허용한다. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
