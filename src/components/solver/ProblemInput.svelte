<script lang="ts">
  import SubProblemBlock from './SubProblemBlock.svelte'
  import {
    ProblemInstanceSchema,
    type ParsedProblemInstance,
    type ParsedSubProblemBlock,
    type ConstraintSense,
  } from '@/lib/solver/problem-schema.js'
  import { validateCouplingDimensions, createEmptyMatrix } from '@/lib/math/matrix-utils.js'

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  let {
    onchange,
  }: {
    onchange: (problem: ParsedProblemInstance | null) => void
  } = $props()

  // ---------------------------------------------------------------------------
  // State: coupling constraints
  // ---------------------------------------------------------------------------
  type CouplingRow = { b: number; sense: ConstraintSense }

  let couplingRows = $state<CouplingRow[]>([])
  // Coupling A matrix stored separate from rows for clarity
  // Dimensions: couplingRows.length × totalVars
  let couplingA = $state<number[][]>([])

  // ---------------------------------------------------------------------------
  // State: sub-problem blocks
  // ---------------------------------------------------------------------------
  let subproblems = $state<ParsedSubProblemBlock[]>([])

  let nextBlockIndex = $state(1)

  // ---------------------------------------------------------------------------
  // Derived: total variable count
  // ---------------------------------------------------------------------------
  let totalVars = $derived(subproblems.reduce((s, sp) => s + sp.c.length, 0))

  // ---------------------------------------------------------------------------
  // Derived: dimension error
  // ---------------------------------------------------------------------------
  let dimensionError = $derived<string | null>(() => {
    if (couplingRows.length === 0 || subproblems.length === 0) return null
    if (couplingA.length === 0) return null
    const couplingCols = couplingA[0]?.length ?? 0
    if (couplingCols !== totalVars) {
      return `Dimension mismatch: coupling matrix has ${couplingCols} columns but sub-problems have ${totalVars} variables in total.`
    }
    return null
  })

  let couplingCount = $derived(couplingRows.length)

  // ---------------------------------------------------------------------------
  // Effects: emit validated problem upward
  // ---------------------------------------------------------------------------
  $effect(() => {
    if (subproblems.length === 0 || couplingRows.length === 0 || dimensionError !== null) {
      onchange(null)
      return
    }

    const raw = {
      objectiveDirection: 'min' as const, // parent can override; default direction
      coupling: {
        A: couplingA,
        b: couplingRows.map((r) => r.b),
        senses: couplingRows.map((r) => r.sense),
      },
      subproblems,
    }

    const result = ProblemInstanceSchema.safeParse(raw)
    onchange(result.success ? result.data : null)
  })

  // ---------------------------------------------------------------------------
  // Helpers: coupling
  // ---------------------------------------------------------------------------
  function addCouplingRow() {
    const newRow: CouplingRow = { b: 0, sense: 'leq' }
    couplingRows = [...couplingRows, newRow]
    // Extend couplingA with a new zero row
    couplingA = [...couplingA, Array<number>(totalVars).fill(0)]
  }

  function removeCouplingRow(r: number) {
    couplingRows = couplingRows.filter((_, i) => i !== r)
    couplingA = couplingA.filter((_, i) => i !== r)
  }

  function updateCouplingB(r: number, raw: string) {
    const n = parseFloat(raw)
    if (isNaN(n)) return
    couplingRows = couplingRows.map((row, i) => (i === r ? { ...row, b: n } : row))
  }

  function updateCouplingSense(r: number, value: string) {
    couplingRows = couplingRows.map((row, i) =>
      i === r ? { ...row, sense: value as ConstraintSense } : row,
    )
  }

  function updateCouplingACell(r: number, c: number, raw: string) {
    const n = parseFloat(raw)
    if (isNaN(n)) return
    couplingA = couplingA.map((row, ri) =>
      row.map((v, ci) => (ri === r && ci === c ? n : v)),
    )
  }

  // Extend couplingA columns when sub-problem variables change
  function syncCouplingColumns(newTotalVars: number) {
    const currentCols = couplingA[0]?.length ?? 0
    if (newTotalVars === currentCols) return
    couplingA = couplingA.map((row) => {
      if (newTotalVars > currentCols) {
        return [...row, ...Array<number>(newTotalVars - currentCols).fill(0)]
      }
      return row.slice(0, newTotalVars)
    })
  }

  // ---------------------------------------------------------------------------
  // Helpers: sub-problems
  // ---------------------------------------------------------------------------
  function addBlock() {
    const newBlock: ParsedSubProblemBlock = {
      index: nextBlockIndex,
      A: createEmptyMatrix(1, 1),
      b: [0],
      constraintSenses: ['leq'],
      c: [0],
      bounds: [{ lower: 0, upper: null }],
    }
    subproblems = [...subproblems, newBlock]
    nextBlockIndex++
    syncCouplingColumns(totalVars + 1)
  }

  function removeBlock(idx: number) {
    const removed = subproblems[idx]
    const removedVars = removed.c.length
    subproblems = subproblems.filter((_, i) => i !== idx)
    syncCouplingColumns(totalVars - removedVars)
  }

  function updateBlock(idx: number, updated: ParsedSubProblemBlock) {
    const prevVars = subproblems[idx].c.length
    const newVars = updated.c.length
    subproblems = subproblems.map((sp, i) => (i === idx ? updated : sp))
    if (newVars !== prevVars) {
      syncCouplingColumns(totalVars - prevVars + newVars)
    }
  }

  // Used externally (SolverWorkspace calls reset())
  export function reset() {
    couplingRows = []
    couplingA = []
    subproblems = []
    nextBlockIndex = 1
  }

  // Used externally: load a full problem instance into the form
  export function loadProblem(p: ParsedProblemInstance) {
    couplingA = p.coupling.A
    couplingRows = p.coupling.b.map((b, i) => ({ b, sense: p.coupling.senses[i] }))
    subproblems = p.subproblems
    nextBlockIndex = p.subproblems.length + 1
  }
