import { URL, URLSearchParams } from 'node:url';
import type {
  ItemListRequestParams,
  ItemListResponse,
  Item,
  FloorListResponse,
  ActressSearchRequestParams,
  ActressSearchResponse,
  GenreSearchRequestParams,
  GenreSearchResponse,
  MakerSearchRequestParams,
  MakerSearchResponse,
  SeriesSearchRequestParams,
  SeriesSearchResponse,
  AuthorSearchRequestParams,
  AuthorSearchResponse,
} from './types';

/**
 * Options for the DMM API client.
 */
export interface DmmApiClientOptions {
  /** API ID */
  apiId: string;
  /** Affiliate ID */
  affiliateId: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Base URL for the API (optional) */
  baseUrl?: string;
}

/**
 * DMM Affiliate API v3 Client.
 */
export class DmmApiClient {
  private readonly baseUrl: string;
  public static readonly ItemListEndpoint = '/ItemList';
  public static readonly FloorListEndpoint = '/FloorList';
  public static readonly ActressSearchEndpoint = '/ActressSearch';
  public static readonly GenreSearchEndpoint = '/GenreSearch';
  public static readonly MakerSearchEndpoint = '/MakerSearch';
  public static readonly SeriesSearchEndpoint = '/SeriesSearch';
  public static readonly AuthorSearchEndpoint = '/AuthorSearch';
  public static readonly DefaultHitsPerPageForGetAllItems = 100;
  public static readonly DefaultTimeout = 10000;
  private readonly apiId: string;
  private readonly affiliateId: string;
  private readonly timeout: number;

  /**
   * Creates an instance of DmmApiClient.
   * @param {DmmApiClientOptions} options - Client options.
   * @throws {Error} if apiId or affiliateId is missing.
   */
  constructor(options: DmmApiClientOptions) {
    if (!options.apiId || !options.affiliateId) {
      throw new Error('API ID and Affiliate ID are required.');
    }
    this.apiId = options.apiId;
    this.affiliateId = options.affiliateId;
    this.timeout = options.timeout ?? DmmApiClient.DefaultTimeout;

    if (options.baseUrl !== undefined) {
      if (typeof options.baseUrl !== 'string' || options.baseUrl.trim() === '') {
        throw new Error('Invalid baseUrl: must be a valid URL string or undefined.');
      }
      try {
        const url = new URL(options.baseUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error('Invalid baseUrl: protocol must be http or https.');
        }
      } catch (e) {
        // URL constructor throws TypeError for invalid URLs
        throw new Error('Invalid baseUrl: must be a valid URL string or undefined.');
      }
    }

    let tempBaseUrl = options.baseUrl ?? 'https://api.dmm.com/affiliate/v3';
    if (tempBaseUrl.endsWith('/')) {
      tempBaseUrl = tempBaseUrl.slice(0, -1);
    }
    this.baseUrl = tempBaseUrl;
  }

  /**
   * Sends a request to the API endpoint.
   * @protected
   * @template T The expected response type.
   * @param {string} endpoint - The API endpoint path (e.g., '/ItemList').
   * @param {Record<string, string | number | undefined>} [params] - API parameters.
   * @returns {Promise<T>} The 'result' part of the API response.
   * @throws {Error} if the request fails, times out, or the response format is invalid.
   */
  protected async request<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    const queryParams: Record<string, string> = {
        api_id: this.apiId,
        affiliate_id: this.affiliateId,
    };

