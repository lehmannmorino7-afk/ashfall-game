'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const COLORS = {
  floor: '#4f6b52',
  character: '#c89b70',
  sword: '#9aa6b2',
  rocks: '#68736b',
  wood: '#785235',
  gate: '#6b4932',
  barrel: '#8a5a36',
  chest: '#9a663a',
  banner: '#a4473d',
};

/* =========================================
   GLB MODEL
========================================= */

function Model({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 2,
  grounded = true,
  color,
}) {
  const { scene } = useGLTF(url);

  const model = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (!child.isMesh) return;

      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material) {
        child.material = child.material.clone();

        // Falls keine Textur vorhanden ist,
        // bekommt das Modell eine passende Farbe.
        if (color && !child.material.map) {
          child.material.color.set(color);
        }

        child.material.roughness = 0.82;
        child.material.metalness = 0;
        child.material.needsUpdate = true;
      }
    });

    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);

    const dimensions = new THREE.Vector3();
    box.getSize(dimensions);

    const largest =
      Math.max(
        dimensions.x,
        dimensions.y,
        dimensions.z
      ) || 1;

    // Automatische Skalierung
    clone.scale.multiplyScalar(
      size / largest
    );

    clone.updateMatrixWorld(true);

    const scaledBox =
      new THREE.Box3().setFromObject(clone);

    const center =
      scaledBox.getCenter(
        new THREE.Vector3()
      );

    // Horizontal zentrieren
    clone.position.x -= center.x;
    clone.position.z -= center.z;

    // Auf dem Boden platzieren
    if (grounded) {
      clone.position.y -= scaledBox.min.y;
    } else {
      clone.position.y -= center.y;
    }

    return clone;
  }, [
    scene,
    size,
    grounded,
    color,
  ]);

  return (
    <group
      position={position}
      rotation={rotation}
    >
      <primitive object={model} />
    </group>
  );
}


/* =========================================
   PLAYER
========================================= */

function Player({ move }) {

  const ref = useRef(null);

  const keys = useRef({});


  useEffect(() => {

    const down = (event) => {

      keys.current[event.code] = true;

    };


    const up = (event) => {

      keys.current[event.code] = false;

    };


    window.addEventListener(
      'keydown',
      down
    );

    window.addEventListener(
      'keyup',
      up
    );


    return () => {

      window.removeEventListener(
        'keydown',
        down
      );

      window.removeEventListener(
        'keyup',
        up
      );

    };

  }, []);


  useFrame((state, delta) => {

    if (!ref.current) return;


    const x =

      (keys.current.KeyD ||
      keys.current.ArrowRight
        ? 1
        : 0)

      -

      (keys.current.KeyA ||
      keys.current.ArrowLeft
        ? 1
        : 0)

      +

      (move.right ? 1 : 0)

      -

      (move.left ? 1 : 0);


    const z =

      (keys.current.KeyS ||
      keys.current.ArrowDown
        ? 1
        : 0)

      -

      (keys.current.KeyW ||
      keys.current.ArrowUp
        ? 1
        : 0)

      +

      (move.down ? 1 : 0)

      -

      (move.up ? 1 : 0);


    if (x !== 0 || z !== 0) {

      const direction =
        new THREE.Vector3(
          x,
          0,
          z
        ).normalize();


      // Bewegung

      ref.current.position.addScaledVector(

        direction,

        5 * delta

      );


      // Begrenzung der Welt

      ref.current.position.x =
        THREE.MathUtils.clamp(

          ref.current.position.x,

          -20,

          20

        );


      ref.current.position.z =
        THREE.MathUtils.clamp(

          ref.current.position.z,

          -20,

          20

        );


      // Charakter dreht sich

      ref.current.rotation.y =
        Math.atan2(

          direction.x,

          direction.z

        );

    }


    /* CAMERA FOLLOW */

    const cameraTarget =
      new THREE.Vector3(

        ref.current.position.x,

        7,

        ref.current.position.z + 10

      );


    state.camera.position.lerp(

      cameraTarget,

      1 - Math.exp(-6 * delta)

    );


    state.camera.lookAt(

      ref.current.position.x,

      1,

      ref.current.position.z

    );

  });


  return (

    <group
      ref={ref}
      position={[0, 0, 8]}
    >

      {/* CHARACTER */}

      <Model

        url="/models/character-human.glb"

        size={2.1}

        color={COLORS.character}

        rotation={[
          0,
          Math.PI,
          0
        ]}

      />


      {/* SWORD */}

      <Model

        url="/models/weapon-sword.glb"

        size={1.05}

        color={COLORS.sword}

        position={[
          0.45,
          0.85,
          0.05
        ]}

        rotation={[
          0,
          0,
          -0.7
        ]}

        grounded={false}

      />

    </group>

  );

}


