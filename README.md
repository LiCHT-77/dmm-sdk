# DMM Affiliate API v3 TypeScript SDK

[![npm version](https://badge.fury.io/js/@licht-77%2Fdmm-sdk.svg)](https://badge.fury.io/js/@licht-77%2Fdmm-sdk)

DMM Affiliate API v3 を TypeScript/JavaScript から簡単に利用するための非公式SDKです。

## 導入方法

npm または yarn を使用してインストールします。

```bash
npm install @licht-77/dmm-sdk
```

## 使い方

### 1. クライアントの初期化

API ID とアフィリエイト ID を指定してクライアントを初期化します。これらは DMM アフィリエイトの管理画面から取得できます。

```typescript
import { DmmApiClient } from '@licht-77/dmm-sdk';

const client = new DmmApiClient({
  apiId: 'YOUR_API_ID',         // あなたのAPI IDに置き換えてください
  affiliateId: 'YOUR_AFFILIATE_ID', // あなたのアフィリエイト ID に置き換えてください
  // site: 'DMM.com', // オプション: 対象サイト (デフォルトは 'DMM.com')
});
```

### 2. APIの呼び出し

#### 商品検索 (ItemList)

```typescript
async function searchItems() {
  try {
    const params = {
      site: 'DMM.R18', // 検索対象サイト
      service: 'digital', // 検索対象サービス (任意)
      floor: 'videoa',    // 検索対象フロア (任意)
      hits: 10,          // 取得件数 (デフォルト: 100, 最大: 100)
      offset: 1,         // 検索開始位置 (デフォルト: 1)
      sort: 'rank',      // ソート順 (任意)
      keyword: 'キーワード', // 検索キーワード (任意)
      // ... その他、API仕様で定義されているパラメータ
    };
    const response = await client.getItemList(params);

    console.log('検索結果:', response.items);
    console.log('総件数:', response.total_count);

  } catch (error) {
    console.error('商品検索エラー:', error);
  }
}

searchItems();
```

#### フロア一覧取得 (FloorList)

```typescript
async function getFloors() {
  try {
    const response = await client.getFloorList();
    console.log('フロア一覧:', response.site);
  } catch (error) {
    console.error('フロア一覧取得エラー:', error);
  }
}

getFloors();
```

#### その他の検索API

女優検索 (`searchActress`), ジャンル検索 (`searchGenre`), メーカー検索 (`searchMaker`), シリーズ検索 (`searchSeries`), 作者検索 (`searchAuthor`) も同様の形式で利用できます。

```typescript
// 例: 女優検索
async function searchActresses() {
  try {
    const params = {
      initial: 'あ', // 頭文字 (任意)
      actress_id: '12345', // 女優ID (任意)
      keyword: '女優名', // キーワード (任意)
      hits: 5,
      offset: 1,
    };
    const response = await client.searchActress(params);
    console.log('女優検索結果:', response.actress);
  } catch (error) {
    console.error('女優検索エラー:', error);
  }
}

searchActresses();
```

各APIの詳細なパラメータについては、[DMM Affiliate API v3 の公式ドキュメント](https://affiliate.dmm.com/api/)を参照してください。

## 型定義

各APIのリクエストパラメータとレスポンスの型定義も提供されています。TypeScriptプロジェクトで型チェックの恩恵を受けることができます。

```typescript
import { ItemListRequestParams, ItemListResponse, Item } from '@licht-77/dmm-sdk';
```

## ライセンス

[MIT](./LICENSE)