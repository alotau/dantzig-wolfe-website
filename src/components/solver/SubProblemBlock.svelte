<script lang="ts">
  import type { ParsedSubProblemBlock, ConstraintSense } from '@/lib/solver/problem-schema.js'

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  let {
    block,
    onchange,
  }: {
    block: ParsedSubProblemBlock
    onchange: (updated: ParsedSubProblemBlock) => void
  } = $props()

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------
  let open = $state(true)

  let rows = $derived(block.A.length)
  let cols = $derived(block.c.length)

  // Validation errors for each cell: key = "A-{r}-{c}" | "b-{r}" | "c-{i}"
  let cellErrors = $state<Record<string, string>>({})
  let hasErrors = $derived(Object.keys(cellErrors).length > 0)

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function parseCell(raw: string): number | null {
    const n = parseFloat(raw)
    return isNaN(n) || !isFinite(n) ? null : n
  }

  function setError(key: string, msg: string) {
    cellErrors = { ...cellErrors, [key]: msg }
  }

  function clearError(key: string) {
    const { [key]: _, ...rest } = cellErrors
    cellErrors = rest
  }

  // ---------------------------------------------------------------------------
  // Dimension helpers — add/remove rows and columns
  // ---------------------------------------------------------------------------
  function addConstraintRow() {
    const newRow = Array<number>(cols).fill(0)
    onchange({
      ...block,
      A: [...block.A, newRow],
      b: [...block.b, 0],
      constraintSenses: [...block.constraintSenses, 'leq'],
    })
  }

  function removeConstraintRow(r: number) {
    onchange({
      ...block,
      A: block.A.filter((_, i) => i !== r),
      b: block.b.filter((_, i) => i !== r),
      constraintSenses: block.constraintSenses.filter((_, i) => i !== r),
    })
  }

  function addVariable() {
    onchange({
      ...block,
      A: block.A.map((row) => [...row, 0]),
      c: [...block.c, 0],
      bounds: [...block.bounds, { lower: 0, upper: null }],
      variableLabels: block.variableLabels ? [...block.variableLabels, ''] : undefined,
    })
  }

  function removeVariable(j: number) {
    onchange({
      ...block,
      A: block.A.map((row) => row.filter((_, i) => i !== j)),
      c: block.c.filter((_, i) => i !== j),
      bounds: block.bounds.filter((_, i) => i !== j),
      variableLabels: block.variableLabels?.filter((_, i) => i !== j),
    })
  }

  // ---------------------------------------------------------------------------
  // Matrix cell update handlers
  // ---------------------------------------------------------------------------
  function updateACell(r: number, c: number, raw: string) {
    const key = `A-${r}-${c}`
    const n = parseCell(raw)
    if (n === null) {
      setError(key, 'Numeric value required')
      return
    }
    clearError(key)
    const newA = block.A.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? n : v)))
    onchange({ ...block, A: newA })
  }

  function updateBCell(r: number, raw: string) {
    const key = `b-${r}`
    const n = parseCell(raw)
    if (n === null) {
      setError(key, 'Numeric value required')
      return
    }
    clearError(key)
    const newB = block.b.map((v, i) => (i === r ? n : v))
    onchange({ ...block, b: newB })
  }

  function updateSense(r: number, value: string) {
    const newSenses = block.constraintSenses.map((s, i) =>
      i === r ? (value as ConstraintSense) : s,
    )
    onchange({ ...block, constraintSenses: newSenses })
  }

  function updateCCell(j: number, raw: string) {
    const key = `c-${j}`
    const n = parseCell(raw)
    if (n === null) {
      setError(key, 'Numeric value required')
      return
    }
    clearError(key)
    const newC = block.c.map((v, i) => (i === j ? n : v))
    onchange({ ...block, c: newC })
  }

  function updateBoundLower(j: number, raw: string) {
    const n = parseCell(raw)
    if (n === null) return
    const newBounds = block.bounds.map((b, i) => (i === j ? { ...b, lower: n } : b))
    onchange({ ...block, bounds: newBounds })
  }

  function updateBoundUpper(j: number, raw: string) {
    if (raw.trim() === '' || raw === '∞' || raw.toLowerCase() === 'inf') {
      const newBounds = block.bounds.map((b, i) => (i === j ? { ...b, upper: null } : b))
      onchange({ ...block, bounds: newBounds })
      return
    }
    const n = parseCell(raw)
    if (n === null) return
    const newBounds = block.bounds.map((b, i) => (i === j ? { ...b, upper: n } : b))
    onchange({ ...block, bounds: newBounds })
  }

  function updateLabel(raw: string) {
    onchange({ ...block, label: raw || undefined })
  }
