import {
  DmmApiClient,
  type DmmApiClientOptions,
} from './client';
import type {
  ItemListRequestParams,
  Item,
} from './types';

/**
 * A helper client that wraps DmmApiClient to provide additional functionalities.
 */
export class DmmApiHelperClient {
  private readonly client: DmmApiClient;

  /**
   * Creates an instance of DmmApiHelperClient.
   * @param {DmmApiClientOptions} options - Options for the DMM API client.
   */
  constructor(options: DmmApiClientOptions) {
    this.client = new DmmApiClient(options);
  }

  /**
   * Gets the underlying DmmApiClient instance.
   * @returns {DmmApiClient} The DmmApiClient instance.
   */
  public api(): DmmApiClient {
    return this.client;
  }

  /**
   * Retrieves a single item by its Content ID (cid).
   * This method uses the ItemList API and returns the first item found.
   * @param {string} cid - The Content ID of the item.
   * @param {Omit<ItemListRequestParams, 'cid' | 'hits' | 'offset'>} [options] - Additional ItemListRequestParams (e.g., site).
   * @returns {Promise<Item | null>} The item information, or null if not found.
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