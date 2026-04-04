<script setup lang="ts">
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router'
import { useYnabStore } from './stores/ynab'

const route = useRoute()
const router = useRouter()
const ynab = useYnabStore()

const ynabToken = findYnabToken()

if (ynabToken != null) {
  ynab.markAuthorised(ynabToken)
}

function findYnabToken() {
  let token = null
  const search = route.hash.substring(1).replace(/&/g, '","').replace(/=/g, '":"')
  if (search && search !== '') {
    // Try to get access_token from the hash returned by OAuth
    const params = JSON.parse('{"' + search + '"}', function (key, value) {
      return key === '' ? value : decodeURIComponent(value)
    })
    token = params.access_token
    router.push('/')
  }
  return token
}
</script>

<template>
  <div class="app-shell">
    <header class="navbar">
      <RouterLink to="/" class="navbar-brand">
        <span class="brand-icon">🔥</span>
        <span class="brand-name">YNAB on Fire</span>
      </RouterLink>

      <nav class="navbar-nav">
        <RouterLink to="/about" class="nav-link">About</RouterLink>

        <template v-if="!ynab.isAuthorised">
          <a class="nav-link nav-cta" :href="ynab.authUri">Authorise with YNAB</a>
        </template>

        <template v-else>
          <a
            v-if="ynab.selectedBudget"
            id="budget_switch"
            href="#"
            class="nav-link"
            @click.prevent="ynab.clearSelectedBudget()"
          >
            📊 {{ ynab.selectedBudget.name }}
          </a>
          <a id="logout" href="#" class="nav-link nav-logout" @click.prevent="ynab.logout()">
            Logout
          </a>
        </template>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #0d0f1a;
  color: #e2e8f0;
  font-family: 'Inter', sans-serif;
}

a {
  text-decoration: none;
}
</style>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Navbar */
.navbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.75rem;
  background: rgba(13, 15, 26, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f1f5f9;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}

.brand-icon {
  font-size: 1.25rem;
  filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.7));
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-link {
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #94a3b8;
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-link:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
}

.nav-cta {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff !important;
  font-weight: 600;
  padding: 0.4rem 1rem;
}

.nav-cta:hover {
  background: linear-gradient(135deg, #4f52d4, #7c3aed);
  color: #fff;
}

.nav-logout {
  color: #ef4444;
}

.nav-logout:hover {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
}

main {
  flex: 1;
}
</style>
