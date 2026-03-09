<script lang="ts">
  import ProblemInput from './ProblemInput.svelte'
  import { ProblemInstanceSchema, type ParsedProblemInstance } from '@/lib/solver/problem-schema.js'

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = 'dw-problem'
  const EXAMPLES = [
    { value: 'cutting-stock', label: 'Cutting Stock (2-width)' },
    { value: 'two-block-lp', label: 'Two-block LP' },
    { value: 'three-block-lp', label: 'Three-block LP' },
  ] as const

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let problem = $state<ParsedProblemInstance | null>(null)
  let exampleDescription = $state<string>('')
  let selectedExample = $state<string>('')
  let solverStatus = $state<'idle' | 'loading' | 'solving' | 'complete' | 'error'>('idle')
  let initError = $state<string | null>(null)
  let hasEnteredData = $state(false)

  // Reference to ProblemInput for imperative reset/load calls
  let problemInputRef: { reset: () => void; loadProblem: (p: ParsedProblemInstance) => void }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  let canSolve = $derived(problem !== null && initError === null && solverStatus === 'idle')

  // ---------------------------------------------------------------------------
  // Lifecycle: restore from sessionStorage / URL param on mount
  // ---------------------------------------------------------------------------
  $effect(() => {
    // INIT_ERROR from pre-check (populated by solver worker setup in Phase 8)
    const initErrorEl = document.querySelector('[data-init-error]')
    if (initErrorEl instanceof HTMLElement && initErrorEl.dataset.initError) {
      initError = initErrorEl.dataset.initError
    }

    // Try URL param `?p=` first, then sessionStorage
    try {
      const url = new URL(window.location.href)
      const urlParam = url.searchParams.get('p')
      if (urlParam) {
        const parsed = ProblemInstanceSchema.safeParse(JSON.parse(atob(urlParam)))
        if (parsed.success && problemInputRef) {
          problemInputRef.loadProblem(parsed.data)
          hasEnteredData = true
        }
        return
      }
    } catch {
      // malformed URL param — ignore
    }

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored && problemInputRef) {
        const parsed = ProblemInstanceSchema.safeParse(JSON.parse(stored))
        if (parsed.success) {
          problemInputRef.loadProblem(parsed.data)
          hasEnteredData = true
        }
      }
    } catch {
      // sessionStorage unavailable or parse failure — ignore
    }
  })

  // ---------------------------------------------------------------------------
  // Effects: persist to sessionStorage on every valid change
  // ---------------------------------------------------------------------------
  $effect(() => {
    if (problem !== null) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(problem))
      } catch {
        // sessionStorage unavailable
      }
    }
  })

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  function handleProblemChange(updated: ParsedProblemInstance | null) {
    problem = updated
    if (updated !== null) hasEnteredData = true
  }

  async function handleExampleSelect(e: Event) {
    const select = e.target as HTMLSelectElement
    const value = select.value
    if (!value) return
    selectedExample = value
    exampleDescription = ''

    try {
      const res = await fetch(`/examples/${value}.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const parsed = ProblemInstanceSchema.safeParse(json)
      if (!parsed.success) {
        exampleDescription = 'Failed to parse example.'
        return
      }
      if (problemInputRef) {
        problemInputRef.loadProblem(parsed.data)
      }
      exampleDescription = parsed.data.metadata?.description ?? ''
      hasEnteredData = true
    } catch (err) {
      exampleDescription = `Could not load example: ${err instanceof Error ? err.message : 'unknown error'}`
    }
  }

  function handleClear() {
    if (hasEnteredData) {
      const confirmed = confirm(
        'Are you sure you want to clear all input data? This cannot be undone.',
      )
      if (!confirmed) return
    }
    problemInputRef?.reset()
    problem = null
    hasEnteredData = false
    selectedExample = ''
    exampleDescription = ''
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // sessionStorage unavailable
    }
  }

  function handleSolve() {
    if (!canSolve) return
    // Phase 8 will wire the solver worker here.
    // For now, this is a placeholder that does nothing (button is disabled when no valid problem).
    solverStatus = 'solving'
  }
</script>

<!-- =========================================================================
     Root workspace element — data-workspace attr for Playwright selectors
========================================================================== -->
<div class="mx-auto max-w-5xl px-4 py-8 space-y-6" data-workspace data-solver-status={solverStatus}>
  <!-- -----------------------------------------------------------------------
       INIT_ERROR: browser-compatibility message (populated by Phase 8 worker)
  ----------------------------------------------------------------------- -->
  {#if initError}
    <div
      class="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900"
      role="alert"
      data-browser-compat-message
    >
      <strong>Browser compatibility notice:</strong>
      {initError}
      <br />
      The interactive solver requires WebAssembly and SharedArrayBuffer. Compatible browsers: Chrome 89+,
      Firefox 88+, Safari 15.2+, Edge 89+.
    </div>
  {/if}

  <!-- -----------------------------------------------------------------------
       Header row: title + example loader + clear button
  ----------------------------------------------------------------------- -->
  <div class="flex flex-wrap items-center gap-3">
    <h1 class="text-2xl font-bold text-[var(--color-text-primary)] flex-1">Interactive Solver</h1>

    <!-- Load Example -->
    <label class="flex items-center gap-2 text-sm">
      <span class="text-[var(--color-text-secondary)]">Load example:</span>
      <select
        value={selectedExample}
        onchange={handleExampleSelect}
        data-example-select
        class="rounded border border-gray-300 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <option value="">— choose —</option>
        {#each EXAMPLES as ex}
          <option value={ex.value}>{ex.label}</option>
        {/each}
      </select>
    </label>

    <!-- Clear -->
    <button
      type="button"
      onclick={handleClear}
      data-action="clear"
      class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
    >
      Clear
    </button>
  </div>

  <!-- Example description -->
  {#if exampleDescription}
    <p
      class="text-sm text-[var(--color-text-secondary)] border-l-4 border-blue-300 pl-3"
      data-example-description
    >
      {exampleDescription}
    </p>
  {:else}
    <p data-example-description class="hidden" aria-hidden="true"></p>
  {/if}

  <!-- -----------------------------------------------------------------------
       Problem Input form
  ----------------------------------------------------------------------- -->
  <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <ProblemInput bind:this={problemInputRef} onchange={handleProblemChange} />
  </div>

  <!-- -----------------------------------------------------------------------
       Solver controls (stub — Phase 8 wires up the worker)
  ----------------------------------------------------------------------- -->
  <div class="flex items-center gap-4" data-solver-controls>
    <button
      type="button"
      onclick={handleSolve}
      disabled={!canSolve}
      data-solve
      class="rounded-lg bg-[var(--color-accent)] px-6 py-2 text-white font-semibold
             disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-[var(--color-accent-hover)]
             transition-colors"
    >
      {#if solverStatus === 'solving'}
        Solving…
      {:else}
        Solve
      {/if}
    </button>

    {#if solverStatus === 'solving'}
      <span class="text-sm text-[var(--color-text-secondary)]" role="status">
        Running Dantzig-Wolfe decomposition…
      </span>
    {/if}

    {#if problem === null && hasEnteredData}
      <span class="text-sm text-red-600" role="status">
        Fix validation errors before solving.
      </span>
    {/if}
  </div>
</div>
