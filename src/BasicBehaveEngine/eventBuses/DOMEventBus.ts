import { IEventBus, IInterpolateAction } from "../IBehaveEngine";

import { IEventQueueItem } from "../IBehaveEngine";

export class DOMEventBus implements IEventBus {
    private eventList: IEventQueueItem[];
    private customEventListeners: Record<string, ((event: CustomEvent) => void)[]>;
    private eventListeners: Record<string, (event: Event) => void>;
    private variableInterpolationCallbacks: Record<number, IInterpolateAction>;
    private pointerInterpolationCallbacks: Record<string, IInterpolateAction>;
    constructor() {
        this.eventList = [];
        this.customEventListeners = {};
        this.eventListeners = {};
        this.variableInterpolationCallbacks = {};
        this.pointerInterpolationCallbacks = {};
    }

    public getEventList = (): IEventQueueItem[] => {
        return this.eventList;
    }

    public clearEventList = (): void => {
        this.eventList = [];
    }

    public addEvent = (event: IEventQueueItem): void => {
        this.eventList.push(event);
    }

    public addCustomEventListener = (name: string, func: (event: CustomEvent) => void): void => {
        if (!this.customEventListeners[name]) {
            this.customEventListeners[name] = [];

            const eventListener = (e: any) => {
                this.customEventListeners[name].forEach((func) => {
                    this.eventList.push({func: () => func(e), inSocketId: name});
                });
            }

            document.addEventListener(name, eventListener);
            this.eventListeners[name] = eventListener;
        }
        this.customEventListeners[name].push(func);
    }

    public dispatchCustomEvent = (name: string, vals: Record<string, any>): void => {
        const event = new CustomEvent(name, { detail: vals });
        document.dispatchEvent(event);
    }

    public getCustomEventsNames = (): string[] => {
        return Object.keys(this.customEventListeners);
    }

    public clearCustomEventListeners = (): void => {
        this.customEventListeners = {};
        Object.keys(this.eventListeners).forEach((name) => {
            document.removeEventListener(name, this.eventListeners[name]);
        });
        this.eventListeners = {};
    }

    public setVariableInterpolationCallback = (variable: number, action: IInterpolateAction): void => {
        this.variableInterpolationCallbacks[variable] = action;
    }

    public clearVariableInterpolation = (variable: number): void => {
        delete this.variableInterpolationCallbacks[variable];
    }

    public getVariableInterpolationCallbacks = (): Record<number, IInterpolateAction> => {
        return this.variableInterpolationCallbacks;
    }

    public setPointerInterpolationCallback = (pointer: string, action: IInterpolateAction): void => {
        this.pointerInterpolationCallbacks[pointer] = action;
    }

    public clearPointerInterpolation = (pointer: string): void => {
        delete this.pointerInterpolationCallbacks[pointer];
    }

    public getPointerInterpolationCallbacks = (): Record<string, IInterpolateAction> => {
        return this.pointerInterpolationCallbacks;
    }
}
