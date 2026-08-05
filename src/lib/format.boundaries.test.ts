/**
 * 표시용 포맷 - 자릿수 경계와 미검증 분기.
 *
 * format.test.ts 가 대표값을 확인하므로, 이 파일은 그 사이의 경계값과
 * 아직 검증되지 않은 분기(formatSavedAt, fractionDigits, 반올림)를 다룬다.
 *
 * 금액 표기가 한 자리라도 어긋나면 사용자는 자산 규모를 잘못 읽는다.
 * 50~70대 사용자가 이 숫자를 근거로 연금 개시 시점을 정한다는 점을 전제한다.
 */

import { describe, expect, it } from 'vitest';

import {
  formatAge,
  formatMonthlyWon,
  formatPercent,
  formatSavedAt,
  formatSignedWon,
  formatSignedYears,
  formatSustainability,
  formatWon,
  formatWonCompact,
  formatYears,
} from '@/lib/format';

describe('formatWon - 자릿수 경계', () => {
  it('1억 바로 아래는 만원 단위로 끝까지 보여준다', () => {
    expect(formatWon(99_999_999)).toBe('9,999만 9,999원');
  });

  it('정확히 1억은 "1억원" 이다', () => {
    expect(formatWon(100_000_000)).toBe('1억원');
  });

  it('만원 경계', () => {
    expect(formatWon(9_999)).toBe('9,999원');
    expect(formatWon(10_000)).toBe('1만원');
    expect(formatWon(10_001)).toBe('1만 1원');
  });

  it('1원도 표시한다', () => {
    expect(formatWon(1)).toBe('1원');
  });

  it('10억 경계', () => {
    expect(formatWon(999_999_999)).toBe('9억 9,999만원');
    expect(formatWon(1_000_000_000)).toBe('10억원');
  });

  it('억 단위 음수도 부호를 붙인다', () => {
    expect(formatWon(-123_400_000)).toBe('-1억 2,340만원');
    expect(formatWon(-100_000_000)).toBe('-1억원');
  });

  it('소수점은 원 단위로 반올림한다', () => {
    expect(formatWon(0.5)).toBe('1원');
    expect(formatWon(0.4)).toBe('0원');
    expect(formatWon(1_234.6)).toBe('1,235원');
  });

  /**
   * 1억 이상에서 만원 미만 잔액이 버려진다.
   *
   * 1억 미만에서는 "9,999만 9,999원" 처럼 끝까지 보여주는데,
   * 1억을 넘으면 같은 9,999원이 사라진다. 구현의 주석은
   * "억 아래 자리는 만원 단위로 내림해서 보여준다" 로 이 동작을 의도한다고
   * 밝히고 있으므로 현재 동작을 고정한다. 판단은 리포트에 적는다.
   */
  it('1억 이상에서는 만원 미만 잔액을 버린다 (현재 동작을 고정한다)', () => {
    expect(formatWon(100_009_999)).toBe('1억원');
    expect(formatWon(100_000_001)).toBe('1억원');
    expect(formatWon(500_009_999)).toBe('5억원');

    // 1억 미만에서는 같은 잔액을 유지한다. 경계에서 표기 규칙이 바뀐다.
    expect(formatWon(99_999_999)).toBe('9,999만 9,999원');
  });
});

describe('formatWonCompact - 자릿수 경계', () => {
  it('만원 경계', () => {
    expect(formatWonCompact(9_999)).toBe('9,999');
    expect(formatWonCompact(10_000)).toBe('1만');
  });

  it('억 경계에서 소수점 한 자리를 쓴다', () => {
    expect(formatWonCompact(100_000_000)).toBe('1.0억');
    expect(formatWonCompact(150_000_000)).toBe('1.5억');
  });

  it('10억 이상은 소수점을 떼어낸다', () => {
    expect(formatWonCompact(1_000_000_000)).toBe('10억');
    expect(formatWonCompact(2_500_000_000)).toBe('25억');
  });

  it('음수도 부호를 붙인다', () => {
    expect(formatWonCompact(-500_000_000)).toBe('-5.0억');
    expect(formatWonCompact(-35_000_000)).toBe('-3,500만');
  });

  /**
   * 1억에 아주 가까운 값이 "10,000만" 으로 표시된다.
   *
   * 9,999.9999만원을 만원 단위로 반올림하면 10,000만이 되는데,
   * 사용자는 이것을 1억으로 읽는다. 바로 위 칸(1억)이 "1.0억" 으로
   * 표시되므로 그래프 축에 "9,999만 / 10,000만 / 1.0억" 이 나란히 놓인다.
   * 현재 동작을 고정하고 판단은 리포트에 적는다.
   */
  it('1억 직전 값이 "10,000만" 으로 표시된다 (현재 동작을 고정한다)', () => {
    expect(formatWonCompact(99_999_999)).toBe('10,000만');
    expect(formatWonCompact(99_995_000)).toBe('10,000만');

    // 조금만 낮으면 정상 표기다.
    expect(formatWonCompact(99_990_000)).toBe('9,999만');
    // 조금만 높으면 억 표기로 넘어간다.
    expect(formatWonCompact(100_000_000)).toBe('1.0억');
  });
});

