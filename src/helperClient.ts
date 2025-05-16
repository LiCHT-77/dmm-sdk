import {
  DmmApiClient,
  type DmmApiClientOptions,
} from './client';
import type {
  ItemListRequestParams,
  Item,
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
  public api(): DmmApiClient {
    return this.client;
  }

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
      hits: 1,
      offset: 1,
    };
    const response = await this.client.getItemList(params);
    if (response.items && response.items.length > 0) {
      return response.items[0];
    }
    return null;
  }
}