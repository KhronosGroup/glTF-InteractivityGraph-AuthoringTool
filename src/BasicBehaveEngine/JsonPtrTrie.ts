import {IJsonPtrEntry} from "./IBehaveEngine";

enum TrieNodeType {
    ROOT,
    STRING,
    INDEX
}

class TrieNode implements IJsonPtrEntry {
    children: Map<string, TrieNode>;
    isEndOfPath: boolean;
    trieNodeType: TrieNodeType;
    setterCallback: ((path: string, value: any) => void) | undefined;
    getterCallback: ((path: string) => any) | undefined;
    typeName: string | undefined;
    readOnly: boolean;
    // the single numeric child; its key is the exclusive upper bound of the indices it matches
    indexKey: string | undefined;
    indexBound: number;

    constructor(type: TrieNodeType) {
        this.children = new Map<string, TrieNode>();
        this.isEndOfPath = false;
        this.trieNodeType = type;
        this.readOnly = false;
        this.indexKey = undefined;
        this.indexBound = 0;
    }

    getValue(path: string) {
        return this.getterCallback?.(path);
    }

    setValue(path: string, value: any) {
        this.setterCallback?.(path, value);
    }
}

export class JsonPtrTrie {
    root: TrieNode;

    constructor() {
        this.root = new TrieNode(TrieNodeType.ROOT);
    }

    /**
     * Adds a path to the JSON Pointer Trie along with getter and setter callbacks.
     * @param path - The JSON Pointer path to add.
     * @param getterCallback - A callback function to get the value at the specified path.
     * @param setterCallback - A callback function to set the value at the specified path.
     */
    public addPath(path: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string, readOnly: boolean): void {
        const pathPieces = path.split('/');
        let currentNode = this.root;

        for (let i = 0; i < pathPieces.length; i++) {
            const pathPiece = pathPieces[i];

            if (!currentNode.children.has(pathPiece)) {
                let nodeToSet: TrieNode;
                if (isNaN(Number(pathPiece))) {
                    nodeToSet = new TrieNode(TrieNodeType.STRING);
                } else {
                    // a numeric segment re-keys the existing index child instead of adding a second one
                    if (currentNode.indexKey === undefined) {
                        nodeToSet = new TrieNode(TrieNodeType.INDEX);
                    } else {
                        nodeToSet = currentNode.children.get(currentNode.indexKey)!;
                        currentNode.children.delete(currentNode.indexKey);
                    }
                    currentNode.indexKey = pathPiece;
                    currentNode.indexBound = Number(pathPiece);
                }
                currentNode.children.set(pathPiece, nodeToSet);
            }

            currentNode = currentNode.children.get(pathPiece)!;
        }

        currentNode.isEndOfPath = true;
        currentNode.getterCallback = getterCallback;
        currentNode.setterCallback = setterCallback;
        currentNode.typeName = typeName;
        currentNode.readOnly = readOnly;
    }

    public removePath(path: string): void {
        const pathPieces = path.split('/');
        let currentNode = this.root;

        for (let i = 0; i < pathPieces.length - 1; i++) {
            const pathPiece = pathPieces[i];
            const child = currentNode.children.get(pathPiece);
            if (!child) {
                return;
            }
            currentNode = child;
        }

        const lastPiece = pathPieces[pathPieces.length - 1];
        currentNode.children.delete(lastPiece);
        if (currentNode.indexKey === lastPiece) {
            currentNode.indexKey = undefined;
            currentNode.indexBound = 0;
        }
    }

    /** The registered entry for a JSON pointer, or undefined if the path is not a registered pointer. */
    public resolve(path: string): IJsonPtrEntry | undefined {
        const node = this.traversePath(path);
        return node !== undefined && node.isEndOfPath ? node : undefined;
    }

    /**
     * Checks if a given JSON Pointer path is valid within the Trie.
     * @param path - The JSON Pointer path to validate.
     * @returns `true` if the path is valid, `false` otherwise.
     */
    public isPathValid(path: string): boolean {
        return this.resolve(path) !== undefined;
    }

    public isReadOnly(path: string): boolean {
        return this.resolve(path)?.readOnly ?? false;
    }

    /**
     * Retrieves the value at a specified JSON Pointer path.
     * @param path - The JSON Pointer path to retrieve the value from.
     * @returns The value at the specified path.
     */
    public getPathValue(path: string) {
        return this.resolve(path)?.getValue(path);
    }

    public getPathTypeName(path:string) {
        return this.resolve(path)?.typeName;
    }

    /**
     * Sets the value at a specified JSON Pointer path.
     * @param path - The JSON Pointer path to set the value for.
     * @param value - The value to set at the specified path.
     */
    public setPathValue(path: string, value: any) {
        return this.resolve(path)?.setValue(path, value);
    }

    /**
     * Returns all registered paths exactly as they were added to the trie.
     */
    public getRegisteredPaths(): string[] {
        const paths: string[] = [];

        const walk = (node: TrieNode, segments: string[]) => {
            if (node.isEndOfPath) {
                paths.push(segments.join("/"));
            }
            for (const [segment, child] of node.children.entries()) {
                walk(child, [...segments, segment]);
            }
        };

        walk(this.root, []);
        return paths.sort();
    }

    private traversePath(path: string): TrieNode | undefined {
        const pathPieces = path.split('/');
        let currentNode = this.root;

        for (let i = 0; i < pathPieces.length; i++) {
            const pathPiece = pathPieces[i];
            let child = currentNode.children.get(pathPiece);
            if (child === undefined) {
                // a numeric piece matches the index child when 0 <= piece < its key
                const index = Number(pathPiece);
                if (isNaN(index) || currentNode.indexKey === undefined || index >= currentNode.indexBound || index < 0) {
                    return undefined;
                }
                child = currentNode.children.get(currentNode.indexKey)!;
            }
            currentNode = child;
        }

        return currentNode;
    }
}
