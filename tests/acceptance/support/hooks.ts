import { BeforeAll, Before, After, AfterAll, setWorldConstructor } from '@cucumber/cucumber'
import { chromium } from '@playwright/test'
import { CustomWorld } from './world.js'
import * as path from 'path'
import * as fs from 'fs'

setWorldConstructor(CustomWorld)

let sharedBrowser: import('@playwright/test').Browser

BeforeAll(async () => {
  sharedBrowser = await chromium.launch({ headless: true })
})

Before(async function (this: CustomWorld) {
  this.browser = sharedBrowser
  this.page = await sharedBrowser.newPage()
})

After(async function (this: CustomWorld, scenario) {
  if (scenario.result?.status === 'FAILED') {
    const screenshotDir = path.join(process.cwd(), 'reports', 'screenshots')
    fs.mkdirSync(screenshotDir, { recursive: true })

    const safeName = scenario.pickle.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const screenshotPath = path.join(screenshotDir, `${safeName}.png`)

    await this.page.screenshot({ path: screenshotPath, fullPage: true })
    this.attach(fs.readFileSync(screenshotPath), 'image/png')
  }

  await this.page.close()
})

AfterAll(async () => {
  await sharedBrowser.close()
})
