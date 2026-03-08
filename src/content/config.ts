import { defineCollection, z } from 'astro:content'

const history = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    order: z.number().int().nonnegative(),
    description: z.string().optional(),
  }),
})

const lessons = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    section: z.number().int().positive(),
    order: z.number().int().nonnegative(),
    prerequisites: z.array(z.string()).default([]),
  }),
})

const ProblemClassEnum = z.enum(['network-flow', 'scheduling', 'cutting-stock', 'other'])

const examples = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    problemClass: ProblemClassEnum,
    source: z.string(),
    doi: z.string().optional(),
    description: z.string().optional(),
  }),
})

const glossary = defineCollection({
  type: 'content',
  schema: z.object({
    term: z.string(),
    shortDef: z.string(),
    relatedTerms: z.array(z.string()).default([]),
  }),
})

export const collections = { history, lessons, examples, glossary }

// Re-export CollectionEntry for convenience in consuming components
export type { CollectionEntry } from 'astro:content'
