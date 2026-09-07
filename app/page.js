'use client';

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Sky } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function Tree({ position, onCollect }) {
  const [collected, setCollected] = useState(false);
  if (collected) return null;

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        setCollected(true);
        onCollect("wood", 2);
      }}
    >
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.38, 3.4, 10]} />
        <meshStandardMaterial color="#4b3426" roughness={1} />
      </mesh>
      <mesh position={[0, 3.7, 0]} castShadow>
        <coneGeometry args={[1.6, 3.8, 12]} />
        <meshStandardMaterial color="#243b27" roughness={0.95} />
      </mesh>
      <mesh position={[0.35, 4.7, 0.1]} castShadow>
        <coneGeometry args={[1.25, 2.8, 12]} />
        <meshStandardMaterial color="#2c4a30" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Rock({ position, onCollect }) {
  const [collected, setCollected] = useState(false);
  if (collected) return null;

  return (
    <mesh
      position={position}
      castShadow
      onClick={(event) => {
        event.stopPropagation();
        setCollected(true);
        onCollect("stone", 2);
      }}
    >
      <dodecahedronGeometry args={[0.85, 1]} />
      <meshStandardMaterial color="#565b56" roughness={1} />
    </mesh>
  );
}

function Player({ move }) {
  const ref = useRef();
  const keys = useRef({});

  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true; };
    const up = (e) => { keys.current[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;

    const inputX =
      (keys.current.KeyD ? 1 : 0) -
      (keys.current.KeyA ? 1 : 0) +
      (move.right ? 1 : 0) -
      (move.left ? 1 : 0);

    const inputZ =
      (keys.current.KeyS ? 1 : 0) -
      (keys.current.KeyW ? 1 : 0) +
      (move.down ? 1 : 0) -
      (move.up ? 1 : 0);

    if (inputX || inputZ) {
      const direction = new THREE.Vector3(inputX, 0, inputZ)
        .normalize()
        .applyQuaternion(state.camera.quaternion);
      direction.y = 0;
      direction.normalize();

      ref.current.position.addScaledVector(direction, 4.5 * delta);
      ref.current.position.x = THREE.MathUtils.clamp(ref.current.position.x, -18, 18);
      ref.current.position.z = THREE.MathUtils.clamp(ref.current.position.z, -18, 18);
      ref.current.rotation.y = Math.atan2(direction.x, direction.z);
    }

    const target = new THREE.Vector3(
      ref.current.position.x,
      ref.current.position.y + 5,
      ref.current.position.z + 8
    );

    state.camera.position.lerp(target, 0.06);
    state.camera.lookAt(
      ref.current.position.x,
      ref.current.position.y + 1.4,
      ref.current.position.z
    );
  });

  return (
    <group ref={ref} position={[0, 0, 9]}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.38, 1.2, 8, 16]} />
        <meshStandardMaterial color="#303a3c" roughness={0.82} />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <sphereGeometry args={[0.31, 20, 20]} />
        <meshStandardMaterial color="#b58b70" roughness={0.9} />
      </mesh>
    </group>
  );
}

function World({ onCollect, move }) {
  const trees = useMemo(
    () => [[-8,-9],[-5,-5],[5,-8],[9,-3],[-10,3],[-6,7],[7,7],[3,10],[-12,-11],[11,8]],
    []
  );
  const rocks = useMemo(
    () => [[-3,-1],[4,-2],[8,4],[-8,-4],[1,3],[-11,9]],
    []
  );

  return (
    <>
      <color attach="background" args={["#6d786f"]} />
      <fog attach="fog" args={["#6d786f", 18, 55]} />
      <Sky sunPosition={[8, 12, 4]} turbidity={7} rayleigh={1.1} />
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#3d4a38" roughness={1} />
      </mesh>

      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[6, 0.16, 5]} />
        <meshStandardMaterial color="#625642" roughness={1} />
      </mesh>

      <mesh position={[-2.4, 0.8, 0]} castShadow>
        <boxGeometry args={[1.8, 1.5, 1.8]} />
        <meshStandardMaterial color="#5d5043" />
      </mesh>
      <mesh position={[2.2, 0.7, -0.8]} castShadow>
        <boxGeometry args={[1.4, 1.3, 1.4]} />
        <meshStandardMaterial color="#645746" />
      </mesh>

      {trees.map(([x, z], index) => (
        <Tree key={index} position={[x, 0, z]} onCollect={onCollect} />
      ))}

      {rocks.map(([x, z], index) => (
        <Rock key={index} position={[x, 0.82, z]} onCollect={onCollect} />
      ))}

      <Player move={move} />
      <Environment preset="forest" />
    </>
  );
}

export default function Home() {
  const [resources, setResources] = useState({ wood: 0, stone: 0 });
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState("Erkunde das Gebiet und sammle Ressourcen.");
  const [move, setMove] = useState({ up: false, down: false, left: false, right: false });

  const collect = (type, amount) => {
    setResources((current) => ({
      ...current,
      [type]: current[type] + amount
    }));
    setStatus(type === "wood" ? `+${amount} Holz gesammelt` : `+${amount} Stein gesammelt`);
  };

  const press = (key, value) => {
    setMove((current) => ({ ...current, [key]: value }));
  };

  return (
    <main>
      {!started && (
        <section className="startScreen">
          <div className="panel">
            <div className="eyebrow">ASHFALL</div>
            <h1>Version 0.1</h1>
            <p>
              Der erste spielbare Prototyp. Erkunde das Startgebiet,
              sammle Holz und Stein und teste die grundlegende Bewegung.
            </p>
            <button onClick={() => setStarted(true)}>Spiel starten</button>
          </div>
        </section>
      )}

      <div className="hud">
        <div className="brand">ASHFALL <span>0.1</span></div>
        <div className="inventory">
          <div><small>HOLZ</small><strong>{resources.wood}</strong></div>
          <div><small>STEIN</small><strong>{resources.stone}</strong></div>
        </div>
        <div className="status">{status}</div>
      </div>

      <Canvas shadows camera={{ position: [0, 5, 16], fov: 55 }}>
        <World onCollect={collect} move={move} />
      </Canvas>

      <div className="desktopHint">
        Desktop: W A S D zum Bewegen · Bäume und Felsen anklicken
      </div>

      <div className="mobileControls">
        <div className="pad">
          <button
            className="up"
            onPointerDown={() => press("up", true)}
            onPointerUp={() => press("up", false)}
            onPointerLeave={() => press("up", false)}
          >▲</button>
          <button
            className="left"
            onPointerDown={() => press("left", true)}
            onPointerUp={() => press("left", false)}
            onPointerLeave={() => press("left", false)}
          >◀</button>
          <button
            className="right"
            onPointerDown={() => press("right", true)}
            onPointerUp={() => press("right", false)}
            onPointerLeave={() => press("right", false)}
          >▶</button>
          <button
            className="down"
            onPointerDown={() => press("down", true)}
            onPointerUp={() => press("down", false)}
            onPointerLeave={() => press("down", false)}
          >▼</button>
        </div>
      </div>
    </main>
  );
}