    for (const key in params) {
        if (key !== 'api_id' && key !== 'affiliate_id' && params[key] !== undefined) {
            queryParams[key] = String(params[key]);
        }
    }
    const searchParams = new URLSearchParams(queryParams);
    url.search = searchParams.toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (!data || typeof data !== 'object' || !('result' in data)) {
          throw new Error('Invalid API response format: "result" field is missing.');
        }
        return data.result as T;
      }

      // Non-retryable error or max retries exceeded
      const errorBody = await response.json().catch(e => response.text());
      const errorMessage = errorBody?.result?.message || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody)) || response.statusText;
      throw new Error(`API request to ${endpoint} failed with status ${response.status}: ${errorMessage}`);

    } catch (error: unknown) {
      clearTimeout(timeoutId);

      let isTimeoutError = false;

      if (error && typeof error === 'object') {
        const err = error as { name?: string; message?: string };
        if (err.name === 'AbortError') {
          isTimeoutError = true;
        } else if (
          err.message &&
          (err.message.toLowerCase().includes('aborted') ||
            err.message.includes('The operation was aborted'))
        ) {
          isTimeoutError = true;
        }
      }

      if (isTimeoutError) {
        throw new Error(`API request to ${endpoint} timed out after ${this.timeout}ms`);
      }

      // Non-retryable error or max retries exceeded
      // HTTP error responses (including JSON parse failures) are handled above
      const originalErrorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error during API request to ${endpoint}: ${originalErrorMessage}`);
    }
  }

  /**
   * Calls the Item List API.
   * @param {ItemListRequestParams} params - Search parameters.
   * @returns {Promise<ItemListResponse>} Item search results.
   */
  public async getItemList(params: ItemListRequestParams): Promise<ItemListResponse> {
    const apiParams = { ...params };
    return this.request<ItemListResponse>(DmmApiClient.ItemListEndpoint, apiParams);
  }

  /**
   * Calls the Floor List API.
   * @returns {Promise<FloorListResponse>} Floor list.
   */
  public async getFloorList(): Promise<FloorListResponse> {
    // This API does not take additional parameters.
    return this.request<FloorListResponse>(DmmApiClient.FloorListEndpoint);
  }

  /**
   * Calls the Actress Search API.
   * @param {ActressSearchRequestParams} params - Search parameters.
   * @returns {Promise<ActressSearchResponse>} Actress search results.
   */
  public async searchActress(params: ActressSearchRequestParams): Promise<ActressSearchResponse> {
    return this.request<ActressSearchResponse>(DmmApiClient.ActressSearchEndpoint, {...params});
  }

  /**
   * Calls the Genre Search API.
   * @param {GenreSearchRequestParams} params - Search parameters.
   * @returns {Promise<GenreSearchResponse>} Genre search results.
   */
  public async searchGenre(params: GenreSearchRequestParams): Promise<GenreSearchResponse> {
    return this.request<GenreSearchResponse>(DmmApiClient.GenreSearchEndpoint, {...params});
  }

  /**
   * Calls the Maker Search API.
   * @param {MakerSearchRequestParams} params - Search parameters.
   * @returns {Promise<MakerSearchResponse>} Maker search results.
   */
  public async searchMaker(params: MakerSearchRequestParams): Promise<MakerSearchResponse> {
    return this.request<MakerSearchResponse>(DmmApiClient.MakerSearchEndpoint, {...params});
  }

  /**
   * Calls the Series Search API.
   * @param {SeriesSearchRequestParams} params - Search parameters.
   * @returns {Promise<SeriesSearchResponse>} Series search results.
   */
  public async searchSeries(params: SeriesSearchRequestParams): Promise<SeriesSearchResponse> {
    return this.request<SeriesSearchResponse>(DmmApiClient.SeriesSearchEndpoint, {...params});
  }

  /**
   * Calls the Author Search API.
   * @param {AuthorSearchRequestParams} params - Search parameters.
   * @returns {Promise<AuthorSearchResponse>} Author search results.
   */
  public async searchAuthor(params: AuthorSearchRequestParams): Promise<AuthorSearchResponse> {
    return this.request<AuthorSearchResponse>(DmmApiClient.AuthorSearchEndpoint, {...params});
  }

  /**
   * Retrieves all items matching the given criteria using the Item List API with an async generator.
   * Suitable for efficiently processing a large number of items.
   * @param {Omit<ItemListRequestParams, 'hits' | 'offset'>} params - Search parameters (hits and offset are managed internally and will be ignored).
   * @yields {Item} Matched item information.
   * @throws {Error} if an error occurs during API calls.
   */
  public async *getAllItems(params: Omit<ItemListRequestParams, 'hits' | 'offset'>): AsyncGenerator<Item, void, undefined> {
    let currentOffset = 1;
    const hitsPerPage = DmmApiClient.DefaultHitsPerPageForGetAllItems;
    let totalCount = -1;

    const requestParams: ItemListRequestParams = {
      ...params,
      hits: hitsPerPage,
      offset: currentOffset,
    };

    while (totalCount === -1 || currentOffset <= totalCount) {
      requestParams.offset = currentOffset;
      try {
        const response = await this.getItemList(requestParams);

        if (totalCount === -1) {
          totalCount = response.total_count;
          if (totalCount === 0) {
            return;
          }
        }

        if (response.items && response.items.length > 0) {
          for (const item of response.items) {
            yield item;
          }
          currentOffset = response.first_position + response.items.length;
        } else {
          break;
        }

      } catch (error) {
        const originalErrorMessage = error instanceof Error ? error.message : String(error);
        const enhancedError = new Error(`Error in getAllItems at offset ${currentOffset}: ${originalErrorMessage}`);
        if (error instanceof Error && error.stack) {
            enhancedError.stack = error.stack;
        }
        if (typeof Error.prototype.cause === 'undefined') {
            Object.defineProperty(enhancedError, 'cause', {
                value: error,
                enumerable: false,
                configurable: true,
                writable: true
            });
        } else {
            enhancedError.cause = error;
        }
        throw enhancedError;
      }
    }
  }
}