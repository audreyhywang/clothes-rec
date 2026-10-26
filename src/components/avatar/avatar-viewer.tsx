"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import { BodyModel } from "./body-model";
import type { AvatarMeasurements } from "./body-geometry";

export function AvatarViewer({
  measurements,
  className,
}: {
  measurements: AvatarMeasurements;
  className?: string;
}) {
  const heightM = (measurements.heightCm ?? 165) / 100;

  return (
    <div className={className ?? "h-[480px] w-full"}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={["#ffffff"]} />
        <PerspectiveCamera
          makeDefault
          position={[0, heightM * 0.55, heightM * 1.8]}
          fov={30}
        />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[2.5, 4, 3]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 1.5, -2]} intensity={0.3} />
        <Suspense fallback={null}>
          <BodyModel measurements={measurements} />
        </Suspense>
        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.3}
          scale={heightM * 2.5}
          blur={2.4}
          far={heightM}
        />
        <OrbitControls
          target={[0, heightM * 0.55, 0]}
          enablePan={false}
          minDistance={heightM * 0.9}
          maxDistance={heightM * 3}
          autoRotate
          autoRotateSpeed={1.1}
        />
      </Canvas>
    </div>
  );
}
