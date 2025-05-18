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
 * DMM APIクライアントのオプション
 */
export interface DmmApiClientOptions {
  /** API ID */
  apiId: string;
  /** アフィリエイトID */
  affiliateId: string;
  /** サイトコード (デフォルト: 'DMM.com') */
  site?: string;
  /** リクエストタイムアウト (ミリ秒, デフォルト: 10000) */
  timeout?: number;
  /** 最大リトライ回数 (デフォルト: 3) */
  maxRetries?: number;
  /** 初回リトライ遅延時間 (ミリ秒, デフォルト: 1000) */
  retryDelay?: number;
}

/**
 * DMM Affiliate API v3 クライアント
 */
export class DmmApiClient {
  private readonly baseUrl = 'https://api.dmm.com/affiliate/v3';
  private readonly apiId: string;
  private readonly affiliateId: string;
  private readonly site: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  /**
   * DmmApiClientのインスタンスを作成します。
   * @param options クライアントオプション
   */
  constructor(options: DmmApiClientOptions) {
    if (!options.apiId || !options.affiliateId) {
      throw new Error('API ID and Affiliate ID are required.');
    }
    this.apiId = options.apiId;
    this.affiliateId = options.affiliateId;
    this.site = options.site || 'DMM.com';
    this.timeout = options.timeout || 10000;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * APIエンドポイントにリクエストを送信します。
   * @param endpoint APIエンドポイントのパス (例: '/ItemList')
   * @param params APIパラメータ
   * @returns APIレスポンスの result 部分
   * @protected
   */
  protected async request<T>(endpoint: string, params: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    const queryParams: Record<string, string> = {
        api_id: this.apiId,
        affiliate_id: this.affiliateId,
        site: String(params.site ?? this.site),
    };

    for (const key in params) {
        if (key !== 'api_id' && key !== 'affiliate_id' && key !== 'site' && params[key] !== undefined) {
            queryParams[key] = String(params[key]);
        }
    }
    const searchParams = new URLSearchParams(queryParams);
    url.search = searchParams.toString();

    let attempts = 0;
    while (attempts <= this.maxRetries) {
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

        // リトライ対象のエラーか確認 (429 Too Many Requests or 5xx Server Error)
        if ((response.status === 429 || response.status >= 500) && attempts < this.maxRetries) {
          attempts++;
          const delay = this.retryDelay * 2 ** (attempts - 1); // 指数バックオフ
          console.warn(`API request to ${endpoint} failed with status ${response.status}. Retrying in ${delay}ms... (Attempt ${attempts}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // リトライ対象外のエラー、または最大リトライ回数超過
        const errorBody = await response.json().catch(e => response.text());
        const errorMessage = errorBody?.result?.message || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody)) || response.statusText;
        throw new Error(`API request to ${endpoint} failed with status ${response.status} after ${attempts} attempts: ${errorMessage}`);

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

        // fetch自体が失敗した場合 (TypeErrorなど) のみリトライ対象とする
        const shouldRetryNetworkError = (error instanceof TypeError);

        if (shouldRetryNetworkError && attempts < this.maxRetries) {
            attempts++;
            const delay = this.retryDelay * 2 ** (attempts - 1);
            console.warn(`API request to ${endpoint} failed with network error: ${error.message}. Retrying in ${delay}ms... (Attempt ${attempts}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
        }

        // リトライ対象外のエラー、または最大リトライ回数超過
        // HTTPエラーレスポンス起因のエラー (JSONパース失敗含む) は上で処理済み
        const originalErrorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Error during API request to ${endpoint} after ${attempts} attempts: ${originalErrorMessage}`);
      }
    }
    // この行には通常到達しないはずだが、型チェックのためにエラーを投げる
    throw new Error(`Reached end of request function unexpectedly after ${this.maxRetries + 1} attempts for endpoint ${endpoint}.`);
  }

  /**
   * 商品検索API (ItemList) を呼び出します。
   * @param params 検索パラメータ
   * @returns 商品検索結果
   */
  public async getItemList(params: ItemListRequestParams): Promise<ItemListResponse> {
    const { site, ...apiParams } = params;
    const requestSite = site || this.site;

    return this.request<ItemListResponse>('/ItemList', { ...apiParams, site: requestSite });
  }

  /**
   * フロア取得API (FloorList) を呼び出します。
   * @returns フロアリスト
   */
  public async getFloorList(): Promise<FloorListResponse> {
    // このAPIは追加のパラメータを取りません
    return this.request<FloorListResponse>('/FloorList', {});
  }

  /**
   * 女優検索API (ActressSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns 女優検索結果
   */
  public async searchActress(params: ActressSearchRequestParams): Promise<ActressSearchResponse> {
    return this.request<ActressSearchResponse>('/ActressSearch', params as Record<string, string | number | undefined>);
  }

  /**
   * ジャンル検索API (GenreSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns ジャンル検索結果
   */
  public async searchGenre(params: GenreSearchRequestParams): Promise<GenreSearchResponse> {
    return this.request<GenreSearchResponse>('/GenreSearch', params as unknown as Record<string, string | number | undefined>);
  }

  /**
   * メーカー検索API (MakerSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns メーカー検索結果
   */
  public async searchMaker(params: MakerSearchRequestParams): Promise<MakerSearchResponse> {
    return this.request<MakerSearchResponse>('/MakerSearch', params as unknown as Record<string, string | number | undefined>);
  }

  /**
   * シリーズ検索API (SeriesSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns シリーズ検索結果
   */
  public async searchSeries(params: SeriesSearchRequestParams): Promise<SeriesSearchResponse> {
    return this.request<SeriesSearchResponse>('/SeriesSearch', params as unknown as Record<string, string | number | undefined>);
  }

  /**
   * 作者検索API (AuthorSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns 作者検索結果
   */
  public async searchAuthor(params: AuthorSearchRequestParams): Promise<AuthorSearchResponse> {
    return this.request<AuthorSearchResponse>('/AuthorSearch', params as unknown as Record<string, string | number | undefined>);
  }

  /**
   * 商品検索API (ItemList) を使用して、指定された条件に一致するすべての商品を非同期ジェネレータで取得します。
   * 大量の商品を効率的に処理するのに適しています。
   * @param params 検索パラメータ (hits, offset は内部で管理されるため無視されます)
   * @yields {Item} 一致した商品情報
   */
  public async *getAllItems(params: Omit<ItemListRequestParams, 'hits' | 'offset'>): AsyncGenerator<Item, void, undefined> {
    let currentOffset = 1;
    const hitsPerPage = 100;
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
        const enhancedError = new Error(`Error in getAllItems at offset ${currentOffset}: ${error instanceof Error ? error.message : String(error)}`);
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