// pw_blank.mjs — Step 0 check: Playwright can launch Chromium and open about:blank.
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('about:blank'); console.log('playwright url:', p.url(), 'chromium', b.version()); await b.close();
