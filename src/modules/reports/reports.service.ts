import { InjectRepository } from '@nestjs/typeorm';
import { Sales } from '../sales/entities/sales.entity';
import { Repository, Between } from 'typeorm';
import { ReportDataType } from './entities/report-data-type.entity';
import { ReportDataTypeDto } from './dto/report-data-type.dto';
import { BadRequestException } from '@nestjs/common';
import { ReportData } from './entities/report-data.entity';
import { InsertReportDataDto } from './dto/insert-report-data.dto';

export class ReportsService {
  constructor(
    // Inject the Sales entity
    @InjectRepository(Sales)
    private salesRepository: Repository<Sales>,
    @InjectRepository(ReportDataType)
    private reportDataTypeRepository: Repository<ReportDataType>,
    @InjectRepository(ReportData)
    private reportDataRepository: Repository<ReportData>,
  ) {}

  async getMonthlySales(month: number, year: number) {
    // Get all sales from the given month and year
    // Return the total amount of sales
    // get a report of the sales for the given month and year
    //the report is a result of the sum of the total amount of all sales, by document type
    //the report is grouped by document type

    const initialDate = new Date(year, month - 1, 1, 0, 0, 0);
    const finalDate = new Date(year, month, 0, 39, 59, 59);
    console.log(initialDate);
    console.log(finalDate);
    const sales = await this.salesRepository.find({
      where: {
        fecha: Between(initialDate, finalDate),
      },
      relations: ['tipo_documento'],
    });

    const docTypes = [];
    sales.forEach((sale) => {
      // If the document type is not in the object, add it
      const docExist = docTypes.find(
        (doc) => doc.id === sale.tipo_documento.id,
      );
      if (!docExist) {
        docTypes.push({
          id: sale.tipo_documento.id,
          name: sale.tipo_documento.tipo,
          total: sale.monto_neto + sale.monto_imp,
          count: 1,
        });
      } else {
        // If the document type is already in the object, sum the total amount
        docExist.total += sale.monto_neto + sale.monto_imp;
        docExist.count += 1;
      }
    });

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Ventas mensuales obtenidas.',
      data: docTypes,
    };
  }

  // get report data types
  async getReportDataTypes(activo: boolean) {
    // Get all report data types
    // Return the report data types that are active
    // get all report data types
    //return all report data types that are active
    let reportDataTypes: ReportDataType[];
    if (activo == true) {
      reportDataTypes = await this.reportDataTypeRepository.find({
        where: {
          activo: true,
        },
        order: {
          orden: 'ASC',
        },
      });
    } else {
      reportDataTypes = await this.reportDataTypeRepository.find({
        order: {
          orden: 'ASC',
        },
      });
    }
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Tipos de datos de reporte obtenidos.',
      data: reportDataTypes,
    };
  }

  // update report data type
  async updateReportDataType(id: number, reportDataTypeDto: ReportDataTypeDto) {
    // Update the report data type with the given id
    // Return the updated report data type
    //update the report data type with the given id
    const reportDataType = await this.reportDataTypeRepository.findOne({
      where: {
        id,
      },
    });
    if (!reportDataType) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Tipo de dato de reporte no encontrado.',
      };
    }

    // if the report data type order is different from the current one, update the order of the other report data types
    // the order of the report data types must be consecutive numbers starting from 1
    //update the report data type only if the order is greater than the current new order
    if (reportDataType.orden > reportDataTypeDto.orden) {
      // Actualizar elementos con orden entre el nuevo y el viejo
      const reportDataTypes = await this.reportDataTypeRepository.find({
        where: {
          orden: Between(reportDataTypeDto.orden, reportDataType.orden - 1),
        },
      });

      for (const rdt of reportDataTypes) {
        rdt.orden = rdt.orden + 1;
        await this.reportDataTypeRepository.save(rdt);
      }
    } else if (reportDataType.orden < reportDataTypeDto.orden) {
      // Actualizar elementos con orden entre el viejo y el nuevo
      const reportDataTypes = await this.reportDataTypeRepository.find({
        where: {
          orden: Between(reportDataType.orden + 1, reportDataTypeDto.orden),
        },
      });

      for (const rdt of reportDataTypes) {
        rdt.orden = rdt.orden - 1;
        await this.reportDataTypeRepository.save(rdt);
      }
    }

    reportDataType.dato = reportDataTypeDto.dato;
    reportDataType.orden = reportDataTypeDto.orden;
    reportDataType.activo = reportDataTypeDto.activo == 1 ? true : false;
    reportDataType.isNumber = reportDataTypeDto.isNumber == 1 ? true : false;
    reportDataType.isMoney = reportDataTypeDto.isMoney == 1 ? true : false;
    reportDataType.updatedAt = new Date();
    reportDataType.createdAt = new Date();

    await this.reportDataTypeRepository.save(reportDataType);

    //update the report data type order

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Tipo de dato de reporte actualizado.',
      data: reportDataType,
    };
  }

  //create report data type
  async createReportDataType(reportDataTypeDto: ReportDataTypeDto) {
    // Create a new report data type
    // Return the created report data type
    //create a new report data type

    // check if the data type already exists
    const reportDataTypeExist = await this.reportDataTypeRepository.findOne({
      where: {
        dato: reportDataTypeDto.dato,
      },
    });

    if (reportDataTypeExist) {
      throw new BadRequestException('El tipo de dato de reporte ya existe.');
    }
    const reportDataType = new ReportDataType();
    reportDataType.dato = reportDataTypeDto.dato;
    reportDataType.orden = reportDataTypeDto.orden;
    reportDataType.activo = reportDataTypeDto.activo == 1 ? true : false;
    reportDataType.isNumber = reportDataTypeDto.isNumber == 1 ? true : false;
    reportDataType.isMoney = reportDataTypeDto.isMoney == 1 ? true : false;
    reportDataType.createdAt = new Date();
    reportDataType.updatedAt = new Date();

    await this.reportDataTypeRepository.save(reportDataType);

    const reportDataTypes = await this.reportDataTypeRepository.find({
      order: {
        orden: 'ASC',
      },
    });

    for (let i = 0; i < reportDataTypes.length; i++) {
      reportDataTypes[i].orden = i + 1;
      await this.reportDataTypeRepository.save(reportDataTypes[i]);
    }

    return {
      serverResponseCode: 201,
      serverResponseMessage: 'Tipo de dato de reporte creado.',
      data: reportDataType,
    };
  }

  // get report data
  async getReportData(month: number, year: number) {
    // Get all report data from the given month and year
    // Return the report data
    //get all report data for the given month and year

    const reportData = await this.reportDataRepository.find({
      where: {
        mes: month,
        año: year,
      },
      relations: ['reportDataType'],
    });

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Datos de reporte obtenidos.',
      data: reportData,
    };
  }

  // insertReportData
  async insertReportData(data: InsertReportDataDto) {
    // Insert the report data
    // Return the inserted report data
    //insert the report data

    // check if the report data already exists
    const reportDataExist = await this.reportDataRepository.findOne({
      where: {
        mes: data.mes,
        año: data.año,
      },
    });

    if (reportDataExist) {
      throw new BadRequestException('Los datos de reporte ya existen.');
    }

    for (const d of data.data) {
      const reportData = new ReportData();
      reportData.mes = data.mes;
      reportData.año = data.año;
      reportData.dato = d.valor;
      reportData.reportDataType = await this.reportDataTypeRepository.findOne({
        where: {
          id: d.id,
        },
      });
      reportData.createdAt = new Date();
      await this.reportDataRepository.save(reportData);
    }

    return {
      serverResponseCode: 201,
      serverResponseMessage: 'Datos de reporte insertados.',
    };
  }
}
