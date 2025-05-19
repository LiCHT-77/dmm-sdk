import {
  DmmSdkError,
  DmmApiError,
  DmmApiResponseError,
  DmmApiParseError,
  DmmNetworkError,
  DmmTimeoutError
} from './errors';

describe('DmmSdkError', () => {
  it('should be an instance of Error', () => {
    const error = new DmmSdkError('Test message');
    expect(error).toBeInstanceOf(Error);
  });

  it('should set the message correctly', () => {
    const message = 'This is a test error message';
    const error = new DmmSdkError(message);
    expect(error.message).toBe(message);
  });

  it('should have the correct name', () => {
    const error = new DmmSdkError('Test message');
    expect(error.name).toBe('DmmSdkError');
  });

  it('should set the cause if provided', () => {
    const causeError = new Error('Original error');
    const error = new DmmSdkError('Test message with cause', { cause: causeError });
    expect(error.cause).toBe(causeError);
  });

  it('should have undefined cause if not provided', () => {
    const error = new DmmSdkError('Test message without cause');
    expect(error.cause).toBeUndefined();
  });
});

describe('DmmApiError', () => {
  it('should be an instance of DmmSdkError', () => {
    const error = new DmmApiError('Test API error');
    expect(error).toBeInstanceOf(DmmSdkError);
  });

  it('should set the message correctly', () => {
    const message = 'This is a test API error message';
    const error = new DmmApiError(message);
    expect(error.message).toBe(message);
  });

  it('should have the correct name', () => {
    const error = new DmmApiError('Test API error');
    expect(error.name).toBe('DmmApiError');
  });

  it('should set the cause if provided', () => {
    const causeError = new Error('Original API error cause');
    const error = new DmmApiError('Test API error with cause', { cause: causeError });
    expect(error.cause).toBe(causeError);
  });

  it('should have undefined cause if not provided', () => {
    const error = new DmmApiError('Test API error without cause');
    expect(error.cause).toBeUndefined();
  });
});

describe('DmmApiResponseError', () => {
  const testMessage = 'Test API response error';
  const testStatusCode = 400;
  const testResponseBody = { error: 'Invalid request' };
  const causeError = new Error('Original cause');

  it('should be an instance of DmmApiError', () => {
    const error = new DmmApiResponseError(testMessage, testStatusCode, testResponseBody);
    expect(error).toBeInstanceOf(DmmApiError);
  });

  it('should set the message, statusCode, and responseBody correctly', () => {
    const error = new DmmApiResponseError(testMessage, testStatusCode, testResponseBody);
    expect(error.message).toBe(testMessage);
    expect(error.statusCode).toBe(testStatusCode);
    expect(error.responseBody).toEqual(testResponseBody);
  });

  it('should have the correct name', () => {
    const error = new DmmApiResponseError(testMessage, testStatusCode, testResponseBody);
    expect(error.name).toBe('DmmApiResponseError');
  });

  it('should set the cause if provided', () => {
    const error = new DmmApiResponseError(testMessage, testStatusCode, testResponseBody, { cause: causeError });
    expect(error.cause).toBe(causeError);
  });

  it('should have undefined cause if not provided', () => {
    const error = new DmmApiResponseError(testMessage, testStatusCode, testResponseBody);
    expect(error.cause).toBeUndefined();
  });
});

describe('DmmApiParseError', () => {
  const testMessage = 'Test API parse error';
  const causeError = new SyntaxError('Unexpected token J in JSON at position 0');

  it('should be an instance of DmmApiError', () => {
    const error = new DmmApiParseError(testMessage, { cause: causeError });
    expect(error).toBeInstanceOf(DmmApiError);
  });

  it('should set the message correctly', () => {
    const error = new DmmApiParseError(testMessage, { cause: causeError });
    expect(error.message).toBe(testMessage);
  });

  it('should have the correct name', () => {
    const error = new DmmApiParseError(testMessage, { cause: causeError });
    expect(error.name).toBe('DmmApiParseError');
  });

  it('should set the cause (e.g., JSON parse error)', () => {
    const error = new DmmApiParseError(testMessage, { cause: causeError });
    expect(error.cause).toBe(causeError);
    expect(error.cause).toBeInstanceOf(SyntaxError);
  });

  it('should have undefined cause if not provided in options', () => {
    const error = new DmmApiParseError(testMessage);
    expect(error.cause).toBeUndefined();
  });
});

describe('DmmNetworkError', () => {
  const testMessage = 'Test network error';
  const causeError = new TypeError("Failed to fetch");

  it('should be an instance of DmmSdkError', () => {
    const error = new DmmNetworkError(testMessage);
    expect(error).toBeInstanceOf(DmmSdkError);
  });

  it('should set the message correctly', () => {
    const error = new DmmNetworkError(testMessage);
    expect(error.message).toBe(testMessage);
  });

  it('should have the correct name', () => {
    const error = new DmmNetworkError(testMessage);
    expect(error.name).toBe('DmmNetworkError');
  });

  it('should set the cause if provided', () => {
    const error = new DmmNetworkError(testMessage, { cause: causeError });
    expect(error.cause).toBe(causeError);
    expect(error.cause).toBeInstanceOf(TypeError);
  });

  it('should have undefined cause if not provided', () => {
    const error = new DmmNetworkError(testMessage);
    expect(error.cause).toBeUndefined();
  });
});

describe('DmmTimeoutError', () => {
  const testMessage = 'Test timeout error';
  const causeError = new Error('AbortError'); // AbortSignal.reason is an 'any', so Error is a safe bet

  it('should be an instance of DmmSdkError', () => {
    const error = new DmmTimeoutError(testMessage);
    expect(error).toBeInstanceOf(DmmSdkError);
  });

  it('should set the message correctly', () => {
    const error = new DmmTimeoutError(testMessage);
    expect(error.message).toBe(testMessage);
  });

  it('should have the correct name', () => {
    const error = new DmmTimeoutError(testMessage);
    expect(error.name).toBe('DmmTimeoutError');
  });

  it('should set the cause if provided', () => {
    const error = new DmmTimeoutError(testMessage, { cause: causeError });
    expect(error.cause).toBe(causeError);
  });

  it('should have undefined cause if not provided', () => {
    const error = new DmmTimeoutError(testMessage);
    expect(error.cause).toBeUndefined();
  });
});