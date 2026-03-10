import { Injectable, Logger } from '@nestjs/common';

export interface TrendTemplateInput {
  currentPrice: number;
  ma50: number;
  ma150: number;
  ma200: number;
  ma200_22dAgo: number;
  high52Week: number;
  low52Week: number;
  rsRating: number;
}

export interface TrendTemplateCheckResult {
  name: string;
  label: string;
  pass: boolean;
  currentValue: number;
  threshold: number;
}

export interface TrendTemplateResult {
  allPass: boolean;
  checks: TrendTemplateCheckResult[];
}

@Injectable()
export class TrendTemplateService {
  private readonly logger = new Logger(TrendTemplateService.name);

  runAllChecks(input: TrendTemplateInput): TrendTemplateResult {
    const checks: TrendTemplateCheckResult[] = [
      this.checkPriceAboveMA150(input),
      this.checkPriceAboveMA200(input),
      this.checkMA150AboveMA200(input),
      this.checkMA200TrendingUp(input),
      this.checkMA50AboveMA150(input),
      this.checkMA50AboveMA200(input),
      this.checkPriceAboveMA50(input),
      this.checkAbove25PctFrom52WkLow(input),
      this.checkWithin25PctOf52WkHigh(input),
      this.checkRsRating(input),
    ];

    return {
      allPass: checks.every(c => c.pass),
      checks,
    };
  }

  private checkPriceAboveMA150(input: TrendTemplateInput): TrendTemplateCheckResult {
    const pass = input.currentPrice > input.ma150;
    return {
      name: 'priceAboveMA150',
      label: '股价 > MA150',
      pass,
      currentValue: input.currentPrice,
      threshold: input.ma150,
    };
  }

  private checkPriceAboveMA200(input: TrendTemplateInput): TrendTemplateCheckResult {
    const pass = input.currentPrice > input.ma200;
    return {
      name: 'priceAboveMA200',
      label: '股价 > MA200',
      pass,
      currentValue: input.currentPrice,
      threshold: input.ma200,
    };
  }

  private checkMA150AboveMA200(input: TrendTemplateInput): TrendTemplateCheckResult {
    const pass = input.ma150 > input.ma200;
    return {
      name: 'ma150AboveMA200',
      label: 'MA150 > MA200',
      pass,
      currentValue: input.ma150,
      threshold: input.ma200,
    };
  }

  private checkMA200TrendingUp(input: TrendTemplateInput): TrendTemplateCheckResult {
    const pass = input.ma200 > input.ma200_22dAgo;
    return {
      name: 'ma200TrendingUp',
      label: 'MA200 连续上升 (≥1月)',
      pass,
      currentValue: input.ma200,
      threshold: input.ma200_22dAgo,
    };
  }

  private checkMA50AboveMA150(input: TrendTemplateInput): TrendTemplateCheckResult {
    const pass = input.ma50 > input.ma150;
    return {
      name: 'ma50AboveMA150',
      label: 'MA50 > MA150',
      pass,
      currentValue: input.ma50,
      threshold: input.ma150,
    };
  }

  private checkMA50AboveMA200(input: TrendTemplateInput): TrendTemplateCheckResult {
    const pass = input.ma50 > input.ma200;
    return {
      name: 'ma50AboveMA200',
      label: 'MA50 > MA200',
      pass,
      currentValue: input.ma50,
      threshold: input.ma200,
    };
  }

  private checkPriceAboveMA50(input: TrendTemplateInput): TrendTemplateCheckResult {
    const pass = input.currentPrice > input.ma50;
    return {
      name: 'priceAboveMA50',
      label: '股价 > MA50',
      pass,
      currentValue: input.currentPrice,
      threshold: input.ma50,
    };
  }

  private checkAbove25PctFrom52WkLow(input: TrendTemplateInput): TrendTemplateCheckResult {
    const currentValue = input.low52Week > 0
      ? ((input.currentPrice - input.low52Week) / input.low52Week) * 100
      : 0;
    const pass = currentValue >= 25;
    return {
      name: 'above25PctFrom52WkLow',
      label: '距52周低点 ≥ 25%',
      pass,
      currentValue,
      threshold: 25,
    };
  }

  private checkWithin25PctOf52WkHigh(input: TrendTemplateInput): TrendTemplateCheckResult {
    const currentValue = input.high52Week > 0
      ? ((input.high52Week - input.currentPrice) / input.high52Week) * 100
      : 0;
    const pass = currentValue <= 25;
    return {
      name: 'within25PctOf52WkHigh',
      label: '距52周高点 ≤ 25%',
      pass,
      currentValue,
      threshold: 25,
    };
  }

  private checkRsRating(input: TrendTemplateInput): TrendTemplateCheckResult {
    const pass = input.rsRating >= 70;
    return {
      name: 'rsRatingAbove70',
      label: 'RS Rating ≥ 70',
      pass,
      currentValue: input.rsRating,
      threshold: 70,
    };
  }
}
