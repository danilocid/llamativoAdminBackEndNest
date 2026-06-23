import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { PurchaseApiData } from './dto/purchases-api.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SiiScraperService {
  private readonly logger = new Logger(SiiScraperService.name);

  private readonly SII_LOGIN_URL =
    'https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi';

  private readonly RCV_APP_URL = 'https://www4.sii.cl/consdcvinternetui';

  private readonly DEBUG_DIR = path.join(process.cwd(), 'debug-screenshots');

  async scrapePurchases(mes: number, anio: number): Promise<PurchaseApiData[]> {
    this.logger.log(`Iniciando scraping RCV SII para ${mes}/${anio}`);

    const rut = process.env.SII_RUT;
    const clave = process.env.SII_PASSWORD;

    if (!rut || !clave) {
      this.logger.error('Variables de entorno SII_RUT y SII_PASSWORD no configuradas');
      return [];
    }

    if (!fs.existsSync(this.DEBUG_DIR)) {
      fs.mkdirSync(this.DEBUG_DIR, { recursive: true });
    }

    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        timeout: 30000,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--single-process',
        ],
      });

      const page = await browser.newPage();
      page.setDefaultTimeout(20000);

      await this.login(page, rut, clave);
      await page.goto(this.RCV_APP_URL, { waitUntil: 'networkidle' });

      await this.selectPeriod(page, mes, anio);

      await this.waitForResumenData(page);
      await this.screenshot(page, '03-resumen-loaded');

      const data = await this.extractFromResumenAndDetail(page);
      await this.screenshot(page, '04-final');

      this.logger.log(`Scraping completado, ${data.length} registros extraídos`);
      return data;
    } catch (error) {
      this.logger.error(`Error en scraping SII: ${(error as Error).message}`);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async screenshot(page: Page, name: string): Promise<void> {
    try {
      const filePath = path.join(this.DEBUG_DIR, `${name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      this.logger.log(`Screenshot guardado: ${filePath}`);

      const htmlPath = path.join(this.DEBUG_DIR, `${name}.html`);
      const html = await page.content();
      fs.writeFileSync(htmlPath, html, 'utf-8');
    } catch {
      // ignore
    }
  }

  private async login(page: Page, rut: string, clave: string): Promise<void> {
    this.logger.log('Navegando a página de login SII');
    await page.goto(this.SII_LOGIN_URL, { waitUntil: 'networkidle' });

    await page.locator('#rutcntr').fill(rut);
    await page.locator('#clave').fill(clave);
    await page.locator('#bt_ingresar').click();
    await page.waitForLoadState('networkidle');
    this.logger.log('Login completado');
  }

  private async dismissModal(page: Page): Promise<void> {
    await page.evaluate(() => {
      const modal = document.getElementById('esperaDialog');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('in');
      }
      document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
      document.body.classList.remove('modal-open');
    }).catch(() => {});
  }

  private async selectPeriod(page: Page, mes: number, anio: number): Promise<void> {
    this.logger.log(`Seleccionando período ${mes}/${anio}`);

    const monthSelect = page.locator('#periodoMes');
    await monthSelect.waitFor({ state: 'visible', timeout: 10000 });
    await monthSelect.selectOption(mes.toString().padStart(2, '0'));
    this.logger.log(`Mes seleccionado: ${mes}`);

    const yearSelect = page.locator('select[ng-model="periodoAnho"]');
    await yearSelect.waitFor({ state: 'visible', timeout: 10000 });
    await yearSelect.selectOption(String(anio));
    this.logger.log(`Año seleccionado: ${anio}`);

    const submitBtn = page.locator('button[type="submit"]:has-text("Consultar")');
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click();
    this.logger.log('Botón Consultar clickeado');
  }

  private async waitForResumenData(page: Page): Promise<void> {
    this.logger.log('Esperando datos del resumen...');

    await page.waitForFunction(
      () => {
        const rows = document.querySelectorAll('table[ng-if*="resumenRegistro"] tbody tr');
        return rows.length > 0;
      },
      { timeout: 30000 },
    );
    this.logger.log('Datos del resumen cargados');

    await this.dismissModal(page);
    await page.waitForTimeout(1000);
  }

  private async extractFromResumenAndDetail(page: Page): Promise<PurchaseApiData[]> {
    const allData: PurchaseApiData[] = [];

    const resumenRows = await page.locator('table[ng-if*="resumenRegistro"] tbody tr').all();
    this.logger.log(`Filas en resumen: ${resumenRows.length}`);

    for (const row of resumenRows) {
      const link = row.locator('a[href*="detalle"]').first();
      const tipoDocText = await link.innerText().catch(() => '');
      const match = tipoDocText.match(/\((\d+)\)/);
      const tipoDocCode = match ? match[1] : '';
      const tipoDocName = tipoDocText.replace(/\s*\(\d+\)/, '').trim();

      this.logger.log(`Tipo documento: ${tipoDocName} (código: ${tipoDocCode})`);

      if (link) {
        await this.dismissModal(page);

        await link.click({ force: true });
        await page.waitForTimeout(3000);
        await this.dismissModal(page);

        await page.waitForTimeout(3000);

        const detailData = await this.extractDetailTable(page, tipoDocCode, tipoDocName);
        allData.push(...detailData);

        await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
        await page.waitForTimeout(2000);
        await this.dismissModal(page);
      }
    }

    return allData;
  }

  private async extractDetailTable(page: Page, tipoDocCode: string, tipoDocName: string): Promise<PurchaseApiData[]> {
    this.logger.log('Extrayendo tabla de detalle...');

    const table = page.locator('#tableCompra');
    const isVisible = await table.isVisible().catch(() => false);

    if (!isVisible) {
      this.logger.warn('#tableCompra no visible en esta página');
      return [];
    }

    const headers = await page.locator('#tableCompra thead th div.dataTables_sizing').allTextContents();
    this.logger.log(`Headers reales: ${headers.join(' | ')}`);

    const rows = await page.locator('#tableCompra tbody tr').all();
    this.logger.log(`Filas de detalle: ${rows.length}`);

      const data: PurchaseApiData[] = [];

    for (const row of rows) {
      const cells = await row.locator('td').allTextContents();
      const cleanCells = cells.map((c) => c.trim());
      this.logger.log(`Fila (${cleanCells.length} celdas): ${cleanCells.join(' | ')}`);

      if (cleanCells.length < 13) continue;

      const rowMap: Record<string, string> = {};
      for (let i = 0; i < headers.length && i < cleanCells.length; i++) {
        const key = headers[i].replace(/\s+/g, ' ').trim();
        rowMap[key] = cleanCells[i];
      }

      const rutLink = row.locator('td a[data-original-title]').first();
      const razonSocial = await rutLink.getAttribute('data-original-title').catch(() => '') || '';

      data.push({
        Nro: '',
        'Tipo Doc': tipoDocCode,
        'Tipo Compra': rowMap['Tipo Compra'] || '',
        'RUT Proveedor': rowMap['RUT Proveedor'] || '',
        'Razon Social': razonSocial,
        Folio: rowMap['Folio'] || '',
        'Fecha Docto': rowMap['Fecha Docto.'] || rowMap['Fecha Docto'] || '',
        'Fecha Recepcion': rowMap['Fecha Recepci\u00f3n'] || rowMap['Fecha Recepcion'] || '',
        'Fecha Acuse': rowMap['Fecha Acuse Recibo'] || '',
        'Monto Exento': rowMap['Monto Exento'] || '0',
        'Monto Neto': rowMap['Monto Neto'] || '0',
        'Monto IVA Recuperable': rowMap['Monto IVA Recuperable'] || '0',
        'Monto Iva No Recuperable': rowMap['Monto Iva No Recuperable'] || '0',
        'Codigo IVA No Rec.': rowMap['C\u00f3digo Iva No Recuperable'] || rowMap['Codigo Iva No Recuperable'] || '0',
        'Monto Total': rowMap['Monto Total'] || '0',
        'Monto Neto Activo Fijo': rowMap['Monto Neto Activo Fijo'] || '0',
        'IVA Activo Fijo': rowMap['IVA Activo Fijo'] || '0',
        'IVA uso Comun': rowMap['IVA uso Com\u00f3n'] || rowMap['IVA uso Comun'] || '0',
        'Impto. Sin Derecho a Credito': rowMap['Impto. Sin Derecho a Cr\u00e9dito'] || rowMap['Impto. Sin Derecho a Credito'] || '0',
        'IVA No Retenido': rowMap['IVA No Retenido'] || '0',
        'Tabacos Puros': rowMap['Tabacos Puros'] || '0',
        'Tabacos Cigarrillos': rowMap['Tabacos Cigarrillos'] || '0',
        'Tabacos Elaborados': rowMap['Tabacos Elaborados'] || '0',
        'NCE o NDE sobre Fact. de Compra': rowMap['NCE o NDE sobre Fact. de Compra'] || '',
        'Codigo Otro Impuesto': rowMap['Total Otros Impuestos'] || '0',
        'Valor Otro Impuesto': '0',
        'Tasa Otro Impuesto': '0',
      });
    }

    return data;
  }
}
