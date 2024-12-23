export const getTurnType = (angle: number): {
  type: string;
  color: string;
} => {
  const absAngle = Math.abs(angle);
  if (absAngle <= 20) {
    return { type: "rapide", color: "text-green-500" };
  } else if (absAngle <= 45) {
    return { type: "lent", color: "text-blue-500" };
  } else if (absAngle <= 90) {
    return { type: "séré", color: "text-orange-500" };
  } else {
    return { type: "lacet", color: "text-red-500" };
  }
};