describe('formatPercent', () => {
  it('기본 소수점은 한 자리다', () => {
    expect(formatPercent(0.0333)).toBe('3.3%');
  });

  it('fractionDigits 를 넘기면 그 자리수를 쓴다', () => {
    expect(formatPercent(0.0333, 2)).toBe('3.33%');
    expect(formatPercent(0.0333, 0)).toBe('3%');
  });

  it('정수로 떨어지면 소수점을 붙이지 않는다', () => {
    expect(formatPercent(0.1)).toBe('10%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('1% 미만도 표시한다', () => {
    expect(formatPercent(0.005)).toBe('0.5%');
  });

  it('음수 비율에 소수점이 있으면 함께 보여준다', () => {
    expect(formatPercent(-0.025)).toBe('-2.5%');
  });
});

describe('formatSavedAt', () => {
  it('ISO 문자열을 한국어 날짜로 바꾼다', () => {
    expect(formatSavedAt('2026-08-04T12:00:00.000Z')).toBe('2026년 8월 4일');
  });

  it('날짜가 아니면 빈 문자열이다 (Invalid Date 를 화면에 보여주지 않는다)', () => {
    expect(formatSavedAt('not-a-date')).toBe('');
    expect(formatSavedAt('')).toBe('');
  });

  it('예외를 던지지 않는다', () => {
    expect(() => formatSavedAt('아무 값')).not.toThrow();
  });
});

describe('formatSustainability - null 과 0 의 구분', () => {
  /**
   * "자산이 평생 유지된다" 를 "0년" 이나 빈 문자열로 보여주면
   * 가장 상태가 좋은 사용자에게 가장 불안한 화면을 보여주게 된다.
   * 이 구분이 회귀하지 않도록 고정한다.
   */
  it('고갈되지 않으면(null) 유지 문구를 쓴다', () => {
    const text = formatSustainability(null, 90);

    expect(text).toBe('90세 이후까지 유지');
    expect(text).toContain('유지');
    // "0년" 이나 빈 문자열로 새어나가면 안 된다.
    expect(text).not.toContain('0년');
    expect(text).not.toContain('소진');
    expect(text.length).toBeGreaterThan(0);
  });

  it('은퇴 첫해에 고갈되는 최악의 경우도 문구가 나온다', () => {
    const text = formatSustainability(65, 90);

    expect(text).toBe('65세에 소진 예상');
    expect(text).toContain('소진');
    expect(text).not.toContain('유지');
  });

  it('null 과 0 은 서로 다른 문구를 만든다', () => {
    // depletionAge 0 은 현실적인 값은 아니지만, null 과 섞이지 않아야 한다.
    expect(formatSustainability(null, 90)).not.toBe(formatSustainability(0, 90));
  });

  it('기대수명이 달라지면 문구의 나이도 달라진다', () => {
    expect(formatSustainability(null, 100)).toBe('100세 이후까지 유지');
  });
});

describe('formatSignedWon / formatSignedYears', () => {
  it('억 단위 증감에도 부호를 붙인다', () => {
    expect(formatSignedWon(100_000_000)).toBe('+1억원');
    expect(formatSignedWon(-100_000_000)).toBe('-1억원');
  });

  it('0은 "변화 없음" 이다 (+0원 으로 보여주지 않는다)', () => {
    expect(formatSignedWon(0)).toBe('변화 없음');
  });

  it('은퇴시점 증감 문구', () => {
    expect(formatSignedYears(5)).toBe('5년 늦춤');
    expect(formatSignedYears(-3)).toBe('3년 앞당김');
    expect(formatSignedYears(0)).toBe('현재 계획');
  });
});

describe('formatAge / formatYears / formatMonthlyWon', () => {
  it('나이를 반올림한다', () => {
    expect(formatAge(65)).toBe('65세');
    expect(formatAge(64.6)).toBe('65세');
  });

  it('0년과 0세도 표시한다 (빈 문자열이 아니다)', () => {
    expect(formatYears(0)).toBe('0년');
    expect(formatAge(0)).toBe('0세');
  });

  it('월 금액에 "월" 을 붙인다', () => {
    expect(formatMonthlyWon(3_000_000)).toBe('월 300만원');
    expect(formatMonthlyWon(0)).toBe('월 0원');
  });
});
