<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  points: Array<{ monthIndex: number; balance: number }>
  totalMonths: number
  payoffMonthIndex: number | null
  maxBalance: number
}>()

const LEFT = 48
const RIGHT = 776
const TOP = 16
const BOTTOM = 264
const PLOT_W = RIGHT - LEFT
const PLOT_H = BOTTOM - TOP

function xFor(monthIndex: number): number {
  return LEFT + (monthIndex / props.totalMonths) * PLOT_W
}

function yFor(balance: number): number {
  if (props.maxBalance === 0) return BOTTOM
  return BOTTOM - (balance / props.maxBalance) * PLOT_H
}

function fmtBalance(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return Math.round(v).toString()
}

const yearStepMonths = computed(() => {
  const years = props.totalMonths / 12
  if (years <= 10) return 12
  if (years <= 20) return 24
  return 60
})

const baseYear = new Date().getFullYear()

const xAxisLabels = computed(() => {
  const labels: { x: number; label: string }[] = []
  for (let m = 0; m <= props.totalMonths; m += yearStepMonths.value) {
    labels.push({ x: xFor(m), label: String(baseYear + Math.round(m / 12)) })
  }
  return labels
})

const gridLevels = [0, 0.25, 0.5, 0.75, 1]

const linePoints = computed(() =>
  props.points.map(({ monthIndex, balance }) => `${xFor(monthIndex)},${yFor(balance)}`).join(' ')
)

const areaPoints = computed(() => {
  if (props.points.length === 0) return ''
  const last = props.points[props.points.length - 1]
  const pathPoints = [
    `${xFor(0)},${BOTTOM}`,
    ...props.points.map(({ monthIndex, balance }) => `${xFor(monthIndex)},${yFor(balance)}`),
    `${xFor(last.monthIndex)},${BOTTOM}`
  ]
  return pathPoints.join(' ')
})
</script>

<template>
  <svg
    viewBox="0 0 800 300"
    class="w-full h-auto"
    role="img"
    aria-label="Debt payoff projection chart"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="debt-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.05" />
      </linearGradient>
      <linearGradient id="debt-line" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#fbbf24" />
      </linearGradient>
    </defs>

    <!-- Y-axis gridlines -->
    <g v-for="level in gridLevels" :key="level">
      <line
        :x1="LEFT"
        :x2="RIGHT"
        :y1="yFor(maxBalance * level)"
        :y2="yFor(maxBalance * level)"
        stroke="#334155"
        stroke-width="1"
        stroke-dasharray="4 4"
      />
      <text
        :x="LEFT - 6"
        :y="yFor(maxBalance * level) + 4"
        fill="#64748b"
        font-size="10"
        text-anchor="end"
      >
        {{ fmtBalance(maxBalance * (1 - level)) }}
      </text>
    </g>

    <!-- Debt-free baseline (more prominent) -->
    <line
      :x1="LEFT"
      :x2="RIGHT"
      :y1="BOTTOM"
      :y2="BOTTOM"
      stroke="#f59e0b"
      stroke-width="1.5"
      stroke-dasharray="6 4"
      opacity="0.7"
    />
    <text :x="RIGHT + 4" :y="BOTTOM + 4" fill="#f59e0b" font-size="10">$0</text>

    <!-- Filled area under the line -->
    <polygon v-if="points.length > 0" :points="areaPoints" fill="url(#debt-fill)" />

    <!-- Projection line -->
    <polyline
      v-if="points.length > 0"
      :points="linePoints"
      fill="none"
      stroke="url(#debt-line)"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Payoff date vertical marker -->
    <g v-if="payoffMonthIndex !== null && payoffMonthIndex <= totalMonths">
      <line
        :x1="xFor(payoffMonthIndex)"
        :x2="xFor(payoffMonthIndex)"
        :y1="TOP"
        :y2="BOTTOM"
        stroke="#f59e0b"
        stroke-width="1.5"
        stroke-dasharray="4 4"
      />
      <circle
        :cx="xFor(payoffMonthIndex)"
        :cy="BOTTOM"
        r="5"
        fill="#f59e0b"
        stroke="#1e293b"
        stroke-width="2"
      />
      <text :x="xFor(payoffMonthIndex) + 8" :y="BOTTOM - 8" fill="#f59e0b" font-size="10">
        Debt-Free
      </text>
    </g>

    <!-- Today's dot -->
    <circle
      :cx="xFor(0)"
      :cy="yFor(maxBalance)"
      r="4"
      fill="#f59e0b"
      stroke="#1e293b"
      stroke-width="2"
    />

    <!-- X-axis year labels -->
    <text
      v-for="label in xAxisLabels"
      :key="label.label"
      :x="label.x"
      y="288"
      fill="#64748b"
      font-size="10"
      text-anchor="middle"
    >
      {{ label.label }}
    </text>
  </svg>
</template>
