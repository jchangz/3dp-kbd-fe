import { three, options } from "../assets/geometry/switch.json";
import { usb } from "../assets/geometry/usb.json";
import { mounting_angle, mounting_position } from "../assets/geometry/mounting.json";

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
    const {
      kbo: {
        left: { base: base_L },
        right: { base: base_R },
      },
    } = three;
    const {
      blocker: { left: blocker_L, right: blocker_R },
    } = options;
    left = setKBOGeometry(base_L, blocker_L);
    right = setKBOGeometry(base_R, blocker_R);
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
  const { left, right } = usb[keyboard];
  return {
    left: left,
    right: right,
  };
}

type KBVariantType = "macro" | "blocker";
const KBVARIANTOPTIONS = ["macro", "no-macro", "60", "65", "65-b", "blocker", "blocker-1", "blocker-2", "no-blocker", "base"] as const;
type KBVariantOptions = (typeof KBVARIANTOPTIONS)[number];
export function isValidKeyboardVariant(option: string): option is KBVariantOptions {
  return KBVARIANTOPTIONS.includes(option as KBVariantOptions);
}

type KBMountingAngle = {
  [key in KBVariantOptions]?: { [key: string]: number };
};

type KBMountingPosition = {
  [key in KBVariantOptions]?: { x: number; y: number; z: number }[];
};

export function getKeyboardData({ keyboard, type }: { keyboard: KBNameOptions; type: string }) {
  const leftSide = () => {
    let selectedOptType: KBVariantType = "macro";
    let selectedOptValue: KBVariantOptions = "macro";
    let selectedMountingAngle = 0;
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

    // Set mounting angle from option select
    const mountingValue = selectedOptType === "blocker" ? "base" : selectedOptValue;
    const mountingAngleData: KBMountingAngle = mounting_angle[keyboard].left;
    const mountingPositionData: KBMountingPosition = mounting_position[keyboard].left;
    const mountingAngle = mountingAngleData[mountingValue];
    const selectedMountingPosition = mountingPositionData[mountingValue];

    const mountingOption = document.querySelector("#mounting-option option:checked");
    if (mountingOption instanceof HTMLOptionElement && mountingAngle) {
      const { value } = mountingOption;
      selectedMountingAngle = mountingAngle[value] || 0;
    }

    return {
      selectedOptType,
      selectedOptValue,
      selectedMountingAngle,
      selectedMountingPosition,
      plateName,
      fileName,
    };
  };

  const rightSide = () => {
    let selectedOptType: KBVariantType = "macro";
    let selectedOptValue: KBVariantOptions = "macro";
    let selectedMountingAngle = 0;
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

    // Set mounting angle from option select
    const mountingValue = selectedOptType === "blocker" ? "base" : selectedOptValue;
    const mountingAngleData: KBMountingAngle = mounting_angle[keyboard].right;
    const mountingPositionData: KBMountingPosition = mounting_position[keyboard].right;
    const mountingAngle = mountingAngleData[mountingValue];
    const selectedMountingPosition = mountingPositionData[mountingValue];

    const mountingOption = document.querySelector("#mounting-option option:checked");
    if (mountingOption instanceof HTMLOptionElement && mountingAngle) {
      const { value } = mountingOption;
      selectedMountingAngle = mountingAngle[value] || 0;
    }

    return {
      selectedOptType,
      selectedOptValue,
      selectedMountingAngle,
      selectedMountingPosition,
      plateName,
      fileName,
    };
  };

  return {
    leftSide,
    rightSide,
  };
}
