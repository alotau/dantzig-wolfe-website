<script lang="ts">
  import type { ParsedProblemInstance } from '@/lib/solver/problem-schema.js'
  import type { SolverResult } from '@/lib/solver/worker-client.js'

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  interface Props {
    result: SolverResult
    problem: ParsedProblemInstance | null
    iterationCount: number
  }

  const { result, problem, iterationCount }: Props = $props()
</script>

<div class="space-y-5" data-solution-panel>
  <!-- -------------------------------------------------------------------------
       Status summary header
  ------------------------------------------------------------------------- -->
  {#if result.status === 'optimal'}
    <div class="flex items-center gap-3">
      <span
        class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800"
        data-solution-status
      >
        Solved — Optimal
      </span>
      <span class="text-sm text-gray-500">
        {result.solveTimeMs.toFixed(0)} ms · {iterationCount}
        {iterationCount !== 1 ? 'iterations' : 'iteration'}
      </span>
    </div>

    <!-- Objective value -->
    {#if result.objectiveValue !== undefined}
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
          Objective value
        </p>
        <p class="text-3xl font-mono font-bold text-[var(--color-accent)]" data-result-objective>
          {result.objectiveValue.toFixed(6)}
        </p>
      </div>
    {/if}

    <!-- Variable values grouped by sub-problem block -->
    {#if result.primalSolution}
      <div data-primal-solution>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Variable values
        </p>
        <div class="overflow-auto rounded-md border border-gray-200">
          <table
            class="w-full text-sm font-mono border-collapse"
            aria-label="Variable values by block"
          >
            <thead>
              <tr class="bg-gray-50 text-xs text-gray-600">
                <th class="border-b border-gray-200 px-4 py-2 text-left font-semibold"> Block </th>
                <th class="border-b border-gray-200 px-4 py-2 text-left font-semibold">
                  Variable
                </th>
                <th class="border-b border-gray-200 px-4 py-2 text-right font-semibold"> Value </th>
              </tr>
            </thead>
            <tbody>
              {#each result.primalSolution.variableValues as blockVars, blockIdx}
                {#each blockVars as val, varIdx}
                  <tr class="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition-colors">
                    <td class="border-b border-gray-100 px-4 py-1.5">
                      {problem?.subproblems[blockIdx]?.label ?? `Block ${blockIdx + 1}`}
                    </td>
                    <td class="border-b border-gray-100 px-4 py-1.5">
                      {problem?.subproblems[blockIdx]?.variableLabels?.[varIdx] ?? `x${varIdx + 1}`}
                    </td>
                    <td class="border-b border-gray-100 px-4 py-1.5 text-right">
                      {val.toFixed(6)}
                    </td>
                  </tr>
                {/each}
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Coupling constraint duals -->
    {#if result.dualSolution}
      <div data-dual-solution>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Coupling constraint duals (shadow prices)
        </p>
        <div class="overflow-auto rounded-md border border-gray-200">
          <table
            class="w-full text-sm font-mono border-collapse"
            aria-label="Coupling constraint dual values"
          >
            <thead>
              <tr class="bg-gray-50 text-xs text-gray-600">
                <th class="border-b border-gray-200 px-4 py-2 text-left font-semibold">
                  Constraint
                </th>
                <th class="border-b border-gray-200 px-4 py-2 text-right font-semibold">
                  Dual value
                </th>
              </tr>
            </thead>
            <tbody>
              {#each result.dualSolution.couplingDuals as dual, i}
                <tr class="odd:bg-white even:bg-gray-50">
                  <td class="border-b border-gray-100 px-4 py-1.5">
                    {problem?.coupling?.constraintLabels?.[i] ?? `Coupling ${i + 1}`}
                  </td>
                  <td class="border-b border-gray-100 px-4 py-1.5 text-right">
                    {dual.toFixed(6)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {:else if result.status === 'infeasible'}
    <div class="space-y-4">
      <span
        class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800"
        data-solution-status
      >
        Solved — Infeasible
      </span>

      {#if result.infeasibilityDiagnostic}
        {@const diag = result.infeasibilityDiagnostic}
        {@const boundBlocks = diag.blocks.filter((b) => b.boundViolations.length > 0)}
        {@const violatedRows = diag.coupling.filter((c) => c.violated)}

        {#if boundBlocks.length > 0}
          <div data-infeasibility-explanation>
            <p class="text-sm font-semibold text-gray-700 mb-1">
              Variable bound conflicts
            </p>
            <ul class="text-sm text-gray-700 space-y-0.5 list-disc list-inside">
              {#each boundBlocks as blk}
                {#each blk.boundViolations as vname}
                  <li>
                    <span class="font-mono">{vname}</span> in sub-problem {blk.index} ({blk.label})
                    — lower bound exceeds upper bound
                  </li>
                {/each}
              {/each}
            </ul>
          </div>
        {/if}

        {#if violatedRows.length > 0}
          <div data-infeasibility-explanation>
            <p class="text-sm font-semibold text-gray-700 mb-1">
              Coupling constraints provably violated at variable bounds
            </p>
            <div class="overflow-x-auto">
              <table class="text-xs border-collapse w-full">
                <thead>
                  <tr class="bg-gray-50">
                    <th class="border border-gray-200 px-2 py-1 text-left font-semibold">Constraint</th>
                    <th class="border border-gray-200 px-2 py-1 text-center font-semibold">Sense</th>
                    <th class="border border-gray-200 px-2 py-1 text-right font-semibold">RHS</th>
                    <th class="border border-gray-200 px-2 py-1 text-right font-semibold">Min achievable</th>
                    <th class="border border-gray-200 px-2 py-1 text-right font-semibold">Max achievable</th>
                  </tr>
                </thead>
                <tbody>
                  {#each violatedRows as row}
                    <tr class="bg-amber-50">
                      <td class="border border-gray-200 px-2 py-1">{row.label}</td>
                      <td class="border border-gray-200 px-2 py-1 text-center font-mono">
                        {row.sense === 'leq' ? '≤' : row.sense === 'geq' ? '≥' : '='}
                      </td>
                      <td class="border border-gray-200 px-2 py-1 text-right font-mono">{row.rhs}</td>
                      <td class="border border-gray-200 px-2 py-1 text-right font-mono">
                        {row.minAchievable !== undefined ? row.minAchievable.toFixed(4) : '−∞'}
                      </td>
                      <td class="border border-gray-200 px-2 py-1 text-right font-mono">
                        {row.maxAchievable !== undefined ? row.maxAchievable.toFixed(4) : '+∞'}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}

        {#if boundBlocks.length === 0 && violatedRows.length === 0}
          <p class="text-sm text-gray-700" data-infeasibility-explanation>
            The problem has no feasible solution. No simple bound conflict was detected — the
            infeasibility arises from the interplay of coupling constraints and sub-problem
            feasible regions. Check that the coupling right-hand sides are consistent with what
            the sub-problems can collectively achieve.
          </p>
        {/if}
      {:else}
        <p class="text-sm text-gray-700" data-infeasibility-explanation>
          The problem has no feasible solution. The constraints cannot all be satisfied
          simultaneously. This typically means the coupling constraints require more resources than
          the sub-problems can collectively provide.
        </p>
      {/if}
    </div>
  {:else if result.status === 'unbounded'}
    <div class="space-y-1">
      <span
        class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800"
        data-solution-status
      >
        Solved — Unbounded
      </span>
      <p class="text-sm text-gray-700 pt-2" data-unbounded-subproblem>
        {#if result.unboundedSubproblemIndex !== undefined}
          The problem is unbounded — sub-problem block {result.unboundedSubproblemIndex + 1}
          ({problem?.subproblems[result.unboundedSubproblemIndex]?.label ??
            `block ${result.unboundedSubproblemIndex + 1}`}) has an unbounded feasible region in the
          pricing direction.
        {:else}
          The problem is unbounded — at least one sub-problem has an unbounded feasible region.
        {/if}
      </p>
    </div>
  {:else if result.status === 'cancelled'}
    <div class="space-y-1">
      <span
        class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700"
        data-solution-status
      >
        Cancelled
      </span>
      <p class="text-sm text-gray-500 pt-2">
        {iterationCount}
        {iterationCount !== 1 ? 'iterations' : 'iteration'} completed before cancellation.
      </p>
    </div>
  {:else if result.status === 'error'}
    <div class="space-y-1">
      <span
        class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800"
        data-solution-status
      >
        Solver error
      </span>
      {#if result.errorMessage}
        <p class="text-sm text-red-700 font-mono pt-2" data-solver-error-message>
          {result.errorMessage}
        </p>
      {/if}
    </div>
  {/if}
</div>
