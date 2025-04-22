/**
 * 作者検索API (AuthorSearch) のリクエストパラメータ
 * https://affiliate.dmm.com/api/v3/authorsearch.html
 */
export interface AuthorSearchRequestParams {
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
 * 作者情報
 */
export interface Author {
  /** 作者ID */
  author_id: string; // ドキュメントでは number だが、実際は string の可能性が高い
  /** 作者名 */
  name: string;
  /** フリガナ */
  ruby: string;
  /** リスト表示フラグ */
  list: number; // 0:非表示, 1:表示
}

/**
 * 作者検索API (AuthorSearch) のレスポンス
 */
export interface AuthorSearchResponse {
  /** リクエストパラメータ */
  request: {
    parameters: AuthorSearchRequestParams;
  };
  /** 総件数 */
  result_count: number;
  /** 取得件数 */
  total_count: number;
  /** 検索開始位置 */
  first_position: number;
  /** 作者リスト */
  author?: Author[]; // authorが存在しない場合もある (0件ヒットなど)
}