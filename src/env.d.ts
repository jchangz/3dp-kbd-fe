/// <reference types="astro/client" />

interface mxObj {
  x: number;
  y: number;
  z: number;
}
interface rowsObj {
  [key: string]: { length: number; matrix: number[] };
}
interface threeObj {
  [index: string]: {
    mx: mxObj[];
    rows: rowsObj;
  };
}