/* =========================================
   ROCK
========================================= */

function Rock({
  position,
  rotation,
  size,
}) {

  return (

    <Model

      url="/models/rocks.glb"

      position={position}

      rotation={[
        0,
        rotation,
        0
      ]}

      size={size}

      color={COLORS.rocks}

    />

  );

}


/* =========================================
   WORLD
========================================= */

function World({ move }) {


  const rocks = [

    [-9, -7, 0.2, 2.4],

    [-5, -3, 1.4, 1.8],

    [-1, -7, 0.6, 2],

    [5, -6, 2.1, 2.5],

    [10, -2, 0.8, 2.1],

    [-10, 3, 2.8, 2.2],

    [-4, 5, 0.4, 1.9],

    [5, 5, 1.7, 2.4],

    [10, 7, 0.9, 1.8],

  ];


  return (

    <>


      {/* BACKGROUND */}

      <color
        attach="background"
        args={['#87a39a']}
      />


      <fog
        attach="fog"
        args={[
          '#87a39a',
          34,
          85
        ]}
      />


      {/* SKY */}

      <Sky

        sunPosition={[
          10,
          14,
          8
        ]}

        turbidity={8}

        rayleigh={1.2}

        mieCoefficient={0.004}

      />


      {/* LIGHTING */}

      <ambientLight
        intensity={0.65}
      />


      <hemisphereLight

        args={[
          '#dbeeff',
          '#31402e',
          0.55
        ]}

      />


      <directionalLight

        position={[
          10,
          16,
          8
        ]}

        intensity={1.2}

        castShadow

        shadow-mapSize-width={2048}

        shadow-mapSize-height={2048}

      />


      {/* FLOOR */}

      <Model

        url="/models/floor.glb"

        size={48}

        color={COLORS.floor}

      />


      {/* BUILDING */}

      <Model

        url="/models/wood-structure.glb"

        position={[
          -5,
          0,
          -2
        ]}

        rotation={[
          0,
          0.55,
          0
        ]}

        size={5.5}

        color={COLORS.wood}

      />


      {/* GATE */}

      <Model

        url="/models/gate.glb"

        position={[
          7,
          0,
          -8
        ]}

        rotation={[
          0,
          Math.PI,
          0
        ]}

        size={4.5}

        color={COLORS.gate}

      />


      {/* BARREL */}

      <Model

        url="/models/barrel.glb"

        position={[
          -2.5,
          0,
          -2.5
        ]}

        rotation={[
          0,
          0.8,
          0
        ]}

        size={1.2}

        color={COLORS.barrel}

      />


      {/* CHEST */}

      <Model

        url="/models/chest.glb"

        position={[
          2.8,
          0,
          -1.5
        ]}

        rotation={[
          0,
          -0.5,
          0
        ]}

        size={1.5}

        color={COLORS.chest}

      />


      {/* BANNER */}

      <Model

        url="/models/banner.glb"

        position={[
          -7.5,
          0,
          3
        ]}

        rotation={[
          0,
          0.4,
          0
        ]}

        size={3.5}

        color={COLORS.banner}

      />


      {/* ROCKS */}

      {rocks.map(

        (
          [
            x,
            z,
            rotation,
            size
          ],

          index

        ) => (

          <Rock

            key={index}

            position={[
              x,
              0,
              z
            ]}

            rotation={rotation}

            size={size}

          />

        )

      )}


      {/* PLAYER */}

      <Player
        move={move}
      />


    </>

  );

}


/* =========================================
   GAME
========================================= */

