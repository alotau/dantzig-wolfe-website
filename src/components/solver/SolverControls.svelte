<script lang="ts">
  import type { ParsedProblemInstance } from '@/lib/solver/problem-schema.js'

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  type SolverUiStatus =
    | 'idle'
    | 'loading'
    | 'ready'
    | 'solving'
    | 'optimal'
    | 'infeasible'
    | 'unbounded'
    | 'cancelled'
    | 'error'

  interface Props {
    status: SolverUiStatus
    problem: ParsedProblemInstance | null
    onsolve: () => void
    oncancel: () => void
  }

  const { status, problem, onsolve, oncancel }: Props = $props()

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  /** Solve button enabled: valid problem, not currently solving */
  const canSolve = $derived(problem !== null && status !== 'solving')

  /** Cancel button visible only while solving */
  const isSolving = $derived(status === 'solving')

  /** Status badge label and style class */
  const badge = $derived<{ label: string; cls: string }>(() => {
    switch (status) {
      case 'idle':
        return { label: '', cls: '' }
      case 'loading':
        return { label: 'Loading solver…', cls: 'text-blue-600' }
      case 'ready':
        return { label: 'Solver ready', cls: 'text-green-600' }
      case 'solving':
        return { label: 'Solving…', cls: 'text-blue-600' }
      case 'optimal':
        return { label: 'Solved — Optimal', cls: 'text-green-700 font-semibold' }
      case 'infeasible':
        return { label: 'Solved — Infeasible', cls: 'text-amber-700 font-semibold' }
      case 'unbounded':
        return { label: 'Solved — Unbounded', cls: 'text-amber-700 font-semibold' }
      case 'cancelled':
        return { label: 'Cancelled', cls: 'text-gray-500' }
      case 'error':
        return { label: 'Error', cls: 'text-red-600 font-semibold' }
      default:
        return { label: '', cls: '' }
    }
  })
</script>

<!-- =========================================================================
     SolverControls — Solve / Cancel buttons + status badge
     data-solver-controls exists on the parent container in SolverWorkspace.
========================================================================== -->

<!-- Solve button -->
<button
  type="button"
  onclick={onsolve}
  disabled={!canSolve}
  data-solve
  class="rounded-lg bg-[var(--color-accent)] px-6 py-2 text-white font-semibold
         disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-[var(--color-accent-hover)]
         transition-colors"
>
  {#if status === 'solving'}
    Solving…
  {:else if status === 'loading'}
    Loading…
  {:else}
    Solve
  {/if}
</button>

<!-- Cancel button (only while solving) -->
{#if isSolving}
  <button
    type="button"
    onclick={oncancel}
    data-cancel
    class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700
           hover:bg-gray-100 transition-colors"
  >
    Cancel
  </button>
{/if}

<!-- Status badge / message -->
{#if badge.label}
  <span
    class="text-sm {badge.cls}"
    role="status"
    data-status-message
  >
    {#if status === 'loading' || status === 'solving'}
      <!-- Animated spinner dot -->
      <span class="inline-block mr-1 animate-pulse">●</span>
    {/if}
    {badge.label}
  </span>
{:else}
  <!-- Empty placeholder keeps layout stable -->
  <span data-status-message class="hidden" aria-hidden="true"></span>
{/if}

<!-- Validation hint when problem is null but user has typed something -->
{#if problem === null && status === 'idle'}
  <span class="text-sm text-red-600" role="status">
    Fix validation errors before solving.
  </span>
{/if}
