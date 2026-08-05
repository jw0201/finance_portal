/**
 * 표시용 포맷 함수.
 *
 * 계산은 하지 않는다. 화면에 보여줄 문자열을 만드는 일만 한다.
 * 50~70대 사용자가 읽기 쉽도록 "억"·"만원" 단위를 함께 쓴다.
 */

/** 1만원. */
const MAN = 10_000;
/** 1억원. */
const EOK = 100_000_000;
/** 비율을 퍼센트로 바꾸는 배수. */
const PERCENT = 100;

/** 숫자에 천 단위 구분 기호를 넣는다. */
function withCommas(value: number): string {
  return Math.round(value).toLocaleString('ko-KR');
}

/**
 * 금액을 한국식 큰 단위로 표시한다.
 *
 * 예) 123,400,000 -> "1억 2,340만원"
 *     45,000,000  -> "4,500만원"
 *     8,000       -> "8,000원"
 *
 * 은퇴 자산은 억 단위가 많아 전체 자릿수를 그대로 보여주면 읽기 어렵다.
 */
export function formatWon(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) {
    return '0원';
  }

  const sign = rounded < 0 ? '-' : '';
  const value = Math.abs(rounded);

  if (value >= EOK) {
    const eok = Math.floor(value / EOK);
    // 억 아래 자리는 만원 단위로 내림해서 보여준다.
    const man = Math.floor((value % EOK) / MAN);
    if (man === 0) {
      return `${sign}${withCommas(eok)}억원`;
    }
    return `${sign}${withCommas(eok)}억 ${withCommas(man)}만원`;
  }

  if (value >= MAN) {
    const man = Math.floor(value / MAN);
    const remainder = value % MAN;
    if (remainder === 0) {
      return `${sign}${withCommas(man)}만원`;
    }
    // 만원 미만이 남으면 버리지 않고 함께 보여준다.
    return `${sign}${withCommas(man)}만 ${withCommas(remainder)}원`;
  }

  return `${sign}${withCommas(value)}원`;
}

/**
 * 월 금액을 표시한다. 예) "월 300만원"
 */
export function formatMonthlyWon(amount: number): string {
  return `월 ${formatWon(amount)}`;
}

/**
 * 만원 단위로 짧게 표시한다. 그래프 축처럼 좁은 곳에 쓴다.
 *
 * 예) 500,000,000 -> "5.0억"
 *     35,000,000  -> "3,500만"
 */
export function formatWonCompact(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) {
    return '0';
  }

  const sign = rounded < 0 ? '-' : '';
  const value = Math.abs(rounded);

  if (value >= EOK) {
    const eok = value / EOK;
    // 10억 이상은 소수점을 떼어 자릿수를 줄인다.
    const text = eok >= 10 ? withCommas(eok) : eok.toFixed(1);
    return `${sign}${text}억`;
  }

  if (value >= MAN) {
    return `${sign}${withCommas(value / MAN)}만`;
  }

  return `${sign}${withCommas(value)}`;
}

/**
 * 비율을 퍼센트로 표시한다.
 *
 * 예) 0.03 -> "3%", 0.025 -> "2.5%"
 */
export function formatPercent(rate: number, fractionDigits = 1): string {
  const percent = rate * PERCENT;
  // 정수로 딱 떨어지면 소수점을 붙이지 않는다.
  if (Number.isInteger(percent)) {
    return `${percent}%`;
  }
  return `${percent.toFixed(fractionDigits)}%`;
}

/** 나이를 표시한다. 예) "65세" */
export function formatAge(age: number): string {
  return `${Math.round(age)}세`;
}

/** 기간(년)을 표시한다. 예) "25년" */
export function formatYears(years: number): string {
  return `${Math.round(years)}년`;
}

/**
 * 자산 유지 기간을 사람이 읽는 문장으로 만든다.
 *
 * 고갈되지 않는 경우를 "0년" 처럼 보여주면 오해를 부르므로 따로 문구를 쓴다.
 */
export function formatSustainability(
  depletionAge: number | null,
  lifeExpectancy: number,
): string {
  if (depletionAge === null) {
    return `${formatAge(lifeExpectancy)} 이후까지 유지`;
  }
  return `${formatAge(depletionAge)}에 소진 예상`;
}

/** 저장 시각을 표시한다. 예) "2026년 8월 4일" */
export function formatSavedAt(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** 부호를 붙여 증감을 표시한다. 예) "+30만원", "-50만원" */
export function formatSignedWon(amount: number): string {
  if (amount === 0) {
    return '변화 없음';
  }
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatWon(amount)}`;
}

/** 부호를 붙여 연수 증감을 표시한다. 예) "3년 늦춤", "1년 앞당김" */
export function formatSignedYears(years: number): string {
  if (years === 0) {
    return '현재 계획';
  }
  return years > 0 ? `${years}년 늦춤` : `${Math.abs(years)}년 앞당김`;
}
