/**
 * 商品検索API (ItemList) のリクエストパラメータ
 * https://affiliate.dmm.com/api/v3/itemlist.html
 */
export interface ItemListRequestParams {
  /** サイト */
  site?: 'DMM.com' | 'FANZA';
  /** サービス */
  service?: string;
  /** フロア */
  floor?: string;
  /** ヒット件数 (1-100, デフォルト: 20) */
  hits?: number;
  /** 検索開始位置 (1-, デフォルト: 1) */
  offset?: number;
  /** ソート順 */
  sort?:
    | 'rank' // 総合人気順
    | 'price' // 価格昇順
    | '-price' // 価格降順
    | 'date' // 新着順
    | 'review' // レビュー平均点順
    | 'match' // キーワードマッチ順
    | string; // サービス固有のソート順 (例: 'reserve')
  /** キーワード */
  keyword?: string;
  /** 商品ID */
  cid?: string;
  /** JANコード/品番 */
  article?: 'maker' | 'item';
  /** JANコード/品番の値 */
  article_id?: string;
  /** GTINコード */
  gtin?: string;
  /** 出演者絞り込み */
  mono_actress?: string;
  /** 作者絞り込み */
  mono_author?: string;
  /** ジャンル絞り込み */
  mono_genre?: string;
  /** メーカー絞り込み */
  mono_maker?: string;
  /** シリーズ絞り込み */
  mono_series?: string;
  /** 在庫絞り込み */
  mono_stock?: 'stock' | 'reserve' | 'mono'; // 在庫あり | 予約受付中 | 在庫あり+予約受付中
  /** 画像あり絞り込み (デフォルト: true) */
  mono_image?: 'true' | 'false';
  /** 口コミあり絞り込み (デフォルト: true) */
  mono_review?: 'true' | 'false';
  /** 動画あり絞り込み (デフォルト: true) */
  mono_movie?: 'true' | 'false';
  /** 発売日絞り込み (YYYY-MM-DD) */
  gte_date?: string;
  /** 発売日絞り込み (YYYY-MM-DD) */
  lte_date?: string;
  /** 予約開始日絞り込み (YYYY-MM-DD) */
  gte_releasedate?: string;
  /** 予約開始日絞り込み (YYYY-MM-DD) */
  lte_releasedate?: string;
  /** 出力オプション */
  output?: string; // カンマ区切り (例: 'json,xml') - SDKではJSONのみ扱う想定
}

/**
 * 商品情報
 */
export interface Item {
  /** サービスコード */
  service_code: string;
  /** サービス名 */
  service_name: string;
  /** フロアコード */
  floor_code: string;
  /** フロア名 */
  floor_name: string;
  /** 商品ID */
  content_id: string;
  /** 品番 */
  product_id: string;
  /** タイトル */
  title: string;
  /** ボリューム */
  volume?: string;
  /** レビュー情報 */
  review?: {
    /** 件数 */
    count: number;
    /** 平均 */
    average: string;
  };
  /** 商品ページのURL */
  URL: string;
  /** アフィリエイトURL */
  affiliateURL: string;
  /** スマホ向けアフィリエイトURL */
  affiliateURLsp?: string;
  /** 画像URL */
  imageURL?: {
    /** リスト */
    list: string;
    /** 小 */
    small: string;
    /** 大 */
    large: string;
  };
  /** サンプル画像URL */
  sampleImageURL?: {
    sample_s?: {
      image: string[];
    };
    sample_l?: { // FANZAのみ
        image: string[];
    };
  };
  /** サンプル動画URL */
  sampleMovieURL?: {
    /** サイズ476_306 */
    size_476_306?: string;
    /** サイズ560_360 */
    size_560_360?: string;
    /** サイズ644_414 */
    size_644_414?: string;
    /** サイズ720_480 */
    size_720_480?: string;
    /** PCファイルサイズ */
    pc_flag: number; // 0:なし, 1:あり
    /** スマホファイルサイズ */
    sp_flag: number; // 0:なし, 1:あり
  };
  /** 価格情報 */
  prices?: {
    /** 税抜価格 */
    price: string;
    /** 税込価格 */
    deliveries?: {
      delivery: {
        type: string;
        price: string;
      }[];
    };
    /** 定価 */
    list_price?: string;
  };
  /** 発売日 */
  date: string;
  /** 商品詳細情報 */
  iteminfo?: {
    /** ジャンル情報 */
    genre?: { id: number; name: string }[];
    /** シリーズ情報 */
    series?: { id: number; name: string }[];
    /** メーカー情報 */
    maker?: { id: number; name: string }[];
    /** 出演者情報 */
    actress?: { id: number; name: string; ruby: string }[];
    /** 監督情報 */
    director?: { id: number; name: string; ruby: string }[];
    /** 作者情報 */
    author?: { id: number; name: string; ruby: string }[];
    /** レーベル情報 */
    label?: { id: number; name: string }[];
  };
  /** 在庫状況 */
  stock?: string;
  // 他にもサービス固有のフィールドが存在する可能性あり
  [key: string]: any;
}

/**
 * 商品検索API (ItemList) のレスポンス
 */
export interface ItemListResponse {
  /** リクエストパラメータ */
  request: {
    parameters: ItemListRequestParams;
  };
  /** 総件数 */
  result_count: number;
  /** 取得件数 */
  total_count: number;
  /** 検索開始位置 */
  first_position: number;
  /** 商品リスト */
  items?: Item[]; // itemsが存在しない場合もある (0件ヒットなど)
}