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
  mx: mxObj[];
  rows: rowsObj;
}
interface keyboardObj {
  [index: string]: {
    left: threeObj;
    right: threeObj;
  };
}
