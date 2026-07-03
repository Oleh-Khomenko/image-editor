import type { CropOp, EditOperation } from '@/core/operations/types';
import { getCrop } from '@/core/operations/model';
import { toRenderParams } from '@/core/render/params';
import { FRAGMENT_SRC, VERTEX_SRC } from '@/core/render/shaders';
import type { Renderer } from '@/core/render/renderer';

export interface UvRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function cropToUv(crop: CropOp | null): UvRect {
  if (!crop) {
    return { x0: 0, y0: 0, x1: 1, y1: 1 };
  }
  return { x0: crop.x, y0: crop.y, x1: crop.x + crop.width, y1: crop.y + crop.height };
}

export function cropOutputSize(
  sourceW: number,
  sourceH: number,
  crop: CropOp | null,
): { width: number; height: number } {
  if (!crop) {
    return { width: Math.round(sourceW), height: Math.round(sourceH) };
  }
  return {
    width: Math.max(1, Math.round(sourceW * crop.width)),
    height: Math.max(1, Math.round(sourceH * crop.height)),
  };
}

interface ProgramLocations {
  position: number;
  uv: number;
  image: WebGLUniformLocation | null;
  brightness: WebGLUniformLocation | null;
  contrast: WebGLUniformLocation | null;
  saturation: WebGLUniformLocation | null;
  filter: WebGLUniformLocation | null;
}

// Position order (TRIANGLE_STRIP): bottom-left, bottom-right, top-left, top-right.
const QUAD_POSITIONS = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

export class WebGLRenderer implements Renderer {
  private readonly gl: WebGLRenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private uvBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private lastSource: ImageBitmap | null = null;
  private locations: ProgramLocations | null = null;

  private readonly onContextLost = (event: Event): void => {
    // Without preventDefault the browser never fires webglcontextrestored.
    event.preventDefault();
  };

  private readonly onContextRestored = (): void => {
    this.initGl();
    if (this.lastSource) {
      this.uploadTexture(this.lastSource);
    }
  };

  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {
      premultipliedAlpha: false,
      alpha: true,
      preserveDrawingBuffer: false,
    }) as WebGLRenderingContext | null;
    if (!gl) {
      throw new Error('WebGL is not supported on this canvas');
    }
    this.gl = gl;
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    this.initGl();
  }

  render(source: ImageBitmap, ops: EditOperation[]): void {
    const gl = this.gl;
    this.ensureTexture(source);
    const crop = getCrop(ops);
    this.setUv(cropToUv(crop));
    const { width, height } = cropOutputSize(source.width, source.height, crop);
    this.canvas.width = width;
    this.canvas.height = height;
    gl.viewport(0, 0, width, height);
    this.draw(ops);
  }

  async toBlob(source: ImageBitmap, ops: EditOperation[], mime: string): Promise<Blob> {
    // preserveDrawingBuffer is false, so read back immediately after rendering.
    this.render(source, ops);
    const gl = this.gl;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // readPixels row 0 is the bottom of the framebuffer; ImageData row 0 is the top.
    const rowBytes = width * 4;
    const flipped = new Uint8ClampedArray(pixels.length);
    for (let row = 0; row < height; row++) {
      const srcStart = row * rowBytes;
      const dstStart = (height - row - 1) * rowBytes;
      flipped.set(pixels.subarray(srcStart, srcStart + rowBytes), dstStart);
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context is not supported');
    }
    ctx.putImageData(new ImageData(flipped, width, height), 0, 0);

    return new Promise((resolve, reject) => {
      outputCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode canvas to blob'));
        }
      }, mime);
    });
  }

  dispose(): void {
    const gl = this.gl;
    if (this.program) {
      gl.deleteProgram(this.program);
    }
    if (this.positionBuffer) {
      gl.deleteBuffer(this.positionBuffer);
    }
    if (this.uvBuffer) {
      gl.deleteBuffer(this.uvBuffer);
    }
    if (this.texture) {
      gl.deleteTexture(this.texture);
    }
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
  }

  private initGl(): void {
    const gl = this.gl;
    const vertexShader = this.compile(gl.VERTEX_SHADER, VERTEX_SRC);
    const fragmentShader = this.compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    this.program = this.createProgram(vertexShader, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_POSITIONS, gl.STATIC_DRAW);

    this.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.DYNAMIC_DRAW);

    this.locations = {
      position: gl.getAttribLocation(this.program, 'a_position'),
      uv: gl.getAttribLocation(this.program, 'a_uv'),
      image: gl.getUniformLocation(this.program, 'u_image'),
      brightness: gl.getUniformLocation(this.program, 'u_brightness'),
      contrast: gl.getUniformLocation(this.program, 'u_contrast'),
      saturation: gl.getUniformLocation(this.program, 'u_saturation'),
      filter: gl.getUniformLocation(this.program, 'u_filter'),
    };

    // GL resources are lost on context loss; the texture must be re-uploaded by the caller.
    this.texture = null;
  }

  private compile(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${info ?? 'unknown error'}`);
    }
    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link failed: ${info ?? 'unknown error'}`);
    }
    return program;
  }

  private ensureTexture(source: ImageBitmap): void {
    // Only re-upload when the source identity changes (or after a context restore).
    if (this.texture && this.lastSource === source) {
      return;
    }
    this.uploadTexture(source);
  }

  private uploadTexture(source: ImageBitmap): void {
    const gl = this.gl;
    if (!this.texture) {
      this.texture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.lastSource = source;
  }

  private setUv(uv: UvRect): void {
    const gl = this.gl;
    // Paired with UNPACK_FLIP_Y_WEBGL so uv stays in top-left image coordinates.
    const uvs = new Float32Array([uv.x0, uv.y1, uv.x1, uv.y1, uv.x0, uv.y0, uv.x1, uv.y0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
  }

  private draw(ops: EditOperation[]): void {
    const gl = this.gl;
    if (!this.program || !this.locations || !this.positionBuffer || !this.uvBuffer) {
      return;
    }
    const locations = this.locations;
    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.enableVertexAttribArray(locations.uv);
    gl.vertexAttribPointer(locations.uv, 2, gl.FLOAT, false, 0, 0);

    const params = toRenderParams(ops);
    gl.uniform1f(locations.brightness, params.brightness);
    gl.uniform1f(locations.contrast, params.contrast);
    gl.uniform1f(locations.saturation, params.saturation);
    gl.uniform1i(locations.filter, params.filter);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(locations.image, 0);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
