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
