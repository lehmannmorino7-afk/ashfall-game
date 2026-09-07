'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/* =====================================================
   ASHFALL – VERSION 0.6
   Saubere GLB-Spielwelt
===================================================== */


/* =====================================================
   GLB MODELL
===================================================== */

function GLBModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 1,
}) {
  const { scene } = useGLTF(url);

  const model = useMemo(() => {
    const clone = scene.clone(true);

    /*
      GLB-Materialien NICHT verändern!

      Dadurch bleiben die originalen Materialien
      des Modells erhalten.
    */

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        /*
          Original-Material behalten!
        */
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });

    clone.updateMatrixWorld(true);

    /*
      Originalgröße berechnen
    */

    const box = new THREE.Box3().setFromObject(clone);

    const dimensions = new THREE.Vector3();

    box.getSize(dimensions);

    const largestDimension =
      Math.max(
        dimensions.x,
        dimensions.y,
        dimensions.z
      ) || 1;

    /*
      Einheitliche Skalierung
    */

    const scale =
      size / largestDimension;

    clone.scale.setScalar(scale);

    clone.updateMatrixWorld(true);

    /*
      Modell erneut berechnen
    */

    const scaledBox =
      new THREE.Box3().setFromObject(clone);

    const center =
      scaledBox.getCenter(
        new THREE.Vector3()
      );

    /*
      Modell horizontal zentrieren
    */

    clone.position.x -= center.x;

    clone.position.z -= center.z;

    /*
      Modell auf Boden setzen
    */

    clone.position.y -=
      scaledBox.min.y;

    return clone;

  }, [scene, size]);

  return (
    <group
      position={position}
      rotation={rotation}
    >
      <primitive object={model} />
    </group>
  );
}


/* =====================================================
   SPIELER
===================================================== */

