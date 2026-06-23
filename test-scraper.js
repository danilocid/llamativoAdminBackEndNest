const { firefox } = require('playwright');
require('dotenv').config();

async function testScraper() {
  const rut = process.env.SII_RUT;
  const clave = process.env.SII_PASSWORD;

  if (!rut || !clave) {
    console.error('SII_RUT y SII_PASSWORD no configurados en .env');
    process.exit(1);
  }

  const SII_LOGIN_URL = 'https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi';
  const RCV_APP_URL = 'https://www4.sii.cl/consdcvinternetui';

  let browser = null;

  try {
    console.log('Lanzando Firefox...');
    browser = await firefox.launch({ headless: true });
    console.log('Firefox lanzado OK');

    const page = await browser.newPage();
    page.setDefaultTimeout(20000);

    console.log('Navegando a login SII...');
    await page.goto(SII_LOGIN_URL, { waitUntil: 'domcontentloaded' });
    console.log('URL login:', page.url());

    const rutInput = page.locator('#rutcntr');
    const visible = await rutInput.isVisible();
    console.log('Input RUT visible:', visible);

    if (!visible) {
      const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
      console.log('Contenido página login:', bodyText);
      throw new Error('Input RUT no encontrado');
    }

    await rutInput.fill(rut);
    await page.locator('#clave').fill(clave);
    await page.locator('#bt_ingresar').click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    console.log('URL post-login:', page.url());

    const errorEl = page.locator('#textoError');
    const hasError = await errorEl.isVisible().catch(() => false);
    if (hasError) {
      const errorText = await errorEl.innerText();
      throw new Error(`Login falló: ${errorText}`);
    }

    console.log('Navegando a RCV...');
    await page.goto(RCV_APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    console.log('URL RCV:', page.url());
    console.log('Título RCV:', await page.title());

    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 1000));
    console.log('Contenido RCV:', bodyText);

    console.log('\n--- TEST COMPLETADO EXITOSAMENTE ---');
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testScraper();
