<template>
  <div class="flex items-start gap-4 mb-2">
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-800 text-slate-100"
    >
      <slot name="icon"></slot>
    </div>
    <div class="flex-1">
      <h3 class="text-lg font-semibold text-slate-100 italic">
        <slot name="heading"></slot>
      </h3>
      <div class="text-slate-400">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
