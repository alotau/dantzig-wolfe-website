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
  let canvasRef = $state<HTMLCanvasElement | undefined>(undefined)

  // ---------------------------------------------------------------------------
  // Chart — created/destroyed via $effect
  // ---------------------------------------------------------------------------
  $effect(() => {
    if (!canvasRef) return

    // Dynamic import to avoid including Chart.js in the SSR bundle
    let chart: import('chart.js').Chart | null = null

    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables)

      const labels = iterations.map((it) => it.iterationNumber)
      const data = iterations.map((it) => it.masterObjectiveValue)

      chart = new Chart(canvasRef!, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Restricted master objective',
              data,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              pointBackgroundColor: 'rgb(59, 130, 246)',
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                title(items) {
                  return `Iteration ${items[0].label}`
                },
                afterBody(items) {
                  const idx = items[0].dataIndex
                  const iter = iterations[idx]
                  if (!iter) return []
                  return [
                    `Best reduced cost: ${iter.enteringColumnReducedCost.toFixed(6)}`,
                    `Sub-problem: ${iter.enteringSubproblemIndex + 1}`,
                  ]
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Iteration',
                font: { size: 12 },
              },
              ticks: { precision: 0 },
            },
            y: {
              title: {
                display: true,
                text: 'Master objective value',
                font: { size: 12 },
              },
            },
          },
        },
      })
    })

    return () => {
      chart?.destroy()
      chart = null
    }
  })
</script>

<!--
  data-convergence-chart — Playwright selector hook
  Outer div sets a fixed height so the canvas is measurable
-->
<div class="relative h-64 w-full" data-convergence-chart>
  {#if iterations.length === 0}
    <p class="flex h-full items-center justify-center text-sm text-gray-400">
      No iteration data yet.
    </p>
  {:else}
    <canvas bind:this={canvasRef} aria-label="Convergence chart"></canvas>
  {/if}
</div>
