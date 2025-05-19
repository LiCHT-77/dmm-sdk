import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DmmApiHelperClient } from './helperClient';
import { DmmApiClient, type DmmApiClientOptions } from './client';
import type { Item, ItemListResponse } from './types';

// DmmApiClient のモックインスタンスを保持するための変数
let mockDmmApiClientInstance: {
  getItemList: ReturnType<typeof vi.fn>;
  // 他の DmmApiClient のメソッドのモックも必要に応じてここに追加
};

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('./client');
  const MockDmmApiClientConstructor = vi.fn();
  const mockGetItemList = vi.fn();
  // 他のメソッドのモックも必要に応じてここに追加

  MockDmmApiClientConstructor.mockImplementation((_options: DmmApiClientOptions) => {
    mockDmmApiClientInstance = {
      getItemList: mockGetItemList,
      // 他のモックメソッド
    } as any; // DmmApiClientの完全なモックではないためanyでキャスト
    return mockDmmApiClientInstance;
  });

  return {
    ...actual, // 元のモジュールの他のエクスポートを維持
    DmmApiClient: MockDmmApiClientConstructor,
  };
});

// モックされたDmmApiClientのコンストラクタを取得
const MockedDmmApiClientConstructor = DmmApiClient as unknown as ReturnType<typeof vi.fn>;


describe('DmmApiHelperClient', () => {
  let enhancedClient: DmmApiHelperClient;
  // モックインスタンスをテスト内で参照するための変数
  let capturedMockRawClient: typeof mockDmmApiClientInstance;

  const mockOptions: DmmApiClientOptions = {
    apiId: 'test-api-id',
    affiliateId: 'test-affiliate-id',
  };

  beforeEach(() => {
    // モックをクリア
    MockedDmmApiClientConstructor.mockClear();
    // オプショナルチェーンを使用
    mockDmmApiClientInstance?.getItemList?.mockClear();
    // 他のモックメソッドもクリア

    enhancedClient = new DmmApiHelperClient(mockOptions);
    capturedMockRawClient = mockDmmApiClientInstance;
  });

  it('should instantiate DmmApiClient with correct options', () => {
    expect(MockedDmmApiClientConstructor).toHaveBeenCalledTimes(1);
    expect(MockedDmmApiClientConstructor).toHaveBeenCalledWith(mockOptions);
  });

  it('should return the raw DmmApiClient instance', () => {
    expect(enhancedClient.api()).toBe(capturedMockRawClient);
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
      imageURL: { small: 'small.jpg', list: 'list.jpg', large: 'large.jpg' },
      sampleImageURL: { sample_s: { image: ['s1.jpg'] } },
      iteminfo: {
        maker: [{ id: 1, name: 'Test Maker' }],
        actress: [{ id: 1, name: 'Test Actress' }],
        director: [{ id: 1, name: 'Test Director' }],
        series: [{ id: 1, name: 'Test Series' }],
        label: [{ id: 1, name: 'Test Label' }],
        genre: [{ id: 1, name: 'Test Genre' }]
        // 他に iteminfo に必要なプロパティがあればここに追加
      }
    };

    it('should call getItemList with correct parameters and return the item', async () => {
      const mockResponse: ItemListResponse = {
        result_count: 1,
        total_count: 1,
        first_position: 1,
        items: [mockItem],
      };
      capturedMockRawClient.getItemList.mockResolvedValue(mockResponse);

      const item = await enhancedClient.getItemById(testCid);

      expect(capturedMockRawClient.getItemList).toHaveBeenCalledTimes(1);
      expect(capturedMockRawClient.getItemList).toHaveBeenCalledWith({
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
        capturedMockRawClient.getItemList.mockResolvedValue(mockResponse);

        const options = { site: 'FANZA' as const, service: 'digital' as const };
        await enhancedClient.getItemById(testCid, options);

        expect(capturedMockRawClient.getItemList).toHaveBeenCalledTimes(1);
        expect(capturedMockRawClient.getItemList).toHaveBeenCalledWith({
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
        first_position: 0,
        items: [],
      };
      capturedMockRawClient.getItemList.mockResolvedValue(mockResponse);

      const item = await enhancedClient.getItemById(testCid);

      expect(capturedMockRawClient.getItemList).toHaveBeenCalledTimes(1);
      expect(capturedMockRawClient.getItemList).toHaveBeenCalledWith({
        cid: testCid,
        hits: 1,
        offset: 1,
      });
      expect(item).toBeNull();
    });

    it('should throw an error if getItemList throws an error', async () => {
      const testError = new Error('API Error');
      capturedMockRawClient.getItemList.mockRejectedValue(testError);

      await expect(enhancedClient.getItemById(testCid)).rejects.toThrow(testError);

      expect(capturedMockRawClient.getItemList).toHaveBeenCalledTimes(1);
      expect(capturedMockRawClient.getItemList).toHaveBeenCalledWith({
        cid: testCid,
        hits: 1,
        offset: 1,
      });
    });
  });
});