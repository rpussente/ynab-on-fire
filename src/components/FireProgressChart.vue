<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  points: Array<{ monthIndex: number; progress: number }>
  totalMonths: number
  fireMonthIndex: number | null
  currentProgress: number
}>()

const LEFT = 48
const RIGHT = 776
const TOP = 16
const BOTTOM = 264
const PLOT_W = RIGHT - LEFT // 728
const PLOT_H = BOTTOM - TOP // 248

function xFor(monthIndex: number): number {
  return LEFT + (monthIndex / props.totalMonths) * PLOT_W
}

function yFor(progress: number): number {
  return BOTTOM - (progress / 100) * PLOT_H
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

const gridLines = [0, 25, 50, 75, 100]

const linePoints = computed(() =>
  props.points.map(({ monthIndex, progress }) => `${xFor(monthIndex)},${yFor(progress)}`).join(' ')
)

const areaPoints = computed(() => {
  if (props.points.length === 0) return ''
  const last = props.points[props.points.length - 1]
  const pathPoints = [
    `${xFor(0)},${BOTTOM}`,
    ...props.points.map(({ monthIndex, progress }) => `${xFor(monthIndex)},${yFor(progress)}`),
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
    aria-label="FIRE projection chart"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="fire-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#a855f7" stop-opacity="0.05" />
      </linearGradient>
      <linearGradient id="fire-line" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#6366f1" />
        <stop offset="100%" stop-color="#a855f7" />
      </linearGradient>
    </defs>

    <!-- Y-axis gridlines -->
    <g v-for="pct in gridLines" :key="pct">
      <line
        :x1="LEFT"
        :x2="RIGHT"
        :y1="yFor(pct)"
        :y2="yFor(pct)"
        stroke="#334155"
        stroke-width="1"
        stroke-dasharray="4 4"
      />
      <text :x="LEFT - 6" :y="yFor(pct) + 4" fill="#64748b" font-size="10" text-anchor="end">
        {{ pct }}%
      </text>
    </g>

    <!-- 100% FIRE target line (more prominent) -->
    <line
      :x1="LEFT"
      :x2="RIGHT"
      :y1="yFor(100)"
      :y2="yFor(100)"
      stroke="#6366f1"
      stroke-width="1.5"
      stroke-dasharray="6 4"
      opacity="0.7"
    />
    <text :x="RIGHT + 4" :y="yFor(100) + 4" fill="#6366f1" font-size="10">FIRE</text>

    <!-- Filled area under the line -->
    <polygon v-if="points.length > 0" :points="areaPoints" fill="url(#fire-fill)" />

    <!-- Projection line -->
    <polyline
      v-if="points.length > 0"
      :points="linePoints"
      fill="none"
      stroke="url(#fire-line)"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Estimated FIRE date vertical marker -->
    <g v-if="fireMonthIndex !== null && fireMonthIndex <= totalMonths">
      <line
        :x1="xFor(fireMonthIndex)"
        :x2="xFor(fireMonthIndex)"
        :y1="TOP"
        :y2="BOTTOM"
        stroke="#a855f7"
        stroke-width="1.5"
        stroke-dasharray="4 4"
      />
      <circle
        :cx="xFor(fireMonthIndex)"
        :cy="yFor(100)"
        r="5"
        fill="#a855f7"
        stroke="#1e293b"
        stroke-width="2"
      />
    </g>

    <!-- Today's dot -->
    <circle
      :cx="xFor(0)"
      :cy="yFor(currentProgress)"
      r="4"
      fill="#6366f1"
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
