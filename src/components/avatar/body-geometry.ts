export interface AvatarMeasurements {
  heightCm: number;
  bustCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  shoulderCm?: number | null;
  /** Crotch-to-floor leg length (inseam). Drives leg length independently of overall height. */
  legLengthCm?: number | null;
}

type ResolvedMeasurements = {
  heightCm: number;
  bustCm: number;
  waistCm: number;
  hipCm: number;
  shoulderCm: number;
};

const DEFAULTS: ResolvedMeasurements = {
  heightCm: 165,
  bustCm: 88,
  waistCm: 70,
  hipCm: 94,
  shoulderCm: 38,
};

/** Circumference (cm) -> radius (meters), used for the torso cross-sections. */
function circumferenceToRadius(cm: number) {
  return cm / (2 * Math.PI) / 100;
}

export interface TorsoProfilePoint {
  /** Absolute height in meters, measured from the floor. */
  y: number;
  radius: number;
}

export interface TaperedSegment {
  /** Absolute Y (meters) of the two ends, top first. */
  topY: number;
  bottomY: number;
  topRadius: number;
  bottomRadius: number;
}

export interface AvatarProportions {
  heightM: number;

  /** Hip-to-neck-base torso, as ONE smooth lathe profile, including a crotch taper so legs attach naturally instead of sprouting from a flat disc. */
  torsoProfile: TorsoProfilePoint[];
  crotchY: number;
  hipY: number;
  shoulderY: number;
  neckBaseY: number;

  neckRadius: number;
  neckTopY: number;
  headRadius: number;
  headCenterY: number;

  shoulderHalfWidth: number;
  shoulderBarRadius: number;
  shoulderJointRadius: number;
  upperArm: TaperedSegment;
  elbowJointRadius: number;
  forearm: TaperedSegment;
  wristRadius: number;

  legOffsetX: number;
  hipJointRadius: number;
  thigh: TaperedSegment;
  kneeJointRadius: number;
  calf: TaperedSegment;
  ankleRadius: number;
}

/**
 * Converts raw body measurements into a jointed, croquis-mannequin-style
 * rig: one smooth torso (with a crotch taper, not a flat hip disc), a
 * shoulder bar spanning the measured shoulder width, and four separate
 * tapered limbs (two arms, two legs) each attached with a small ball joint.
 */
export function computeAvatarProportions(input: AvatarMeasurements): AvatarProportions {
  const m: ResolvedMeasurements = {
    heightCm: input.heightCm ?? DEFAULTS.heightCm,
    bustCm: input.bustCm ?? DEFAULTS.bustCm,
    waistCm: input.waistCm ?? DEFAULTS.waistCm,
    hipCm: input.hipCm ?? DEFAULTS.hipCm,
    shoulderCm: input.shoulderCm ?? DEFAULTS.shoulderCm,
  };

  const heightM = m.heightCm / 100;

  // Default standing-height anthropometric landmark fractions (ankle ≈4%,
  // knee ≈28.5%, crotch ≈47.5%, hip band ≈53%, waist ≈62%, chest ≈73%,
  // shoulder ≈80%, chin ≈87% of stature) — used whenever the user hasn't
  // given an explicit leg length, and to keep the knee sensibly placed
  // within whatever leg span results when they have.
  const DEFAULT_ANKLE_F = 0.04;
  const DEFAULT_KNEE_F = 0.285;
  const DEFAULT_CROTCH_F = 0.475;

  const ankleY = heightM * DEFAULT_ANKLE_F;
  // Leg length (crotch-to-floor) drives the crotch height directly when
  // given, instead of always being a fixed fraction of total height — a
  // longer inseam at the same stature means a shorter torso, which is
  // anatomically correct, not an inconsistency.
  const requestedLegM = input.legLengthCm ? input.legLengthCm / 100 : null;
  const crotchY = requestedLegM
    ? Math.min(Math.max(requestedLegM, ankleY + heightM * 0.1), heightM * 0.7)
    : heightM * DEFAULT_CROTCH_F;
  const kneeY =
    ankleY + (crotchY - ankleY) * ((DEFAULT_KNEE_F - DEFAULT_ANKLE_F) / (DEFAULT_CROTCH_F - DEFAULT_ANKLE_F));

  const hipY = crotchY + heightM * 0.055;
  const waistY = Math.max(heightM * 0.62, hipY + heightM * 0.05);
  const bustY = Math.max(heightM * 0.73, waistY + heightM * 0.08);
  const shoulderY = Math.max(heightM * 0.8, bustY + heightM * 0.05);
  const neckBaseY = shoulderY + heightM * 0.05;
  const chinY = neckBaseY + heightM * 0.018;

  const headHeight = heightM / 7.5;
  const headRadius = headHeight * 0.42;
  const neckRadius = headRadius * 0.42;

  const bustR = circumferenceToRadius(m.bustCm);
  const waistR = circumferenceToRadius(m.waistCm);
  const hipR = circumferenceToRadius(m.hipCm);
  const shoulderHalfWidth = m.shoulderCm / 2 / 100;
  const chestTopR = bustR * 0.74; // near the collarbone, tapering toward the neck

  // Measurements we don't collect (limbs) are derived from the ones we do,
  // via typical proportional ratios to the nearest known landmark.
  const thighTopR = hipR * 0.34;
  const kneeR = thighTopR * 0.72;
  const calfTopR = kneeR * 1.1;
  const ankleR = calfTopR * 0.58;
  const armTopR = Math.max(bustR * 0.19, heightM * 0.03);
  const forearmTopR = armTopR * 0.82;
  const wristR = forearmTopR * 0.72;

  // The torso tapers all the way down to a narrow crotch point instead of
  // stopping at a flat hip-width disc, so the legs read as a continuation
  // of the pelvis rather than sprouting from underneath a pancake.
  const torsoProfile: TorsoProfilePoint[] = [
    { y: crotchY, radius: hipR * 0.34 },
    { y: hipY, radius: hipR },
    { y: waistY, radius: waistR },
    { y: bustY, radius: bustR },
    { y: shoulderY, radius: chestTopR },
    { y: neckBaseY, radius: neckRadius * 1.25 },
  ];

  const legOffsetX = hipR * 0.46;

  const shoulderBarRadius = chestTopR * 0.55;
  const elbowY = shoulderY - heightM * 0.17;
  const wristY = shoulderY - heightM * 0.33;

  return {
    heightM,
    torsoProfile,
    crotchY,
    hipY,
    shoulderY,
    neckBaseY,
    neckRadius,
    neckTopY: chinY,
    headRadius,
    headCenterY: chinY + headRadius * 0.95,
    shoulderHalfWidth,
    shoulderBarRadius,
    shoulderJointRadius: armTopR * 1.25,
    upperArm: { topY: shoulderY, bottomY: elbowY, topRadius: armTopR, bottomRadius: armTopR * 0.86 },
    elbowJointRadius: armTopR * 0.95,
    forearm: { topY: elbowY, bottomY: wristY, topRadius: forearmTopR, bottomRadius: wristR },
    wristRadius: wristR * 1.3,
    legOffsetX,
    hipJointRadius: thighTopR * 1.15,
    thigh: { topY: crotchY, bottomY: kneeY, topRadius: thighTopR, bottomRadius: kneeR },
    kneeJointRadius: kneeR * 1.05,
    calf: { topY: kneeY, bottomY: ankleY, topRadius: calfTopR, bottomRadius: ankleR },
    ankleRadius: ankleR * 1.2,
  };
}
