/**
 * 공통 UI 조각.
 *
 * 금융 계산을 하지 않는다. domain 이 계산한 값을 받아 표시만 한다.
 * 50~70대 사용자를 위해 글자와 터치 영역을 크게 둔다.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * 화면 폭을 쓰는 바깥 껍데기.
 *
 * 배경 띠는 화면 끝까지 채우고, 안쪽 내용만 이 껍데기로 감싼다.
 * 폭 값을 여기 한 곳에만 두어 페이지마다 다른 폭이 생기지 않게 한다.
 */
export function Shell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-shell px-5 sm:px-8 lg:px-12 xl:px-16 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * 페이지 제목과 설명. 모든 페이지가 같은 형태를 쓴다.
 *
 * 어두운 띠 위에 얹어 화면 상단을 가득 채운다.
 */
export function PageHeading({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: string;
  /** 제목 위에 붙는 작은 분류 문구. */
  eyebrow?: string;
}) {
  return (
    <div className="grid-texture border-b border-white/10 bg-brand-950">
      <Shell className="py-14 lg:py-20">
        {eyebrow ? (
          <p className="mb-4 text-base font-bold tracking-wide text-brand-300">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-slate-300">
            {description}
          </p>
        ) : null}
      </Shell>
    </div>
  );
}

/** 페이지 본문 영역. 밝은 배경 위에 놓인다. */
export function Section({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`py-12 lg:py-16 ${className}`}>{children}</section>;
}

/** 본문 영역의 소제목. 넓은 화면에서 각 구획을 구분한다. */
export function SectionTitle({
  children,
  description,
}: {
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {children}
      </h2>
      {description ? (
        <p className="mt-3 max-w-prose text-lg text-slate-600">{description}</p>
      ) : null}
    </div>
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
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8 ${className}`}
    >
      {children}
    </section>
  );
}

/** 카드 안의 소제목. */
export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-5 text-xl font-bold tracking-tight text-slate-900">{children}</h2>
  );
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

/** 핵심 숫자 카드 위쪽에 두는 색 띠. 숫자의 성격을 색으로도 알린다. */
const TONE_BAR: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  brand: 'bg-brand-600',
  caution: 'bg-caution-600',
  good: 'bg-good-600',
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className={`h-1.5 w-full ${TONE_BAR[tone]}`} />
      <div className="p-6">
        <p className="text-base font-bold text-slate-600">{label}</p>
        <p className={`tabular mt-3 text-3xl font-bold tracking-tight ${TONE_VALUE[tone]}`}>
          {value}
        </p>
        {hint ? <p className="mt-3 text-base leading-relaxed text-slate-600">{hint}</p> : null}
      </div>
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
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-3.5 last:border-b-0">
      <span className="text-lg text-slate-600">{label}</span>
      <span className={`tabular text-lg font-bold ${TONE_VALUE[tone]}`}>{value}</span>
    </div>
  );
}

/** 버튼 공통 모양. 터치 영역을 충분히 크게 둔다. */
const BUTTON_BASE =
  'inline-flex min-h-touch items-center justify-center rounded-xl px-8 text-lg font-bold tracking-tight transition-all duration-150';

/** 버튼 모양 링크. 터치 영역을 충분히 크게 둔다. */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  /** onDark 는 어두운 띠 위에 놓는 보조 버튼이다. */
  variant?: 'primary' | 'secondary' | 'onDark';
}) {
  const styles: Record<string, string> = {
    primary: 'bg-brand-600 text-white shadow-card hover:bg-brand-700 hover:shadow-card-hover',
    secondary: 'border-2 border-slate-300 bg-white text-slate-800 hover:border-brand-600 hover:text-brand-700',
    onDark: 'border-2 border-white/30 bg-white/5 text-white hover:border-white/60 hover:bg-white/10',
  };

  return (
    <Link href={href} className={`${BUTTON_BASE} ${styles[variant] ?? styles.primary}`}>
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
    primary: 'bg-brand-600 text-white shadow-card hover:bg-brand-700 hover:shadow-card-hover',
    secondary: 'border-2 border-slate-300 bg-white text-slate-800 hover:border-brand-600 hover:text-brand-700',
    danger: 'border-2 border-caution-600 bg-white text-caution-700 hover:bg-caution-50',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${BUTTON_BASE} disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${
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
    <div className={`rounded-xl border-l-4 border-y border-r p-5 ${TONE_BOX[tone]}`}>
      {title ? <p className="mb-2 text-lg font-bold text-slate-900">{title}</p> : null}
      <div className="space-y-2 text-base leading-relaxed text-slate-700">{children}</div>
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
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">{children}</div>
  );
}
