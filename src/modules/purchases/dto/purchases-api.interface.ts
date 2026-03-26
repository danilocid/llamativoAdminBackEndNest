// Nueva estructura de respuesta de BaseAPI
export interface BaseApiPurchaseResponse {
  success: boolean;
  data: {
    totalRegistros: number;
    datos: PurchaseApiData[];
    resumenPorTipo: ResumenPorTipo[];
  };
}

export interface PurchaseApiData {
  Nro: string;
  'Tipo Doc': string;
  'Tipo Compra': string;
  'RUT Proveedor': string;
  'Razon Social': string;
  Folio: string;
  'Fecha Docto': string;
  'Fecha Recepcion': string;
  'Fecha Acuse': string;
  'Monto Exento': string;
  'Monto Neto': string;
  'Monto IVA Recuperable': string;
  'Monto Iva No Recuperable': string;
  'Codigo IVA No Rec.': string;
  'Monto Total': string;
  'Monto Neto Activo Fijo': string;
  'IVA Activo Fijo': string;
  'IVA uso Comun': string;
  'Impto. Sin Derecho a Credito': string;
  'IVA No Retenido': string;
  'Tabacos Puros': string;
  'Tabacos Cigarrillos': string;
  'Tabacos Elaborados': string;
  'NCE o NDE sobre Fact. de Compra': string;
  'Codigo Otro Impuesto': string;
  'Valor Otro Impuesto': string;
  'Tasa Otro Impuesto': string;
}

export interface ResumenPorTipo {
  tipoDocumento: string;
  codigoTipoDoc: number;
  totalDocumentos: number;
  montoExento: number;
  montoNeto: number;
  montoIva: number;
  montoTotal: number;
}

// Interfaz anterior (deprecated, mantener por compatibilidad)
export interface PurchaseApiResponse {
  tipoDTEString: string;
  tipoDTE: number;
  tipoCompra: string;
  rutProveedor: string;
  razonSocial: string;
  folio: number;
  fechaEmision: Date;
  fechaRecepcion: Date;
  acuseRecibo: string;
  montoExento: number;
  montoNeto: number;
  montoIvaRecuperable: number;
  montoIvaNoRecuperable: number;
  codigoIvaNoRecuperable: number;
  montoTotal: number;
  montoNetoActivoFijo: number;
  ivaActivoFijo: number;
  ivaUsoComun: number;
  impuestoSinDerechoCredito: number;
  ivaNoRetenido: number;
  tabacosPuros: number;
  tabacosCigarrillos: number;
  tabacosElaborados: number;
  totalOtrosImpuestos: number;
  valorOtroImpuesto: null;
  tasaOtroImpuesto: null;
  tipoDocReferencia: number;
  folioDocReferencia: string;
  estado: string;
}
