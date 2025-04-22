import {
  DmmApiClient,
  DmmApiClientOptions,
} from './client';
import {
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
 * DmmApiClientをラップし、追加機能を提供するクライアント
 */
export class DmmApiHelperClient {
  private readonly client: DmmApiClient;

  /**
   * DmmApiHelperClientのインスタンスを作成します。
   * @param options DMM APIクライアントのオプション
   */
  constructor(options: DmmApiClientOptions) {
    this.client = new DmmApiClient(options);
  }

  /**
   * 元のDmmApiClientインスタンスを取得します。
   * @returns DmmApiClientインスタンス
   */
  public getRawClient(): DmmApiClient {
    return this.client;
  }

  // --- DmmApiClientのメソッドを委譲 ---

  /**
   * 商品検索API (ItemList) を呼び出します。
   * @param params 検索パラメータ
   * @returns 商品検索結果
   */
  public async getItemList(params: ItemListRequestParams): Promise<ItemListResponse> {
    return this.client.getItemList(params);
  }

  /**
   * フロア取得API (FloorList) を呼び出します。
   * @returns フロアリスト
   */
  public async getFloorList(): Promise<FloorListResponse> {
    return this.client.getFloorList();
  }

  /**
   * 女優検索API (ActressSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns 女優検索結果
   */
  public async searchActress(params: ActressSearchRequestParams): Promise<ActressSearchResponse> {
    return this.client.searchActress(params);
  }

  /**
   * ジャンル検索API (GenreSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns ジャンル検索結果
   */
  public async searchGenre(params: GenreSearchRequestParams): Promise<GenreSearchResponse> {
    return this.client.searchGenre(params);
  }

  /**
   * メーカー検索API (MakerSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns メーカー検索結果
   */
  public async searchMaker(params: MakerSearchRequestParams): Promise<MakerSearchResponse> {
    return this.client.searchMaker(params);
  }

  /**
   * シリーズ検索API (SeriesSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns シリーズ検索結果
   */
  public async searchSeries(params: SeriesSearchRequestParams): Promise<SeriesSearchResponse> {
    return this.client.searchSeries(params);
  }

  /**
   * 作者検索API (AuthorSearch) を呼び出します。
   * @param params 検索パラメータ
   * @returns 作者検索結果
   */
  public async searchAuthor(params: AuthorSearchRequestParams): Promise<AuthorSearchResponse> {
    return this.client.searchAuthor(params);
  }

  /**
   * 商品検索API (ItemList) を使用して、指定された条件に一致するすべての商品を非同期ジェネレータで取得します。
   * @param params 検索パラメータ (hits, offset は内部で管理されるため無視されます)
   * @yields {Item} 一致した商品情報
   */
  public async *getAllItems(params: Omit<ItemListRequestParams, 'hits' | 'offset'>): AsyncGenerator<Item, void, undefined> {
     // DmmApiClientのgetAllItemsをそのまま呼び出すジェネレータを作成
     for await (const item of this.client.getAllItems(params)) {
        yield item;
     }
  }

  // --- 追加メソッド ---

  /**
   * 商品ID (cid) を指定して単一の商品を取得します。
   * ItemList APIを利用し、最初に見つかった商品を返します。
   * @param cid 商品ID
   * @param options 追加のItemListRequestParams (siteなど)
   * @returns 商品情報、見つからない場合はnull
   */
  public async getItemById(cid: string, options?: Omit<ItemListRequestParams, 'cid' | 'hits' | 'offset'>): Promise<Item | null> {
    const params: ItemListRequestParams = {
      ...options,
      cid: cid,
      hits: 1, // 1件だけ取得
      offset: 1,
    };
    try {
      const response = await this.client.getItemList(params);
      if (response.items && response.items.length > 0) {
        return response.items[0];
      }
      return null;
    } catch (error) {
      // エラーハンドリング: getItemListでエラーが発生した場合、それをラップして再スローするか、nullを返すか検討
      // ここではエラーログを出力し、nullを返す例
      console.error(`Error fetching item with cid ${cid}:`, error);
      // 必要であればエラーを再スローする
      // throw new Error(`Failed to get item by ID ${cid}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}