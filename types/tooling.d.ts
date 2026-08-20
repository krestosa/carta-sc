declare module 'sharp' {
  interface Metadata { width?: number; height?: number; hasAlpha?: boolean; }
  interface OutputInfo { width:number; height:number; channels:number; }
  interface SharpInstance {
    metadata():Promise<Metadata>;
    rotate():SharpInstance;
    ensureAlpha():SharpInstance;
    resize(options:Record<string,unknown>):SharpInstance;
    webp(options:Record<string,unknown>):SharpInstance;
    raw():SharpInstance;
    toBuffer(options:{resolveWithObject:true}):Promise<{data:Buffer;info:OutputInfo}>;
  }
  interface SharpFactory { (input:Buffer,options?:Record<string,unknown>):SharpInstance; kernel:{lanczos3:string}; }
  const sharp:SharpFactory; export default sharp;
}
