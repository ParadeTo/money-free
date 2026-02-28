import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { KLinesModule } from './modules/klines/klines.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ScreenerModule } from './modules/screener/screener.module';
import { StrategiesModule } from './modules/strategies/strategies.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    StocksModule,
    KLinesModule,
    IndicatorsModule,
    FavoritesModule,
    ScreenerModule,
    StrategiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
