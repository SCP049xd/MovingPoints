/** Arrays of homogeneous coordinates; scalar types depend on the backend. */
export type Vector<S = unknown> = S[];
export type Category = 'point' | 'line' | 'circle' | 'conic' | 'cubic' | 'pair';
export type InputKind = Category | 'curve' | 'locus';
export interface GeometryNode {
  id: number;
  name: string;
  type: string;
  parents: number[];
  meta: Record<string, unknown>;
  visible: boolean;
}
export interface ConstructionResult<S = unknown> {
  v: Vector<S>;
  cancelled?: number;
  common?: S;
}
/** Shared by rational, fixed quadratic, dynamic quadratic and numerical fields. */
export interface MathField<S = unknown> {
  constant(value: number | bigint): S;
  zero: S;
  one: S;
  add(a: S, b: S): S;
  sub(a: S, b: S): S;
  neg(a: S): S;
  mul(a: S, b: S): S;
  scale(a: S, factor: number | bigint): S;
  pow(a: S, exponent: number): S;
  isZero(a: S): boolean;
  normalize(vector: Vector<S>): ConstructionResult<S> | null;
  cross(a: Vector<S>, b: Vector<S>): Vector<S>;
  crossReduce(a: Vector<S>, b: Vector<S>): ConstructionResult<S>;
  midpoint(a: Vector<S>, b: Vector<S>): ConstructionResult<S>;
  perpendicularFoot(point: Vector<S>, line: Vector<S>): ConstructionResult<S>;
  parallel(point: Vector<S>, line: Vector<S>, perpendicular?: boolean): ConstructionResult<S>;
  circle3(a: Vector<S>, b: Vector<S>, c: Vector<S>): ConstructionResult<S>;
  fixedCircle(center: Vector<S>, point: Vector<S>): ConstructionResult<S>;
  circleCenter(circle: Vector<S>): ConstructionResult<S>;
  circleToConic(circle: Vector<S>): Vector<S>;
  conicTest(conic: Vector<S>, point: Vector<S>): S;
  onLine(point: Vector<S>, line: Vector<S>): S;
  otherIntersection(point: Vector<S>, line: Vector<S>, conic: Vector<S>): ConstructionResult<S>;
  reflect(point: Vector<S>, line: Vector<S>): ConstructionResult<S>;
  reflectLine(line: Vector<S>, mirror: Vector<S>): ConstructionResult<S>;
  pointMirror(point: Vector<S>, center: Vector<S>): ConstructionResult<S>;
  rotateQuarter(point: Vector<S>, center: Vector<S>, direction: number | bigint): ConstructionResult<S>;
  pole(line: Vector<S>, conic: Vector<S>): ConstructionResult<S>;
  polar(point: Vector<S>, conic: Vector<S>): ConstructionResult<S>;
  translate(point: Vector<S>, a: Vector<S>, b: Vector<S>): ConstructionResult<S>;
  centroid(a: Vector<S>, b: Vector<S>, c: Vector<S>): ConstructionResult<S>;
  orthocenter(a: Vector<S>, b: Vector<S>, c: Vector<S>): ConstructionResult<S>;
  ideal(line: Vector<S>): ConstructionResult<S>;
  diameterCircle(a: Vector<S>, b: Vector<S>): ConstructionResult<S>;
  radiusCircle(center: Vector<S>, a: Vector<S>, b: Vector<S>): ConstructionResult<S>;
  radicalAxis(a: Vector<S>, b: Vector<S>): ConstructionResult<S>;
  radicalCenter(a: Vector<S>, b: Vector<S>, c: Vector<S>): ConstructionResult<S>;
  radicalAxisFamily?(circle: Vector<S>): ConstructionResult<S>;
  radicalCenterFamily?(circle: Vector<S>): ConstructionResult<S>;
  conic5(points: Vector<S>[]): ConstructionResult<S>;
  inversion(point: Vector<S>, circle: Vector<S>): ConstructionResult<S>;
  det(rows: Vector<S>[]): S;
  [operation: string]: unknown;
}
export interface ConstructionContext<S = any> {
  math: MathField<S>;
  vectors: Vector<S>[];
  parents: GeometryNode[];
  node: GeometryNode;
  category(node: GeometryNode): Category;
}
export interface ConstructionDefinition {
  id: string;
  label: string;
  category: Category | 'action';
  inputs?: InputKind[];
  /** Kind of additional graph parents (e.g. segment ends in a radius expression). */
  variadic?: InputKind;
  validateParents?: (meta: Record<string, unknown>, parents: GeometryNode[]) => void;
  /** Index of a defining point on a custom curve, used by curve parametrization. */
  anchorParent?: number;
  evaluate?: (context: ConstructionContext) => ConstructionResult | null;
  validate?: (meta: Record<string, unknown>) => void;
  /** Optional overload names from GeoGebra's geogebra.xml. Parent kinds disambiguate. */
  geogebra?: string[];
  tool?: {
    id?: string;
    group?: string;
    icon: string;
    label?: string;
    tip: string;
    inputs?: InputKind[];
  };
  /** Optional specialized renderer computation; it never establishes exact degrees. */
  numeric?: (context: { geometry: unknown; vectors: number[][]; parents: GeometryNode[]; node: GeometryNode }) => number[] | null;
}
