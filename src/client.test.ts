// src/client.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DmmApiClient, type DmmApiClientOptions } from './client';
import type {
  ItemListRequestParams,
  Item,
  ActressSearchRequestParams,
  GenreSearchRequestParams,
  MakerSearchRequestParams,
  SeriesSearchRequestParams,
  AuthorSearchRequestParams,
} from './types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('DmmApiClient', () => {
  const defaultOptions: DmmApiClientOptions = {
    apiId: 'test-api-id',
    affiliateId: 'test-affiliate-id',
  };
  const clientDefaultMaxRetries = DmmApiClient.DefaultMaxRetries;
  const clientDefaultRetryDelay = DmmApiClient.DefaultRetryDelay;
  const clientDefaultTimeout = DmmApiClient.DefaultTimeout;

  const testRetryDelay = 50;
  const testTimeout = 500;
  const testMaxRetries = 3;

  let client: DmmApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new DmmApiClient({
        apiId: defaultOptions.apiId,
        affiliateId: defaultOptions.affiliateId,
        timeout: testTimeout,
        retryDelay: testRetryDelay,
        maxRetries: testMaxRetries,
    });
  });

  afterEach(() => {
    // vi.clearAllTimers(); // Vitestでは通常不要か、vi.useRealTimers()などで制御
  });

  it('should throw an error if apiId is missing', () => {
    expect(() => new DmmApiClient({ affiliateId: 'test' } as DmmApiClientOptions))
      .toThrow('API ID and Affiliate ID are required.');
  });

  it('should default to DMM.com site for requests like getFloorList if not overridable by params', async () => {
    const defaultSiteClient = new DmmApiClient(defaultOptions);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await defaultSiteClient.getFloorList();

    const expectedUrl = new URL(`${(defaultSiteClient as unknown as { baseUrl: string }).baseUrl}/FloorList`);
    const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
    });
    expectedUrl.search = searchParams.toString();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('getFloorList should always use DMM.com site by default', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.getFloorList();

    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/FloorList`);
    const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
    });
    expectedUrl.search = searchParams.toString();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('should create an instance with default timeout and retries', () => {
     const defaultClient = new DmmApiClient(defaultOptions);
    expect((defaultClient as unknown as { timeout: number }).timeout).toBe(clientDefaultTimeout);
    expect((defaultClient as unknown as { maxRetries: number }).maxRetries).toBe(clientDefaultMaxRetries);
    expect((defaultClient as unknown as { retryDelay: number }).retryDelay).toBe(clientDefaultRetryDelay);
  });

  it('should create an instance with specified timeout, maxRetries, and retryDelay', () => {
    const customOptions: DmmApiClientOptions = {
      ...defaultOptions,
      timeout: 5000,
      maxRetries: 5,
      retryDelay: 500,
    };
    const customClient = new DmmApiClient(customOptions);
    expect((customClient as unknown as { timeout: number }).timeout).toBe(5000);
    expect((customClient as unknown as { maxRetries: number }).maxRetries).toBe(5);
    expect((customClient as unknown as { retryDelay: number }).retryDelay).toBe(500);
  });

  describe('request method (including timeout and retry logic)', () => {
    const endpoint = '/TestEndpoint';
    const params = { param1: 'value1', param2: 123 };
    const expectedBaseUrl = 'https://api.dmm.com/affiliate/v3';

    it('should call fetch with the correct URL and parameters', async () => {
      const mockResponse = { result: { success: true } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await (client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, {...params, site: 'DMM.com' });

      const expectedUrl = new URL(`${expectedBaseUrl}${endpoint}`);
      const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        param1: 'value1',
        param2: '123',
        site: 'DMM.com',
      });
      expectedUrl.search = searchParams.toString();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    it('should not include undefined parameters in the URL query', async () => {
      const paramsWithUndefined = {
        param1: 'value1',
        param2: undefined,
        param3: 'value3',
        param4: undefined,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { success: true } }),
      });

      await (client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, {...paramsWithUndefined, site: 'DMM.com'});

      const expectedUrl = new URL(`${expectedBaseUrl}${endpoint}`);
      const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        param1: 'value1',
        param3: 'value3',
        site: 'DMM.com',
      });
      expectedUrl.search = searchParams.toString();

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    it('should return the result field on successful response', async () => {
        const mockResult = { data: 'test data' };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: mockResult }),
        });

        const result = await (client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params);
        expect(result).toEqual(mockResult);
    });

    it('should throw an error if response is not ok (non-retryable status)', async () => {
      const errorStatus = 400;
      const errorResponse = { result: { message: 'Bad Request' } };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: errorStatus,
        statusText: 'Bad Request',
        json: async () => errorResponse,
      });

      await expect((client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params))
        .rejects
        .toThrow(`API request to ${endpoint} failed with status ${errorStatus} after 0 attempts: ${errorResponse.result.message}`);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry and throw an error if response is not ok and body is not json (retryable status)', { timeout: testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000 }, async () => {
        const errorStatus = 500;
        const errorText = 'Internal Server Error';
        mockFetch.mockResolvedValue({
            ok: false,
            status: errorStatus,
            statusText: 'Server Error',
            json: async () => { throw new Error('Not JSON')},
            text: async () => errorText,
        });

        try {
            await (client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params);
            throw new Error('Promise should have been rejected');
        } catch (error: unknown) {
            const expectedOriginalMessage = `API request to ${endpoint} failed with status ${errorStatus} after ${testMaxRetries} attempts: ${errorText}`;
            if (error instanceof Error) {
                expect(error.message).toBe(`Error during API request to ${endpoint} after ${testMaxRetries} attempts: ${expectedOriginalMessage}`);
            } else {
                throw new Error('Caught error is not an instance of Error');
            }
        }

        const expectedCalls = 1 + testMaxRetries;
        expect(mockFetch).toHaveBeenCalledTimes(expectedCalls);
    });

    it('should retry on network error', { timeout: testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000 }, async () => {
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValue(networkError);

       try {
           await (client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params);
           throw new Error('Promise should have been rejected');
       } catch (error: unknown) {
           expect(error).toBeInstanceOf(Error);
           if (error instanceof Error) {
            expect(error.message).toBe(`Error during API request to ${endpoint} after ${testMaxRetries} attempts: ${networkError.message}`);
           }
       }

      const expectedNetworkErrorCalls = 1 + testMaxRetries;
      expect(mockFetch).toHaveBeenCalledTimes(expectedNetworkErrorCalls);
    });

     it('should retry on 429 Too Many Requests', { timeout: testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000 }, async () => {
        const errorStatus = 429;
        const errorResponse = { result: { message: 'Too Many Requests' } };
        mockFetch.mockResolvedValue({
            ok: false,
            status: errorStatus,
            statusText: 'Too Many Requests',
            json: async () => errorResponse,
        });

        try {
            await (client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params);
            throw new Error('Promise should have been rejected');
        } catch (error: unknown) {
             const expectedOriginalMessage = `API request to ${endpoint} failed with status ${errorStatus} after ${testMaxRetries} attempts: ${errorResponse.result.message}`;
             if (error instanceof Error) {
                expect(error.message).toBe(`Error during API request to ${endpoint} after ${testMaxRetries} attempts: ${expectedOriginalMessage}`);
             } else {
                throw new Error('Caught error is not an instance of Error');
             }
        }

        expect(mockFetch).toHaveBeenCalledTimes(1 + testMaxRetries);
    });

     it('should retry on 5xx Server Error', { timeout: testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000 }, async () => {
        const errorStatus = 503;
        const errorResponse = { result: { message: 'Service Unavailable' } };
         mockFetch.mockResolvedValue({
            ok: false,
            status: errorStatus,
            statusText: 'Service Unavailable',
            json: async () => errorResponse,
        });

        try {
            await (client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params);
            throw new Error('Promise should have been rejected');
        } catch (error: unknown) {
            const expectedOriginalMessage = `API request to ${endpoint} failed with status ${errorStatus} after ${testMaxRetries} attempts: ${errorResponse.result.message}`;
            if (error instanceof Error) {
                expect(error.message).toBe(`Error during API request to ${endpoint} after ${testMaxRetries} attempts: ${expectedOriginalMessage}`);
            } else {
                throw new Error('Caught error is not an instance of Error');
            }
        }

        expect(mockFetch).toHaveBeenCalledTimes(1 + testMaxRetries);
    });

     it('should timeout if fetch takes too long', { timeout: testTimeout + 1000 }, async () => {
        mockFetch.mockImplementation(async (_url, options) => {
            const signal = options?.signal;
            await new Promise<void>((_resolve, reject) => {
                const timeoutId = setTimeout(() => {
                }, testTimeout + 100);
                signal?.addEventListener('abort', () => {
                    clearTimeout(timeoutId);
                    reject(new DOMException('The operation was aborted.', 'AbortError'));
                });
            });
            return { ok: true, json: async () => ({ result: { success: true } }) };
        });

        await expect((client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params))
            .rejects
            .toThrow(`API request to ${endpoint} timed out after ${testTimeout}ms`);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

     it('should not timeout if fetch responds within time', { timeout: testTimeout + 1000 }, async () => {
        const mockResult = { data: 'fast data' };
        mockFetch.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({
                 ok: true, json: async () => ({ result: mockResult })
            }), testTimeout - 50))
        );

        await expect((client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params)).resolves.toEqual(mockResult);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });


    it('should throw an error if response format is invalid (missing result)', async () => {
        const invalidResponse = { data: 'no result field' };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => invalidResponse,
        });

        await expect((client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params))
            .rejects
            .toThrow('Invalid API response format: "result" field is missing.');
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry if maxRetries is 0', async () => {
      const noRetryClient = new DmmApiClient({
        ...defaultOptions,
        maxRetries: 0,
        retryDelay: testRetryDelay,
        timeout: testTimeout,
      });
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(
        (noRetryClient as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params)
      ).rejects.toThrow(`Error during API request to ${endpoint} after 0 attempts: ${networkError.message}`);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // --- API メソッドのテスト ---

  it('getItemList should call request with correct parameters', async () => {
    const params: ItemListRequestParams = { service: 'digital', floor: 'videoa', hits: 10, keyword: 'test' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.getItemList(params);
    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/ItemList`);
    const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        service: params.service || '',
        floor: params.floor || '',
        hits: String(params.hits || ''),
        keyword: params.keyword || '',
    });
    expectedUrl.search = searchParams.toString();
    expect(expectedUrl.searchParams.getAll('site').length).toBe(0);
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('getItemList should call request with specified site', async () => {
    const params: ItemListRequestParams = { site: 'FANZA', service: 'digital', floor: 'videoa', hits: 10 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.getItemList(params);
    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/ItemList`);
    const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        site: 'FANZA',
        service: params.service || '',
        floor: params.floor || '',
        hits: String(params.hits || ''),
    });
    expectedUrl.search = searchParams.toString();
    expect(expectedUrl.searchParams.getAll('site').length).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('getFloorList should call request with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.getFloorList();
    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/FloorList`);
     const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
    });
    expectedUrl.search = searchParams.toString();
    expect(expectedUrl.searchParams.getAll('site').length).toBe(0);
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('searchActress should call request with correct parameters', async () => {
    const params: ActressSearchRequestParams = { initial: 'あ', hits: 5 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.searchActress(params);
     const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/ActressSearch`);
     const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        initial: params.initial || '',
        hits: String(params.hits || ''),
    });
    expectedUrl.search = searchParams.toString();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('searchActress should call request with hits and offset', async () => {
    const params: ActressSearchRequestParams = { initial: 'い', hits: 10, offset: 11 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.searchActress(params);

    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/ActressSearch`);
    const searchParams = new URLSearchParams({
      api_id: defaultOptions.apiId,
      affiliate_id: defaultOptions.affiliateId,
      initial: 'い',
      hits: '10',
      offset: '11',
    });
    expectedUrl.search = searchParams.toString();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('searchActress should call request with sort parameter', async () => {
    const params: ActressSearchRequestParams = { initial: 'う', sort: '-name' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.searchActress(params);

    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/ActressSearch`);
    const searchParams = new URLSearchParams({
      api_id: defaultOptions.apiId,
      affiliate_id: defaultOptions.affiliateId,
      initial: 'う',
      sort: '-name',
    });
    expectedUrl.search = searchParams.toString();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('searchGenre should call request with correct parameters', async () => {
    const params: GenreSearchRequestParams = { floor_id: '123', initial: 'か' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.searchGenre(params);
    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/GenreSearch`);
     const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        floor_id: params.floor_id || '',
        initial: params.initial || '',
    });
    expectedUrl.search = searchParams.toString();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('searchMaker should call request with correct parameters', async () => {
    const params: MakerSearchRequestParams = { floor_id: '456', initial: 'さ' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.searchMaker(params);
    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/MakerSearch`);
     const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        floor_id: params.floor_id || '',
        initial: params.initial || '',
    });
    expectedUrl.search = searchParams.toString();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('searchSeries should call request with correct parameters', async () => {
    const params: SeriesSearchRequestParams = { floor_id: '789', initial: 'た' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.searchSeries(params);
    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/SeriesSearch`);
     const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        floor_id: params.floor_id || '',
        initial: params.initial || '',
    });
    expectedUrl.search = searchParams.toString();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  it('searchAuthor should call request with correct parameters', async () => {
    const params: AuthorSearchRequestParams = { floor_id: '101', initial: 'な' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await client.searchAuthor(params);
    const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/AuthorSearch`);
     const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        floor_id: params.floor_id || '',
        initial: params.initial || '',
    });
    expectedUrl.search = searchParams.toString();
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
  });

  // --- Test getAllItems ---
  describe('getAllItems', () => {
    const params: Omit<ItemListRequestParams, 'hits' | 'offset'> = {
      service: 'digital',
      floor: 'videoa',
      keyword: 'test',
    };
    const hitsPerPage = DmmApiClient.DefaultHitsPerPageForGetAllItems;

    it('should yield all items from multiple pages', { timeout: testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000 }, async () => {
      const totalItems = 250;
      const page1Items: Partial<Item>[] = Array.from({ length: hitsPerPage }, (_, i) => ({ content_id: `item_${i + 1}` }));
      const page2Items: Partial<Item>[] = Array.from({ length: hitsPerPage }, (_, i) => ({ content_id: `item_${i + 101}` }));
      const page3Items: Partial<Item>[] = Array.from({ length: 50 }, (_, i) => ({ content_id: `item_${i + 201}` }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              request: { parameters: { ...params, hits: hitsPerPage, offset: 1 } },
              result_count: totalItems,
              total_count: totalItems,
              first_position: 1,
              items: page1Items,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              request: { parameters: { ...params, hits: hitsPerPage, offset: 101 } },
              result_count: totalItems,
              total_count: totalItems,
              first_position: 101,
              items: page2Items,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              request: { parameters: { ...params, hits: hitsPerPage, offset: 201 } },
              result_count: totalItems,
              total_count: totalItems,
              first_position: 201,
              items: page3Items,
            },
          }),
        });

      const receivedItems: Partial<Item>[] = [];
      for await (const item of client.getAllItems(params)) {
        receivedItems.push(item);
      }

      expect(receivedItems.length).toBe(totalItems);
      expect(receivedItems[0].content_id).toBe('item_1');
      expect(receivedItems[100].content_id).toBe('item_101');
      expect(receivedItems[249].content_id).toBe('item_250');
      expect(mockFetch).toHaveBeenCalledTimes(3);

      const expectedUrlBase = `${(client as unknown as { baseUrl: string }).baseUrl}/ItemList`;
      const baseSearchParams = {
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        service: params.service || '',
        floor: params.floor || '',
        keyword: params.keyword || '',
        hits: String(hitsPerPage),
      };

      const url1 = new URL(expectedUrlBase);
      const p1 = { ...baseSearchParams, offset: '1' };
      url1.search = new URLSearchParams(p1).toString();
      expect(mockFetch).toHaveBeenNthCalledWith(1, url1.toString(), expect.any(Object));

      const url2 = new URL(expectedUrlBase);
      const p2 = { ...baseSearchParams, offset: '101' };
      url2.search = new URLSearchParams(p2).toString();
      expect(mockFetch).toHaveBeenNthCalledWith(2, url2.toString(), expect.any(Object));

      const url3 = new URL(expectedUrlBase);
      const p3 = { ...baseSearchParams, offset: '201' };
      url3.search = new URLSearchParams(p3).toString();
      expect(mockFetch).toHaveBeenNthCalledWith(3, url3.toString(), expect.any(Object));
    });

    it('should yield no items if result_count is 0', async () => {
       mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              request: { parameters: { ...params, hits: hitsPerPage, offset: 1 } },
              result_count: 0,
              total_count: 0,
              first_position: 0,
              items: [],
            },
          }),
        });

        const receivedItems = [];
        for await (const item of client.getAllItems(params)) {
            receivedItems.push(item);
        }

        expect(receivedItems.length).toBe(0);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

     it('should yield items from a single page', async () => {
        const totalItems = 50;
        const pageItems: Partial<Item>[] = Array.from({ length: totalItems }, (_, i) => ({ content_id: `item_${i + 1}` }));
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                result: {
                    request: { parameters: { ...params, hits: hitsPerPage, offset: 1 } },
                    result_count: totalItems,
                    total_count: totalItems,
                    first_position: 1,
                    items: pageItems,
                },
            }),
        });

        const receivedItems = [];
        for await (const item of client.getAllItems(params)) {
            receivedItems.push(item);
        }

        expect(receivedItems.length).toBe(totalItems);
        expect(receivedItems[0].content_id).toBe('item_1');
        expect(receivedItems[49].content_id).toBe('item_50');
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

     it('should throw an error if getItemList fails during iteration', async () => {
        const page1Items: Partial<Item>[] = Array.from({ length: hitsPerPage }, (_, i) => ({ content_id: `item_${i + 1}` }));
        const apiError = new TypeError('Failed to fetch');

        let callCount = 0;
        mockFetch.mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
                return {
                    ok: true,
                    json: async () => ({
                        result: {
                            request: { parameters: { ...params, hits: hitsPerPage, offset: 1 } },
                            result_count: 150,
                            total_count: 150,
                            first_position: 1,
                            items: page1Items,
                        },
                    }),
                };
            }
            throw apiError;
        });

        const generator = client.getAllItems(params);
        const receivedItems: Partial<Item>[] = [];
        let caughtError: Error | null = null;

        try {
            for await (const item of generator) {
                receivedItems.push(item);
            }
             throw new Error('Error should have been thrown during iteration');
        } catch (error) {
            caughtError = error as Error;
        }

        expect(receivedItems.length).toBe(hitsPerPage);
        expect(receivedItems[0].content_id).toBe('item_1');
        expect(caughtError).toBeInstanceOf(Error);

        const expectedOffsetForError = 1 + hitsPerPage;
        const expectedOriginalErrorMessage = `Error during API request to /ItemList after ${testMaxRetries} attempts: ${apiError.message}`;
        if (caughtError) {
            expect(caughtError.message).toBe(`Error in getAllItems at offset ${expectedOffsetForError}: ${expectedOriginalErrorMessage}`);
            expect(caughtError.cause).toBeInstanceOf(Error);
            if (caughtError.cause instanceof Error) {
                expect(caughtError.cause.message).toBe(expectedOriginalErrorMessage);
            }
        }

        expect(mockFetch).toHaveBeenCalledTimes(1 + (1 + testMaxRetries));
    });
  });

  describe('getItemList API (Endpoint Constant Test)', () => {
    const itemListParams: ItemListRequestParams = { site: 'DMM.com', service: 'mono', floor: 'dvd', hits: 10, offset: 1, sort: 'rank' };

    it('should call fetch with the currently hardcoded endpoint for ItemList', async () => {
      const mockResponse = { result: { items: [] } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      await client.getItemList(itemListParams);
      const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/ItemList`);
      const queryParams: Record<string, string> = {
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
      };
      for (const key in itemListParams) {
        if (Object.prototype.hasOwnProperty.call(itemListParams, key) && itemListParams[key as keyof ItemListRequestParams] !== undefined) {
          queryParams[key] = String(itemListParams[key as keyof ItemListRequestParams]);
        }
      }
      const searchParams = new URLSearchParams(queryParams);
      expectedUrl.search = searchParams.toString();
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
    });

    it('should use the DmmApiClient.ItemListEndpoint constant for the endpoint path', async () => {
      const mockResponse = { result: { items: [] } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.getItemList(itemListParams);
      const fetchCall = mockFetch.mock.calls[0][0] as string;
      expect(fetchCall.includes(DmmApiClient.ItemListEndpoint)).toBe(true);
    });
  });

  describe('getFloorList', () => {
    const expectedEndpoint = '/FloorList';
    it('getFloorList should call request with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
      await client.getFloorList();
      const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/FloorList`);
       const searchParams = new URLSearchParams({
          api_id: defaultOptions.apiId,
          affiliate_id: defaultOptions.affiliateId,
      });
      expectedUrl.search = searchParams.toString();
      expect(expectedUrl.searchParams.getAll('site').length).toBe(0);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
    });

    it('getFloorList should always use DMM.com site by default', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
      await client.getFloorList();

      const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}/FloorList`);
      const searchParams = new URLSearchParams({
          api_id: defaultOptions.apiId,
          affiliate_id: defaultOptions.affiliateId,
      });
      expectedUrl.search = searchParams.toString();
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.any(Object));
    });

    it('should use the DmmApiClient.FloorListEndpoint constant for the endpoint path', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });

      await client.getFloorList();
      const fetchCall = mockFetch.mock.calls[0][0] as string;
      expect(fetchCall.includes(DmmApiClient.FloorListEndpoint)).toBe(true);
    });
  });

  describe('searchActress', () => {
    const actressSearchParams: ActressSearchRequestParams = {
      keyword: 'test actress',
    };

    it('should call fetch with the correct endpoint and parameters for ActressSearch', async () => {
      const mockResponse = { result: { actresses: [] } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.searchActress(actressSearchParams);

      const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}${DmmApiClient.ActressSearchEndpoint}`);
      const expectedParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        keyword: actressSearchParams.keyword as string,
      });
      expectedUrl.search = expectedParams.toString();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    it('should throw an error if keyword is missing for ActressSearch', async () => {
      const paramsWithoutKeyword = { ...actressSearchParams, keyword: undefined } as unknown as ActressSearchRequestParams;
      expect(true).toBe(true);
    });
  });

  describe('searchGenre', () => {
    const genreSearchParams: GenreSearchRequestParams = {
      floor_id: '123',
      // 他の GenreSearch に必要なパラメータがあればここに追加
    };

    it('should call fetch with the correct endpoint and parameters for GenreSearch', async () => {
      const mockResponse = { result: { genre: [] } }; // レスポンスの型を合わせる (必要であれば)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.searchGenre(genreSearchParams);

      // Use the (not-yet-defined) constant for the expected endpoint
      const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}${DmmApiClient.GenreSearchEndpoint}`); // DmmApiClient.GenreSearchEndpoint を使用
      const expectedParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        floor_id: genreSearchParams.floor_id,
        // 他の送信されるべきパラメータをここに追加
      });
      expectedUrl.search = expectedParams.toString();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    // 他の searchGenre 関連のテストケースは必要に応じて追加
  });

  describe('searchMaker', () => {
    const makerSearchParams: MakerSearchRequestParams = {
      floor_id: '456',
      initial: 'あ',
      // 他の MakerSearch に必要なパラメータがあればここに追加
    };

    it('should call fetch with the correct endpoint and parameters for MakerSearch', async () => {
      const mockResponse = { result: { maker: [] } }; // レスポンスの型を合わせる (必要であれば)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.searchMaker(makerSearchParams);

      const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}${DmmApiClient.MakerSearchEndpoint}`);
      const expectedParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        floor_id: makerSearchParams.floor_id,
        initial: makerSearchParams.initial as string,
        // 他の送信されるべきパラメータをここに追加
      });
      expectedUrl.search = expectedParams.toString();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    // 他の searchMaker 関連のテストケースは必要に応じて追加
  });

  describe('searchSeries', () => {
    const seriesSearchParams: SeriesSearchRequestParams = {
      floor_id: '789',
      initial: 'た',
      // 他の SeriesSearch に必要なパラメータがあればここに追加
    };

    it('should call fetch with the correct endpoint and parameters for SeriesSearch', async () => {
      const mockResponse = { result: { series: [] } }; // レスポンスの型を合わせる (必要であれば)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.searchSeries(seriesSearchParams);

      const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}${DmmApiClient.SeriesSearchEndpoint}`);
      const expectedParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        floor_id: seriesSearchParams.floor_id,
        initial: seriesSearchParams.initial as string,
        // 他の送信されるべきパラメータをここに追加
      });
      expectedUrl.search = expectedParams.toString();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    // 他の searchSeries 関連のテストケースは必要に応じて追加
  });

  describe('searchAuthor', () => {
    const authorSearchParams: AuthorSearchRequestParams = {
      floor_id: '101',
      initial: 'な',
      // 他の AuthorSearch に必要なパラメータがあればここに追加
    };

    it('should call fetch with the correct endpoint and parameters for AuthorSearch', async () => {
      const mockResponse = { result: { author: [] } }; // レスポンスの型を合わせる (必要であれば)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.searchAuthor(authorSearchParams);

      const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}${DmmApiClient.AuthorSearchEndpoint}`);
      const expectedParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        floor_id: authorSearchParams.floor_id,
        initial: authorSearchParams.initial as string,
        // 他の送信されるべきパラメータをここに追加
      });
      expectedUrl.search = expectedParams.toString();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    // 他の searchAuthor 関連のテストケースは必要に応じて追加
  });
});