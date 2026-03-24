import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';

export class PythonParser {
    private parser: Parser;
    constructor() {
        this.parser = new Parser();
        this.parser.setLanguage(Python);
    }

    public getAstNodes(code: string) {
        return this.parser.parse(code).rootNode;
    }
}