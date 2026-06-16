export type LodgingBaseChoice = string;

export type {
  LodgingAreaId,
  LodgingAreaOption,
  LodgingDistanceRow,
} from "@/lib/plan/lodging-sub-areas";

export {
  computeLodgingAreaOptions,
  computeLodgingAreaOptions as computeLodgingBaseOptions,
  lodgingDistancesFromArea,
  parseStayHintParts,
  estimateDriveMinutes,
} from "@/lib/plan/lodging-sub-areas";

/** Alias for map / legacy imports */
export type LodgingBaseOption = import("@/lib/plan/lodging-sub-areas").LodgingAreaOption;
