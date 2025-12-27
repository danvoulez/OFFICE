
export interface RequestOptions {
  retries?: number;
  backoff?: number;
  timeout?: number;
}

export class NetworkService {
  private static DEFAULT_OPTIONS: RequestOptions = {
    retries: 3,
    backoff: 1000,
    timeout: 15000
  };

  static async execute<T>(
    task: () => Promise<T>, 
    options: RequestOptions = {}
  ): Promise<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < opts.retries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeout);
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Request timeout'));
          });
        });

        const result = await Promise.race([task(), timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
      } catch (error: any) {
        lastError = error;
        if (attempt < opts.retries! - 1) {
          const delay = opts.backoff! * Math.pow(2, attempt);
          console.warn(`[Network] Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, error.message);
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }

    throw new Error(`[Network] Task failed after ${opts.retries} attempts: ${lastError?.message}`);
  }
}
