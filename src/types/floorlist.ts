/**
 * フロア情報
 */
export interface Floor {
  /** フロアID */
  id: string;
  /** フロアコード */
  code: string;
  /** フロア名 */
  name: string;
}

/**
 * サービス情報
 */
export interface Service {
  /** サービス名 */
  name: string;
  /** サービスコード */
  code: string;
  /** フロアリスト */
  floor: Floor[];
}

/**
 * サイト情報
 */
export interface Site {
  /** サイト名 */
  name: string;
  /** サイトコード */
  code: string;
  /** サービスリスト */
  service: Service[];
}

/**
 * フロア取得API (FloorList) のレスポンス
 * https://affiliate.dmm.com/api/v3/floorlist.html
 */
export interface FloorListResponse {
  /** サイトリスト */
  site: Site[];
}