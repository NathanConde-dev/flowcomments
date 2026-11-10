import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const screenshots = [
  { name: 'home', url: '/dashboard', width: 1440, height: 900 },
  { name: 'contatos', url: '/contacts', width: 1440, height: 900 },
  { name: 'automacoes', url: '/automations', width: 1440, height: 900 },
  { name: 'inbox', url: '/inbox', width: 1440, height: 900 },
  { name: 'settings', url: '/settings', width: 1440, height: 900 },
  { name: 'login', url: '/login', width: 1440, height: 900, noAuth: true },
  { name: 'setup', url: '/setup', width: 1440, height: 900, noAuth: true },
  { name: 'mobile-drawer', url: '/dashboard', width: 390, height: 844 },
];

const baseUrl = 'http://localhost:8080';

async function takeScreenshots() {
  await mkdir('docs/screenshots', { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Login first
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
  await page.close();

  for (const shot of screenshots) {
    console.log(`Taking screenshot: ${shot.name}`);
    const page = await context.newPage();
    await page.setViewportSize({ width: shot.width, height: shot.height });

    if (shot.noAuth) {
      // New context for non-auth pages
      const noAuthContext = await browser.newContext();
      const noAuthPage = await noAuthContext.newPage();
      await noAuthPage.setViewportSize({ width: shot.width, height: shot.height });
      await noAuthPage.goto(`${baseUrl}${shot.url}`, { waitUntil: 'networkidle' });
      await noAuthPage.screenshot({ path: `docs/screenshots/${shot.name}.png` });
      await noAuthContext.close();
    } else {
      await page.goto(`${baseUrl}${shot.url}`, { waitUntil: 'networkidle' });

      // Open drawer for mobile screenshot
      if (shot.name === 'mobile-drawer') {
        const menuButton = page.locator('button').filter({ hasText: /menu/i }).first();
        if (await menuButton.count() > 0) {
          await menuButton.click();
          await page.waitForTimeout(500);
        }
      }

      // Click "Nova Automação" for automations modal
      if (shot.name === 'automacoes') {
        const newButton = page.locator('button').filter({ hasText: /nova automação/i });
        if (await newButton.count() > 0) {
          await newButton.click();
          await page.waitForTimeout(1000);
        }
      }

      await page.screenshot({ path: `docs/screenshots/${shot.name}.png` });
    }

    await page.close();
  }

  await browser.close();
  console.log('All screenshots taken!');
}

takeScreenshots().catch(console.error);
