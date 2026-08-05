/**
 * 은퇴 계획 저장.
 *
 * localStorage 에만 저장한다. 서버로 전송하지 않는다.
 * 저장 실패 시에도 금융정보(금액·연금액 등)를 로그에 남기지 않는다.
 *
 * 이 방침을 바꾸는 것은 회원 기능·DB 도입과 함께 결정할 사안이다.
 */

import type { RetirementInput, SavedPlan } from '@/domain/retirement/types';

const STORAGE_KEY = 'retirement-plans';

/** 저장 가능한 계획 개수 상한. 오래된 것부터 밀려난다. */
const MAX_PLANS = 20;

/** 저장 결과. 실패 사유는 화면에 보여줄 수 있는 수준으로만 구분한다. */
export type StorageResult =
  | { ok: true; plan: SavedPlan }
  | { ok: false; reason: 'unavailable' | 'quota' | 'failed' };

/**
 * localStorage 를 쓸 수 있는지 확인한다.
 *
 * 서버 렌더링 중이거나 브라우저가 저장을 막아둔 경우를 걸러낸다.
 */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    // 접근 자체가 예외를 던지는 환경(쿠키 차단 등)이 있어 시험 삼아 써본다.
    const probeKey = '__retirement_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 저장된 값이 우리가 기대하는 모양인지 확인한다. */
function isSavedPlan(value: unknown): value is SavedPlan {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<SavedPlan>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.savedAt === 'string' &&
    typeof candidate.input === 'object' &&
    candidate.input !== null
  );
}

/**
 * 저장된 계획을 모두 불러온다. 최근 저장한 것이 앞에 온다.
 *
 * 읽기에 실패하거나 형식이 깨졌으면 빈 배열을 돌려준다.
 * 실패 내용에 금융정보가 섞일 수 있으므로 로그를 남기지 않는다.
 */
export function listPlans(): SavedPlan[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSavedPlan);
  } catch {
    return [];
  }
}

/** 계획 목록을 저장한다. 성공했는지 돌려준다. */
function writePlans(plans: SavedPlan[]): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return true;
  } catch {
    return false;
  }
}

/** 브라우저가 저장 공간 부족을 알리는 예외인지 확인한다. */
function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

/** 충돌하지 않는 id 를 만든다. */
function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // randomUUID 를 쓸 수 없는 환경을 위한 대비책.
  return `plan-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * 계획을 새로 저장한다.
 *
 * 이름이 비어 있으면 저장 날짜로 이름을 만든다.
 */
export function savePlan(name: string, input: RetirementInput): StorageResult {
  const storage = getStorage();
  if (!storage) {
    return { ok: false, reason: 'unavailable' };
  }

  const now = new Date();
  const trimmed = name.trim();
  const plan: SavedPlan = {
    id: createId(),
    name: trimmed.length > 0 ? trimmed : `${now.toLocaleDateString('ko-KR')} 계획`,
    savedAt: now.toISOString(),
    input,
  };

  // 최근 저장한 것이 앞에 오고, 상한을 넘으면 오래된 것을 버린다.
  const plans = [plan, ...listPlans()].slice(0, MAX_PLANS);

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return { ok: true, plan };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'failed' };
  }
}

/** id 로 계획 하나를 불러온다. 없으면 null. */
export function loadPlan(id: string): SavedPlan | null {
  return listPlans().find((plan) => plan.id === id) ?? null;
}

/** id 로 계획을 삭제한다. 삭제에 성공했는지 돌려준다. */
export function deletePlan(id: string): boolean {
  const remaining = listPlans().filter((plan) => plan.id !== id);
  return writePlans(remaining);
}

/** 저장된 계획을 모두 지운다. */
export function clearPlans(): boolean {
  return writePlans([]);
}
