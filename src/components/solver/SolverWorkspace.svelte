<script lang="ts">
  import ProblemInput from './ProblemInput.svelte'
  import SolverControls from './SolverControls.svelte'
  import SolutionPanel from './SolutionPanel.svelte'
  import ConvergenceChart from './ConvergenceChart.svelte'
  import IterationLog from './IterationLog.svelte'
  import {
    ProblemInstanceSchema,
    type ParsedProblemInstance,
    type ParsedSubProblemBlock,
  } from '@/lib/solver/problem-schema.js'
  import {
    WorkerClient,
    type SolverIteration,
    type SolverResult,
  } from '@/lib/solver/worker-client.js'
  import { buildExportPayload, downloadJson } from '@/lib/solver/export.js'
  import { buildShareURL, decodeProblem } from '@/lib/sharing/url-codec.js'

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = 'dw-problem'
  const EXAMPLES = [
    { value: 'cutting-stock', label: 'Cutting Stock (2-width)' },
    { value: 'two-block-lp', label: 'Two-block LP' },
    { value: 'three-block-lp', label: 'Three-block LP' },
    { value: 'trick-2block', label: 'Trick – 2-block LP (Trick)' },
    { value: 'lasdon-2block', label: 'Lasdon – 2-block LP' },
    { value: 'mitchell-1block', label: 'Mitchell – 1-block LP' },
    { value: 'bertsimas-1block', label: 'Bertsimas – 1-block LP' },
    { value: 'dantzig-3block', label: 'Dantzig – 3-block LP' },
  ] as const

  // ---------------------------------------------------------------------------
  // Types
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

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let problem = $state<ParsedProblemInstance | null>(null)
  let exampleDescription = $state<string>('')
  let selectedExample = $state<string>('')
  let solverStatus = $state<SolverUiStatus>('idle')
  let initError = $state<string | null>(null)
  let hasEnteredData = $state(false)
  let iterations = $state<SolverIteration[]>([])
  let solverResult = $state<SolverResult | null>(null)
  let workerClient = $state<WorkerClient | null>(null)

  // Reference to ProblemInput for imperative reset/load calls
  let problemInputRef = $state<
    | {
        reset: () => void
        loadProblem: (p: ParsedProblemInstance) => void
        _forceState: (
          cA: number[][],
          cR: Array<{ b: number; sense: 'leq' | 'geq' | 'eq' }>,
          sps: ParsedSubProblemBlock[],
        ) => void
      }
    | undefined
  >(undefined)

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  let canSolve = $derived(problem !== null && initError === null && solverStatus !== 'solving')

  // ---------------------------------------------------------------------------
  // Lifecycle: initialise WorkerClient and restore persisted problem
  // ---------------------------------------------------------------------------
  $effect(() => {
    // Create the singleton WorkerClient and start Pyodide loading
    const client = new WorkerClient()
    workerClient = client
    solverStatus = 'loading'

    client
      .init()
      .then(() => {
        // Only set ready if not already solving/done
        if (solverStatus === 'loading') solverStatus = 'ready'
      })
      .catch((err: Error) => {
        initError = err.message
        solverStatus = 'error'
      })

    return () => {
      client.dispose()
    }
  })

  $effect(() => {
    // Try URL param `?p=` first, then sessionStorage
    try {
      const url = new URL(window.location.href)
      const urlParam = url.searchParams.get('p')
      if (urlParam) {
        const decoded = decodeProblem(urlParam)
        if (decoded && problemInputRef) {
          problemInputRef.loadProblem(decoded)
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
  // Effects: register acceptance-test hook on window
  // (allows tests to force a dimension-mismatched state that normal UI prevents)
  // ---------------------------------------------------------------------------
  $effect(() => {
    ;(window as unknown as { __dwTestHelpers: unknown }).__dwTestHelpers = {
      forceInputState(
        couplingA: number[][],
        couplingRows: Array<{ b: number; sense: 'leq' | 'geq' | 'eq' }>,
        subproblems: ParsedSubProblemBlock[],
      ) {
        problemInputRef?._forceState(couplingA, couplingRows, subproblems)
      },
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
    iterations = []
    solverResult = null
    if (solverStatus !== 'loading' && solverStatus !== 'solving') {
      solverStatus = workerClient ? 'ready' : 'idle'
    }

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
    iterations = []
    solverResult = null
    if (solverStatus !== 'loading' && solverStatus !== 'solving') {
      solverStatus = workerClient ? 'ready' : 'idle'
    }
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // sessionStorage unavailable
    }
  }

  async function handleSolve() {
    if (!canSolve || !workerClient || !problem) return

    // Reset iteration state for a new solve
    iterations = []
    solverResult = null
    solverStatus = 'solving'

    try {
      const result = await workerClient.solve(problem, (iter) => {
        // Clone to trigger Svelte reactivity
        iterations = [...iterations, iter]
      })

      solverResult = result
      solverStatus = result.status as SolverUiStatus
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[SolverWorkspace] handleSolve caught JS error:', errMsg)
      initError = errMsg
      solverStatus = 'error'
    }
  }

  function handleCancel() {
    workerClient?.cancel()
  }

  function handleExport() {
    if (!solverResult || !problem) return
    const payload = buildExportPayload(problem, solverResult, iterations)
    downloadJson(payload)
  }

  function handleShare() {
    if (!problem) return
    const url = buildShareURL(problem)
    if (!url) {
      alert('The problem is too large to share via URL (exceeds 64 KB).')
      return
    }
    window.history.replaceState(null, '', url.toString())
    // Copy to clipboard as a convenience if the API is available
    navigator.clipboard?.writeText(url.toString()).catch(() => {
      // Clipboard unavailable — URL is still updated in the address bar
    })
  }
</script>

<!-- =========================================================================
     Root workspace element — data-workspace attr for Playwright selectors
     data-solver-status is updated reactively for step definition waits
========================================================================== -->
<div
  class="mx-auto max-w-5xl px-4 py-8 space-y-6"
  data-workspace
  data-solver-status={solverStatus}
  data-solver-error-message={solverResult?.errorMessage ?? ''}
>
  <!-- -----------------------------------------------------------------------
       INIT_ERROR: browser-compatibility message (WebAssembly unsupported or
       Pyodide package install failure)
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
      The interactive solver requires WebAssembly and a modern browser. Compatible browsers: Chrome 89+,
      Firefox 88+, Safari 15.2+, Edge 89+.
    </div>
  {:else}
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
       Solver controls: Solve / Cancel buttons + status badge
  ----------------------------------------------------------------------- -->
    <div class="flex items-center gap-4" data-solver-controls>
      <SolverControls
        status={solverStatus}
        {problem}
        hasResult={solverResult !== null}
        onsolve={handleSolve}
        oncancel={handleCancel}
        onexport={handleExport}
        onshare={handleShare}
      />

      {#if problem === null && hasEnteredData}
        <span class="text-sm text-red-600" role="status">
          Fix validation errors before solving.
        </span>
      {/if}
    </div>

    <!-- -----------------------------------------------------------------------
       Iteration log (live during solving; preserved after completion)
  ----------------------------------------------------------------------- -->
    {#if iterations.length > 0}
      <div class="space-y-2">
        <h2
          class="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide"
        >
          Iteration Log
        </h2>
        <IterationLog {iterations} />
      </div>
    {/if}

    <!-- -----------------------------------------------------------------------
       Results panel (shown after a completed solve)
       Uses SolutionPanel for the summary + ConvergenceChart for the chart.
  ----------------------------------------------------------------------- -->
    {#if solverResult !== null}
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <SolutionPanel result={solverResult} {problem} iterationCount={iterations.length} />

        <!-- Convergence chart — only meaningful when there are iterations -->
        {#if iterations.length > 0}
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Convergence</p>
            <ConvergenceChart {iterations} />
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
