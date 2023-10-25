import { JsonPtrTrie } from '../src/BasicBehaveEngine/JsonPtrTrie';
import { jest } from '@jest/globals';

describe('jsonPtrTrie', () => {
    it('should register paths', () => {
        const jsonPtr: JsonPtrTrie = new JsonPtrTrie();
        expect(jsonPtr.isPathValid('nodes/99/translation')).toBe(false);

        const mockSetter = jest.fn();
        jsonPtr.addPath(
            'nodes/99/translation',
            (path) => {
                return 'GOT FROM PATH';
            },
            (path, value) => {
                mockSetter(value);
            },
            "float3"
        );
        expect(jsonPtr.isPathValid('nodes/99/translation')).toBe(true);
        expect(jsonPtr.getPathValue('nodes/99/translation')).toBe('GOT FROM PATH');
        jsonPtr.setPathValue('nodes/99/translation', 'setValue');
        expect(mockSetter).toHaveBeenCalledWith('setValue');
    });
    it('should register numerical paths', () => {
        const jsonPtr: JsonPtrTrie = new JsonPtrTrie();
        jsonPtr.addPath(
            'nodes/98/translation',
            (path) => {
                // get
            },
            (path, value) => {
                // set
            },
            "float3"
        );
        expect(jsonPtr.isPathValid('nodes/99/translation')).toBe(false);

        jsonPtr.addPath(
            'nodes/99/translation',
            (path) => {
                // get
            },
            (path, value) => {
                // set
            },
            "float3"
        );
        expect(jsonPtr.isPathValid('nodes/99/translation')).toBe(true);

        jsonPtr.addPath(
            'nodes/98/translation',
            (path) => {
                // get
            },
            (path, value) => {
                // set
            },
            "float3"
        );
        expect(jsonPtr.isPathValid('nodes/99/translation')).toBe(false);
    });
});
