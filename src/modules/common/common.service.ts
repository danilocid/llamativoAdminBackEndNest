import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment_method.entity';
import { DocumentType } from './entities/document_type.entity';
export class CommonService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(DocumentType)
    private documentTypeRepository: Repository<DocumentType>,
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
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Tipos de documento obtenidos.',
      data: documentTypes,
    };
  }
}
