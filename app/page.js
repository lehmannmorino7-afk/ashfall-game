'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Sky, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';


/* =========================================
   GLB MODEL
========================================= */

function Model({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) {
  const { scene } = useGLTF(url);

  const model = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  useEffect(() => {
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [model]);

  return (
    <primitive
      object={model}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}


/* =========================================
   SPIELER
========================================= */

function Player({ move, playerPosition }) {
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

      const direction = new THREE.Vector3(x, 0, z);

      direction.normalize();


      playerRef.current.position.x +=
        direction.x * 5 * delta;

      playerRef.current.position.z +=
        direction.z * 5 * delta;


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


      playerRef.current.rotation.y =
        Math.atan2(
          direction.x,
          direction.z
        );

    }


    playerPosition.current.copy(
      playerRef.current.position
    );


    /* KAMERA FOLGT DEM SPIELER */

    const cameraTarget = new THREE.Vector3(
      playerRef.current.position.x,
      6,
      playerRef.current.position.z + 9
    );


    state.camera.position.lerp(
      cameraTarget,
      0.05
    );


    state.camera.lookAt(
      playerRef.current.position.x,
      1.5,
      playerRef.current.position.z
    );

  });


  return (

    <group
      ref={playerRef}
      position={[0, 0, 8]}
    >


      {/* =================================
          DEIN ECHTER CHARACTER
      ================================= */}

      <Model
        url="/models/character-human.glb"
        position={[0, 0, 0]}
        rotation={[0, Math.PI, 0]}
        scale={1}
      />


      {/* =================================
          DEIN ECHTES SCHWERT
      ================================= */}

      <Model
        url="/models/weapon-sword.glb"
        position={[0.45, 1.1, 0]}
        rotation={[0, 0, -0.7]}
        scale={0.75}
      />


    </group>

  );

}


/* =========================================
   FELS
========================================= */

function Rock({ position }) {

  return (

    <group position={position}>

      <Model
        url="/models/rocks.glb"
        position={[0, 0, 0]}
        scale={0.8}
      />

    </group>

  );

}


/* =========================================
   WELT
========================================= */

