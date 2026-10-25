/**
 * 연도별 자산 변화 그래프.
 *
 * 차트 라이브러리를 쓰지 않고 SVG 로 직접 그린다.
 * 계산은 하지 않는다. simulate() 결과를 받아 좌표로만 바꾼다.
 *
 * 그래프만 두지 않고 숫자 설명을 함께 보여준다 (UX 지침).
 */

import { formatAge, formatWon, formatWonCompact } from '@/lib/format';
import type { YearlyProjection } from '@/domain/retirement/types';

/** 그래프 크기와 여백. viewBox 좌표 기준이다. */
const CHART = {
  width: 720,
  height: 320,
  padding: { top: 20, right: 24, bottom: 48, left: 72 },
  /** 세로축 눈금 개수. */
  yTicks: 4,
} as const;

const PLOT_WIDTH = CHART.width - CHART.padding.left - CHART.padding.right;
const PLOT_HEIGHT = CHART.height - CHART.padding.top - CHART.padding.bottom;

/**
 * 자산 변화를 선 그래프로 보여준다.
 *
 * 은퇴 시점과 고갈 시점을 세로선으로 표시한다.
 */
export function AssetChart({
  projections,
  retirementAge,
  depletionAge,
}: {
  projections: YearlyProjection[];
  retirementAge: number;
  depletionAge: number | null;
}) {
  if (projections.length === 0) {
    return null;
  }

  const firstAge = projections[0]?.age ?? 0;
  const lastAge = projections[projections.length - 1]?.age ?? firstAge;
  const ageSpan = Math.max(1, lastAge - firstAge);

  /** 화면에 보여주는 실제 최댓값. 자산이 내내 0원이면 0원이다. */
  const peakAssets = Math.max(0, ...projections.map((year) => year.endingAssets));
  /** 세로축 눈금 기준. 0 으로 나누지 않도록 따로 둔다. 화면 문구에 쓰지 않는다. */
  const scaleMax = peakAssets > 0 ? peakAssets : 1;

  /** 나이를 x 좌표로 바꾼다. */
  const toX = (age: number): number =>
    CHART.padding.left + ((age - firstAge) / ageSpan) * PLOT_WIDTH;

  /** 자산을 y 좌표로 바꾼다. 위로 갈수록 금액이 크다. */
  const toY = (assets: number): number =>
    CHART.padding.top + PLOT_HEIGHT - (assets / scaleMax) * PLOT_HEIGHT;

  const linePoints = projections
    .map((year) => `${toX(year.age).toFixed(1)},${toY(year.endingAssets).toFixed(1)}`)
    .join(' ');

  // 선 아래를 옅게 채워 잔액이 줄어드는 느낌을 준다.
  const areaPoints = [
    `${toX(firstAge).toFixed(1)},${(CHART.padding.top + PLOT_HEIGHT).toFixed(1)}`,
    linePoints,
    `${toX(lastAge).toFixed(1)},${(CHART.padding.top + PLOT_HEIGHT).toFixed(1)}`,
  ].join(' ');

  // 자산이 내내 0원이면 "0원" 눈금 하나만 둔다. 나누면 1원 미만 눈금이 생긴다.
  const yTickValues =
    peakAssets > 0
      ? Array.from({ length: CHART.yTicks + 1 }, (_, index) => (peakAssets / CHART.yTicks) * index)
      : [0];

  // 가로축 눈금은 첫 나이, 은퇴, 고갈, 마지막 나이를 우선해서 보여준다.
  const xTickAges = Array.from(
    new Set(
      [firstAge, retirementAge, depletionAge, lastAge].filter(
        (age): age is number => age !== null && age >= firstAge && age <= lastAge,
      ),
    ),
  ).sort((a, b) => a - b);

  const baselineY = CHART.padding.top + PLOT_HEIGHT;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${formatAge(firstAge)}부터 ${formatAge(
          lastAge,
        )}까지의 자산 변화 그래프. 가장 많을 때 ${formatWon(peakAssets)}.`}
      >
        {/* 가로 눈금선과 금액 표시 */}
        {yTickValues.map((value) => {
          const y = toY(value);
          return (
            <g key={value}>
              <line
                x1={CHART.padding.left}
                y1={y}
                x2={CHART.padding.left + PLOT_WIDTH}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={CHART.padding.left - 10}
                y={y + 5}
                textAnchor="end"
                className="fill-slate-500"
                fontSize={14}
              >
                {formatWonCompact(value)}
              </text>
            </g>
          );
        })}

        {/* 자산 곡선 */}
        <polygon points={areaPoints} fill="#dbeafe" opacity={0.7} />
        <polyline
          points={linePoints}
          fill="none"
          stroke="#1d4ed8"
          strokeWidth={3}
          strokeLinejoin="round"
        />

        {/* 은퇴 시점 */}
        {retirementAge >= firstAge && retirementAge <= lastAge ? (
          <g>
            <line
              x1={toX(retirementAge)}
              y1={CHART.padding.top}
              x2={toX(retirementAge)}
              y2={baselineY}
              stroke="#15803d"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <text
              x={toX(retirementAge)}
              y={CHART.padding.top - 6}
              textAnchor="middle"
              className="fill-good-700 font-bold"
              fontSize={14}
            >
              은퇴
            </text>
          </g>
        ) : null}

        {/* 고갈 시점 */}
        {depletionAge !== null && depletionAge >= firstAge && depletionAge <= lastAge ? (
          <g>
            <line
              x1={toX(depletionAge)}
              y1={CHART.padding.top}
              x2={toX(depletionAge)}
              y2={baselineY}
              stroke="#b91c1c"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <text
              x={toX(depletionAge)}
              y={CHART.padding.top - 6}
              textAnchor="middle"
              className="fill-caution-700 font-bold"
              fontSize={14}
            >
              자산 소진
            </text>
          </g>
        ) : null}

        {/* 가로축 */}
        <line
          x1={CHART.padding.left}
          y1={baselineY}
          x2={CHART.padding.left + PLOT_WIDTH}
          y2={baselineY}
          stroke="#94a3b8"
          strokeWidth={2}
        />
        {xTickAges.map((age) => (
          <text
            key={age}
            x={toX(age)}
            y={baselineY + 26}
            textAnchor="middle"
            className="fill-slate-600"
            fontSize={15}
          >
            {formatAge(age)}
          </text>
        ))}
      </svg>

      {/* 그래프를 읽기 어려운 경우를 위해 숫자로도 설명한다. */}
      <figcaption className="mt-4 space-y-1 text-base text-slate-700">
        <p>
          가로축은 나이, 세로축은 남은 금융자산입니다. 가장 많을 때{' '}
          <strong className="text-slate-900">{formatWon(peakAssets)}</strong> 입니다.
        </p>
        {depletionAge === null ? (
          <p>
            {formatAge(lastAge)}까지 자산이 남습니다. 마지막에{' '}
            <strong className="text-good-700">
              {formatWon(projections[projections.length - 1]?.endingAssets ?? 0)}
            </strong>{' '}
            남을 것으로 계산됩니다.
          </p>
        ) : (
          <p>
            <strong className="text-caution-700">{formatAge(depletionAge)}</strong> 에
            금융자산이 모두 소진될 것으로 계산됩니다. 이후에는 연금 수입만으로 생활하게
            됩니다.
          </p>
        )}
      </figcaption>
    </figure>
  );
}
