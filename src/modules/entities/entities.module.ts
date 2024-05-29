import { Module } from '@nestjs/common';
import { EntitiesController } from './entities.controller';
import { EntitiesService } from './entities.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region } from './entities/regions.entity';
import { Comune } from './entities/comunas.entity';
import { Entities } from './entities/entities.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Region, Comune, Entities])],
  controllers: [EntitiesController],
  providers: [EntitiesService],
})
export class EntitiesModule {}