function World({ move, playerPosition }) {


  const rocks = [
    [-7, -6],
    [-3, -2],
    [4, -5],
    [8, -1],
    [-8, 5],
    [-2, 6],
    [5, 7],
    [10, 5],
  ];


  return (

    <>

      <color
        attach="background"
        args={['#6b786d']}
      />


      <fog
        attach="fog"
        args={['#6b786d', 20, 60]}
      />


      {/* HIMMEL */}

      <Sky
        sunPosition={[10, 15, 5]}
        turbidity={8}
        rayleigh={1}
      />


      {/* LICHT */}

      <ambientLight intensity={0.8} />


      <directionalLight
        position={[10, 15, 10]}
        intensity={2}
        castShadow
      />


      {/* =================================
          DEIN GLB BODEN
      ================================= */}

      <Model
        url="/models/floor.glb"
        position={[0, 0, 0]}
        scale={12}
      />


      {/* NOTFALL BODEN */}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >

        <planeGeometry
          args={[100, 100]}
        />

        <meshStandardMaterial
          color="#3f513c"
        />

      </mesh>


      {/* =================================
          HOLZ STRUKTUR
      ================================= */}

      <Model
        url="/models/wood-structure.glb"
        position={[-4, 0, -3]}
        rotation={[0, 0.5, 0]}
        scale={1}
      />


      {/* =================================
          FELSEN
      ================================= */}

      {rocks.map((rock, index) => (

        <Rock
          key={index}
          position={[
            rock[0],
            0,
            rock[1]
          ]}
        />

      ))}


      {/* =================================
          DEIN SPIELER
      ================================= */}

      <Player
        move={move}
        playerPosition={playerPosition}
      />


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


  const playerPosition =
    useRef(
      new THREE.Vector3(0, 0, 8)
    );


  const press = (direction, value) => {

    setMove((current) => ({
      ...current,
      [direction]: value,
    }));

  };


  return (

    <main
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
        position: 'relative',
        touchAction: 'none',
      }}
    >


      {/* =================================
          STARTMENÜ
      ================================= */}

      {!started && (

        <div
          style={{
            position: 'absolute',
            zIndex: 10,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'linear-gradient(135deg, #111, #26352b)',
          }}
        >

          <div
            style={{
              textAlign: 'center',
              color: 'white',
              padding: 30,
            }}
          >

            <h1
              style={{
                fontSize: 48,
                marginBottom: 10,
              }}
            >
              ASHFALL
            </h1>


            <h2>
              Version 0.2
            </h2>


            <p
              style={{
                color: '#ccc',
                marginBottom: 30,
              }}
            >
              Dein GLB Charakter und dein
              GLB Schwert sind jetzt im Spiel.
            </p>


            <button
              onClick={() =>
                setStarted(true)
              }
              style={{
                padding:
                  '16px 35px',
                fontSize: 20,
                border: 'none',
                borderRadius: 12,
                background: '#5c8f55',
                color: 'white',
              }}
            >
              SPIEL STARTEN
            </button>

          </div>

        </div>

      )}


      {/* =================================
          HUD
      ================================= */}

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 5,
          color: 'white',
          fontFamily: 'Arial',
          pointerEvents: 'none',
        }}
      >

        <div
          style={{
            fontSize: 26,
            fontWeight: 'bold',
          }}
        >
          ASHFALL
        </div>


        <div
          style={{
            opacity: 0.7,
          }}
        >
          Version 0.2
        </div>

      </div>


      {/* =================================
          3D SPIEL
      ================================= */}

      <Canvas
        shadows
        camera={{
          position: [0, 6, 17],
          fov: 55,
        }}
      >

        <World
          move={move}
          playerPosition={playerPosition}
        />

      </Canvas>


      {/* =================================
          MOBILE STEUERUNG
      ================================= */}

      <div
        style={{
          position: 'absolute',
          bottom: 30,
          left: 30,
          zIndex: 5,
        }}
      >


        <button
          onPointerDown={() =>
            press('up', true)
          }

          onPointerUp={() =>
            press('up', false)
          }

          onPointerLeave={() =>
            press('up', false)
          }

          style={buttonStyle}
        >
          ▲
        </button>


        <div>

          <button
            onPointerDown={() =>
              press('left', true)
            }

            onPointerUp={() =>
              press('left', false)
            }

            onPointerLeave={() =>
              press('left', false)
            }

            style={buttonStyle}
          >
            ◀
          </button>


          <button
            onPointerDown={() =>
              press('down', true)
            }

            onPointerUp={() =>
              press('down', false)
            }

            onPointerLeave={() =>
              press('down', false)
            }

            style={buttonStyle}
          >
            ▼
          </button>


          <button
            onPointerDown={() =>
              press('right', true)
            }

            onPointerUp={() =>
              press('right', false)
            }

            onPointerLeave={() =>
              press('right', false)
            }

            style={buttonStyle}
          >
            ▶
          </button>

        </div>

      </div>


      {/* =================================
          INFO
      ================================= */}

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          color: 'white',
          opacity: 0.8,
          fontFamily: 'Arial',
          fontSize: 12,
          zIndex: 5,
        }}
      >
        WASD oder Steuerkreuz
      </div>


    </main>

  );

}


/* =========================================
   BUTTON STYLE
========================================= */

const buttonStyle = {

  width: 65,
  height: 65,

  margin: 4,

  fontSize: 25,

  borderRadius: 15,

  border:
    '2px solid rgba(255,255,255,0.3)',

  background:
    'rgba(20,20,20,0.7)',

  color: 'white',

};


/* =========================================
   MODEL PRELOAD
========================================= */

useGLTF.preload(
  '/models/character-human.glb'
);

useGLTF.preload(
  '/models/weapon-sword.glb'
);

useGLTF.preload(
  '/models/rocks.glb'
);

useGLTF.preload(
  '/models/floor.glb'
);

useGLTF.preload(
  '/models/wood-structure.glb'
);
