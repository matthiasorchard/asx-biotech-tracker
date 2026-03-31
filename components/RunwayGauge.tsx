// Semicircle arc gauge showing cash runway in quarters.
// Pure SVG — no client state needed.

const CX = 100, CY = 98, R = 70, SW = 9
const MAX_Q = 8

function gaugePoint(p: number) {
  // p: 0 = left (0Q), 1 = right (MAX_Q). Arc goes CCW through top.
  return {
    x: CX - R * Math.cos(p * Math.PI),
    y: CY - R * Math.sin(p * Math.PI),
  }
}

function arcD(p1: number, p2: number) {
  const s = gaugePoint(p1)
  const e = gaugePoint(p2)
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

export default function RunwayGauge({
  months,
  isCfPositive,
}: {
  months: number | null
  isCfPositive: boolean | null
}) {
  if (isCfPositive) {
    return (
      <div className="flex flex-col items-center justify-center w-36 h-20 text-emerald-400">
        <span className="text-2xl font-bold font-mono">CF+</span>
        <span className="text-xs text-slate-600 mt-0.5">cash flow positive</span>
      </div>
    )
  }

  if (months === null || months <= 0) {
    return (
      <div className="flex flex-col items-center justify-center w-36 h-20">
        <span className="text-sm text-slate-600">No runway data</span>
      </div>
    )
  }

  const quarters = months / 3
  const p = Math.min(1, quarters / MAX_Q)

  const needle = {
    x: CX - (R - 16) * Math.cos(p * Math.PI),
    y: CY - (R - 16) * Math.sin(p * Math.PI),
  }

  const needleColor =
    quarters < 2 ? '#fb7185' : quarters < 4 ? '#fbbf24' : '#34d399'

  const valueColor =
    quarters < 2 ? 'text-rose-400' : quarters < 4 ? 'text-amber-400' : 'text-emerald-400'

  const displayQ = quarters >= MAX_Q ? `${MAX_Q}Q+` : `${quarters.toFixed(1)}Q`

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg viewBox="0 0 200 125" className="w-40">
        {/* Background track */}
        <path d={arcD(0, 1)} fill="none" stroke="#1e293b" strokeWidth={SW} strokeLinecap="round" />

        {/* Red zone: 0–2Q */}
        <path d={arcD(0, 2 / MAX_Q)} fill="none" stroke="#e11d48" strokeWidth={SW}
          strokeLinecap="butt" opacity={0.45} />
        {/* Amber zone: 2–4Q */}
        <path d={arcD(2 / MAX_Q, 4 / MAX_Q)} fill="none" stroke="#d97706" strokeWidth={SW}
          strokeLinecap="butt" opacity={0.45} />
        {/* Green zone: 4–8Q */}
        <path d={arcD(4 / MAX_Q, 1)} fill="none" stroke="#059669" strokeWidth={SW}
          strokeLinecap="butt" opacity={0.45} />

        {/* Zone labels */}
        <text x={18}  y={113} textAnchor="middle" fontSize={7} fill="#475569">0</text>
        <text x={100} y={19}  textAnchor="middle" fontSize={7} fill="#475569">4Q</text>
        <text x={182} y={113} textAnchor="middle" fontSize={7} fill="#475569">8Q+</text>

        {/* Needle */}
        <line x1={CX} y1={CY} x2={needle.x.toFixed(2)} y2={needle.y.toFixed(2)}
          stroke={needleColor} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={4} fill={needleColor} />

        {/* Value */}
        <text x={CX} y={88} textAnchor="middle" fontSize={15} fontWeight="bold"
          fill={needleColor} fontFamily="monospace">
          {displayQ}
        </text>
        <text x={CX} y={103} textAnchor="middle" fontSize={7.5} fill="#64748b">
          quarters cash
        </text>
      </svg>

      {/* Raise risk warning below gauge */}
      {quarters < 2 && (
        <span className="text-xs text-crimson bg-crimson-950 border border-crimson-900 rounded px-2 py-0.5 font-medium">
          ⚠ Capital Raise Risk
        </span>
      )}
    </div>
  )
}
