export class DmmSdkError extends Error {
  public cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    // Set name after super call to ensure it's not overridden by Error constructor
    this.name = 'DmmSdkError';
    if (options?.cause) {
      this.cause = options.cause;
    }
    // Ensure `instanceof` works correctly for subclasses
    Object.setPrototypeOf(this, DmmSdkError.prototype);
  }
}

export class DmmApiError extends DmmSdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    // Set name after super call to ensure it's not overridden by DmmSdkError constructor
    this.name = 'DmmApiError';
    Object.setPrototypeOf(this, DmmApiError.prototype);
  }
}

export class DmmApiResponseError extends DmmApiError {
  public statusCode: number;
  public responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody: unknown, options?: { cause?: unknown }) {
    super(message, options);
    // Set name after super call to ensure it's not overridden by DmmApiError constructor
    this.name = 'DmmApiResponseError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, DmmApiResponseError.prototype);
  }
}

export class DmmApiParseError extends DmmApiError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    // Set name after super call to ensure it's not overridden by DmmApiError constructor
    this.name = 'DmmApiParseError';
    Object.setPrototypeOf(this, DmmApiParseError.prototype);
  }
}

export class DmmNetworkError extends DmmSdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    // Set name after super call to ensure it's not overridden by DmmSdkError constructor
    this.name = 'DmmNetworkError';
    Object.setPrototypeOf(this, DmmNetworkError.prototype);
  }
}

export class DmmTimeoutError extends DmmSdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    // Set name after super call to ensure it's not overridden by DmmSdkError constructor
    this.name = 'DmmTimeoutError';
    Object.setPrototypeOf(this, DmmTimeoutError.prototype);
  }
}