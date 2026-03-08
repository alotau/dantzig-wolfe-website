import { World, type IWorldOptions } from '@cucumber/cucumber'
import type { Browser, Page } from '@playwright/test'

export class CustomWorld extends World {
  browser!: Browser
  page!: Page
  baseURL: string

  constructor(options: IWorldOptions) {
    super(options)
    this.baseURL = process.env.BASE_URL ?? 'http://localhost:4321'
  }
}