</script>

<!-- -------------------------------------------------------------------------
     Block wrapper — collapsible via <details>
     data-subproblem-block: Playwright/Cucumber selector
     data-block-index: exposes index for step-def assertions
------------------------------------------------------------------------- -->
<details
  class="rounded-lg border border-gray-200 bg-white shadow-sm"
  data-subproblem-block
  data-block-index={block.index}
  bind:open
>
  <summary
    class="flex cursor-pointer items-center justify-between px-4 py-3 font-medium text-[var(--color-text-primary)] select-none list-none"
    data-toggle-block
  >
    <span>
      Sub-problem {block.index}
      {#if block.label}
        <span class="ml-1 text-[var(--color-text-secondary)] font-normal">— {block.label}</span>
      {/if}
    </span>
    <span class="ml-4 flex items-center gap-3 text-sm font-normal text-[var(--color-text-secondary)]">
      {#if hasErrors}
        <span class="text-red-600 font-semibold" aria-live="polite">⚠ Errors</span>
      {/if}
      <!-- dims badge -->
      <span data-block-dims class="tabular-nums">
        {rows} × {cols}
        <span class="text-xs">(rows × vars)</span>
      </span>
      <svg
        aria-hidden="true"
        class="h-4 w-4 transition-transform {open ? 'rotate-180' : ''}"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </span>
  </summary>

  <!-- -----------------------------------------------------------------------
       Content
  ----------------------------------------------------------------------- -->
  <div class="px-4 pb-4 pt-1 space-y-5">
    <!-- Label field -->
    <div>
      <label class="block text-xs font-medium text-[var(--color-text-secondary)] mb-1" for="label-{block.index}">
        Block label (optional)
      </label>
      <input
        id="label-{block.index}"
        type="text"
        value={block.label ?? ''}
        oninput={(e) => updateLabel((e.target as HTMLInputElement).value)}
        placeholder="e.g. Plant A"
        class="w-48 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      />
    </div>

    <!-- Constraint matrix (A, b, sense) -->
    <div class="overflow-x-auto" data-coupling-table>
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs font-medium text-[var(--color-text-secondary)]">
          Constraint matrix A · RHS b · Sense
        </p>
        <div class="flex gap-2 text-xs">
          <button
            type="button"
            onclick={addVariable}
            class="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-100 transition-colors"
          >
            + Variable
          </button>
          <button
            type="button"
            onclick={addConstraintRow}
            class="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-100 transition-colors"
          >
            + Constraint
          </button>
        </div>
      </div>
      <table class="text-xs border-collapse">
        <thead>
          <tr class="bg-gray-50">
            {#each Array(cols) as _, j}
              <th class="border border-gray-200 px-2 py-1 font-normal text-[var(--color-text-secondary)]">
                x<sub>{j + 1}</sub>
              </th>
            {/each}
            <th class="border border-gray-200 px-2 py-1 font-normal">≤/≥/=</th>
            <th class="border border-gray-200 px-2 py-1 font-normal">b</th>
            <th class="border-0"></th>
          </tr>
        </thead>
        <tbody>
          {#each Array(rows) as _, r}
            <tr>
              {#each Array(cols) as _, c}
                {@const key = `A-${r}-${c}`}
                <td class="border border-gray-200 p-0" data-matrix-cell class:invalid={!!cellErrors[key]}>
                  <input
                    type="number"
                    step="any"
                    value={block.A[r][c]}
                    oninput={(e) => updateACell(r, c, (e.target as HTMLInputElement).value)}
                    aria-invalid={!!cellErrors[key]}
                    class="w-14 px-1 py-0.5 text-right focus:outline-none focus:bg-blue-50 {cellErrors[key] ? 'bg-red-50 text-red-700' : ''}"
                  />
                  {#if cellErrors[key]}
                    <span class="sr-only" data-validation-message>{cellErrors[key]}</span>
                  {/if}
                </td>
              {/each}
              <!-- Sense selector -->
              <td class="border border-gray-200 p-0" data-coupling-sense>
                <select
                  value={block.constraintSenses[r]}
                  onchange={(e) => updateSense(r, (e.target as HTMLSelectElement).value)}
                  class="px-1 py-0.5 bg-transparent focus:outline-none"
                >
                  <option value="leq">≤</option>
                  <option value="geq">≥</option>
                  <option value="eq">=</option>
                </select>
              </td>
              <!-- b column -->
              <td class="border border-gray-200 p-0" data-coupling-b>
                <input
                  type="number"
                  step="any"
                  value={block.b[r]}
                  oninput={(e) => updateBCell(r, (e.target as HTMLInputElement).value)}
                  aria-invalid={!!cellErrors[`b-${r}`]}
                  class="w-16 px-1 py-0.5 text-right focus:outline-none focus:bg-blue-50 {cellErrors[`b-${r}`] ? 'bg-red-50 text-red-700' : ''}"
                />
              </td>
              <!-- Remove row button -->
              <td class="border-0 pl-1">
                <button
                  type="button"
                  onclick={() => removeConstraintRow(r)}
                  class="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove constraint row {r + 1}"
                >×</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Validation messages (visible, not just sr-only) for A cells -->
    {#each Object.entries(cellErrors).filter(([k]) => k.startsWith('A-') || k.startsWith('b-')) as [key, msg]}
      <p class="text-red-600 text-xs" data-validation-message>{key}: {msg}</p>
    {/each}

    <!-- Objective cost vector c -->
    <div class="overflow-x-auto">
      <p class="text-xs font-medium text-[var(--color-text-secondary)] mb-1">
        Objective cost vector c
      </p>
      <div class="flex gap-1" data-block-c>
        {#each Array(cols) as _, j}
          {@const key = `c-${j}`}
          <div class="flex flex-col items-center gap-0.5">
            <input
              type="number"
              step="any"
              value={block.c[j]}
              oninput={(e) => updateCCell(j, (e.target as HTMLInputElement).value)}
              aria-invalid={!!cellErrors[key]}
              data-cell-c
              class="w-14 rounded border border-gray-300 px-1 py-0.5 text-right text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] {cellErrors[key] ? 'border-red-400 bg-red-50' : ''}"
            />
            {#if cellErrors[key]}
              <span class="text-red-500 text-xs" data-validation-message>{cellErrors[key]}</span>
            {/if}
            <span class="text-xs text-[var(--color-text-secondary)]">c<sub>{j + 1}</sub></span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Variable bounds -->
    <div class="overflow-x-auto">
      <p class="text-xs font-medium text-[var(--color-text-secondary)] mb-1">
        Variable bounds [lower, upper] — leave upper blank for ∞
      </p>
      <table class="text-xs border-collapse">
        <thead>
          <tr class="bg-gray-50">
            <th class="border border-gray-200 px-2 py-1 font-normal">Variable</th>
            <th class="border border-gray-200 px-2 py-1 font-normal">Lower</th>
            <th class="border border-gray-200 px-2 py-1 font-normal">Upper</th>
          </tr>
        </thead>
        <tbody>
          {#each Array(cols) as _, j}
            <tr>
              <td class="border border-gray-200 px-2 py-0.5 text-[var(--color-text-secondary)]">
                {block.variableLabels?.[j] ?? `x${j + 1}`}
              </td>
              <td class="border border-gray-200 p-0">
                <input
                  type="number"
                  step="any"
                  value={block.bounds[j].lower}
                  oninput={(e) => updateBoundLower(j, (e.target as HTMLInputElement).value)}
                  data-bound-lower
                  class="w-16 px-1 py-0.5 text-right focus:outline-none focus:bg-blue-50"
                />
              </td>
              <td class="border border-gray-200 p-0">
                <input
                  type="text"
                  value={block.bounds[j].upper === null ? '' : block.bounds[j].upper}
                  oninput={(e) => updateBoundUpper(j, (e.target as HTMLInputElement).value)}
                  placeholder="∞"
                  data-bound-upper
                  data-bound-default
                  class="w-16 px-1 py-0.5 text-right focus:outline-none focus:bg-blue-50"
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Remove block (delegated to parent via event) -->
  </div>
</details>
