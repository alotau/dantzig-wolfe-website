<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  interface GlossaryEntry {
    term: string
    shortDef: string
    relatedTerms: string[]
    slug: string
    body?: string
  }

  interface Props {
    entries: GlossaryEntry[]
  }

  let { entries }: Props = $props()

  let open = $state(false)
  let selectedTerm = $state<GlossaryEntry | null>(null)
  let filterText = $state('')
  let panelEl = $state<HTMLElement | null>(null)
  let filterInput = $state<HTMLInputElement | null>(null)
  let previouslyFocused = $state<HTMLElement | null>(null)

  const filtered = $derived(
    filterText.trim() === ''
      ? [...entries].sort((a, b) => a.term.localeCompare(b.term))
      : entries
          .filter((e) => e.term.toLowerCase().includes(filterText.toLowerCase()))
          .sort((a, b) => a.term.localeCompare(b.term)),
  )

  function openPanel(term?: string) {
    previouslyFocused = document.activeElement as HTMLElement
    open = true
    if (term) {
      const entry = entries.find((e) => e.term.toLowerCase() === term.toLowerCase())
      selectedTerm = entry ?? null
    } else {
      selectedTerm = null
    }
    // Focus the filter input on next tick
    setTimeout(() => filterInput?.focus(), 50)
  }

  function closePanel() {
    open = false
    selectedTerm = null
    filterText = ''
    previouslyFocused?.focus()
    previouslyFocused = null
  }

  function handleGlossaryEvent(e: Event) {
    const detail = (e as CustomEvent<{ term?: string }>).detail
    openPanel(detail?.term)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return
    if (e.key === 'Escape') {
      closePanel()
      return
    }
    // Trap focus within panel
    if (e.key === 'Tab' && panelEl) {
      const focusable = Array.from(
        panelEl.querySelectorAll<HTMLElement>('a, button, input, [tabindex]:not([tabindex="-1"])'),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  onMount(() => {
    window.addEventListener('open-glossary', handleGlossaryEvent)
    document.addEventListener('keydown', handleKeydown)
  })

  onDestroy(() => {
    window.removeEventListener('open-glossary', handleGlossaryEvent)
    document.removeEventListener('keydown', handleKeydown)
  })
</script>

<!-- Backdrop -->
{#if open}
  <div class="fixed inset-0 z-40 bg-black/30" onclick={closePanel} aria-hidden="true"></div>
{/if}

<!-- Panel -->
<div
  bind:this={panelEl}
  data-glossary-panel
  role="dialog"
  aria-modal="true"
  aria-label="Glossary"
  aria-hidden={!open}
  class={[
    'fixed right-0 top-0 z-50 h-full w-80 max-w-full bg-white shadow-xl flex flex-col transition-transform duration-300',
    open ? 'translate-x-0' : 'translate-x-full',
  ].join(' ')}
>
  <!-- Header -->
  <div
    class="flex items-center justify-between border-b px-4 py-3 bg-[var(--color-primary)] text-white"
  >
    <h2 class="font-semibold text-base">Glossary</h2>
    <button
      type="button"
      aria-label="Close Glossary"
      onclick={closePanel}
      class="rounded p-1 hover:bg-white/20 transition-colors"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path
          d="M14 4L4 14M4 4l10 10"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>

  {#if selectedTerm}
    <!-- Definition view -->
    <div class="flex-1 overflow-y-auto p-4">
      <button
        type="button"
        onclick={() => {
          selectedTerm = null
        }}
        class="mb-3 text-sm text-[var(--color-accent)] hover:underline"
        aria-label="Back to term list"
      >
        ← Back to list
      </button>
      <h3 class="text-lg font-semibold text-[var(--color-primary)] mb-2">{selectedTerm.term}</h3>
      <p class="text-sm leading-relaxed text-gray-700" data-glossary-definition>{selectedTerm.shortDef}</p>

      {#if selectedTerm.relatedTerms.length > 0}
        <div class="mt-4">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Related terms
          </p>
          <ul class="flex flex-wrap gap-2">
            {#each selectedTerm.relatedTerms as rel}
              <li>
                <button
                  type="button"
                  data-glossary-term={rel}
                  onclick={() => {
                    const entry = entries.find((e) => e.term.toLowerCase() === rel.toLowerCase())
                    if (entry) selectedTerm = entry
                  }}
                  class="px-2 py-0.5 rounded text-xs bg-[var(--color-math-bg)] text-[var(--color-primary)] hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                >
                  {rel}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Term list view -->
    <div class="p-3 border-b">
      <label for="glossary-filter" class="sr-only">Filter terms</label>
      <input
        id="glossary-filter"
        bind:this={filterInput}
        bind:value={filterText}
        type="search"
        placeholder="Filter terms…"
        class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-[var(--color-accent)] focus:outline-2"
        aria-label="Filter glossary terms"
      />
    </div>
    <ul class="flex-1 overflow-y-auto divide-y text-sm" role="list">
      {#each filtered as entry (entry.slug)}
        <li>
          <button
            type="button"
            data-glossary-term={entry.term}
            onclick={() => {
              selectedTerm = entry
            }}
            class="w-full text-left px-4 py-2.5 hover:bg-[var(--color-math-bg)] transition-colors"
          >
            <span class="font-medium text-[var(--color-primary)]">{entry.term}</span>
            <span class="block text-xs text-gray-500 truncate mt-0.5">{entry.shortDef}</span>
          </button>
        </li>
      {:else}
        <li class="px-4 py-6 text-center text-gray-400 text-sm">No terms match "{filterText}"</li>
      {/each}
    </ul>
  {/if}
</div>
