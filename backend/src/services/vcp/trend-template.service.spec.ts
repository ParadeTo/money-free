import { TrendTemplateService } from './trend-template.service';

describe('TrendTemplateService', () => {
  let service: TrendTemplateService;

  const passingInput = {
    currentPrice: 100,
    ma50: 95,
    ma150: 85,
    ma200: 80,
    ma200_22dAgo: 78,
    high52Week: 110,
    low52Week: 60,
    rsRating: 85,
  };

  beforeEach(() => {
    service = new TrendTemplateService();
  });

  it('runAllChecks returns allPass=true when all conditions pass', () => {
    const result = service.runAllChecks(passingInput);
    expect(result.allPass).toBe(true);
    expect(result.checks.every(c => c.pass)).toBe(true);
  });

  it('runAllChecks returns allPass=false when any condition fails', () => {
    const result = service.runAllChecks({ ...passingInput, rsRating: 50 });
    expect(result.allPass).toBe(false);
    expect(result.checks.some(c => !c.pass)).toBe(true);
  });

  it('check price > MA150', () => {
    const pass = service.runAllChecks(passingInput);
    const check = pass.checks.find(c => c.name === 'priceAboveMA150');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, currentPrice: 80 }).checks.find(c => c.name === 'priceAboveMA150')?.pass).toBe(false);
  });

  it('check price > MA200', () => {
    const check = service.runAllChecks(passingInput).checks.find(c => c.name === 'priceAboveMA200');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, currentPrice: 75 }).checks.find(c => c.name === 'priceAboveMA200')?.pass).toBe(false);
  });

  it('check MA150 > MA200', () => {
    const check = service.runAllChecks(passingInput).checks.find(c => c.name === 'ma150AboveMA200');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, ma150: 75 }).checks.find(c => c.name === 'ma150AboveMA200')?.pass).toBe(false);
  });

  it('check MA200 trending up (ma200 > ma200_22dAgo)', () => {
    const check = service.runAllChecks(passingInput).checks.find(c => c.name === 'ma200TrendingUp');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, ma200_22dAgo: 85 }).checks.find(c => c.name === 'ma200TrendingUp')?.pass).toBe(false);
  });

  it('check MA50 > MA150', () => {
    const check = service.runAllChecks(passingInput).checks.find(c => c.name === 'ma50AboveMA150');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, ma50: 80 }).checks.find(c => c.name === 'ma50AboveMA150')?.pass).toBe(false);
  });

  it('check MA50 > MA200', () => {
    const check = service.runAllChecks(passingInput).checks.find(c => c.name === 'ma50AboveMA200');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, ma50: 75 }).checks.find(c => c.name === 'ma50AboveMA200')?.pass).toBe(false);
  });

  it('check price > MA50', () => {
    const check = service.runAllChecks(passingInput).checks.find(c => c.name === 'priceAboveMA50');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, currentPrice: 90 }).checks.find(c => c.name === 'priceAboveMA50')?.pass).toBe(false);
  });

  it('check ≥25% above 52wk low', () => {
    const check = service.runAllChecks(passingInput).checks.find(c => c.name === 'above25PctFrom52WkLow');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, currentPrice: 70 }).checks.find(c => c.name === 'above25PctFrom52WkLow')?.pass).toBe(false);
  });

  it('check within 25% of 52wk high', () => {
    const check = service.runAllChecks(passingInput).checks.find(c => c.name === 'within25PctOf52WkHigh');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, currentPrice: 80 }).checks.find(c => c.name === 'within25PctOf52WkHigh')?.pass).toBe(false);
  });

  it('check RS ≥ 70', () => {
    const check = service.runAllChecks(passingInput).checks.find(c => c.name === 'rsRatingAbove70');
    expect(check?.pass).toBe(true);
    expect(service.runAllChecks({ ...passingInput, rsRating: 60 }).checks.find(c => c.name === 'rsRatingAbove70')?.pass).toBe(false);
  });

  it('edge case: low52Week = 0 division guard', () => {
    const result = service.runAllChecks({ ...passingInput, low52Week: 0 });
    const check = result.checks.find(c => c.name === 'above25PctFrom52WkLow');
    expect(check?.currentValue).toBe(0);
    expect(check?.pass).toBe(false);
  });

  it('edge case: high52Week = 0 division guard', () => {
    const result = service.runAllChecks({ ...passingInput, high52Week: 0 });
    const check = result.checks.find(c => c.name === 'within25PctOf52WkHigh');
    expect(check?.currentValue).toBe(0);
    expect(check?.pass).toBe(true);
  });
});
