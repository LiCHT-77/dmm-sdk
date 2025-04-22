/**
 * ジャンル検索API (GenreSearch) のリクエストパラメータ
 * https://affiliate.dmm.com/api/v3/genresearch.html
 */
export interface GenreSearchRequestParams {
  /** フロアID */
  floor_id: string;
  /** 頭文字 (50音) */
  initial?: string;
  /** ヒット件数 (1-1000, デフォルト: 100) */
  hits?: number;
  /** 検索開始位置 (1-, デフォルト: 1) */
  offset?: number;
  /** 出力オプション */
  output?: string; // カンマ区切り (例: 'json,xml') - SDKではJSONのみ扱う想定
}

/**
 * ジャンル情報
 */
export interface Genre {
  /** ジャンルID */
  genre_id: number;
  /** ジャンル名 */
  name: string;
  /** フリガナ */
  ruby: string;
  /** リスト表示フラグ */
  list: number; // 0:非表示, 1:表示
}

/**
 * ジャンル検索API (GenreSearch) のレスポンス
 */
export interface GenreSearchResponse {
  /** リクエストパラメータ */
  request: {
    parameters: GenreSearchRequestParams;
  };
  /** 総件数 */
  result_count: number;
  /** 取得件数 */
  total_count: number;
  /** 検索開始位置 */
  first_position: number;
  /** ジャンルリスト */
  genre?: Genre[]; // genreが存在しない場合もある (0件ヒットなど)
}