export default function Home() {


  const [
    started,
    setStarted
  ] = useState(false);


  const [
    move,
    setMove
  ] = useState({

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


  /* MOBILE CONTROLS */

  const buttonEvents = (
    direction
  ) => ({

    onPointerDown: (event) => {

      event.preventDefault();

      press(
        direction,
        true
      );

    },


    onPointerUp: () =>

      press(
        direction,
        false
      ),


    onPointerCancel: () =>

      press(
        direction,
        false
      ),


    onPointerLeave: () =>

      press(
        direction,
        false
      ),


    onTouchStart: (event) => {

      event.preventDefault();

      press(
        direction,
        true
      );

    },


    onTouchEnd: (event) => {

      event.preventDefault();

      press(
        direction,
        false
      );

    },

  });


  return (

    <main
      style={{
        position: 'relative',

        width: '100vw',

        height: '100dvh',

        overflow: 'hidden',

        background: '#101311',

        touchAction: 'none',

      }}
    >


      {/* 3D */}

      <Canvas

        shadows

        dpr={[1, 1.5]}

        camera={{

          position: [
            0,
            7,
            18
          ],

          fov: 52,

          near: 0.1,

          far: 120,

        }}

        gl={{

          antialias: true,

          toneMapping:
            THREE.ACESFilmicToneMapping,

          toneMappingExposure:
            0.9,

        }}

      >

        <Suspense
          fallback={null}
        >

          <World
            move={move}
          />

        </Suspense>

      </Canvas>


      {/* LOGO */}

      <div

        style={{

          position: 'absolute',

          top: 20,

          left: 20,

          zIndex: 5,

          pointerEvents: 'none',

          color: 'white',

          fontFamily: 'Arial',

          textShadow:
            '0 2px 8px rgba(0,0,0,.8)',

        }}

      >

        <div

          style={{

            fontSize: 26,

            fontWeight: 900,

            letterSpacing: 3,

          }}

        >

          ASHFALL

        </div>


        <div

          style={{

            marginTop: 4,

            opacity: 0.78,

          }}

        >

          Version 0.4

        </div>

      </div>


      {/* START SCREEN */}

      {!started && (

        <div

          style={{

            position: 'absolute',

            inset: 0,

            zIndex: 10,

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            padding: 24,

            background:
              'linear-gradient(135deg, rgba(9,12,10,.94), rgba(38,62,46,.84))',

          }}

        >

          <div

            style={{

              textAlign: 'center',

              color: 'white',

              maxWidth: 430,

            }}

          >

            <h1

              style={{

                margin: '0 0 8px',

                fontSize: 50,

                letterSpacing: 5,

              }}

            >

              ASHFALL

            </h1>


            <h2

              style={{

                margin: 0,

                fontWeight: 400,

                opacity: 0.75,

              }}

            >

              Version 0.4

            </h2>


            <p

              style={{

                margin:
                  '26px 0 30px',

                color: '#d9e2dc',

                lineHeight: 1.55,

              }}

            >

              Erkunde die Welt und bewege
              deinen Charakter.

            </p>


            <button

              onClick={() =>
                setStarted(true)
              }

              style={{

                padding:
                  '16px 34px',

                fontSize: 18,

                fontWeight: 800,

                border:
                  '1px solid rgba(255,255,255,.35)',

                borderRadius: 14,

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


      {/* MOBILE CONTROLS */}

      {started && (

        <div

          style={{

            position: 'absolute',

            left: 18,

            bottom: 18,

            zIndex: 20,

            display: 'grid',

            gridTemplateColumns:
              'repeat(3, 62px)',

            gridTemplateRows:
              'repeat(2, 62px)',

            gap: 5,

          }}

        >

          <div />


          <button

            {...buttonEvents('up')}

            style={buttonStyle}

          >

            ▲

          </button>


          <div />


          <button

            {...buttonEvents('left')}

            style={buttonStyle}

          >

            ◀

          </button>


          <button

            {...buttonEvents('down')}

            style={buttonStyle}

          >

            ▼

          </button>


          <button

            {...buttonEvents('right')}

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

  width: 62,

  height: 62,

  fontSize: 23,

  fontWeight: 800,

  borderRadius: 16,

  border:
    '1px solid rgba(255,255,255,.38)',

  background:
    'rgba(12,16,14,.78)',

  color: 'white',

  touchAction: 'none',

  userSelect: 'none',

};


/* =========================================
   PRELOAD MODELS
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

].forEach((file) => {

  useGLTF.preload(
    `/models/${file}`
  );

});
