/**
 * 표시용 포맷 테스트.
 *
 * 금액 표기는 사용자가 금액을 잘못 읽으면 곧바로 오해로 이어지므로
 * 자리수 경계를 확인한다.
 */

import { describe, expect, it } from 'vitest';
import {
  formatAge,
  formatMonthlyWon,
  formatPercent,
  formatSignedWon,
  formatSignedYears,
  formatSustainability,
  formatWon,
  formatWonCompact,
  formatYears,
} from './format';

describe('formatWon', () => {
  it('억 단위와 만원 단위를 함께 보여준다', () => {
    expect(formatWon(123_400_000)).toBe('1억 2,340만원');
  });

  it('억 아래가 딱 떨어지면 억만 보여준다', () => {
    expect(formatWon(500_000_000)).toBe('5억원');
    expect(formatWon(100_000_000)).toBe('1억원');
  });

  it('억 미만은 만원 단위로 보여준다', () => {
    expect(formatWon(45_000_000)).toBe('4,500만원');
    expect(formatWon(10_000)).toBe('1만원');
  });

  it('만원 미만은 원 단위로 보여준다', () => {
    expect(formatWon(8_000)).toBe('8,000원');
  });

  it('만원 단위에 나머지가 있으면 함께 보여준다', () => {
    expect(formatWon(12_345)).toBe('1만 2,345원');
  });

  it('0원을 표시한다', () => {
    expect(formatWon(0)).toBe('0원');
  });

  it('음수는 부호를 붙인다', () => {
    expect(formatWon(-500_000)).toBe('-50만원');
  });

  it('10억 이상도 정확히 표시한다', () => {
    expect(formatWon(2_000_000_000)).toBe('20억원');
    expect(formatWon(1_234_500_000)).toBe('12억 3,450만원');
  });
});

describe('formatWonCompact', () => {
  it('억 단위는 소수점 한 자리로 줄인다', () => {
    expect(formatWonCompact(500_000_000)).toBe('5.0억');
  });

  it('10억 이상은 소수점을 떼어 자릿수를 줄인다', () => {
    expect(formatWonCompact(2_000_000_000)).toBe('20억');
  });

  it('억 미만은 만 단위로 보여준다', () => {
    expect(formatWonCompact(35_000_000)).toBe('3,500만');
  });

  it('0을 표시한다', () => {
    expect(formatWonCompact(0)).toBe('0');
  });
});

describe('formatPercent', () => {
  it('정수 퍼센트는 소수점을 붙이지 않는다', () => {
    expect(formatPercent(0.03)).toBe('3%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('소수 퍼센트는 소수점을 보여준다', () => {
    expect(formatPercent(0.025)).toBe('2.5%');
  });

  it('음수 비율도 표시한다', () => {
    expect(formatPercent(-0.01)).toBe('-1%');
  });
});

describe('formatSustainability', () => {
  it('고갈되지 않으면 기대수명 이후까지 유지된다고 알려준다', () => {
    expect(formatSustainability(null, 90)).toBe('90세 이후까지 유지');
  });

  it('고갈되면 그 나이를 알려준다', () => {
    expect(formatSustainability(82, 90)).toBe('82세에 소진 예상');
  });
});

describe('기타 포맷', () => {
  it('나이와 기간을 표시한다', () => {
    expect(formatAge(65)).toBe('65세');
    expect(formatYears(25)).toBe('25년');
  });

  it('월 금액을 표시한다', () => {
    expect(formatMonthlyWon(3_000_000)).toBe('월 300만원');
  });

  it('증감에 부호를 붙인다', () => {
    expect(formatSignedWon(300_000)).toBe('+30만원');
    expect(formatSignedWon(-500_000)).toBe('-50만원');
    expect(formatSignedWon(0)).toBe('변화 없음');
  });

  it('은퇴시점 증감을 문구로 표시한다', () => {
    expect(formatSignedYears(3)).toBe('3년 늦춤');
    expect(formatSignedYears(-1)).toBe('1년 앞당김');
    expect(formatSignedYears(0)).toBe('현재 계획');
  });
});
