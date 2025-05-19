/**
 * 女優検索API (ActressSearch) のリクエストパラメータ
 * https://affiliate.dmm.com/api/v3/actresssearch.html
 */
export interface ActressSearchRequestParams {
  /** 頭文字 (50音) */
  initial?: string;
  /** 女優ID (カンマ区切り) */
  actress_id?: string;
  /** キーワード */
  keyword?: string;
  /** バスト下限 */
  gte_bust?: number;
  /** バスト上限 */
  lte_bust?: number;
  /** ウエスト下限 */
  gte_waist?: number;
  /** ウエスト上限 */
  lte_waist?: number;
  /** ヒップ下限 */
  gte_hip?: number;
  /** ヒップ上限 */
  lte_hip?: number;
  /** 身長下限 */
  gte_height?: number;
  /** 身長上限 */
  lte_height?: number;
  /** 誕生日下限 (YYYY-MM-DD) */
  gte_birthday?: string;
  /** 誕生日上限 (YYYY-MM-DD) */
  lte_birthday?: string;
  /** ヒット件数 (1-100, デフォルト: 20) */
  hits?: number;
  /** 検索開始位置 (1-, デフォルト: 1) */
  offset?: number;
  /** ソート順 */
  sort?:
    | 'name'
    | '-name'
    | 'bust'
    | '-bust'
    | 'waist'
    | '-waist'
    | 'hip'
    | '-hip'
    | 'height'
    | '-height'
    | 'birthday'
    | '-birthday'
    | 'id'
    | '-id';
}

/**
 * 女優情報
 */
export interface Actress {
  /** 女優ID */
  id: string;
  /** 名前 */
  name: string;
  /** フリガナ */
  ruby: string;
  /** バスト */
  bust?: string;
  /** カップ */
  cup?: string;
  /** ウエスト */
  waist?: string;
  /** ヒップ */
  hip?: string;
  /** 身長 */
  height?: string;
  /** 誕生日 (YYYY-MM-DD HH:MM:SS or YYYY/MM/DD) */
  birthday?: string;
  /** 血液型 */
  blood_type?: string;
  /** 趣味 */
  hobby?: string;
  /** 出身地 */
  prefectures?: string;
  /** 画像URL */
  imageURL?: {
    /** 小 */
    small: string;
    /** 大 */
    large: string;
  };
  /** 女優ページURL (アフィリエイトID付き) */
  listURL?: {
    /** 動画 */
    digital: string;
    /** 月額動画 見放題chデラックス */
    monthly_premium: string;
    /** DVD通販 */
    mono?: string;
  };
}

/**
 * 女優検索API (ActressSearch) のレスポンス
 */
export interface ActressSearchResponse {
  /** 総件数 */
  result_count: number;
  /** 取得件数 */
  total_count: number;
  /** 検索開始位置 */
  first_position: number;
  /** 女優リスト */
  actress?: Actress[]; // actressが存在しない場合もある (0件ヒットなど)
}