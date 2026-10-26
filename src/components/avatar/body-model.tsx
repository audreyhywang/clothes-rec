"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  computeAvatarProportions,
  type AvatarMeasurements,
  type TaperedSegment,
} from "./body-geometry";

/** Soft, neutral clay tone — a sculptor's/artist's mannequin, not skin or garment colors. */
const BODY_COLOR = "#d9d3c7";
const JOINT_COLOR = "#c7bfb0";

function Limb({ segment, x }: { segment: TaperedSegment; x: number }) {
  const height = segment.topY - segment.bottomY;
  const centerY = (segment.topY + segment.bottomY) / 2;
  return (
    <mesh position={[x, centerY, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[segment.topRadius, segment.bottomRadius, height, 20]} />
      <meshStandardMaterial color={BODY_COLOR} roughness={0.9} />
    </mesh>
  );
}

function Joint({ x, y, radius }: { x: number; y: number; radius: number }) {
  return (
    <mesh position={[x, y, 0]} castShadow>
      <sphereGeometry args={[radius, 20, 20]} />
      <meshStandardMaterial color={JOINT_COLOR} roughness={0.85} />
    </mesh>
  );
}

export function BodyModel({ measurements }: { measurements: AvatarMeasurements }) {
  const p = useMemo(() => computeAvatarProportions(measurements), [measurements]);

  const torsoGeometry = useMemo(() => {
    // Smooth the anatomical landmarks into a dense, flowing curve instead of
    // straight segments between them, so the torso reads as one continuous
    // contour rather than a faceted silhouette.
    const controlPoints = p.torsoProfile.map((pt) => new THREE.Vector3(pt.radius, pt.y, 0));
    const curve = new THREE.CatmullRomCurve3(controlPoints, false, "catmullrom", 0.3);
    const smoothed = curve.getPoints(48).map((v) => new THREE.Vector2(Math.max(v.x, 0.001), v.y));
    return new THREE.LatheGeometry(smoothed, 40);
  }, [p]);

  const neckHeight = p.neckTopY - p.neckBaseY;
  const neckCenterY = (p.neckTopY + p.neckBaseY) / 2;

  return (
    <group>
      {/* Torso — one continuous revolved surface from the crotch taper up to the neck base */}
      <mesh geometry={torsoGeometry} castShadow receiveShadow>
        <meshStandardMaterial color={BODY_COLOR} roughness={0.9} />
      </mesh>

      {/* Shoulder bar — spans the measured shoulder width so the torso actually
          widens out to it, with a joint sphere at each end where the arms attach. */}
      <mesh position={[0, p.shoulderY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry
          args={[p.shoulderBarRadius, p.shoulderBarRadius, p.shoulderHalfWidth * 2, 16]}
        />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.9} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, neckCenterY, 0]} castShadow>
        <cylinderGeometry args={[p.neckRadius, p.neckRadius * 1.2, neckHeight, 16]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.9} />
      </mesh>

      {/* Head */}
      <mesh position={[0, p.headCenterY, 0]} castShadow>
        <sphereGeometry args={[p.headRadius, 32, 32]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.9} />
      </mesh>

      {/* Arms: shoulder joint -> upper arm -> elbow joint -> forearm -> wrist */}
      {[-1, 1].map((side) => {
        const x = side * p.shoulderHalfWidth;
        return (
          <group key={`arm-${side}`}>
            <Joint x={x} y={p.shoulderY} radius={p.shoulderJointRadius} />
            <Limb segment={p.upperArm} x={x} />
            <Joint x={x} y={p.upperArm.bottomY} radius={p.elbowJointRadius} />
            <Limb segment={p.forearm} x={x} />
            <Joint x={x} y={p.forearm.bottomY} radius={p.wristRadius} />
          </group>
        );
      })}

      {/* Legs: hip joint (at the torso's crotch taper) -> thigh -> knee joint -> calf -> ankle */}
      {[-1, 1].map((side) => {
        const x = side * p.legOffsetX;
        return (
          <group key={`leg-${side}`}>
            <Joint x={x} y={p.crotchY} radius={p.hipJointRadius} />
            <Limb segment={p.thigh} x={x} />
            <Joint x={x} y={p.thigh.bottomY} radius={p.kneeJointRadius} />
            <Limb segment={p.calf} x={x} />
            <Joint x={x} y={p.calf.bottomY} radius={p.ankleRadius} />
          </group>
        );
      })}
    </group>
  );
}
