export type Gender = 'female' | 'male' | 'unspecified';
export type Relationship =
  'mother' | 'father' | 'son' | 'daughter' | 'wife' | 'husband';
export type ParentRole = 'mother' | 'father';

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle extends Point {
  width: number;
  height: number;
}

export interface Person extends Point {
  id: string;
  name: string;
  gender: Gender;
  born: string;
  notes: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  type: Relationship;
}

export interface FamilyGraph {
  version: 1;
  title: string;
  people: Person[];
  connections: Connection[];
}

export interface PartnerChildOption {
  child: Person;
  role: ParentRole;
  reason: string;
}

export interface PartnerReview {
  graph: FamilyGraph;
  partnerId: string;
  sourceName: string;
  options: PartnerChildOption[];
}

export interface OtherParentOption {
  person: Person;
  role: ParentRole;
}

export interface OtherParentReview {
  graph: FamilyGraph;
  childId: string;
  childName: string;
  options: OtherParentOption[];
}

export type EditorModal =
  | { kind: 'person' }
  | { kind: 'reset' }
  | { kind: 'export' }
  | { kind: 'relative'; source: string }
  | { kind: 'edit' | 'delete'; person: Person }
  | { kind: 'disconnect'; edge: Connection }
  | { kind: 'disconnectFamily'; edges: Connection[] }
  | { kind: 'import'; graph: FamilyGraph };
