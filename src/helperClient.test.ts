import { DmmApiHelperClient } from './helperClient';
import { DmmApiClient } from './client';
import type { Item, ItemListResponse } from './types';

// DmmApiClientをモック化
jest.mock('./client');

const MockDmmApiClient = DmmApiClient as jest.MockedClass<typeof DmmApiClient>;

describe('DmmApiHelperClient', () => {
  let enhancedClient: DmmApiHelperClient;
  let mockRawClient: jest.Mocked<DmmApiClient>;

  const mockOptions = {
    apiId: 'test-api-id',
    affiliateId: 'test-affiliate-id',
  };

  beforeEach(() => {
    // 各テストの前にモックをリセット
    MockDmmApiClient.mockClear();

    enhancedClient = new DmmApiHelperClient(mockOptions);
    // モックされた DmmApiClient のインスタンスを取得
    // DmmApiHelperClient のコンストラクタ内で new DmmApiClient が呼ばれるため、
    // mock.instances[0] でアクセスできる
    mockRawClient = MockDmmApiClient.mock.instances[0] as jest.Mocked<DmmApiClient>;
  });

  it('should instantiate DmmApiClient with correct options', () => {
    expect(MockDmmApiClient).toHaveBeenCalledTimes(1);
    expect(MockDmmApiClient).toHaveBeenCalledWith(mockOptions);
  });

  it('should return the raw DmmApiClient instance', () => {
    expect(enhancedClient.api()).toBe(mockRawClient);
  });

  describe('getItemById', () => {
    const testCid = 'testitem123';
    const mockItem: Item = {
      service_code: 'digital',
      service_name: '動画',
      floor_code: 'videoa',
      floor_name: 'ビデオ',
      category_name: 'テストカテゴリ',
      content_id: testCid,
      product_id: 'abcde12345',
      title: 'テスト商品',
      URL: `https://example.com/product/${testCid}/`,
      affiliateURL: `https://affiliate.example.com/?cid=${testCid}`,
      date: '2024-01-01 00:00:00',
      // 他の必須またはテストに必要なフィールドを追加
    };

    it('should call getItemList with correct parameters and return the item', async () => {
      const mockResponse: ItemListResponse = {
        result_count: 1,
        total_count: 1,
        first_position: 1,
        items: [mockItem],
      };
      // getItemListが特定のレスポンスを返すようにモックを設定
      mockRawClient.getItemList.mockResolvedValue(mockResponse);

      const item = await enhancedClient.getItemById(testCid);

      expect(mockRawClient.getItemList).toHaveBeenCalledTimes(1);
      expect(mockRawClient.getItemList).toHaveBeenCalledWith({
        cid: testCid,
        hits: 1,
        offset: 1,
      });
      expect(item).toEqual(mockItem);
    });

    it('should call getItemList with additional options', async () => {
        const mockResponse: ItemListResponse = {
          result_count: 1,
          total_count: 1,
          first_position: 1,
          items: [mockItem],
        };
        mockRawClient.getItemList.mockResolvedValue(mockResponse);

        const options = { site: 'FANZA' as const, service: 'digital' };
        await enhancedClient.getItemById(testCid, options);

        expect(mockRawClient.getItemList).toHaveBeenCalledTimes(1);
        expect(mockRawClient.getItemList).toHaveBeenCalledWith({
          ...options,
          cid: testCid,
          hits: 1,
          offset: 1,
        });
      });


    it('should return null if getItemList returns no items', async () => {
      const mockResponse: ItemListResponse = {
        result_count: 0,
        total_count: 0,
        first_position: 0, // 0件の場合は0になることが多い
        items: [], // 空の配列
      };
      mockRawClient.getItemList.mockResolvedValue(mockResponse);

      const item = await enhancedClient.getItemById(testCid);

      expect(mockRawClient.getItemList).toHaveBeenCalledTimes(1);
      expect(mockRawClient.getItemList).toHaveBeenCalledWith({
        cid: testCid,
        hits: 1,
        offset: 1,
      });
      expect(item).toBeNull();
    });

    it('should throw an error if getItemList throws an error', async () => {
      const testError = new Error('API Error');
      mockRawClient.getItemList.mockRejectedValue(testError);

      // getItemById が testError をスローすることを期待する
      await expect(enhancedClient.getItemById(testCid)).rejects.toThrow(testError);

      expect(mockRawClient.getItemList).toHaveBeenCalledTimes(1);
      expect(mockRawClient.getItemList).toHaveBeenCalledWith({
        cid: testCid,
        hits: 1,
        offset: 1,
      });
    });
  });
});