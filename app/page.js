'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Sky, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/* =========================================
   GLB MODELL
   Automatische Größenanpassung
========================================= */

function Model({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 2,
  grounded = true,
}) {
  const { scene } = useGLTF(url);

  const model = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Größe des Original-Modells bestimmen
    const box = new THREE.Box3().setFromObject(clone);

    const modelSize = new THREE.Vector3();
    box.getSize(modelSize);

    const center = new THREE.Vector3();
    box.getCenter(center);

    const largestDimension = Math.max(
      modelSize.x,
      modelSize.y,
      modelSize.z
    ) || 1;

    // Modell automatisch skalieren
    const scaleFactor = size / largestDimension;

    clone.scale.multiplyScalar(scaleFactor);

    // Nach Skalierung neu berechnen
    const scaledBox = new THREE.Box3().setFromObject(clone);

    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    // X und Z zentrieren
    clone.position.x -= scaledCenter.x;
    clone.position.z -= scaledCenter.z;

    // Modell auf Boden setzen
    if (grounded) {
      clone.position.y -= scaledBox.min.y;
    } else {
      clone.position.y -= scaledCenter.y;
    }

    return clone;
  }, [scene, size, grounded]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={model} />
    </group>
  );
}

/* =========================================
   SPIELER
========================================= */

function Player({ move }) {
  const playerRef = useRef();
  const keys = useRef({});

  useEffect(() => {
    const keyDown = (event) => {
      keys.current[event.code] = true;
    };

    const keyUp = (event) => {
      keys.current[event.code] = false;
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!playerRef.current) return;

    const x =
      (keys.current.KeyD ? 1 : 0) -
      (keys.current.KeyA ? 1 : 0) +
      (move.right ? 1 : 0) -
      (move.left ? 1 : 0);

    const z =
      (keys.current.KeyS ? 1 : 0) -
      (keys.current.KeyW ? 1 : 0) +
      (move.down ? 1 : 0) -
      (move.up ? 1 : 0);

    if (x !== 0 || z !== 0) {
      const direction = new THREE.Vector3(x, 0, z).normalize();

      playerRef.current.position.addScaledVector(
        direction,
        4.5 * delta
      );

      // Weltbegrenzung
      playerRef.current.position.x =
        THREE.MathUtils.clamp(
          playerRef.current.position.x,
          -20,
          20
        );

      playerRef.current.position.z =
        THREE.MathUtils.clamp(
          playerRef.current.position.z,
          -20,
          20
        );

      // Spieler dreht sich in Bewegungsrichtung
      playerRef.current.rotation.y =
        Math.atan2(
          direction.x,
          direction.z
        );
    }

    // Kamera folgt dem Spieler
    const desiredCamera = new THREE.Vector3(
      playerRef.current.position.x,
      7.5,
      playerRef.current.position.z + 11
    );

    state.camera.position.lerp(
      desiredCamera,
      1 - Math.exp(-5 * delta)
    );

    state.camera.lookAt(
      playerRef.current.position.x,
      1,
      playerRef.current.position.z
    );
  });

  return (
    <group
      ref={playerRef}
      position={[0, 0, 8]}
    >

      {/* CHARAKTER */}

      <Model
        url="/models/character-human.glb"
        size={2.1}
        rotation={[0, Math.PI, 0]}
      />

      {/* SCHWERT */}

      <Model
        url="/models/weapon-sword.glb"
        size={1.1}
        position={[0.45, 0.85, 0.05]}
        rotation={[0, 0, -0.7]}
        grounded={false}
      />

    </group>
  );
}

/* =========================================
   FELS
========================================= */

function Rock({
  position,
  rotation = 0,
  size = 2,
}) {
  return (
    <Model
      url="/models/rocks.glb"
      position={position}
      rotation={[0, rotation, 0]}
      size={size}
    />
  );
}

/* =========================================
   WELT
========================================= */

function World({ move }) {

  const rocks = [
    [-9, -7, 0.2, 2.4],
    [-5, -3, 1.4, 1.8],
    [-1, -7, 0.6, 2.0],
    [5, -6, 2.1, 2.5],
    [10, -2, 0.8, 2.1],
    [-10, 3, 2.8, 2.2],
    [-4, 5, 0.4, 1.9],
    [5, 5, 1.7, 2.4],
    [10, 7, 0.9, 1.8],
  ];

  return (
    <>

      {/* HIMMEL */}

      <color
        attach="background"
        args={['#7f9b92']}
      />

      <fog
        attach="fog"
        args={['#7f9b92', 28, 75]}
      />

      <Sky
        sunPosition={[12, 18, 8]}
        turbidity={7}
        rayleigh={1.5}
      />

      {/* LICHT */}

      <hemisphereLight
        args={['#d9efff', '#405338', 1.5]}
      />

      <directionalLight
        position={[12, 18, 10]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* =========================
          GLB BODEN
      ========================= */}

      <Model
        url="/models/floor.glb"
        size={48}
      />

      {/* =========================
          GEBÄUDE
      ========================= */}

      <Model
        url="/models/wood-structure.glb"
        position={[-5, 0, -2]}
        rotation={[0, 0.55, 0]}
        size={5.5}
      />

      {/* TOR */}

      <Model
        url="/models/gate.glb"
        position={[7, 0, -8]}
        rotation={[0, Math.PI, 0]}
        size={4.5}
      />

      {/* FASS */}

      <Model
        url="/models/barrel.glb"
        position={[-2.5, 0, -2.5]}
        rotation={[0, 0.8, 0]}
        size={1.2}
      />

      {/* TRUHE */}

      <Model
        url="/models/chest.glb"
        position={[2.8, 0, -1.5]}
        rotation={[0, -0.5, 0]}
        size={1.5}
      />

      {/* BANNER */}

      <Model
        url="/models/banner.glb"
        position={[-7.5, 0, 3]}
        rotation={[0, 0.4, 0]}
        size={3.5}
      />

      {/* FELSEN */}

      {rocks.map(
        ([x, z, rotation, size], index) => (
          <Rock
            key={index}
            position={[x, 0, z]}
            rotation={rotation}
            size={size}
          />
        )
      )}

      {/* SPIELER */}

      <Player move={move} />

      <Environment preset="forest" />

    </>
  );
}

