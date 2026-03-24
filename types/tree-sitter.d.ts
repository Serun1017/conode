declare module 'tree-sitter' {
  export default class Parser {
    setLanguage(language: any): void;
    parse(input: string): Tree;
  }
  export interface Tree {
    rootNode: SyntaxNode;
  }
  export interface SyntaxNode {
    type: string;
    text: string;
    children: SyntaxNode[];
  }
}