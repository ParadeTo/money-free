/**
 * Rate Limiter using Token Bucket Algorithm
 * 
 * Controls API request rate to avoid exceeding quota limits.
 * Implements a token bucket that refills at a fixed rate.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond
  private readonly minInterval: number; // minimum time between requests (ms)

  /**
   * Create a RateLimiter
   * @param requestsPerMinute - Maximum requests allowed per minute
   * @param burstSize - Maximum burst size (defaults to requestsPerMinute)
   */
  constructor(
    private readonly requestsPerMinute: number,
    burstSize?: number,
  ) {
    this.maxTokens = burstSize || requestsPerMinute;
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
    
    // Calculate refill rate: tokens per millisecond
    this.refillRate = requestsPerMinute / 60000;
    
    // Minimum interval to spread requests evenly
    this.minInterval = 60000 / requestsPerMinute;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Acquire a token, waiting if necessary
   * @returns Promise that resolves when token is acquired
   */
  async acquire(): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      // Calculate wait time for next token
      const tokensNeeded = 1 - this.tokens;
      const waitTime = Math.ceil(tokensNeeded / this.refillRate);
      
      // Add small buffer to ensure token is available
      await this.sleep(waitTime + 10);
    }
  }

  /**
   * Try to acquire a token without waiting
   * @returns true if token acquired, false otherwise
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get current available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset the limiter to full capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): { requestsPerMinute: number; maxTokens: number; currentTokens: number } {
    this.refill();
    return {
      requestsPerMinute: this.requestsPerMinute,
      maxTokens: this.maxTokens,
      currentTokens: this.tokens,
    };
  }
}
