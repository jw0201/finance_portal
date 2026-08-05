/**
 * 저장·불러오기 테스트.
 *
 * 확인하려는 것은 두 가지다.
 *   1. 저장한 값이 그대로 돌아오는가 (금액이 조금이라도 달라지면 안 된다).
 *   2. 저장된 데이터가 깨졌을 때 예외를 던지거나
 *      "그럴듯하지만 틀린" 계획을 만들어내지 않는가.
 *
 * 두 번째가 더 중요하다. 깨진 데이터로 만든 계획은 사용자가 근거로 삼는 숫자를
 * 조용히 바꿔놓는다.
 *
 * node 환경이므로 localStorage 를 직접 만들어 넣는다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RetirementInput } from '@/domain/retirement/types';
import {
  clearPlans,
  deletePlan,
  listPlans,
  loadPlan,
  savePlan,
} from '@/services/retirementStorage';

const STORAGE_KEY = 'retirement-plans';

/** localStorage 를 대신하는 최소 구현. */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  /**
   * setItem 이 던질 예외. 저장 실패 경로를 시험할 때 넣는다.
   *
   * getStorage() 가 probe 키로 시험 삼아 써보므로, probe 는 통과시키고
   * 실제 저장만 실패시켜야 한다. 그러지 않으면 unavailable 로 빠져
   * quota/failed 구분에 닿지 못한다.
   */
  throwOnSet: Error | null = null;

  /** 이 키로 시작하는 쓰기는 예외를 던지지 않는다. */
  private static readonly PROBE_PREFIX = '__retirement_probe__';

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.throwOnSet && !key.startsWith(MemoryStorage.PROBE_PREFIX)) {
      throw this.throwOnSet;
    }
    this.data.set(key, value);
  }
}

let storage: MemoryStorage;

const INPUT: RetirementInput = {
  currentAge: 57,
  retirementAge: 63,
  lifeExpectancy: 92,
  financialAssets: 487_650_000,
  nationalPensionMonthly: 1_180_000,
  nationalPensionStartAge: 65,
  privatePensionMonthly: 355_000,
  privatePensionStartAge: 60,
  otherIncomeMonthly: 700_000,
  otherIncomeEndAge: 68,
  monthlyLivingCost: 2_950_000,
  inflationRate: 0.023,
  investmentReturnRate: 0.034,
  includeHealthcareCost: true,
  healthcareMonthlyCost: 320_000,
};

beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis as Record<string, unknown>, 'window');
});

/** 저장된 raw 문자열을 직접 넣는다. 깨진 데이터를 만들 때 쓴다. */
function seedRaw(raw: string): void {
  storage.setItem(STORAGE_KEY, raw);
}

