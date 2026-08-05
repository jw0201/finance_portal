/**
 * 법령 수치가 확인되지 **않은** 항목의 동작을 고정한다.
 *
 * CLAUDE.md 법령 수치 규칙:
 *   하나라도 null 이면 계산기는 결과를 내지 않고 `status: 'unavailable'` 을 반환한다.
 *   이 동작을 우회하거나 기본값으로 대체하지 않는다.
 *
 * 여기 있는 테스트는 "숫자를 만들어내지 않는다" 는 것을 증명한다.
 * 값이 채워진 뒤의 계산 정확성은 `estimator.resolved.test.ts` 가 다룬다.
 */

import { describe, expect, it } from 'vitest';

import {
  estimateNationalPensionTax,
  estimateRegionalPremiumWithProperty,
  estimateStandardTaxCredit,
} from './estimator';
import {
  LOCAL_INCOME_TAX_FILING_BRACKETS,
  NATIONAL_PENSION_TAXABLE_BASE,
  PENSION_INCOME_RECOGNITION_RATE,
  PROPERTY_POINT_TABLE,
  STANDARD_TAX_CREDIT,
  TAX_EXEMPT_PENSION_TYPES,
} from './statutory';

/**
 * 확인 전에 반드시 pending 으로 남아야 하는 항목들.
 *
 * 이 목록은 `docs/statutory-research.md` 의 "반드시 pending() 으로 남겨야 하는 항목"
 * 과 일치해야 한다. 누군가 짐작한 값으로 채우면 이 테스트가 깨진다.
 */
const MUST_STAY_PENDING = [
  ['지역가입자 재산 부과점수표', PROPERTY_POINT_TABLE],
  ['연금소득 반영 비율', PENSION_INCOME_RECOGNITION_RATE],
  ['국민연금 과세기준금액', NATIONAL_PENSION_TAXABLE_BASE],
  ['지방소득세 종합소득 표준세율표', LOCAL_INCOME_TAX_FILING_BRACKETS],
  ['표준세액공제', STANDARD_TAX_CREDIT],
  ['비과세 연금소득 열거', TAX_EXEMPT_PENSION_TYPES],
] as const;

describe('확인되지 않은 법령 수치는 pending 으로 남아 있다', () => {
  for (const [label, entry] of MUST_STAY_PENDING) {
    it(`${label} 은 pending 이다`, () => {
      expect(entry.status).toBe('pending');
    });

    it(`${label} 은 value 필드를 갖지 않는다 (?? 0 우회를 막는다)`, () => {
      // 타입 수준에서도 막혀 있지만, 런타임 형태도 함께 고정한다.
      expect('value' in entry).toBe(false);
    });

    it(`${label} 은 출처와 이유를 함께 남긴다`, () => {
      if (entry.status !== 'pending') {
        throw new Error('pending 이어야 한다');
      }
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.source.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(0);
    });
  }
});

describe('재산보험료 — 점수표가 없으면 계산하지 않는다', () => {
  it('status 가 unavailable 이다', () => {
    const result = estimateRegionalPremiumWithProperty();
    expect(result.status).toBe('unavailable');
  });

  it('금액을 만들어내지 않는다', () => {
    const result = estimateRegionalPremiumWithProperty();
    // unavailable 결과에는 value 자체가 없다.
    expect('value' in result).toBe(false);
  });

  it('무엇이 없어서 계산할 수 없는지 알려준다', () => {
    const result = estimateRegionalPremiumWithProperty();
    if (result.status !== 'unavailable') {
      throw new Error('unavailable 이어야 한다');
    }

    expect(result.missing.length).toBeGreaterThan(0);
    const labels = result.missing.map((item) => item.label);
    expect(labels.some((label) => label.includes('재산 부과점수표'))).toBe(true);
  });

  it('부족한 항목마다 출처와 이유를 담는다', () => {
    const result = estimateRegionalPremiumWithProperty();
    if (result.status !== 'unavailable') {
      throw new Error('unavailable 이어야 한다');
    }

    for (const item of result.missing) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.source.length).toBeGreaterThan(0);
      expect(item.reason.length).toBeGreaterThan(0);
    }
  });

  it('공식 계산기 링크를 안내한다 (사용자가 다음에 할 일)', () => {
    const result = estimateRegionalPremiumWithProperty();
    if (result.status !== 'unavailable') {
      throw new Error('unavailable 이어야 한다');
    }

    const withCalculator = result.missing.filter(
      (item) => item.officialCalculator !== null,
    );
    expect(withCalculator.length).toBeGreaterThan(0);
  });

  it('0원으로 대체하지 않는다 (재산보험료를 0 으로 두면 실제보다 적게 나온다)', () => {
    const result = estimateRegionalPremiumWithProperty();
    // 어떤 경로로도 숫자 0 이 결과로 나오지 않는다.
    expect(JSON.stringify(result)).not.toMatch(/"value"\s*:\s*0/);
  });
});

describe('국민연금 세금 — 과세기준금액이 없으면 계산하지 않는다', () => {
  it('전액 과세로 가정하지 않고 unavailable 을 반환한다', () => {
    const result = estimateNationalPensionTax(24_000_000);
    expect(result.status).toBe('unavailable');
  });

  it('과세기준금액이 부족 항목으로 보고된다', () => {
    const result = estimateNationalPensionTax(24_000_000);
    if (result.status !== 'unavailable') {
      throw new Error('unavailable 이어야 한다');
    }
    const labels = result.missing.map((item) => item.label);
    expect(labels.some((label) => label.includes('과세기준금액'))).toBe(true);
  });

  it('수령액이 얼마든 계산되지 않는다', () => {
    for (const amount of [0, 12_000_000, 100_000_000]) {
      expect(estimateNationalPensionTax(amount).status).toBe('unavailable');
    }
  });
});

describe('표준세액공제 — 확인 전에는 계산하지 않는다', () => {
  it('unavailable 을 반환한다', () => {
    expect(estimateStandardTaxCredit().status).toBe('unavailable');
  });
});
