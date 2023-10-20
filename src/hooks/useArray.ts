import {useState} from "react";

export const useArray = (defaultValue: any[]) => {
    const [array, setArray] = useState(defaultValue);

    const push = (element: any) => {
        setArray(a => [...a, element]);
    }

    const set = (index: number, element: any) => {
        setArray(a => [
            ...a.slice(0, index),
            element,
            ...a.slice(index + 1)
        ]);
    }

    const remove = (index: number) => {
        setArray(a => [
            ...a.slice(0, index),
            ...a.slice(index + 1)
        ]);
    }

    const clear = () => {
        setArray([]);
    }

    return {array, setArray, push, set, remove, clear}
}
