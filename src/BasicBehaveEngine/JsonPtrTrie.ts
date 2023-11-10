enum TrieNodeType {
    ROOT,
    STRING,
    INDEX
}

class TrieNode {
    children: Map<string, TrieNode>;
    isEndOfPath: boolean;
    trieNodeType: TrieNodeType;
    setterCallback: ((path: string, value: any) => void) | undefined;
    getterCallback: ((path: string) => any) | undefined;
    engineCallbacks: Map<string, (value: any, onComplete: ()=> void) => void> = new Map<string, (value: any, onComplete: ()=> void) => void>();
    typeName: string | undefined;


    constructor(type: TrieNodeType) {
        this.children = new Map<string, TrieNode>();
        this.isEndOfPath = false;
        this.trieNodeType = type;
    }
}

export class JsonPtrTrie {
    root: TrieNode;

    constructor() {
        this.root = new TrieNode(TrieNodeType.ROOT);
    }

    public addEngineCallback(path: string, callback: (value: any, onComplete: ()=> void) => void) {
        console.log(`Adding engine callback for: ${path}`);
        this.root.engineCallbacks.set(path, callback);
    }

    /**
     * Adds a path to the JSON Pointer Trie along with getter and setter callbacks.
     * @param path - The JSON Pointer path to add.
     * @param getterCallback - A callback function to get the value at the specified path.
     * @param setterCallback - A callback function to set the value at the specified path.
     */
    public addPath(path: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string): void {
        const pathPieces = path.split('/');
        let currentNode = this.root;

        for (let i = 0; i < pathPieces.length; i++) {
            const pathPiece = pathPieces[i];

            if (!currentNode.children.has(pathPiece)) {
                const type: TrieNodeType = isNaN(Number(pathPiece)) ? TrieNodeType.STRING : TrieNodeType.INDEX;
                let nodeToSet: TrieNode;
                if (type === TrieNodeType.INDEX) {
                    const indexNodeKey: string | undefined = Array.from(currentNode.children.keys()).find(key => currentNode.children.get(key)!.trieNodeType === TrieNodeType.INDEX);
                    if (indexNodeKey === undefined) {
                        nodeToSet = new TrieNode(TrieNodeType.INDEX);
                    } else {
                        nodeToSet = currentNode.children.get(indexNodeKey)!;
                        currentNode.children.delete(indexNodeKey);
                    }
                } else if (type === TrieNodeType.STRING) {
                    nodeToSet = new TrieNode(type);
                } else {
                    throw Error("Invalid Node Type");
                }

                currentNode.children.set(pathPiece, nodeToSet);
                currentNode.isEndOfPath = false;
            }

            currentNode = currentNode.children.get(pathPiece)!;
        }

        currentNode.isEndOfPath = true;
        currentNode.getterCallback = getterCallback;
        currentNode.setterCallback = setterCallback;
        currentNode.typeName = typeName;
    }

    public runEngineCallback(path: string, value: any, onComplete: ()=> void) { 
        const callback = this.root.engineCallbacks.get(path);
        if (callback)
            callback(value, onComplete);
    }

    /**
     * Checks if a given JSON Pointer path is valid within the Trie.
     * @param path - The JSON Pointer path to validate.
     * @returns `true` if the path is valid, `false` otherwise.
     */
    public isPathValid(path: string): boolean {
        const leafNode: TrieNode | undefined = this.traversePath(path);
        return leafNode === undefined ? false : leafNode.isEndOfPath;
    }

    /**
     * Retrieves the value at a specified JSON Pointer path.
     * @param path - The JSON Pointer path to retrieve the value from.
     * @returns The value at the specified path.
     */
    public getPathValue(path: string) {
        const node: TrieNode | undefined = this.traversePath(path);
        if (node !== undefined && node.getterCallback !== undefined) {
            return node.getterCallback(path);
        }
    }

    public getPathTypeName(path:string) {
        const node: TrieNode | undefined = this.traversePath(path);
        if (node !== undefined && node.typeName !== undefined) {
            return node.typeName;
        }
    }

    /**
     * Sets the value at a specified JSON Pointer path.
     * @param path - The JSON Pointer path to set the value for.
     * @param value - The value to set at the specified path.
     */
    public setPathValue(path: string, value: any) {
        const node: TrieNode | undefined = this.traversePath(path);
        if (node !== undefined && node.setterCallback !== undefined) {
            return node.setterCallback(path, value);
        }
    }

    private traversePath(path: string): TrieNode | undefined {
        const pathPieces = path.split('/');
        let currentNode = this.root;

        for (let i = 0; i < pathPieces.length; i++) {
            const pathPiece = pathPieces[i];

            if (!currentNode.children.has(pathPiece)) {
                if (isNaN(Number(pathPiece))) {return undefined}
                // if it is a number, first the path is valid if the path piece is < the key
                const numericalKey = [...currentNode.children.keys()].find(key => currentNode.children.get(key)!.trieNodeType === TrieNodeType.INDEX);
                if (numericalKey === undefined) {return undefined}
                if (Number(pathPiece) >= Number(numericalKey)) {return undefined}
                currentNode = currentNode.children.get(numericalKey)!
            } else {
                currentNode = currentNode.children.get(pathPiece)!;
            }
        }

        return currentNode;
    }
}
