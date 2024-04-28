import { usb } from "../assets/geometry/usb.json";

const KBNAMEOPTIONS = ["quefrency", "sinc", "kbo"] as const;
type KBNameOptions = (typeof KBNAMEOPTIONS)[number];
export function isValidKeyboardName(option: string): option is KBNameOptions {
  return KBNAMEOPTIONS.includes(option as KBNameOptions);
}

export function getUSBData({ keyboard }: { keyboard: KBNameOptions }) {
  const usbGeometry = usb[keyboard];
  return {
    left: usbGeometry.left,
    right: usbGeometry.right,
  };
}

const KBVARIANTOPTIONS = ["macro", "no-macro", "60", "65", "65-b", "blocker", "blocker-1", "blocker-2", "no-blocker", "base"] as const;
type KBVariantOptions = (typeof KBVARIANTOPTIONS)[number];
export function isValidKeyboardVariant(option: string): option is KBVariantOptions {
  return KBVARIANTOPTIONS.includes(option as KBVariantOptions);
}

export function getKeyboardData({ keyboard, type }: { keyboard: KBNameOptions; type: string }) {
  const leftSide = () => {
    let selectedOptType = "macro";
    let selectedOptValue = "macro";
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

    if (selectedOptValue === "macro") fileName += "-macro";
    fileName += ".glb";

    return {
      selectedOptType,
      selectedOptValue,
      fileName,
    };
  };

  const rightSide = () => {
    let selectedOptType = "macro";
    let selectedOptValue = "macro";
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
      else fileName += "-65";
    }
    fileName += ".glb";

    return {
      selectedOptType,
      selectedOptValue,
      fileName,
    };
  };

  return {
    leftSide,
    rightSide,
  };
}