function Player({
  move,
  startPosition,
  onPositionChange,
}) {

  const playerRef = useRef(null);

  const keys = useRef({});

  const lastPositionUpdate =
    useRef(0);


  /* =================================
     TASTATUR
  ================================= */

  useEffect(() => {

    const keyDown = (event) => {

      keys.current[event.code] = true;

    };


    const keyUp = (event) => {

      keys.current[event.code] = false;

    };


    window.addEventListener(
      'keydown',
      keyDown
    );

    window.addEventListener(
      'keyup',
      keyUp
    );


    return () => {

      window.removeEventListener(
        'keydown',
        keyDown
      );

      window.removeEventListener(
        'keyup',
        keyUp
      );

    };

  }, []);


  /* =================================
     BEWEGUNG
  ================================= */

  useFrame((state, delta) => {

    if (!playerRef.current) return;


    let moveX = 0;

    let moveZ = 0;


    /* TASTATUR */

    if (
      keys.current.KeyA ||
      keys.current.ArrowLeft
    ) {
      moveX -= 1;
    }


    if (
      keys.current.KeyD ||
      keys.current.ArrowRight
    ) {
      moveX += 1;
    }


    if (
      keys.current.KeyW ||
      keys.current.ArrowUp
    ) {
      moveZ -= 1;
    }


    if (
      keys.current.KeyS ||
      keys.current.ArrowDown
    ) {
      moveZ += 1;
    }


    /* MOBILE */

    if (move.left) {
      moveX -= 1;
    }

    if (move.right) {
      moveX += 1;
    }

    if (move.up) {
      moveZ -= 1;
    }

    if (move.down) {
      moveZ += 1;
    }


    /* =================================
       BEWEGEN
    ================================= */

    if (
      moveX !== 0 ||
      moveZ !== 0
    ) {

      const direction =
        new THREE.Vector3(
          moveX,
          0,
          moveZ
        ).normalize();


      const speed = 5;


      playerRef.current.position.x +=
        direction.x *
        speed *
        delta;


      playerRef.current.position.z +=
        direction.z *
        speed *
        delta;


      /* WELTGRENZEN */

      playerRef.current.position.x =
        THREE.MathUtils.clamp(
          playerRef.current.position.x,
          -22,
          22
        );


      playerRef.current.position.z =
        THREE.MathUtils.clamp(
          playerRef.current.position.z,
          -22,
          22
        );


      /* CHARAKTER DREHEN */

      const targetRotation =
        Math.atan2(
          direction.x,
          direction.z
        );

      playerRef.current.rotation.y =
        THREE.MathUtils.lerp(
          playerRef.current.rotation.y,
          targetRotation,
          0.15
        );

    }


    /* =================================
       POSITION SPEICHERN
       Nicht mehr 60x pro Sekunde!
    ================================= */

    const now =
      performance.now();


    if (
      now -
      lastPositionUpdate.current >
      100
    ) {

      onPositionChange({
        x:
          playerRef.current.position.x,

        z:
          playerRef.current.position.z,
      });


      lastPositionUpdate.current =
        now;

    }


    /* =================================
       KAMERA FOLGT SPIELER
    ================================= */

    const targetCameraPosition =
      new THREE.Vector3(
        playerRef.current.position.x,
        9,
        playerRef.current.position.z + 12
      );


    state.camera.position.lerp(
      targetCameraPosition,
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
      position={startPosition}
    >

      {/*
        NUR EIN CHARAKTER!

        Kein orangefarbener Ersatzkörper.
      */}

      <GLBModel
        url="/models/character-human.glb"
        size={2.2}
      />

    </group>

  );

}


/* =====================================================
   RESSOURCE
===================================================== */

function Resource({
  resource,
  playerPosition,
}) {

  const distance =
    Math.sqrt(

      Math.pow(
        playerPosition.x -
        resource.x,
        2
      )

      +

      Math.pow(
        playerPosition.z -
        resource.z,
        2
      )

    );


  const isNear =
    distance < 3;


  return (

    <group
      position={[
        resource.x,
        0,
        resource.z,
      ]}
    >

      {/* GLB MODELL */}

      <GLBModel
        url={resource.model}
        size={resource.size}
        rotation={resource.rotation || [
          0,
          0,
          0,
        ]}
      />


      {/* MARKIERUNG WENN NAH */}

      {isNear && (

        <mesh
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}
          position={[
            0,
            0.025,
            0,
          ]}
        >

          <ringGeometry
            args={[
              1.1,
              1.4,
              32,
            ]}
          />

          <meshBasicMaterial
            color={
              resource.type === 'stone'
                ? '#9ec5ff'
                : '#f3b65b'
            }
            transparent
            opacity={0.9}
          />

        </mesh>

      )}

    </group>

  );

}


/* =====================================================
   DEKORATION
===================================================== */

function Decoration() {

  return (

    <Suspense fallback={null}>


      {/* TOR */}

      <GLBModel
        url="/models/gate.glb"
        position={[0, 0, -18]}
        rotation={[
          0,
          Math.PI,
          0,
        ]}
        size={5}
      />


      {/* TRUHE */}

      <GLBModel
        url="/models/chest.glb"
        position={[-7, 0, -4]}
        rotation={[
          0,
          0.5,
          0,
        ]}
        size={1.8}
      />


      {/* FÄSSER */}

      <GLBModel
        url="/models/barrel.glb"
        position={[-9, 0, -5]}
        size={1.4}
      />


      <GLBModel
        url="/models/barrel.glb"
        position={[-8, 0, -6]}
        rotation={[
          0,
          0.5,
          0,
        ]}
        size={1.1}
      />


      {/* BANNER */}

      <GLBModel
        url="/models/banner.glb"
        position={[10, 0, -10]}
        rotation={[
          0,
          -0.5,
          0,
        ]}
        size={3.5}
      />


      {/* TISCH */}

      <GLBModel
        url="/models/table.glb"
        position={[8, 0, 8]}
        rotation={[
          0,
          -0.8,
          0,
        ]}
        size={2.8}
      />


      {/* STUHL */}

      <GLBModel
        url="/models/chair.glb"
        position={[6.5, 0, 8]}
        rotation={[
          0,
          1,
          0,
        ]}
        size={1.5}
      />


      {/* FELSDEKORATION */}

      <GLBModel
        url="/models/stones.glb"
        position={[15, 0, 10]}
        size={3.5}
      />


      <GLBModel
        url="/models/stones.glb"
        position={[-16, 0, -8]}
        rotation={[
          0,
          1.5,
          0,
        ]}
        size={3}
      />


    </Suspense>

  );

}


/* =====================================================
   WELT
===================================================== */

function World({
  move,
  playerPosition,
  setPlayerPosition,
  resources,
}) {

  return (

    <>


      {/* =================================
         HIMMEL
      ================================= */}

      <color
        attach="background"
        args={['#86a89a']}
      />


      <fog
        attach="fog"
        args={[
          '#86a89a',
          35,
          80,
        ]}
      />


      <Sky
        sunPosition={[
          15,
          20,
          10,
        ]}
        turbidity={6}
        rayleigh={1}
        mieCoefficient={0.003}
      />


      {/* =================================
         LICHT
      ================================= */}

      <ambientLight
        intensity={0.8}
      />


      <hemisphereLight
        args={[
          '#dcecff',
          '#35523c',
          1.2,
        ]}
      />


      <directionalLight
        position={[
          12,
          20,
          10,
        ]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />


      {/* =================================
         HAUPTBODEN

         WICHTIG:
         floor.glb wird NICHT verwendet!

         Das war einer der Gründe für
         die weiße kaputte Welt.
      ================================= */}

      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        receiveShadow
      >

        <planeGeometry
          args={[
            60,
            60,
          ]}
        />

        <meshStandardMaterial
          color="#426b4d"
          roughness={1}
        />

      </mesh>


      {/* =================================
         ZWEITER BODENBEREICH
      ================================= */}

      <mesh
        position={[
          0,
          0.01,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >

        <circleGeometry
          args={[
            18,
            64,
          ]}
        />

        <meshStandardMaterial
          color="#4e7a58"
          roughness={1}
        />

      </mesh>


      {/* =================================
         DEKORATION
      ================================= */}

      <Decoration />


      {/* =================================
         RESSOURCEN
      ================================= */}

      {resources.map(
        (resource) => (

          <Suspense
            key={resource.id}
            fallback={null}
          >

            <Resource
              resource={resource}
              playerPosition={
                playerPosition
              }
            />

          </Suspense>

        )
      )}


      {/* =================================
         SPIELER
      ================================= */}

      <Suspense fallback={null}>

        <Player
          move={move}
          startPosition={[
            0,
            0,
            8,
          ]}
          onPositionChange={
            setPlayerPosition
          }
        />

      </Suspense>


    </>

  );

}


/* =====================================================
   HAUPTSPIEL
===================================================== */

export default function Home() {


  /* =================================
     START
  ================================= */

  const [
    started,
    setStarted,
  ] = useState(false);


  /* =================================
     BEWEGUNG
  ================================= */

  const [
    move,
    setMove,
  ] = useState({

    up: false,
    down: false,
    left: false,
    right: false,

  });


  /* =================================
     SPIELER POSITION
  ================================= */

  const [
    playerPosition,
    setPlayerPosition,
  ] = useState({

    x: 0,
    z: 8,

  });


  /* =================================
     INVENTAR
  ================================= */

  const [
    inventory,
    setInventory,
  ] = useState({

    wood: 0,
    stone: 0,

  });


  /* =================================
     NACHRICHT
  ================================= */

  const [
    message,
    setMessage,
  ] = useState(
    'Erkunde die Welt!'
  );


  /* =================================
     RESSOURCEN

     Nur Modelle, die wirklich
     in deinem /models Ordner liegen.
  ================================= */

  const [
    resources,
    setResources,
  ] = useState([


    /* =============================
       STEIN
    ============================= */

    {
      id: 'stone-1',
      type: 'stone',
      x: 4,
      z: 4,
      size: 2.5,
      model: '/models/rocks.glb',
    },


    {
      id: 'stone-2',
      type: 'stone',
      x: -6,
      z: 5,
      size: 2.3,
      model: '/models/rocks.glb',
    },


    {
      id: 'stone-3',
      type: 'stone',
      x: 9,
      z: -3,
      size: 2.5,
      model: '/models/rocks.glb',
    },


    {
      id: 'stone-4',
      type: 'stone',
      x: -10,
      z: -4,
      size: 2.2,
      model: '/models/rocks.glb',
    },


    /* =============================
       HOLZ

       wood-structure.glb
       als sammelbare Holzressource
    ============================= */

    {
      id: 'wood-1',
      type: 'wood',
      x: -3,
      z: 2,
      size: 2.3,
      model:
        '/models/wood-structure.glb',
    },


    {
      id: 'wood-2',
      type: 'wood',
      x: 6,
      z: -5,
      size: 2.2,
      model:
        '/models/wood-structure.glb',
    },


    {
      id: 'wood-3',
      type: 'wood',
      x: 12,
      z: 6,
      size: 2.2,
      model:
        '/models/wood-structure.glb',
    },


  ]);


  /* =================================
     MOBILE STEUERUNG
  ================================= */

  const press = (
    direction,
    value
  ) => {

    setMove(
      (current) => ({

        ...current,

        [direction]:
          value,

      })
    );

  };


  const buttonEvents = (
    direction
  ) => ({

    onPointerDown:
      (event) => {

        event.preventDefault();

        press(
          direction,
          true
        );

      },


    onPointerUp:
      () => {

        press(
          direction,
          false
        );

      },


    onPointerCancel:
      () => {

        press(
          direction,
          false
        );

      },


    onPointerLeave:
      () => {

        press(
          direction,
          false
        );

      },

  });


  /* =================================
     NÄCHSTE RESSOURCE
  ================================= */

  const getNearestResource =
    () => {


      if (
        resources.length === 0
      ) {

        return null;

      }


      let nearest =
        null;


      let nearestDistance =
        Infinity;


      resources.forEach(
        (resource) => {

          const distance =
            Math.sqrt(

              Math.pow(
                playerPosition.x -
                resource.x,
                2
              )

              +

              Math.pow(
                playerPosition.z -
                resource.z,
                2
              )

            );


          if (
            distance <
            nearestDistance
          ) {

            nearest =
              resource;

            nearestDistance =
              distance;

          }

        }
      );


      return {

        resource:
          nearest,

        distance:
          nearestDistance,

      };

    };


  /* =================================
     ABBAUEN
  ================================= */

  const mineResource =
    () => {


      const result =
        getNearestResource();


      if (
        !result ||
        !result.resource
      ) {

        setMessage(
          'Keine Ressourcen mehr!'
        );

        return;

      }


      const resource =
        result.resource;


      /* ZU WEIT WEG */

      if (
        result.distance >
        3
      ) {

        setMessage(
          'Gehe näher an eine Ressource!'
        );

        return;

      }


      /* INVENTAR */

      setInventory(
        (current) => ({

          ...current,

          [resource.type]:

            current[
              resource.type
            ] + 1,

        })
      );


      /* RESSOURCE ENTFERNEN */

      setResources(
        (current) =>

          current.filter(
            (item) =>

              item.id !==
              resource.id
          )

      );


      /* NACHRICHT */

      if (
        resource.type ===
        'stone'
      ) {

        setMessage(
          '+1 Stein abgebaut!'
        );

      } else {

        setMessage(
          '+1 Holz gesammelt!'
        );

      }

    };


  /* =================================
     IST SPIELER NAH?
  ================================= */

  const nearestResult =
    getNearestResource();


  const nearResource =

    nearestResult &&

    nearestResult.distance <
    3;


  return (

    <main
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#243a2d',
        touchAction: 'none',
        fontFamily:
          'Arial, sans-serif',
      }}
    >


      {/* =================================
         3D SPIEL
      ================================= */}

      <Canvas

        shadows

        dpr={[1, 1.5]}

        camera={{
          position: [
            0,
            9,
            20,
          ],
          fov: 50,
          near: 0.1,
          far: 120,
        }}

        gl={{
          antialias: true,
          toneMapping:
            THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
        }}

      >

        <Suspense fallback={null}>

          <World

            move={move}

            playerPosition={
              playerPosition
            }

            setPlayerPosition={
              setPlayerPosition
            }

            resources={
              resources
            }

          />

        </Suspense>

      </Canvas>


      {/* =================================
         LOGO
      ================================= */}

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
          pointerEvents: 'none',
          color: 'white',
          textShadow:
            '0 3px 10px rgba(0,0,0,.8)',
        }}
      >

        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 4,
          }}
        >
          ASHFALL
        </div>


        <div
          style={{
            marginTop: 4,
            fontSize: 16,
            opacity: 0.8,
          }}
        >
          Version 0.6
        </div>

      </div>


      {/* =================================
         INVENTAR
      ================================= */}

      {started && (

        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 18,
            zIndex: 20,
            display: 'flex',
            gap: 8,
          }}
        >

          <div
            style={inventoryStyle}
          >
            🪵 {inventory.wood}
          </div>


          <div
            style={inventoryStyle}
          >
            🪨 {inventory.stone}
          </div>

        </div>

      )}


      {/* =================================
         NACHRICHT
      ================================= */}

      {started && (

        <div
          style={{
            position: 'absolute',
            top: 85,
            left: '50%',
            transform:
              'translateX(-50%)',
            zIndex: 20,
            background:
              'rgba(10,18,14,.82)',
            color: 'white',
            padding:
              '10px 16px',
            borderRadius: 14,
            border:
              '1px solid rgba(255,255,255,.15)',
            fontSize: 14,
            whiteSpace: 'nowrap',
          }}
        >

          {message}

        </div>

      )}


      {/* =================================
         STARTSCREEN
      ================================= */}

      {!started && (

        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'linear-gradient(135deg, rgba(8,13,10,.94), rgba(34,63,43,.9))',
            padding: 25,
          }}
        >

          <div
            style={{
              textAlign: 'center',
              color: 'white',
              maxWidth: 420,
            }}
          >

            <h1
              style={{
                margin: 0,
                fontSize: 48,
                letterSpacing: 5,
              }}
            >
              ASHFALL
            </h1>


            <div
              style={{
                marginTop: 8,
                opacity: 0.7,
              }}
            >
              Dein Abenteuer beginnt.
            </div>


            <p
              style={{
                margin:
                  '30px 0',
                lineHeight: 1.6,
                color: '#d7e5da',
              }}
            >

              Sammle Ressourcen,
              erkunde die Welt
              und baue deine eigene
              Siedlung auf.

            </p>


            <button

              onClick={() =>
                setStarted(true)
              }

              style={{
                padding:
                  '17px 32px',
                borderRadius: 14,
                border:
                  '1px solid rgba(255,255,255,.25)',
                background:
                  '#5f995d',
                color: 'white',
                fontSize: 17,
                fontWeight: 800,
              }}

            >

              SPIEL STARTEN

            </button>

          </div>

        </div>

      )}


      {/* =================================
         MOBILE STEUERUNG
      ================================= */}

      {started && (

        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 30,
            display: 'grid',
            gridTemplateColumns:
              '62px 62px 62px',
            gridTemplateRows:
              '62px 62px',
            gap: 7,
          }}
        >

          <div />


          <button
            {...buttonEvents('up')}
            style={controlStyle}
          >
            ▲
          </button>


          <div />


          <button
            {...buttonEvents('left')}
            style={controlStyle}
          >
            ◀
          </button>


          <button
            {...buttonEvents('down')}
            style={controlStyle}
          >
            ▼
          </button>


          <button
            {...buttonEvents('right')}
            style={controlStyle}
          >
            ▶
          </button>

        </div>

      )}


      {/* =================================
         ABBAUEN
      ================================= */}

      {started && (

        <button

          onClick={
            mineResource
          }

          style={{
            position: 'absolute',
            bottom: 28,
            right: 20,
            zIndex: 30,
            width: 130,
            height: 70,
            borderRadius: 18,

            border:

              nearResource
                ? '2px solid #ffd27d'
                : '1px solid rgba(255,255,255,.25)',

            background:

              nearResource
                ? '#a8702e'
                : 'rgba(15,24,18,.9)',

            color: 'white',
            fontWeight: 900,
            fontSize: 15,

            boxShadow:

              nearResource
                ? '0 0 25px rgba(255,180,70,.4)'
                : 'none',

          }}

        >

          ⛏

          <br />

          ABBAUEN

        </button>

      )}


    </main>

  );

}


