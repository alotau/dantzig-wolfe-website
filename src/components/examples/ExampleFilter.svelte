<script lang="ts">
  interface Example {
    title: string
    problemClass: string
    description?: string
    source: string
    slug: string
  }

  interface Props {
    examples: Example[]
  }

  const { examples }: Props = $props()

  const ALL = 'all'

  const filters = [
    { value: ALL, label: 'All' },
    { value: 'cutting-stock', label: 'Cutting Stock' },
    { value: 'network-flow', label: 'Network Flow' },
    { value: 'scheduling', label: 'Scheduling' },
    { value: 'other', label: 'Other' },
  ]

  const badgeLabels: Record<string, string> = {
    'network-flow': 'Network Flow',
    scheduling: 'Scheduling',
    'cutting-stock': 'Cutting Stock',
    other: 'Other',
  }

  const badgeColors: Record<string, string> = {
    'network-flow': 'bg-blue-100 text-blue-800',
    scheduling: 'bg-green-100 text-green-800',
    'cutting-stock': 'bg-orange-100 text-orange-800',
    other: 'bg-gray-100 text-gray-700',
  }

  let activeFilter = $state(ALL)

  const filtered = $derived(
    activeFilter === ALL ? examples : examples.filter((e) => e.problemClass === activeFilter),
  )
</script>

<div>
  <!-- Filter bar -->
  <div class="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter examples by problem class">
    {#each filters as f (f.value)}
      <button
        type="button"
        data-filter-btn
        data-problem-class={f.value}
        aria-pressed={activeFilter === f.value}
        onclick={() => (activeFilter = f.value)}
        class={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
          activeFilter === f.value
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:border-[var(--color-primary)]'
        }`}
      >
        {f.label}
      </button>
    {/each}
  </div>

  <!-- Example list -->
  {#if filtered.length === 0}
    <p class="text-gray-500">No examples found for this filter.</p>
  {:else}
    <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each filtered as example (example.slug)}
        <li>
          <article
            data-example-card
            data-problem-class={example.problemClass}
            class="h-full rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col"
          >
            <div class="flex items-start justify-between gap-3 mb-3">
              <h2 class="text-lg font-semibold text-[var(--color-primary)]">
                <a href={`/examples/${example.slug}`} class="hover:underline">{example.title}</a>
              </h2>
              <span
                class={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[example.problemClass] ?? 'bg-gray-100 text-gray-700'}`}
              >
                {badgeLabels[example.problemClass] ?? example.problemClass}
              </span>
            </div>

            {#if example.description}
              <p class="mb-3 text-gray-600 text-sm leading-relaxed grow">{example.description}</p>
            {/if}

            <cite
              class="block text-xs text-gray-500 not-italic border-l-2 border-gray-200 pl-2 mt-auto"
            >
              {example.source}
            </cite>
          </article>
        </li>
      {/each}
    </ul>
  {/if}
</div>
