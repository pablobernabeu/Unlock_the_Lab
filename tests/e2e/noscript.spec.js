// Without JavaScript, each page says that it needs it. The build fills these
// <noscript> messages from the locale files (tools/vite-plugin-i18n.js).
import { expect, test } from './test.js';

test.use({ javaScriptEnabled: false });

for (const [path, message] of [
    ['/', 'This workshop needs JavaScript. Please turn it on or try a different browser.'],
    [
        '/dashboard.html',
        'The live dashboard needs JavaScript. Turn it on in your browser and reload the page.',
    ],
    [
        '/admin.html',
        'The facilitator panel needs JavaScript. Turn it on in your browser and reload the page.',
    ],
]) {
    test(`without JavaScript, ${path} says that it needs it`, async ({ page }) => {
        await page.goto(path);
        const notice = page.locator('main noscript .info-box--warning');
        await expect(notice).toBeVisible();
        await expect(notice).toHaveText(message);
    });
}
