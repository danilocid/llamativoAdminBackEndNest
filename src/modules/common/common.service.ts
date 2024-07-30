import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment_method.entity';
import { DocumentType } from './entities/document_type.entity';
import { Sales } from '../sales/entities/sales.entity';
export class CommonService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(DocumentType)
    private documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(Sales)
    private salesRepository: Repository<Sales>,
  ) {}

  // get payment methods
  async getPaymentMethods() {
    const paymentMethods = await this.paymentMethodRepository.find();
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Métodos de pago obtenidos.',
      data: paymentMethods,
    };
  }

  // get document types
  async getDocumentTypes() {
    const documentTypes = await this.documentTypeRepository.find();
    // select the last emitted document type from the sales table, for each document type
    const lastDocumentType = await this.salesRepository
      .createQueryBuilder('sales')
      .select('MAX(sales.documento)', 'lastDocument')
      .addSelect('sales.tipo_documento', 'documentType')
      .groupBy('sales.tipo_documento')
      .getRawMany();

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Tipos de documento obtenidos.',
      data: documentTypes,
      lastDocumentType: lastDocumentType,
    };
  }
}
