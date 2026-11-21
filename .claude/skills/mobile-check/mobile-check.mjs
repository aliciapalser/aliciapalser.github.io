#!/usr/bin/env node
// Mobile preview of the portfolio using Chrome DevTools Protocol (CDP).
//
// `chrome --headless --window-size=390,...` is not a faithful phone view
// (headless Chrome enforces a minimum window width), so this script emulates
// a real phone viewport instead, checks for common responsive problems and
// saves a screenshot.
//
// Usage:
//   node mobile-check.mjs --out <dir> [--url http://localhost:1313/es/]
//        [--section skills] [--full] [--width 390] [--height 844]
//
// Requires Node >= 22 (global fetch and WebSocket) and Google Chrome.
// Prints a JSON report on stdout; exit code 1 on errors.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:1313/' },
    out: { type: 'string' },
    section: { type: 'string' },
    full: { type: 'boolean', default: false },
    width: { type: 'string', default: '390' },
    height: { type: 'string', default: '844' }
  }
})

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const width = Number(args.width)
const height = Number(args.height)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function fail (message) {
  console.error(`mobile-check: ${message}`)
  process.exitCode = 1
}

async function main () {
  if (!args.out) return fail('missing --out <directory> for screenshots')
  if (!existsSync(CHROME)) return fail(`Google Chrome not found at ${CHROME} (set CHROME_PATH)`)

  // Fail fast with a clear message if the site is not being served.
  try {
    const res = await fetch(args.url)
    if (!res.ok) return fail(`${args.url} answered HTTP ${res.status}`)
  } catch {
    return fail(`cannot reach ${args.url} - is \`hugo server\` running?`)
  }

  mkdirSync(args.out, { recursive: true })
  const profile = mkdtempSync(join(tmpdir(), 'mobile-check-profile-'))
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank'
  ], { stdio: 'ignore' })

  let ws
  try {
    // Chrome writes the port it picked into DevToolsActivePort.
    const portFile = join(profile, 'DevToolsActivePort')
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100)
    if (!existsSync(portFile)) throw new Error('Chrome did not start (no DevToolsActivePort)')
    const port = readFileSync(portFile, 'utf8').split('\n')[0].trim()

    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    const page = targets.find((t) => t.type === 'page')
    ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true })
      ws.addEventListener('error', reject, { once: true })
    })

    let nextId = 0
    const pending = new Map()
    const listeners = []
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg)
        pending.delete(msg.id)
      } else if (msg.method) {
        listeners.forEach((fn) => fn(msg))
      }
    })
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)))
      ws.send(JSON.stringify({ id, method, params }))
    })
    const waitFor = (method, timeout = 15000) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), timeout)
      listeners.push((msg) => { if (msg.method === method) { clearTimeout(timer); resolve(msg) } })
    })

    const consoleErrors = []
    listeners.push((msg) => {
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text)
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        consoleErrors.push(`${msg.params.entry.text} ${msg.params.entry.url || ''}`.trim())
      }
    })

    await send('Page.enable')
    await send('Runtime.enable')
    await send('Log.enable')
    await send('Emulation.setUserAgentOverride', { userAgent: IPHONE_UA })
    await send('Emulation.setTouchEmulationEnabled', { enabled: true })
    await send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 2, mobile: true, screenWidth: width, screenHeight: height
    })

    const loaded = waitFor('Page.loadEventFired')
    await send('Page.navigate', { url: args.url })
    await loaded
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true })
    await sleep(800) // let Filterizr position the cards

    const { result } = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        // clientWidth = visible width; mobile browsers widen innerWidth to fit overflowing content.
        const vw = document.documentElement.clientWidth;
        // An element sticking out is only a problem if no ancestor clips it.
        const clipped = (el) => {
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX;
            if ((ox === 'hidden' || ox === 'clip') && p.getBoundingClientRect().right <= vw + 1) return true;
          }
          return false;
        };
        const overflowing = [...document.querySelectorAll('body *')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !clipped(el);
          })
          .slice(0, 15)
          .map((el) => {
            const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).join('.') : '';
            return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls + ' (right=' + Math.round(el.getBoundingClientRect().right) + ')';
          });
        const home = document.querySelector('.home');
        const homeHeight = home ? Math.round(home.getBoundingClientRect().height) : null;
        return {
          viewport: vw + 'x' + window.innerHeight,
          layoutViewportWidth: window.innerWidth,
          horizontalScroll: document.documentElement.scrollWidth > vw,
          scrollWidth: document.documentElement.scrollWidth,
          overflowingElements: overflowing,
          heroHeight: homeHeight === null ? null : homeHeight + 'px (' + Math.round(homeHeight / window.innerHeight * 100) + '% of screen)',
          pageHeight: document.documentElement.scrollHeight
        };
      })()`
    })
    const report = { url: args.url, ...result.value }

    if (args.section) {
      const found = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => { const el = document.getElementById(${JSON.stringify(args.section)}); if (!el) return false; el.scrollIntoView(); return true })()`
      })
      report.section = found.result.value ? args.section : `${args.section} (not found)`
      await sleep(400)
    }

    const shotParams = { format: 'png' }
    if (args.full) {
      const { cssContentSize } = await send('Page.getLayoutMetrics')
      shotParams.captureBeyondViewport = true
      shotParams.clip = { x: 0, y: 0, width, height: Math.ceil(cssContentSize.height), scale: 1 }
    }
    const shot = await send('Page.captureScreenshot', shotParams)
    const slug = new URL(args.url).pathname.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home'
    const file = join(args.out, `mobile-${slug}${args.section ? '-' + args.section : ''}${args.full ? '-full' : ''}.png`)
    writeFileSync(file, Buffer.from(shot.data, 'base64'))

    report.consoleErrors = consoleErrors
    report.screenshot = file
    console.log(JSON.stringify(report, null, 2))
  } catch (error) {
    fail(error.message)
  } finally {
    try { ws?.close() } catch {}
    chrome.kill()
    await sleep(300)
    rmSync(profile, { recursive: true, force: true })
  }
}

await main()
