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