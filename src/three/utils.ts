import { three, options } from "../assets/three.json";
import { usb } from "../assets/geometry/usb.json";

type KBSwitchPosition = {
  mx: { x: number; y: number; z: number }[];
  rows: {
    [key: string]: { length: number; matrix: number[] };
  };
};

const KBNAMEOPTIONS = ["quefrency", "sinc", "kbo"] as const;
type KBNameOptions = (typeof KBNAMEOPTIONS)[number];
export function isValidKeyboardName(option: string): option is KBNameOptions {
  return KBNAMEOPTIONS.includes(option as KBNameOptions);
}

const KBOBLOCKEROPTIONS = ["no-blocker", "blocker-1", "blocker-2"] as const;
type KBOBlockerType = (typeof KBOBLOCKEROPTIONS)[number];

type KBOData = {
  [key in KBOBlockerType]?: KBSwitchPosition;
};

export function getSwitchData({ keyboard }: { keyboard: KBNameOptions }) {
  const setKBOGeometry = (data: KBSwitchPosition, options: KBOData) => {
    // Transform kbo specific layouts
    const newData: KBOData = {};
    KBOBLOCKEROPTIONS.forEach((opt) => {
      const dataCopy = JSON.parse(JSON.stringify(data));
      const extraData = options[opt];
      if (extraData) {
        dataCopy.mx = [...dataCopy.mx, ...extraData.mx];
        dataCopy.rows = { ...dataCopy.rows, ...extraData.rows };
      }
      newData[opt] = dataCopy;
    });

    return newData;
  };

  let left;
  let right;
  if (keyboard === "kbo") {
    left = setKBOGeometry(three.kbo.left.base, options.blocker.left);
    right = setKBOGeometry(three.kbo.right.base, options.blocker.right);
  } else {
    left = three[keyboard].left;
    right = three[keyboard].right;
  }
  return {
    left,
    right,
  };
}

export function getUSBData({ keyboard }: { keyboard: KBNameOptions }) {
  const usbGeometry = usb[keyboard];
  return {
    left: usbGeometry.left,
    right: usbGeometry.right,
  };
}

type KBVariantType = "macro" | "blocker";
const KBVARIANTOPTIONS = ["macro", "no-macro", "60", "65", "65-b", "blocker", "blocker-1", "blocker-2", "no-blocker", "base"] as const;
type KBVariantOptions = (typeof KBVARIANTOPTIONS)[number];
export function isValidKeyboardVariant(option: string): option is KBVariantOptions {
  return KBVARIANTOPTIONS.includes(option as KBVariantOptions);
}

export function getKeyboardData({ keyboard, type }: { keyboard: KBNameOptions; type: string }) {
  const leftSide = () => {
    let selectedOptType: KBVariantType = "macro";
    let selectedOptValue: KBVariantOptions = "macro";
    let plateName = `models/plates/${keyboard.slice(0, 1)}-left`;
    let fileName = `models/type${type}/t${type}-${keyboard.slice(0, 1)}-left`;

    const leftOption = document.querySelector("#left-options option:checked");
    if (leftOption instanceof HTMLOptionElement) {
      const {
        dataset: { type: caseType },
        value,
      } = leftOption;

      if (caseType === "blocker") selectedOptType = "blocker";
      if (isValidKeyboardVariant(value)) selectedOptValue = value;
    }

    if (selectedOptValue === "macro") {
      (plateName += "-macro"), (fileName += "-macro");
    }
    (plateName += ".glb"), (fileName += ".glb");

    return {
      selectedOptType,
      selectedOptValue,
      plateName,
      fileName,
    };
  };

  const rightSide = () => {
    let selectedOptType: KBVariantType = "macro";
    let selectedOptValue: KBVariantOptions = "macro";
    let plateName = `models/plates/${keyboard.slice(0, 1)}-right`;
    let fileName = `models/type${type}/t${type}-${keyboard.slice(0, 1)}-right`;

    const rightOption = document.querySelector("#right-options option:checked");
    if (rightOption instanceof HTMLOptionElement) {
      const {
        dataset: { type: caseType },
        value,
      } = rightOption;

      if (caseType === "blocker") selectedOptType = "blocker";
      if (isValidKeyboardVariant(value)) selectedOptValue = value;
    }

    if (selectedOptType === "macro") {
      if (selectedOptValue === "60") fileName += "-60";
      else {
        (plateName += "-65"), (fileName += "-65");
      }
    }
    (plateName += ".glb"), (fileName += ".glb");

    return {
      selectedOptType,
      selectedOptValue,
      plateName,
      fileName,
    };
  };

  return {
    leftSide,
    rightSide,
  };
}
