<script lang="ts">
  import type { SolverIteration } from '@/lib/solver/worker-client.js'

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    iterations: SolverIteration[]
  }

  const { iterations }: Props = $props()

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let expandedRow = $state<number | null>(null)
  let logEl: HTMLDivElement

  // ---------------------------------------------------------------------------
  // Effects: auto-scroll to bottom when new iterations arrive
  // ---------------------------------------------------------------------------

  $effect(() => {
    // Access iterations.length to track changes
    if (iterations.length > 0 && logEl) {
      logEl.scrollTop = logEl.scrollHeight
    }
  })

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function fmt(n: number): string {
    if (!isFinite(n)) return String(n)
    return n.toFixed(4)
  }

  function toggleRow(idx: number) {
    expandedRow = expandedRow === idx ? null : idx
  }
</script>

<!-- =========================================================================
     IterationLog — live table of Dantzig-Wolfe iterations
========================================================================== -->
{#if iterations.length > 0}
  <div
    bind:this={logEl}
    class="rounded-lg border border-gray-200 bg-white overflow-auto max-h-64"
    data-iteration-log
    aria-label="Iteration log"
    role="table"
    aria-live="polite"
    aria-relevant="additions"
  >
    <!-- Header -->
    <div
      class="sticky top-0 grid grid-cols-3 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200
             text-xs font-semibold text-gray-500 uppercase tracking-wide"
      role="row"
    >
      <span role="columnheader">Iteration</span>
      <span role="columnheader">Master Objective</span>
      <span role="columnheader">Best Reduced Cost</span>
    </div>

    <!-- Rows -->
    {#each iterations as iter, idx (iter.iterationNumber)}
      <!-- Summary row -->
      <button
        type="button"
        class="w-full text-left grid grid-cols-3 gap-2 px-4 py-2 border-b border-gray-100
               hover:bg-blue-50 transition-colors text-sm font-mono
               focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300"
        onclick={() => toggleRow(idx)}
        aria-expanded={expandedRow === idx}
        data-iteration-row
        role="row"
      >
        <span data-iteration-number>{iter.iterationNumber}</span>
        <span data-master-objective>{fmt(iter.masterObjectiveValue)}</span>
        <span data-reduced-cost class:text-red-600={iter.enteringColumnReducedCost < 0}>
          {fmt(iter.enteringColumnReducedCost)}
        </span>
      </button>

      <!-- Expanded detail row -->
      {#if expandedRow === idx}
        <div
          class="px-4 py-3 bg-blue-50 border-b border-blue-100 text-xs text-gray-700 space-y-1"
          role="rowgroup"
          aria-label="Iteration {iter.iterationNumber} detail"
        >
          <p>
            <span class="font-medium">Entering sub-problem:</span>
            block {iter.enteringSubproblemIndex + 1}
          </p>
          <p>
            <span class="font-medium">Dual variables:</span>
            [{iter.dualVariables.map(fmt).join(', ')}]
          </p>
          <p>
            <span class="font-medium">Sub-problem objectives:</span>
            [{iter.subproblemObjectiveValues.map(fmt).join(', ')}]
          </p>
        </div>
      {/if}
    {/each}
  </div>
{/if}