/* =========================================
   HAUPTSPIEL
========================================= */

export default function Home() {

  const [started, setStarted] =
    useState(false);

  const [move, setMove] =
    useState({
      up: false,
      down: false,
      left: false,
      right: false,
    });

  const press = (
    direction,
    value
  ) => {

    setMove((current) => ({
      ...current,
      [direction]: value,
    }));

  };

  const pointerButton = (
    direction
  ) => ({

    onPointerDown: (event) => {

      event.currentTarget.setPointerCapture?.(
        event.pointerId
      );

      press(direction, true);

    },

    onPointerUp: () =>
      press(direction, false),

    onPointerCancel: () =>
      press(direction, false),

    onPointerLeave: () =>
      press(direction, false),

  });

  return (

    <main
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#101311',
        position: 'relative',
        touchAction: 'none',
      }}
    >

      {/* =========================
          3D CANVAS
      ========================= */}

      <Canvas
        shadows
        dpr={[1, 2]}

        camera={{
          position: [0, 7.5, 19],
          fov: 52,
        }}
      >

        <Suspense fallback={null}>

          <World
            move={move}
          />

        </Suspense>

      </Canvas>

      {/* =========================
          START MENÜ
      ========================= */}

      {!started && (

        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            background:
              'linear-gradient(135deg, rgba(9,12,10,.94), rgba(38,62,46,.82))',
          }}
        >

          <div
            style={{
              textAlign: 'center',
              color: 'white',
              padding: 30,
              maxWidth: 430,
            }}
          >

            <h1
              style={{
                fontSize: 48,

                margin:
                  '0 0 8px',

                letterSpacing: 4,
              }}
            >
              ASHFALL
            </h1>

            <h2
              style={{
                fontWeight: 400,

                opacity: 0.75,

                marginTop: 0,
              }}
            >
              Version 0.3
            </h2>

            <p
              style={{
                color: '#d9e2dc',

                lineHeight: 1.5,

                marginBottom: 30,
              }}
            >
              Erkunde die Welt.
            </p>

            <button

              onClick={() =>
                setStarted(true)
              }

              style={{
                padding:
                  '16px 35px',

                fontSize: 18,

                fontWeight: 700,

                border:
                  '1px solid rgba(255,255,255,.3)',

                borderRadius: 12,

                background:
                  '#5c8f55',

                color: 'white',
              }}
            >

              SPIEL STARTEN

            </button>

          </div>

        </div>

      )}

      {/* =========================
          LOGO
      ========================= */}

      <div
        style={{
          position: 'absolute',

          top: 20,

          left: 20,

          zIndex: 5,

          color: 'white',

          fontFamily: 'Arial',

          pointerEvents: 'none',

          textShadow:
            '0 2px 8px #000',
        }}
      >

        <div
          style={{
            fontSize: 26,

            fontWeight: 800,

            letterSpacing: 2,
          }}
        >
          ASHFALL
        </div>

        <div
          style={{
            opacity: 0.75,
          }}
        >
          Version 0.3
        </div>

      </div>

      {/* =========================
          MOBILE STEUERUNG
      ========================= */}

      {started && (

        <div
          style={{
            position: 'absolute',

            bottom: 26,

            left: 22,

            zIndex: 5,

            display: 'grid',

            gridTemplateColumns:
              'repeat(3, 58px)',

            gridTemplateRows:
              '58px 58px',

            gap: 4,
          }}
        >

          <div />

          <button
            {...pointerButton('up')}
            style={buttonStyle}
          >
            ▲
          </button>

          <div />

          <button
            {...pointerButton('left')}
            style={buttonStyle}
          >
            ◀
          </button>

          <button
            {...pointerButton('down')}
            style={buttonStyle}
          >
            ▼
          </button>

          <button
            {...pointerButton('right')}
            style={buttonStyle}
          >
            ▶
          </button>

        </div>

      )}

    </main>
  );
}


/* =========================================
   BUTTON STYLE
========================================= */

const buttonStyle = {

  width: 58,

  height: 58,

  fontSize: 22,

  borderRadius: 14,

  border:
    '1px solid rgba(255,255,255,.35)',

  background:
    'rgba(12,16,14,.72)',

  color: 'white',

  touchAction: 'none',

};


/* =========================================
   GLB PRELOAD
========================================= */

[
  'character-human.glb',

  'weapon-sword.glb',

  'rocks.glb',

  'floor.glb',

  'wood-structure.glb',

  'gate.glb',

  'barrel.glb',

  'chest.glb',

  'banner.glb',

].forEach((file) =>

  useGLTF.preload(
    `/models/${file}`
  )

);
