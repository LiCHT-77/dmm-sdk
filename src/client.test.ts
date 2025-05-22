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

describe('DmmApiClientOptions type', () => {
  it('should allow baseUrl to be an optional string', () => {
    const optionsWithBaseUrl: DmmApiClientOptions = {
      apiId: 'test-api-id',
      affiliateId: 'test-affiliate-id',
      baseUrl: 'https://example.com',
    };
    expect(optionsWithBaseUrl.baseUrl).toBe('https://example.com');

    const optionsWithoutBaseUrl: DmmApiClientOptions = {
      apiId: 'test-api-id',
      affiliateId: 'test-affiliate-id',
    };
    expect(optionsWithoutBaseUrl.baseUrl).toBeUndefined();
  });
});

describe('DmmApiClient', () => {
  const defaultOptions: DmmApiClientOptions = {
    apiId: 'test-api-id',
    affiliateId: 'test-affiliate-id',
  };

  let client: DmmApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new DmmApiClient({
        apiId: defaultOptions.apiId,
        affiliateId: defaultOptions.affiliateId,
    });
  });

  afterEach(() => {
    // vi.clearAllTimers(); // Vitestでは通常不要か、vi.useRealTimers()などで制御
  });

  describe('baseUrl handling', () => {
    const defaultApiBaseUrl = 'https://api.dmm.com/affiliate/v3';

    it('should use the default baseUrl if none is provided', async () => {
      const clientWithDefaultBaseUrl = new DmmApiClient(defaultOptions);
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
      await clientWithDefaultBaseUrl.getFloorList();

      const urlInstance = new URL(mockFetch.mock.calls[0][0] as string);
      expect(urlInstance.origin + urlInstance.pathname).toBe(`${defaultApiBaseUrl}/FloorList`);
    });

    it('should use the provided baseUrl if specified', async () => {
      const customBaseUrl = 'https://custom.example.com/api';
      const clientWithCustomBaseUrl = new DmmApiClient({
        ...defaultOptions,
        baseUrl: customBaseUrl,
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
      await clientWithCustomBaseUrl.getFloorList();

      const urlInstance = new URL(mockFetch.mock.calls[0][0] as string);
      expect(urlInstance.origin + urlInstance.pathname).toBe(`${customBaseUrl}/FloorList`);
    });

    it('should correctly handle baseUrl with a trailing slash', async () => {
        const customBaseUrlWithSlash = 'https://custom.example.com/api/';
        const clientWithCustomBaseUrl = new DmmApiClient({
            ...defaultOptions,
            baseUrl: customBaseUrlWithSlash,
        });
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
        await clientWithCustomBaseUrl.getFloorList();

        const urlInstance = new URL(mockFetch.mock.calls[0][0] as string);
        // APIエンドポイントの前にスラッシュが2重にならないことを期待
        expect(urlInstance.origin + urlInstance.pathname).toBe(`${customBaseUrlWithSlash.slice(0, -1)}/FloorList`);
    });

    it('should correctly handle baseUrl without a trailing slash and endpoint without leading slash', async () => {
        const customBaseUrl = 'https://custom.example.com/api';
        // DmmApiClientの内部でエンドポイントの先頭に `/` が付与されることを想定
        const clientWithCustomBaseUrl = new DmmApiClient({
            ...defaultOptions,
            baseUrl: customBaseUrl,
        });
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
        // getFloorListは内部で 'FloorList' (先頭スラッシュなし) を使うと仮定
        await clientWithCustomBaseUrl.getFloorList();

        const urlInstance = new URL(mockFetch.mock.calls[0][0] as string);
        expect(urlInstance.origin + urlInstance.pathname).toBe(`${customBaseUrl}/FloorList`);
    });

    describe('Backward compatibility and testability', () => {
      it('should work correctly with existing DmmApiClientOptions (without baseUrl)', async () => {
        const clientWithoutBaseUrl = new DmmApiClient(defaultOptions);
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) });
        await clientWithoutBaseUrl.getFloorList();

        const urlCall = mockFetch.mock.calls[0][0] as string;
        const urlInstance = new URL(urlCall);
        expect(urlInstance.origin + urlInstance.pathname).toBe(`${defaultApiBaseUrl}/FloorList`);
        expect(urlCall).toContain(`api_id=${defaultOptions.apiId}`);
        expect(urlCall).toContain(`affiliate_id=${defaultOptions.affiliateId}`);
      });

      it('should use the overridden baseUrl for all API methods when testing', async () => {
        const testBaseUrl = 'https://test-double.example.com/v1';
        const testClient = new DmmApiClient({
          ...defaultOptions,
          baseUrl: testBaseUrl,
        });

        const methodsToTest: { method: keyof DmmApiClient, params?: unknown, endpoint: string }[] = [
          { method: 'getItemList', params: { site: 'DMM.com', service: 'digital', floor: 'videoa', hits: 1, sort: 'rank' } as ItemListRequestParams, endpoint: 'ItemList' },
          { method: 'getFloorList', params: undefined, endpoint: 'FloorList' },
          { method: 'searchActress', params: { initial: 'a', hits: 1 } as ActressSearchRequestParams, endpoint: 'ActressSearch' },
          { method: 'searchGenre', params: { floor_id: '123', initial: 'あ', hits: 1 } as GenreSearchRequestParams, endpoint: 'GenreSearch' },
          { method: 'searchMaker', params: { floor_id: '456', initial: 'm', hits: 1 } as MakerSearchRequestParams, endpoint: 'MakerSearch' },
          { method: 'searchSeries', params: { floor_id: '789', initial: 's', hits: 1 } as SeriesSearchRequestParams, endpoint: 'SeriesSearch' },
          { method: 'searchAuthor', params: { floor_id: '101', initial: 'k', hits: 1 } as AuthorSearchRequestParams, endpoint: 'AuthorSearch' },
        ];

        for (const { method, params, endpoint } of methodsToTest) {
          mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: { status: 200 } }) });
          await (testClient[method] as (params: unknown) => Promise<unknown>)(params);

          const urlCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
          const urlInstance = new URL(urlCall);
          expect(urlInstance.origin + urlInstance.pathname).toBe(`${testBaseUrl}/${endpoint}`);
          expect(urlCall).toContain(`api_id=${defaultOptions.apiId}`);
          expect(urlCall).toContain(`affiliate_id=${defaultOptions.affiliateId}`);
        }
      });
    });
  });

  describe('baseUrl validation', () => {
    it('should throw an error if baseUrl is an empty string', () => {
      expect(() => new DmmApiClient({ ...defaultOptions, baseUrl: '' }))
        .toThrow('Invalid baseUrl: must be a valid URL string or undefined.');
    });

    it('should throw an error if baseUrl is an invalid URL', () => {
      expect(() => new DmmApiClient({ ...defaultOptions, baseUrl: 'invalid-url' }))
        .toThrow('Invalid baseUrl: must be a valid URL string or undefined.');
    });

    it('should throw an error if baseUrl is a URL with an unsupported protocol', () => {
      expect(() => new DmmApiClient({ ...defaultOptions, baseUrl: 'ftp://example.com' }))
        .toThrow('Invalid baseUrl: must be a valid URL string or undefined.');
    });

    it('should not throw an error for valid http or https URLs', () => {
      expect(() => new DmmApiClient({ ...defaultOptions, baseUrl: 'http://example.com' })).not.toThrow();
      expect(() => new DmmApiClient({ ...defaultOptions, baseUrl: 'https://secure.example.com/api/v2' })).not.toThrow();
    });
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
  });

  it('should create an instance with default timeout and retries', () => {
     const defaultClient = new DmmApiClient(defaultOptions);
    expect((defaultClient as unknown as { apiId: string }).apiId).toBe(defaultOptions.apiId);
    expect((defaultClient as unknown as { affiliateId: string }).affiliateId).toBe(defaultOptions.affiliateId);
  });

  describe('request method', () => {
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
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
        .toThrow(`API request to ${endpoint} failed with status ${errorStatus}: ${errorResponse.result.message}`);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 5xx errors and throw an error immediately', async () => {
      const endpoint = '/Test5xxError';
      const testParams = { site: 'DMM.com' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ result: { message: 'Server Error' } }),
      });

      await expect(
        (client as unknown as { request: (endpoint: string, params?: unknown) => Promise<unknown> }).request(endpoint, testParams)
      ).rejects.toThrow('API request to /Test5xxError failed with status 500: Server Error');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 429 errors and throw an error immediately', async () => {
      const endpoint = '/Test429Error';
      const testParams = { site: 'DMM.com' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ result: { message: 'Rate Limit Exceeded' } }),
      });

      await expect(
        (client as unknown as { request: (endpoint: string, params?: unknown) => Promise<unknown> }).request(endpoint, testParams)
      ).rejects.toThrow('API request to /Test429Error failed with status 429: Rate Limit Exceeded');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on network error (fetch throws) and throw an error immediately', async () => {
      const endpoint = '/TestNetworkError';
      const testParams = { site: 'DMM.com' };
      const networkError = new TypeError('Network request failed');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(
          (client as unknown as { request: (endpoint: string, params?: unknown) => Promise<unknown> }).request(endpoint, testParams)
      ).rejects.toThrow(`Error during API request to ${endpoint}: Network request failed`);
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
  });

  // --- Test getAllItems ---
  describe('getAllItems', () => {
    const baseParamsForGetAllItems: Omit<ItemListRequestParams, 'hits' | 'offset'> = {
      service: 'digital',
      floor: 'videoa',
      keyword: 'test-keyword-getallitems', // 他のテストと区別できるようなキーワード
    };
    const hitsPerPage = DmmApiClient.DefaultHitsPerPageForGetAllItems;

    it('should yield all items from multiple pages', { timeout: 1000 }, async () => {
      const totalItems = 250;
      const page1Items: Partial<Item>[] = Array.from({ length: hitsPerPage }, (_, i) => ({ content_id: `item_${i + 1}` }));
      const page2Items: Partial<Item>[] = Array.from({ length: hitsPerPage }, (_, i) => ({ content_id: `item_${i + 101}` }));
      const page3Items: Partial<Item>[] = Array.from({ length: 50 }, (_, i) => ({ content_id: `item_${i + 201}` }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              request: { parameters: { ...baseParamsForGetAllItems, hits: hitsPerPage, offset: 1 } },
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
              request: { parameters: { ...baseParamsForGetAllItems, hits: hitsPerPage, offset: 101 } },
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
              request: { parameters: { ...baseParamsForGetAllItems, hits: hitsPerPage, offset: 201 } },
              result_count: totalItems,
              total_count: totalItems,
              first_position: 201,
              items: page3Items,
            },
          }),
        });

      const receivedItems: Partial<Item>[] = [];
      for await (const item of client.getAllItems(baseParamsForGetAllItems)) {
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
        service: baseParamsForGetAllItems.service || '',
        floor: baseParamsForGetAllItems.floor || '',
        keyword: baseParamsForGetAllItems.keyword || '',
        hits: String(hitsPerPage),
      };

      const url1 = new URL(expectedUrlBase);
      const p1 = { ...baseSearchParams, offset: '1' };
      url1.search = new URLSearchParams(p1).toString();
      expect(mockFetch).toHaveBeenNthCalledWith(1, url1.toString());

      const url2 = new URL(expectedUrlBase);
      const p2 = { ...baseSearchParams, offset: '101' };
      url2.search = new URLSearchParams(p2).toString();
      expect(mockFetch).toHaveBeenNthCalledWith(2, url2.toString());

      const url3 = new URL(expectedUrlBase);
      const p3 = { ...baseSearchParams, offset: '201' };
      url3.search = new URLSearchParams(p3).toString();
      expect(mockFetch).toHaveBeenNthCalledWith(3, url3.toString());
    });

    it('should yield no items if result_count is 0', async () => {
       mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              request: { parameters: { ...baseParamsForGetAllItems, hits: hitsPerPage, offset: 1 } },
              result_count: 0,
              total_count: 0,
              first_position: 0,
              items: [],
            },
          }),
        });

        const receivedItems = [];
        for await (const item of client.getAllItems(baseParamsForGetAllItems)) {
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
                    request: { parameters: { ...baseParamsForGetAllItems, hits: hitsPerPage, offset: 1 } },
                    result_count: totalItems,
                    total_count: totalItems,
                    first_position: 1,
                    items: pageItems,
                },
            }),
        });

        const receivedItems = [];
        for await (const item of client.getAllItems(baseParamsForGetAllItems)) {
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
                            request: { parameters: { ...baseParamsForGetAllItems, hits: hitsPerPage, offset: 1 } },
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

        const generator = client.getAllItems(baseParamsForGetAllItems);
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
        const expectedOriginalErrorMessage = `Error during API request to /ItemList: ${apiError.message}`;
        if (caughtError) {
            expect(caughtError.message).toBe(`Error in getAllItems at offset ${expectedOffsetForError}: ${expectedOriginalErrorMessage}`);
            expect(caughtError.cause).toBeInstanceOf(Error);
            if (caughtError.cause instanceof Error) {
                expect(caughtError.cause.message).toBe(expectedOriginalErrorMessage);
            }
        }

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should yield items correctly and handle pagination until no more items are returned', async () => {
      const params: ItemListRequestParams = { site: 'DMM.com', service: 'digital', floor: 'videoa', hits: 10, offset: 1 };
      const mockResponse1 = {
        result: {
          status: 200,
          result_count: 1,
          total_count: 2,
          first_position: 1,
          items: [{ content_id: 'item1' } as Item],
        },
      };
      const mockResponse2 = {
        result: {
          status: 200,
          result_count: 1,
          total_count: 2,
          first_position: 2,
          items: [{ content_id: 'item2' } as Item],
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse1 })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse2 });

      const items: Item[] = [];
      const { hits, offset, ...baseParams } = params;
      for await (const item of client.getAllItems(baseParams)) {
        items.push(item);
      }

      expect(items.length).toBe(2);
      expect(items[0].content_id).toBe('item1');
      expect(items[1].content_id).toBe('item2');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const calls = mockFetch.mock.calls;
      const firstCallUrl = new URL(calls[0][0] as string);
      expect(firstCallUrl.searchParams.get('hits')).toBe(String(DmmApiClient.DefaultHitsPerPageForGetAllItems));
      expect(firstCallUrl.searchParams.get('offset')).toBe('1');

      const secondCallUrl = new URL(calls[1][0] as string);
      expect(secondCallUrl.searchParams.get('hits')).toBe(String(DmmApiClient.DefaultHitsPerPageForGetAllItems));
      expect(secondCallUrl.searchParams.get('offset')).toBe(String(mockResponse1.result.first_position + mockResponse1.result.items.length));
    });

    it('should handle API error during pagination in getAllItems and throw enhanced error', async () => {
      const params: Omit<ItemListRequestParams, 'hits' | 'offset'> = { site: 'DMM.com', service: 'digital', floor: 'videoa', sort: 'rank' };
      const mockSuccessResponse = {
        result: {
          status: 200,
          result_count: 1,
          total_count: 10,
          first_position: 1,
          items: [{ content_id: 'item1' } as Item],
        },
      };
      const mockError = new Error('Simulated API Error');

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse })
        .mockRejectedValueOnce(mockError);

      const items: Item[] = [];
      try {
        for await (const item of client.getAllItems(params)) {
          items.push(item);
        }
        expect('Error was not thrown').toBe('Error should have been thrown');
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error);
        const error = e as Error & { cause?: Error };
        expect(error.message).toMatch(/^Error in getAllItems at offset \d+: Error during API request to \/ItemList: Simulated API Error$/);
        expect(error.cause).toBeInstanceOf(Error);
        expect(error.cause?.message).toBe(`Error during API request to ${DmmApiClient.ItemListEndpoint}: ${mockError.message}`);
      }
      expect(items.length).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should correctly set total_count on the first call and use it for subsequent loop condition', async () => {
      const totalItemsExpected = 5; // total_countが少ないケース
      const itemsPage1: Item[] = [{ content_id: 'tc_item1' }, { content_id: 'tc_item2' }] as Item[];
      const itemsPage2: Item[] = [{ content_id: 'tc_item3' }, { content_id: 'tc_item4' }, { content_id: 'tc_item5' }] as Item[];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              status: 200,
              result_count: itemsPage1.length,
              total_count: totalItemsExpected, // First call sets this
              first_position: 1,
              items: itemsPage1,
            },
          }),
        })
        .mockResolvedValueOnce({ // This call should happen
          ok: true,
          json: async () => ({
            result: {
              status: 200,
              result_count: itemsPage2.length,
              total_count: totalItemsExpected, // Subsequent calls use the existing total_count
              first_position: 1 + itemsPage1.length,
              items: itemsPage2,
            },
          }),
        });
        // .mockResolvedValueOnce({ // This call should NOT happen as currentOffset (1+2+3=6) > totalCount (5)
        //   ok: true,
        //   json: async () => ({ result: { items: [], total_count: totalItemsExpected, first_position: 1 + itemsPage1.length + itemsPage2.length, result_count: 0 } }),
        // });


      const receivedItems: Item[] = [];
      for await (const item of client.getAllItems(baseParamsForGetAllItems)) {
        receivedItems.push(item);
      }

      expect(receivedItems.length).toBe(totalItemsExpected);
      expect(mockFetch).toHaveBeenCalledTimes(2); // total_countに基づいて2回呼び出される
      expect(receivedItems.map(i => i.content_id)).toEqual(['tc_item1', 'tc_item2', 'tc_item3', 'tc_item4', 'tc_item5']);
    });

    it('getAllItems should handle a large number of items with multiple pages', async () => {
      const totalItems = 250; // DefaultHitsPerPageForGetAllItems (100) * 2 + 50
      const page1Items: Partial<Item>[] = Array.from({ length: hitsPerPage }, (_, i) => ({ content_id: `large_item_${i + 1}` }));
      const page2Items: Partial<Item>[] = Array.from({ length: hitsPerPage }, (_, i) => ({ content_id: `large_item_${i + 1 + hitsPerPage}` }));
      const page3Items: Partial<Item>[] = Array.from({ length: totalItems - 2 * hitsPerPage }, (_, i) => ({ content_id: `large_item_${i + 1 + 2 * hitsPerPage}` }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              status: 200,
              result_count: page1Items.length,
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
              status: 200,
              result_count: page2Items.length,
              total_count: totalItems,
              first_position: 1 + hitsPerPage,
              items: page2Items,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              status: 200,
              result_count: page3Items.length,
              total_count: totalItems,
              first_position: 1 + 2 * hitsPerPage,
              items: page3Items,
            },
          }),
        });

      const receivedItems: Partial<Item>[] = [];
      for await (const item of client.getAllItems(baseParamsForGetAllItems)) {
        receivedItems.push(item);
      }

      expect(receivedItems.length).toBe(totalItems);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(receivedItems[0].content_id).toBe('large_item_1');
      expect(receivedItems[totalItems - 1].content_id).toBe(`large_item_${totalItems}`);
    });

    it('getAllItems should make no API calls if total_count is 0 on the first response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            status: 200,
            result_count: 0,
            total_count: 0, // total_count is 0
            first_position: 0,
            items: [],
          },
        }),
      });

      const receivedItems: Item[] = [];
      for await (const item of client.getAllItems(baseParamsForGetAllItems)) {
        receivedItems.push(item);
      }

      expect(receivedItems.length).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only the first call to get total_count
    });

    it('getAllItems should yield no items if the first response has no items and total_count is 0', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            status: 200,
            result_count: 0,
            total_count: 0,
            first_position: 0,
            items: [], // No items
          },
        }),
      });

      const receivedItems: Item[] = [];
      for await (const item of client.getAllItems(baseParamsForGetAllItems)) {
        receivedItems.push(item);
      }

      expect(receivedItems.length).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

     it('getAllItems should yield no items if the first response has items but total_count is 0 (edge case, API should not do this)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            status: 200,
            result_count: 1, // Has an item
            total_count: 0,   // But total_count is 0
            first_position: 1,
            items: [{ content_id: 'edge_item1' } as Item],
          },
        }),
      });

      const receivedItems: Item[] = [];
      for await (const item of client.getAllItems(baseParamsForGetAllItems)) {
        receivedItems.push(item);
      }
      // total_countが0なので、最初のAPI呼び出しで終了し、アイテムはイールドされない
      expect(receivedItems.length).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('getAllItems should stop if items array is unexpectedly empty or missing mid-pagination', async () => {
      const itemsPage1: Item[] = [{ content_id: 'stop_item1' }, { content_id: 'stop_item2' }] as Item[];
      mockFetch
        .mockResolvedValueOnce({ // First page has items
          ok: true,
          json: async () => ({
            result: {
              status: 200,
              result_count: itemsPage1.length,
              total_count: 5, // Expects more items
              first_position: 1,
              items: itemsPage1,
            },
          }),
        })
        .mockResolvedValueOnce({ // Second page unexpectedly has no items
          ok: true,
          json: async () => ({
            result: {
              status: 200,
              result_count: 0,
              total_count: 5,
              first_position: 1 + itemsPage1.length,
              items: [], // Empty items
            },
          }),
        });

      const receivedItems: Item[] = [];
      for await (const item of client.getAllItems(baseParamsForGetAllItems)) {
        receivedItems.push(item);
      }

      expect(receivedItems.length).toBe(itemsPage1.length); // Should only get items from the first page
      expect(mockFetch).toHaveBeenCalledTimes(2); // Called twice, but stopped due to empty items
      expect(receivedItems.map(i=>i.content_id)).toEqual(['stop_item1', 'stop_item2']);
    });


    it('getAllItems should correctly calculate the next offset when first_position is not 1', async () => {
      // このテストケース専用のモック設定に集中する
      mockFetch.mockClear(); // 念のためクリア

      const firstCallResponse = {
        result: {
          status: 200,
          result_count: 1,
          total_count: 7, // Adjusted total_count
          first_position: 5,
          items: [{content_id: 'fp_item1'} as Item]
        }
      };
      const secondCallResponse = {
         result: {
          status: 200,
          result_count: 1,
          total_count: 7, // Adjusted total_count
          first_position: 6,
          items: [{content_id: 'fp_item2'} as Item]
        }
      };
      // このテストでは、上記レスポンス以降はアイテムがないことを示す空レスポンスを追加
      const thirdCallEmptyResponse = {
        result: {
          status: 200,
          result_count: 0,
          total_count: 7, // Adjusted total_count
          first_position: 7, // 6 + 1
          items: []
        }
      };


      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => firstCallResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => secondCallResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => thirdCallEmptyResponse });


      const receivedItems: Item[] = [];
      // getAllItems に渡すパラメータは hits や offset を含まないもの
      const queryParams: Omit<ItemListRequestParams, 'hits' | 'offset'> = {
        service: 'digital',
        floor: 'videoa',
        keyword: 'test-fp-calc', // このテスト固有のキーワード
      };

      for await (const item of client.getAllItems(queryParams)) {
        receivedItems.push(item);
      }

      // 2つのアイテムが取得され、3回目のAPI呼び出しでループが終了するはず
      expect(receivedItems.length).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 2回アイテム取得 + 1回空確認

      const calls = mockFetch.mock.calls;

      const firstCallUrl = new URL(calls[0][0] as string);
      expect(firstCallUrl.searchParams.get('offset')).toBe('1');
      expect(firstCallUrl.searchParams.get('keyword')).toBe('test-fp-calc');


      const secondCallUrl = new URL(calls[1][0] as string);
      expect(secondCallUrl.searchParams.get('offset')).toBe(
        String(firstCallResponse.result.first_position + firstCallResponse.result.items.length) // 5 + 1 = 6
      );
      expect(secondCallUrl.searchParams.get('keyword')).toBe('test-fp-calc');

      const thirdCallUrl = new URL(calls[2][0] as string);
      expect(thirdCallUrl.searchParams.get('offset')).toBe(
        String(secondCallResponse.result.first_position + secondCallResponse.result.items.length) // 6 + 1 = 7
      );
      expect(thirdCallUrl.searchParams.get('keyword')).toBe('test-fp-calc');

      expect(receivedItems.map(i=>i.content_id)).toEqual(['fp_item1', 'fp_item2']);
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
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
    });

    it('should use the DmmApiClient.ItemListEndpoint constant for the endpoint path', async () => {
      const mockItemListResponse = { status: 200, items: [], total_count:0, result_count:0, first_position:0 };
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ result: mockItemListResponse }) });

      const client = new DmmApiClient(defaultOptions);
      const params: ItemListRequestParams = { site: 'DMM.com', service: 'digital', floor: 'videoa' };
      await client.getItemList(params);

      const expectedUrl = new URL(`${(client as unknown as { baseUrl: string }).baseUrl}${DmmApiClient.ItemListEndpoint}`);
      const queryParamsForSearch: Record<string, string> = {
        api_id: defaultOptions.apiId,
        affiliate_id: defaultOptions.affiliateId,
      };
      // params の各プロパティを string に変換して queryParamsForSearch にマージ
      for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
          const paramKey = key as keyof ItemListRequestParams;
          if (params[paramKey] !== undefined) { // undefined の値は除外
            queryParamsForSearch[paramKey] = String(params[paramKey]);
          }
        }
      }
      expectedUrl.search = new URLSearchParams(queryParamsForSearch).toString();

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
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
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
    });

    // 他の searchAuthor 関連のテストケースは必要に応じて追加
  });
});