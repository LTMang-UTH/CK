declare module 'fabric' {
  export class Canvas {
    constructor(element: HTMLCanvasElement | string, options?: any);
    on(event: string, handler: (e: any) => void): void;
    off(event: string, handler?: (e: any) => void): void;
    getPointer(e: any): { x: number; y: number };
    add(object: any): void;
    clear(): void;
    renderAll(): void;
    dispose(): void;
    backgroundColor: string;
    connected?: boolean;
  }

  export class Point {
    x: number;
    y: number;
    constructor(x: number, y: number);
  }

  export class Line {
    constructor(coords: number[], options?: any);
  }

  export interface IEvent {
    e: any;
  }
}

