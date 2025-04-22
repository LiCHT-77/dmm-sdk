import { DmmApiHelperClient } from './helperClient';
import { DmmApiClient } from './client';
import { Item, ItemListRequestParams, ItemListResponse } from './types';

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
    expect(enhancedClient.getRawClient()).toBe(mockRawClient);
  });

  describe('getItemById', () => {
    const testCid = 'testitem123';
    const mockItem: Item = {
      service_code: 'digital',
      service_name: '動画',
      floor_code: 'videoa',
      floor_name: 'ビデオ',
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
        request: { parameters: { cid: testCid, hits: 1, offset: 1 } },
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
          request: { parameters: { site: 'FANZA', cid: testCid, hits: 1, offset: 1 } },
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
        request: { parameters: { cid: testCid, hits: 1, offset: 1 } },
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

    it('should return null if getItemList throws an error', async () => {
      const testError = new Error('API Error');
      mockRawClient.getItemList.mockRejectedValue(testError);
      // console.error の出力を抑制 (テスト中のエラーログを防ぐ)
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});


      const item = await enhancedClient.getItemById(testCid);

      expect(mockRawClient.getItemList).toHaveBeenCalledTimes(1);
      expect(mockRawClient.getItemList).toHaveBeenCalledWith({
        cid: testCid,
        hits: 1,
        offset: 1,
      });
      expect(item).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Error fetching item with cid ${testCid}:`, testError);

      // スパイを元に戻す
      consoleErrorSpy.mockRestore();
    });
  });

  // 他の委譲されたメソッドのテストも同様に追加可能 (必要に応じて)
  // 例: getItemList
  describe('getItemList (delegated)', () => {
    it('should call the raw client getItemList', async () => {
      const params: ItemListRequestParams = { keyword: 'test' };
      const mockResponse: ItemListResponse = { /* モックレスポンス */ } as any;
      mockRawClient.getItemList.mockResolvedValue(mockResponse);

      const result = await enhancedClient.getItemList(params);

      expect(mockRawClient.getItemList).toHaveBeenCalledTimes(1);
      expect(mockRawClient.getItemList).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResponse);
    });
  });

  // 例: getAllItems
  describe('getAllItems (delegated)', () => {
    it('should call the raw client getAllItems and yield items', async () => {
        const params = { keyword: 'test' };
        const mockItem1: Item = { content_id: 'item1' } as Item;
        const mockItem2: Item = { content_id: 'item2' } as Item;

        // モックジェネレータ関数
        async function* mockGenerator(): AsyncGenerator<Item, void, undefined> {
            yield mockItem1;
            yield mockItem2;
        }

        // DmmApiClient.prototype.getAllItems がモックジェネレータを返すように設定
        // jest.spyOn を使ってプロトタイプメソッドをモックする
        const getAllItemsSpy = jest.spyOn(DmmApiClient.prototype, 'getAllItems')
                                   .mockImplementation(mockGenerator);

        // DmmApiHelperClient を再生成して、モックされたプロトタイプメソッドを持つ DmmApiClient を内部で使うようにする
        enhancedClient = new DmmApiHelperClient(mockOptions);

        const results: Item[] = [];
        for await (const item of enhancedClient.getAllItems(params)) {
            results.push(item);
        }

        expect(getAllItemsSpy).toHaveBeenCalledTimes(1);
        expect(getAllItemsSpy).toHaveBeenCalledWith(params);
        expect(results).toEqual([mockItem1, mockItem2]);

        // スパイを元に戻す
        getAllItemsSpy.mockRestore();
    });
});

});