</script>

<!-- -------------------------------------------------------------------------
     Instructions / help panel
     data-instructions: Playwright selector
------------------------------------------------------------------------- -->
<div
  class="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900"
  data-instructions
>
  <p class="font-semibold mb-1">How to enter a Dantzig-Wolfe decomposed LP</p>
  <ol class="list-decimal list-inside space-y-1 text-blue-800">
    <li>
      Add <em>coupling constraints</em> — these link the sub-problem blocks (the A₀x = b₀ part).
    </li>
    <li>
      Add one or more <em>sub-problem blocks</em> — each block has its own constraint matrix, RHS,
      and objective cost vector.
    </li>
    <li>
      The column count of the coupling matrix must equal the total variable count across all blocks.
    </li>
  </ol>
  <p class="mt-2 text-xs text-blue-700">
    Unfamiliar with a term?
    <button
      type="button"
      class="underline cursor-pointer"
      onclick={() => window.dispatchEvent(new CustomEvent('open-glossary', { detail: {} }))}
      aria-label="Open Glossary panel for definitions"
    >
      Open the Glossary
    </button>
    for definitions of block-angular LP, coupling constraints, master problem, and more.
  </p>
</div>

<!-- -------------------------------------------------------------------------
     Coupling constraints section
------------------------------------------------------------------------- -->
<section class="mb-8" aria-labelledby="coupling-heading">
  <div class="flex items-center justify-between mb-3">
    <h2 id="coupling-heading" class="text-lg font-semibold text-[var(--color-text-primary)]">
      Coupling Constraints
      <span
        class="ml-2 text-sm font-normal text-[var(--color-text-secondary)]"
        data-coupling-count
      >
        ({couplingCount} row{couplingCount === 1 ? '' : 's'})
      </span>
    </h2>
    <button
      type="button"
      onclick={addCouplingRow}
      data-add-coupling-row
      class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 transition-colors"
    >
      + Constraint row
    </button>
  </div>

  {#if couplingRows.length === 0}
    <p class="text-sm text-[var(--color-text-secondary)] italic">
      No coupling constraints yet — click "+ Constraint row" to add one.
    </p>
  {:else}
    <!-- Coupling A matrix + b + sense -->
    <div class="overflow-x-auto" data-coupling-table>
      <table class="text-xs border-collapse w-full">
        <thead>
          <tr class="bg-gray-50">
            {#each Array(totalVars) as _, j}
              <th class="border border-gray-200 px-2 py-1 font-normal text-[var(--color-text-secondary)] tabular-nums">
                x<sub>{j + 1}</sub>
              </th>
            {/each}
            <th class="border border-gray-200 px-2 py-1 font-normal">≤/≥/=</th>
            <th class="border border-gray-200 px-2 py-1 font-normal">b₀</th>
            <th class="border-0"></th>
          </tr>
        </thead>
        <tbody>
          {#each couplingRows as row, r}
            <tr>
              {#each Array(totalVars) as _, c}
                <td class="border border-gray-200 p-0" data-matrix-cell>
                  <input
                    type="number"
                    step="any"
                    value={couplingA[r]?.[c] ?? 0}
                    oninput={(e) => updateCouplingACell(r, c, (e.target as HTMLInputElement).value)}
                    class="w-14 px-1 py-0.5 text-right focus:outline-none focus:bg-blue-50"
                  />
                </td>
              {/each}
              <!-- Sense -->
              <td class="border border-gray-200 p-0" data-coupling-sense>
                <select
                  value={row.sense}
                  onchange={(e) => updateCouplingSense(r, (e.target as HTMLSelectElement).value)}
                  class="px-1 py-0.5 bg-transparent focus:outline-none"
                >
                  <option value="leq">≤</option>
                  <option value="geq">≥</option>
                  <option value="eq">=</option>
                </select>
              </td>
              <!-- b -->
              <td class="border border-gray-200 p-0" data-coupling-b>
                <input
                  type="number"
                  step="any"
                  value={row.b}
                  oninput={(e) => updateCouplingB(r, (e.target as HTMLInputElement).value)}
                  class="w-16 px-1 py-0.5 text-right focus:outline-none focus:bg-blue-50"
                />
              </td>
              <!-- Remove -->
              <td class="border-0 pl-1">
                <button
                  type="button"
                  onclick={() => removeCouplingRow(r)}
                  class="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove coupling row {r + 1}"
                >×</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- Dimension error -->
  {#if dimensionError}
    <p
      class="mt-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
      data-dimension-error
      data-error
      role="alert"
    >
      ⚠ {dimensionError}
    </p>
  {/if}
</section>

<!-- -------------------------------------------------------------------------
     Sub-problem blocks
------------------------------------------------------------------------- -->
<section aria-labelledby="subproblems-heading">
  <div class="flex items-center justify-between mb-3">
    <h2 id="subproblems-heading" class="text-lg font-semibold text-[var(--color-text-primary)]">
      Sub-problem Blocks
    </h2>
    <button
      type="button"
      onclick={addBlock}
      data-add-block
      class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 transition-colors"
    >
      + Sub-problem
    </button>
  </div>

  {#if subproblems.length === 0}
    <p class="text-sm text-[var(--color-text-secondary)] italic">
      No sub-problem blocks yet — click "+ Sub-problem" to add one.
    </p>
  {:else}
    <div class="space-y-3">
      {#each subproblems as sp, idx (sp.index)}
        <div class="relative">
          <SubProblemBlock
            block={sp}
            onchange={(updated) => updateBlock(idx, updated)}
          />
          <button
            type="button"
            onclick={() => removeBlock(idx)}
            class="absolute top-3 right-10 text-xs text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Remove sub-problem {sp.index}"
          >
            Remove
          </button>
        </div>
      {/each}
    </div>
  {/if}
</section>
