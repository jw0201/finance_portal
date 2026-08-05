'use client';

/**
 * 금액·나이·비율 입력 필드.
 *
 * 계산은 하지 않는다. 숫자를 받아 부모에게 전달하고, 오류 메시지를 보여준다.
 * 큰 글자와 큰 입력 영역을 쓴다.
 */

import { useId } from 'react';
import { formatWon } from '@/lib/format';

/** 숫자 입력에서 쉼표 등을 걷어내고 숫자만 남긴다. */
function parseNumeric(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  if (cleaned === '') {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 금액 입력 필드.
 *
 * 입력한 금액을 "1억 2,340만원" 형태로 아래에 다시 보여준다.
 * 0이 몇 개인지 세지 않아도 되게 하려는 것이다.
 */
export function AmountField({
  label,
  hint,
  value,
  onChange,
  error,
  step,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  error?: string | null;
  /** 빠른 증감 버튼의 단위. 지정하면 +/- 버튼을 보여준다. */
  step?: number;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="mb-6">
      <label htmlFor={id} className="block text-lg font-bold text-slate-900">
        {label}
      </label>
      {hint ? <p className="mt-1 text-base text-slate-600">{hint}</p> : null}

      <div className="mt-2 flex items-stretch gap-2">
        {step ? (
          <button
            type="button"
            onClick={() => onChange(Math.max(0, value - step))}
            aria-label={`${label} ${formatWon(step)} 줄이기`}
            className="min-h-touch w-16 shrink-0 rounded-xl border-2 border-slate-300 bg-white text-2xl font-bold text-slate-700 hover:bg-slate-50"
          >
            −
          </button>
        ) : null}

        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value === 0 ? '0' : value.toLocaleString('ko-KR')}
          onChange={(event) => {
            const parsed = parseNumeric(event.target.value);
            onChange(parsed ?? 0);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`min-h-touch w-full rounded-xl border-2 px-4 text-right text-xl font-bold text-slate-900 ${
            error ? 'border-caution-600 bg-caution-50' : 'border-slate-300 bg-white'
          }`}
        />

        {step ? (
          <button
            type="button"
            onClick={() => onChange(value + step)}
            aria-label={`${label} ${formatWon(step)} 늘리기`}
            className="min-h-touch w-16 shrink-0 rounded-xl border-2 border-slate-300 bg-white text-2xl font-bold text-slate-700 hover:bg-slate-50"
          >
            +
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-lg text-brand-700">{formatWon(value)}</p>

      {error ? (
        <p id={errorId} className="mt-2 text-base font-bold text-caution-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** 나이 입력 필드. 정수만 받는다. */
export function AgeField({
  label,
  hint,
  value,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  error?: string | null;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="mb-6">
      <label htmlFor={id} className="block text-lg font-bold text-slate-900">
        {label}
      </label>
      {hint ? <p className="mt-1 text-base text-slate-600">{hint}</p> : null}

      <div className="mt-2 flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          aria-label={`${label} 1세 줄이기`}
          className="min-h-touch w-16 shrink-0 rounded-xl border-2 border-slate-300 bg-white text-2xl font-bold text-slate-700 hover:bg-slate-50"
        >
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={String(value)}
          onChange={(event) => {
            const parsed = parseNumeric(event.target.value);
            onChange(parsed === null ? 0 : Math.round(parsed));
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`min-h-touch w-full rounded-xl border-2 px-4 text-center text-xl font-bold text-slate-900 ${
            error ? 'border-caution-600 bg-caution-50' : 'border-slate-300 bg-white'
          }`}
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`${label} 1세 늘리기`}
          className="min-h-touch w-16 shrink-0 rounded-xl border-2 border-slate-300 bg-white text-2xl font-bold text-slate-700 hover:bg-slate-50"
        >
          +
        </button>
      </div>

      {error ? (
        <p id={errorId} className="mt-2 text-base font-bold text-caution-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 비율 입력 필드. 화면에는 퍼센트로 보여주고 값은 소수로 다룬다.
 *
 * 예) 화면 "3" -> 값 0.03
 */
export function RateField({
  label,
  hint,
  value,
  onChange,
  error,
  stepPercent = 0.5,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  error?: string | null;
  stepPercent?: number;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const PERCENT = 100;

  // 부동소수점 오차로 2.9999% 같은 값이 보이지 않게 반올림한다.
  const asPercent = Math.round(value * PERCENT * 100) / 100;

  const shift = (deltaPercent: number): void => {
    const next = (asPercent + deltaPercent) / PERCENT;
    onChange(Math.round(next * 10_000) / 10_000);
  };

  return (
    <div className="mb-6">
      <label htmlFor={id} className="block text-lg font-bold text-slate-900">
        {label}
      </label>
      {hint ? <p className="mt-1 text-base text-slate-600">{hint}</p> : null}

      <div className="mt-2 flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => shift(-stepPercent)}
          aria-label={`${label} ${stepPercent}% 줄이기`}
          className="min-h-touch w-16 shrink-0 rounded-xl border-2 border-slate-300 bg-white text-2xl font-bold text-slate-700 hover:bg-slate-50"
        >
          −
        </button>
        <div className="relative w-full">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={String(asPercent)}
            onChange={(event) => {
              const parsed = parseNumeric(event.target.value);
              onChange(parsed === null ? 0 : parsed / PERCENT);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`min-h-touch w-full rounded-xl border-2 px-4 pr-12 text-center text-xl font-bold text-slate-900 ${
              error ? 'border-caution-600 bg-caution-50' : 'border-slate-300 bg-white'
            }`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-500">
            %
          </span>
        </div>
        <button
          type="button"
          onClick={() => shift(stepPercent)}
          aria-label={`${label} ${stepPercent}% 늘리기`}
          className="min-h-touch w-16 shrink-0 rounded-xl border-2 border-slate-300 bg-white text-2xl font-bold text-slate-700 hover:bg-slate-50"
        >
          +
        </button>
      </div>

      {error ? (
        <p id={errorId} className="mt-2 text-base font-bold text-caution-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** 예/아니오 선택. 체크박스보다 터치하기 쉽게 두 개의 큰 버튼으로 만든다. */
export function YesNoField({
  label,
  hint,
  value,
  onChange,
  yesLabel = '포함',
  noLabel = '포함하지 않음',
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  const selected = 'border-brand-600 bg-brand-50 text-brand-700';
  const unselected = 'border-slate-300 bg-white text-slate-700';

  return (
    <fieldset className="mb-6">
      <legend className="block text-lg font-bold text-slate-900">{label}</legend>
      {hint ? <p className="mt-1 text-base text-slate-600">{hint}</p> : null}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          aria-pressed={value}
          onClick={() => onChange(true)}
          className={`min-h-touch flex-1 rounded-xl border-2 px-4 text-lg font-bold ${
            value ? selected : unselected
          }`}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => onChange(false)}
          className={`min-h-touch flex-1 rounded-xl border-2 px-4 text-lg font-bold ${
            value ? unselected : selected
          }`}
        >
          {noLabel}
        </button>
      </div>
    </fieldset>
  );
}
