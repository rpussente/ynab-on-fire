<script setup lang="ts">
import { useYnabStore } from '@/stores/ynab'

const ynab = useYnabStore()

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function getAvatarGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #10b981, #3b82f6)',
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #f97316, #eab308)',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="budget-page">
    <div class="hero">
      <span class="hero-icon">🔥</span>
      <h1 class="hero-title">Select your budget</h1>
      <p class="hero-subtitle">Choose which budget you'd like to analyse</p>
    </div>

    <div class="budget-grid">
      <button
        v-for="budget in ynab.budgets"
        :key="budget.id"
        :id="budget.id"
        class="budget-card"
        @click="ynab.selectedBudget = budget"
      >
        <div class="avatar" :style="{ background: getAvatarGradient(budget.name) }">
          {{ getInitials(budget.name) }}
        </div>
        <div class="budget-info">
          <span class="budget-name">{{ budget.name }}</span>
          <span v-if="budget.last_modified_on" class="budget-meta">
            Last modified {{ formatDate(budget.last_modified_on) }}
          </span>
        </div>
        <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.budget-page {
  font-family: 'Inter', sans-serif;
  min-height: calc(100vh - 56px);
  background: radial-gradient(ellipse at 50% 0%, #1a1040 0%, #0d0f1a 60%);
  padding: 3rem 1.5rem 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Hero */
.hero {
  text-align: center;
  margin-bottom: 2.5rem;
}

.hero-icon {
  font-size: 2.75rem;
  display: block;
  margin-bottom: 0.75rem;
  filter: drop-shadow(0 0 18px rgba(251, 146, 60, 0.6));
}

.hero-title {
  font-size: 2rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
}

/* Grid */
.budget-grid {
  width: 100%;
  max-width: 780px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (max-width: 580px) {
  .budget-grid {
    grid-template-columns: 1fr;
  }
}

/* Card */
.budget-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  text-align: left;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
  color: inherit;
}

.budget-card:hover {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.3), 0 8px 24px rgba(0, 0, 0, 0.35);
  transform: translateY(-2px);
}

.budget-card:active {
  transform: translateY(0);
}

/* Avatar */
.avatar {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.03em;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* Info */
.budget-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.budget-name {
  font-size: 0.975rem;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.budget-meta {
  font-size: 0.775rem;
  color: #475569;
}

/* Arrow */
.card-arrow {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: #475569;
  transition: color 0.2s ease, transform 0.2s ease;
}

.budget-card:hover .card-arrow {
  color: #818cf8;
  transform: translateX(3px);
}
</style>
