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
  [key: string]: {
    left: { [key: string]: threeObj };
    right: { [key: string]: threeObj };
  };
}
interface geometryObj {
  [key: string]: {
    left: { [key: string]: number[][] };
    right: { [key: string]: number[][] };
  };
}
interface kboData {
  blocker: { [key: string]: threeObj };
  shift?: { [key: string]: mxObj };
}
interface configOptionsObj {
  title: string;
  "data-type": string;
  value: string;
  default: boolean;
}
interface configObj {
  [key: string]: {
    left: configOptionsObj[];
    right: configOptionsObj[];
    shift?: configOptionsObj[];
  };
}