/* =====================================================
   BUTTON STYLE
===================================================== */

const controlStyle = {

  width: 62,

  height: 62,

  borderRadius: 17,

  border:
    '1px solid rgba(255,255,255,.35)',

  background:
    'rgba(10,24,16,.9)',

  color:
    'white',

  fontSize:
    22,

  fontWeight:
    900,

  touchAction:
    'none',

  userSelect:
    'none',

};


/* =====================================================
   INVENTAR STYLE
===================================================== */

const inventoryStyle = {

  background:
    'rgba(10,18,14,.85)',

  color:
    'white',

  padding:
    '10px 13px',

  borderRadius:
    13,

  border:
    '1px solid rgba(255,255,255,.18)',

  fontSize:
    15,

  fontWeight:
    700,

};


/* =====================================================
   GLB VORLADEN
===================================================== */

useGLTF.preload(
  '/models/character-human.glb'
);

useGLTF.preload(
  '/models/rocks.glb'
);

useGLTF.preload(
  '/models/stones.glb'
);

useGLTF.preload(
  '/models/wood-structure.glb'
);

useGLTF.preload(
  '/models/gate.glb'
);

useGLTF.preload(
  '/models/chest.glb'
);

useGLTF.preload(
  '/models/barrel.glb'
);

useGLTF.preload(
  '/models/banner.glb'
);

useGLTF.preload(
  '/models/table.glb'
);

useGLTF.preload(
  '/models/chair.glb'
);
