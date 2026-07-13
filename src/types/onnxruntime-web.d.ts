declare module 'onnxruntime-web' {
  export namespace env {
    namespace wasm {
      let wasmPaths: string;
      let numThreads: number;
    }
  }

  export class Tensor {
    readonly dims: readonly number[];
    readonly data: Float32Array | Uint8Array | Int32Array | BigInt64Array;
    constructor(
      type: 'float32' | 'uint8' | 'int32' | 'int64',
      data: Float32Array | Uint8Array | Int32Array | number[],
      dims?: readonly number[],
    );
  }

  export interface InferenceSession {
    readonly inputNames: string[];
    readonly outputNames: string[];
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
  }

  export namespace InferenceSession {
    function create(
      path: string | ArrayBuffer | Uint8Array,
      options?: {
        executionProviders?: string[];
        graphOptimizationLevel?: string;
      },
    ): Promise<InferenceSession>;
  }
}
