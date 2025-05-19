// src/client.test.ts
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

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('DmmApiClient', () => {
  const defaultOptions: DmmApiClientOptions = {
    apiId: 'test-api-id',
    affiliateId: 'test-affiliate-id',
  };
  const clientDefaultMaxRetries = 3;
  const clientDefaultRetryDelay = 1000;
  const clientDefaultTimeout = 10000;

  const testRetryDelay = 50;
  const testTimeout = 500;
  const testMaxRetries = 3;

  let client: DmmApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new DmmApiClient({
        ...defaultOptions,
        timeout: testTimeout,
        retryDelay: testRetryDelay,
        maxRetries: testMaxRetries,
    });
  });

  afterEach(() => {
    // jest.clearAllTimers();
  });

  it('should throw an error if apiId is missing', () => {
    expect(() => new DmmApiClient({ affiliateId: 'test' } as DmmApiClientOptions))
      .toThrow('API ID and Affiliate ID are required.');
  });

  it('should create an instance with default site', () => {
    const defaultClient = new DmmApiClient(defaultOptions);
    expect(defaultClient).toBeInstanceOf(DmmApiClient);
    expect((defaultClient as unknown as { site: string }).site).toBe('DMM.com');
  });

  it('should use the site specified in options as default for requests', async () => {
    const fanzaClient = new DmmApiClient({ ...defaultOptions, site: 'FANZA' });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
    await fanzaClient.getFloorList(); // getFloorList は site を引数に取らない

    const expectedUrl = new URL(`${(fanzaClient as unknown as { baseUrl: string }).baseUrl}/FloorList`);
    const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        site: 'FANZA', // ここが FANZA になることを期待
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

      await (client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params);

      const expectedUrl = new URL(`${expectedBaseUrl}${endpoint}`);
      const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        site: 'DMM.com',
        param1: 'value1',
        param2: '123',
      });
      expectedUrl.search = searchParams.toString();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    it('should not include undefined parameters in the URL query', async () => {
      const paramsWithUndefined = {
        param1: 'value1',
        param2: undefined, // このパラメータは除外されるべき
        param3: 'value3',
        param4: undefined, // このパラメータも除外されるべき
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { success: true } }),
      });

      await (client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, paramsWithUndefined);

      const expectedUrl = new URL(`${expectedBaseUrl}${endpoint}`);
      const searchParams = new URLSearchParams({
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
        site: 'DMM.com',
        param1: 'value1',
        param3: 'value3',
        // param2 と param4 は含まれない
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

    it('should retry and throw an error if response is not ok and body is not json (retryable status)', async () => {
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
    }, testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000);

    it('should retry on network error', async () => {
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
    }, testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000);

     it('should retry on 429 Too Many Requests', async () => {
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
    }, testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000);

     it('should retry on 5xx Server Error', async () => {
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
    }, testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000);

     it('should timeout if fetch takes too long', async () => {
        mockFetch.mockImplementation(async (_url, options) => {
            const signal = options?.signal;
            await new Promise<void>((_resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    // タイムアウトより長くかかった場合
                }, testTimeout + 100);
                signal?.addEventListener('abort', () => {
                    clearTimeout(timeoutId);
                    reject(new DOMException('The operation was aborted.', 'AbortError'));
                });
            });
            // Abort されなかった場合
            return { ok: true, json: async () => ({ result: { success: true } }) };
        });

        await expect((client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params))
            .rejects
            .toThrow(`API request to ${endpoint} timed out after ${testTimeout}ms`);
        expect(mockFetch).toHaveBeenCalledTimes(1); // タイムアウトなのでリトライしない
    }, testTimeout + 1000);

     it('should not timeout if fetch responds within time', async () => {
        const mockResult = { data: 'fast data' };
        mockFetch.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({
                 ok: true, json: async () => ({ result: mockResult })
            }), testTimeout - 50)) // クライアントタイムアウト未満
        );

        await expect((client as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params)).resolves.toEqual(mockResult);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    }, testTimeout + 1000);


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
        retryDelay: testRetryDelay, // retryDelayはテスト時間短縮のため小さい値のまま
        timeout: testTimeout,
      });
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(networkError); // 1回だけエラーを発生させる

      await expect(
        (noRetryClient as unknown as { request: (endpoint: string, params: unknown) => Promise<unknown> }).request(endpoint, params)
      ).rejects.toThrow(`Error during API request to ${endpoint} after 0 attempts: ${networkError.message}`);

      expect(mockFetch).toHaveBeenCalledTimes(1); // fetchが1回だけ呼ばれることを確認
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
        site: 'DMM.com',
        service: params.service || '',
        floor: params.floor || '',
        hits: String(params.hits || ''),
        keyword: params.keyword || '',
    });
    expectedUrl.search = searchParams.toString();
    expect(expectedUrl.searchParams.getAll('site').length).toBe(1);
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
        site: 'DMM.com',
    });
    expectedUrl.search = searchParams.toString();
    expect(expectedUrl.searchParams.getAll('site').length).toBe(1);
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
        site: 'DMM.com',
        initial: params.initial || '',
        hits: String(params.hits || ''),
    });
    expectedUrl.search = searchParams.toString();
    expect(expectedUrl.searchParams.getAll('site').length).toBe(1);
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
      site: 'DMM.com',
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
      site: 'DMM.com',
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
        site: 'DMM.com',
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
        site: 'DMM.com',
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
        site: 'DMM.com',
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
        site: 'DMM.com',
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
    const hitsPerPage = 100;

    it('should yield all items from multiple pages', async () => {
      const totalItems = 250;
      const page1Items: Partial<Item>[] = Array.from({ length: hitsPerPage }, (_, i) => ({ content_id: `item_${i + 1}` }));
      const page2Items: Partial<Item>[] = Array.from({ length: hitsPerPage }, (_, i) => ({ content_id: `item_${i + 101}` }));
      const page3Items: Partial<Item>[] = Array.from({ length: 50 }, (_, i) => ({ content_id: `item_${i + 201}` }));

      mockFetch
        .mockResolvedValueOnce({ // 1ページ目
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
        .mockResolvedValueOnce({ // 2ページ目
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
        .mockResolvedValueOnce({ // 3ページ目
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
        site: 'DMM.com',
        service: params.service || '',
        floor: params.floor || '',
        keyword: params.keyword || '',
        hits: String(hitsPerPage),
      };

      const url1 = new URL(expectedUrlBase);
      url1.search = new URLSearchParams({ ...baseSearchParams, offset: '1' }).toString();
      expect(mockFetch).toHaveBeenNthCalledWith(1, url1.toString(), expect.any(Object));

      const url2 = new URL(expectedUrlBase);
      url2.search = new URLSearchParams({ ...baseSearchParams, offset: '101' }).toString();
      expect(mockFetch).toHaveBeenNthCalledWith(2, url2.toString(), expect.any(Object));

      const url3 = new URL(expectedUrlBase);
      url3.search = new URLSearchParams({ ...baseSearchParams, offset: '201' }).toString();
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
                // 1回目の呼び出しは成功
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
            // 2回目以降の呼び出しはネットワークエラー
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
    }, testRetryDelay * (2 ** (testMaxRetries + 1) -1) + 1000);
  });
});