describe('savePlan / loadPlan - 왕복', () => {
  it('저장한 입력값이 하나도 달라지지 않고 돌아온다', () => {
    const saved = savePlan('내 계획', INPUT);

    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }

    const loaded = loadPlan(saved.plan.id);
    expect(loaded).not.toBeNull();
    // 금액·비율이 한 자리도 달라지면 안 된다.
    expect(loaded?.input).toEqual(INPUT);
    expect(loaded?.name).toBe('내 계획');
    expect(loaded?.id).toBe(saved.plan.id);
  });

  it('저장 시각이 ISO 8601 문자열이다', () => {
    const saved = savePlan('계획', INPUT);
    if (!saved.ok) {
      throw new Error('저장에 실패했습니다.');
    }

    expect(saved.plan.savedAt).toBe(new Date(saved.plan.savedAt).toISOString());
  });

  it('이름이 비어 있으면 날짜로 이름을 만든다', () => {
    const saved = savePlan('   ', INPUT);
    if (!saved.ok) {
      throw new Error('저장에 실패했습니다.');
    }

    expect(saved.plan.name.length).toBeGreaterThan(0);
    expect(saved.plan.name).toContain('계획');
  });

  it('이름의 앞뒤 공백을 지운다', () => {
    const saved = savePlan('  은퇴 계획 A  ', INPUT);
    if (!saved.ok) {
      throw new Error('저장에 실패했습니다.');
    }

    expect(saved.plan.name).toBe('은퇴 계획 A');
  });

  it('여러 건을 저장하면 최근 것이 앞에 온다', () => {
    const first = savePlan('첫번째', INPUT);
    const second = savePlan('두번째', { ...INPUT, financialAssets: 100_000_000 });

    expect(first.ok && second.ok).toBe(true);

    const plans = listPlans();
    expect(plans).toHaveLength(2);
    expect(plans[0]?.name).toBe('두번째');
    expect(plans[1]?.name).toBe('첫번째');
  });

  it('각 계획이 서로 다른 id 를 갖는다', () => {
    savePlan('A', INPUT);
    savePlan('B', INPUT);
    savePlan('C', INPUT);

    const ids = listPlans().map((plan) => plan.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('여러 계획을 저장해도 각각의 입력값이 섞이지 않는다', () => {
    const a: RetirementInput = { ...INPUT, financialAssets: 100_000_000 };
    const b: RetirementInput = { ...INPUT, financialAssets: 900_000_000 };

    const savedA = savePlan('A', a);
    const savedB = savePlan('B', b);
    if (!savedA.ok || !savedB.ok) {
      throw new Error('저장에 실패했습니다.');
    }

    expect(loadPlan(savedA.plan.id)?.input.financialAssets).toBe(100_000_000);
    expect(loadPlan(savedB.plan.id)?.input.financialAssets).toBe(900_000_000);
  });

  it('없는 id 를 불러오면 null 이다 (빈 계획을 만들어내지 않는다)', () => {
    savePlan('계획', INPUT);

    expect(loadPlan('존재하지-않는-id')).toBeNull();
  });

  it('상한(20건)을 넘으면 오래된 것부터 밀려난다', () => {
    for (let i = 0; i < 25; i += 1) {
      savePlan(`계획 ${i}`, INPUT);
    }

    const plans = listPlans();
    expect(plans).toHaveLength(20);
    // 가장 최근이 앞. 가장 오래된 '계획 0' 은 밀려났다.
    expect(plans[0]?.name).toBe('계획 24');
    expect(plans.find((plan) => plan.name === '계획 0')).toBeUndefined();
  });
});

describe('listPlans - 저장된 값이 없을 때', () => {
  it('아무것도 저장하지 않았으면 빈 배열이다', () => {
    expect(listPlans()).toEqual([]);
  });

  it('window 가 없으면(서버 렌더링) 빈 배열이고 예외를 던지지 않는다', () => {
    Reflect.deleteProperty(globalThis as Record<string, unknown>, 'window');

    expect(() => listPlans()).not.toThrow();
    expect(listPlans()).toEqual([]);
    expect(loadPlan('아무거나')).toBeNull();
  });

  it('window 가 없으면 저장은 unavailable 을 돌려준다', () => {
    Reflect.deleteProperty(globalThis as Record<string, unknown>, 'window');

    const result = savePlan('계획', INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unavailable');
    }
  });
});

describe('listPlans - 깨진 데이터 (가장 중요한 경로)', () => {
  it('JSON 이 아니면 예외를 던지지 않고 빈 배열이다', () => {
    seedRaw('{이건 JSON 이 아니다');

    expect(() => listPlans()).not.toThrow();
    expect(listPlans()).toEqual([]);
  });

  it('빈 문자열이면 빈 배열이다', () => {
    seedRaw('');

    expect(listPlans()).toEqual([]);
  });

  it('배열이 아닌 JSON 이면 빈 배열이다', () => {
    for (const raw of ['null', '123', '"문자열"', 'true', '{"plans":[]}']) {
      seedRaw(raw);
      expect(() => listPlans()).not.toThrow();
      expect(listPlans()).toEqual([]);
    }
  });

  it('모양이 어긋난 항목은 걸러낸다', () => {
    seedRaw(
      JSON.stringify([
        // id 가 없다.
        { name: '이름만', savedAt: '2026-01-01T00:00:00.000Z', input: INPUT },
        // input 이 객체가 아니다.
        { id: 'a', name: 'A', savedAt: '2026-01-01T00:00:00.000Z', input: 'nope' },
        // input 이 null 이다.
        { id: 'b', name: 'B', savedAt: '2026-01-01T00:00:00.000Z', input: null },
        // 숫자 id.
        { id: 1, name: 'C', savedAt: '2026-01-01T00:00:00.000Z', input: INPUT },
        // 원시값.
        'string',
        42,
        null,
      ]),
    );

    expect(() => listPlans()).not.toThrow();
    expect(listPlans()).toEqual([]);
  });

  it('정상 항목과 깨진 항목이 섞여 있으면 정상 항목만 남긴다', () => {
    const good = {
      id: 'good-1',
      name: '정상 계획',
      savedAt: '2026-01-01T00:00:00.000Z',
      input: INPUT,
    };
    seedRaw(JSON.stringify([{ id: 'broken' }, good, null]));

    const plans = listPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe('good-1');
    expect(plans[0]?.input).toEqual(INPUT);
  });

  it('깨진 항목의 id 로는 계획을 불러올 수 없다', () => {
    seedRaw(
      JSON.stringify([
        { id: 'broken', name: 'B', savedAt: '2026-01-01T00:00:00.000Z', input: null },
      ]),
    );

    expect(loadPlan('broken')).toBeNull();
  });

  /**
   * 이 테스트가 확인하는 것을 분명히 해둔다.
   *
   * isSavedPlan 은 input 이 "객체인지" 만 본다. 안쪽 필드는 확인하지 않는다.
   * 따라서 input 의 숫자 필드가 문자열이거나 아예 없어도 계획으로 통과한다.
   * 이 경우 시뮬레이션에 NaN 이 흘러들어갈 수 있다.
   */
  it('input 안쪽 필드는 검증하지 않는다 (현재 동작을 고정한다)', () => {
    seedRaw(
      JSON.stringify([
        {
          id: 'partial',
          name: '일부만 있는 계획',
          savedAt: '2026-01-01T00:00:00.000Z',
          // currentAge 가 문자열이고 나머지 필드는 대부분 없다.
          input: { currentAge: '쉰일곱' },
        },
      ]),
    );

    const loaded = loadPlan('partial');
    // 통과해버린다. 화면에서 쓰기 전에 validateRetirementInput 을 반드시 거쳐야 한다.
    expect(loaded).not.toBeNull();
    expect(loaded?.input.currentAge).toBe('쉰일곱' as unknown as number);
    expect(loaded?.input.financialAssets).toBeUndefined();
  });
});

describe('savePlan - 저장 실패', () => {
  it('저장 공간이 부족하면 quota 를 돌려준다', () => {
    storage.throwOnSet = new DOMException('full', 'QuotaExceededError');

    const result = savePlan('계획', INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('quota');
    }
  });

  it('그 밖의 오류는 failed 를 돌려준다', () => {
    storage.throwOnSet = new Error('알 수 없는 오류');

    const result = savePlan('계획', INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('failed');
    }
  });

  it('저장에 실패해도 예외를 던지지 않는다', () => {
    storage.throwOnSet = new Error('실패');

    expect(() => savePlan('계획', INPUT)).not.toThrow();
  });
});

describe('deletePlan / clearPlans', () => {
  it('id 로 계획을 지우고 나머지는 남긴다', () => {
    const a = savePlan('A', INPUT);
    const b = savePlan('B', INPUT);
    if (!a.ok || !b.ok) {
      throw new Error('저장에 실패했습니다.');
    }

    expect(deletePlan(a.plan.id)).toBe(true);

    const plans = listPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe(b.plan.id);
    expect(loadPlan(a.plan.id)).toBeNull();
  });

  it('없는 id 를 지워도 예외가 없고 나머지가 그대로다', () => {
    savePlan('A', INPUT);

    expect(() => deletePlan('없는-id')).not.toThrow();
    expect(listPlans()).toHaveLength(1);
  });

  it('전체를 지우면 빈 목록이 된다', () => {
    savePlan('A', INPUT);
    savePlan('B', INPUT);

    expect(clearPlans()).toBe(true);
    expect(listPlans()).toEqual([]);
  });

  it('삭제 후에도 남은 계획의 입력값이 그대로다', () => {
    const a = savePlan('A', { ...INPUT, financialAssets: 111_000_000 });
    const b = savePlan('B', { ...INPUT, financialAssets: 222_000_000 });
    if (!a.ok || !b.ok) {
      throw new Error('저장에 실패했습니다.');
    }

    deletePlan(a.plan.id);

    expect(loadPlan(b.plan.id)?.input.financialAssets).toBe(222_000_000);
  });
});

describe('민감정보 취급 - 로그를 남기지 않는다', () => {
  /**
   * CLAUDE.md: "민감한 금융정보를 로그에 기록하지 않는다."
   *
   * catch 블록의 console.error(plan) 하나로 자산 총액과 연금액이
   * 브라우저 콘솔에 남는다. 정적 grep 은 미래의 회귀를 못 잡으므로
   * 실제로 호출되는지 감시한다.
   */
  const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const;

  /** 모든 console 메서드를 감시하고, 호출 여부를 확인하는 함수를 돌려준다. */
  function spyOnConsole(): () => void {
    const spies = CONSOLE_METHODS.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );

    return () => {
      for (const spy of spies) {
        expect(spy).not.toHaveBeenCalled();
      }
      for (const spy of spies) {
        spy.mockRestore();
      }
    };
  }

  it('저장·불러오기 성공 경로에서 아무것도 기록하지 않는다', () => {
    const expectSilent = spyOnConsole();

    const saved = savePlan('계획', INPUT);
    if (saved.ok) {
      loadPlan(saved.plan.id);
    }
    listPlans();

    expectSilent();
  });

  it('깨진 JSON 을 읽을 때 아무것도 기록하지 않는다', () => {
    seedRaw('{깨진 데이터');
    const expectSilent = spyOnConsole();

    listPlans();
    loadPlan('아무거나');

    expectSilent();
  });

  it('모양이 어긋난 항목을 걸러낼 때 아무것도 기록하지 않는다', () => {
    seedRaw(
      JSON.stringify([
        { id: 'broken', name: 'B', savedAt: '2026-01-01T00:00:00.000Z', input: null },
      ]),
    );
    const expectSilent = spyOnConsole();

    listPlans();

    expectSilent();
  });

  it('저장 공간 부족으로 실패할 때 아무것도 기록하지 않는다', () => {
    storage.throwOnSet = new DOMException('full', 'QuotaExceededError');
    const expectSilent = spyOnConsole();

    savePlan('계획', INPUT);

    expectSilent();
  });

  it('알 수 없는 오류로 저장에 실패할 때 아무것도 기록하지 않는다', () => {
    storage.throwOnSet = new Error('알 수 없는 오류');
    const expectSilent = spyOnConsole();

    savePlan('계획', INPUT);

    expectSilent();
  });

  it('localStorage 를 쓸 수 없을 때 아무것도 기록하지 않는다', () => {
    Reflect.deleteProperty(globalThis as Record<string, unknown>, 'window');
    const expectSilent = spyOnConsole();

    savePlan('계획', INPUT);
    listPlans();

    expectSilent();
  });

  it('삭제·전체삭제에서 아무것도 기록하지 않는다', () => {
    const saved = savePlan('계획', INPUT);
    const expectSilent = spyOnConsole();

    if (saved.ok) {
      deletePlan(saved.plan.id);
    }
    clearPlans();

    expectSilent();
  });
});

describe('민감정보 취급 - 저장 위치', () => {
  it('저장 키 하나만 사용한다 (금액이 별도 키로 흩어지지 않는다)', () => {
    savePlan('계획', INPUT);

    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key !== null) {
        keys.push(key);
      }
    }

    expect(keys).toEqual([STORAGE_KEY]);
  });
});
