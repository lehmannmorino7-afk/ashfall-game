'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';


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

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          child.material = child.material.clone();
          child.material.roughness = 0.8;
          child.material.metalness = 0;
        }
      }
    });

    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);

    const modelSize = new THREE.Vector3();

    box.getSize(modelSize);

    const largest =
      Math.max(
        modelSize.x,
        modelSize.y,
        modelSize.z
      ) || 1;

    const scale = size / largest;

    clone.scale.multiplyScalar(scale);

    clone.updateMatrixWorld(true);

    const newBox =
      new THREE.Box3().setFromObject(clone);

    const center =
      newBox.getCenter(
        new THREE.Vector3()
      );

    clone.position.x -= center.x;
    clone.position.z -= center.z;

    clone.position.y -= newBox.min.y;

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
  playerPosition,
  setPlayerPosition,
}) {
  const playerRef = useRef(null);

  const keys = useRef({});


  /* TASTATUR */

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


    /* BEWEGUNG */

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


      const speed = 4;


      playerRef.current.position.x +=
        direction.x *
        speed *
        delta;


      playerRef.current.position.z +=
        direction.z *
        speed *
        delta;


      /* WELTGRENZE */

      playerRef.current.position.x =
        THREE.MathUtils.clamp(
          playerRef.current.position.x,
          -18,
          18
        );


      playerRef.current.position.z =
        THREE.MathUtils.clamp(
          playerRef.current.position.z,
          -18,
          18
        );


      /* SPIELER DREHEN */

      playerRef.current.rotation.y =
        Math.atan2(
          direction.x,
          direction.z
        );
    }


    /* POSITION AN REACT */

    setPlayerPosition({
      x: playerRef.current.position.x,
      z: playerRef.current.position.z,
    });


    /* KAMERA FOLGT */

    const cameraPosition =
      new THREE.Vector3(
        playerRef.current.position.x,
        8,
        playerRef.current.position.z + 12
      );


    state.camera.position.lerp(
      cameraPosition,
      1 - Math.exp(-5 * delta)
    );


    state.camera.lookAt(
      playerRef.current.position.x,
      0.8,
      playerRef.current.position.z
    );
  });


  return (
    <group
      ref={playerRef}
      position={[
        playerPosition.x,
        0,
        playerPosition.z,
      ]}
    >

      {/* =================================
          SICHERER SICHTBARER CHARAKTER
      ================================= */}

      {/* KÖRPER */}

      <mesh
        position={[0, 0.9, 0]}
        castShadow
      >
        <capsuleGeometry
          args={[
            0.32,
            0.7,
            6,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#c98c55"
        />
      </mesh>


      {/* KOPF */}

      <mesh
        position={[0, 1.7, 0]}
        castShadow
      >
        <sphereGeometry
          args={[
            0.3,
            16,
            16,
          ]}
        />

        <meshStandardMaterial
          color="#e6b38a"
        />
      </mesh>


      {/* AUGENRICHTUNG */}

      <mesh
        position={[0, 1.72, -0.28]}
      >
        <sphereGeometry
          args={[
            0.08,
            10,
            10,
          ]}
        />

        <meshStandardMaterial
          color="#202020"
        />
      </mesh>


      {/* BEINE */}

      <mesh
        position={[-0.16, 0.3, 0]}
        castShadow
      >
        <boxGeometry
          args={[
            0.2,
            0.6,
            0.2,
          ]}
        />

        <meshStandardMaterial
          color="#2d3945"
        />
      </mesh>


      <mesh
        position={[0.16, 0.3, 0]}
        castShadow
      >
        <boxGeometry
          args={[
            0.2,
            0.6,
            0.2,
          ]}
        />

        <meshStandardMaterial
          color="#2d3945"
        />
      </mesh>


      {/* =================================
          GLB CHARAKTER ZUSÄTZLICH LADEN
      ================================= */}

      <Suspense fallback={null}>
        <group
          position={[0, 0, 0]}
        >
          <GLBModel
            url="/models/character-human.glb"
            size={1.8}
          />
        </group>
      </Suspense>

    </group>
  );
}


/* =====================================================
   RESSOURCE
===================================================== */

function Resource({
  resource,
  playerPosition,
  onMine,
}) {
  const distance = Math.sqrt(
    Math.pow(
      playerPosition.x -
        resource.x,
      2
    ) +
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
      />


      {/* LEUCHTENDER RING,
          WENN SPIELER NAH IST */}

      {isNear && (
        <mesh
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}
          position={[0, 0.03, 0]}
        >
          <ringGeometry
            args={[
              1.2,
              1.45,
              32,
            ]}
          />

          <meshBasicMaterial
            color={
              resource.type === 'stone'
                ? '#a8c7ff'
                : '#ffd38a'
            }
          />
        </mesh>
      )}

    </group>
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
  mineResource,
}) {
  return (
    <>


      {/* HIMMEL */}

      <color
        attach="background"
        args={['#7f9d91']}
      />


      <fog
        attach="fog"
        args={[
          '#7f9d91',
          28,
          70,
        ]}
      />


      <Sky
        sunPosition={[
          10,
          12,
          8,
        ]}
        turbidity={8}
        rayleigh={1.5}
      />


      {/* LICHT */}

      <ambientLight
        intensity={0.7}
      />


      <hemisphereLight
        args={[
          '#d7e7ff',
          '#28402c',
          0.7,
        ]}
      />


      <directionalLight
        position={[
          10,
          15,
          10,
        ]}
        intensity={1.4}
        castShadow
      />


      {/* =================================
          BODEN
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
          color="#3d654a"
          roughness={1}
        />
      </mesh>


      {/* =================================
          GLB BODEN
      ================================= */}

      <Suspense fallback={null}>
        <GLBModel
          url="/models/floor.glb"
          size={35}
        />
      </Suspense>


      {/* =================================
          DEKORATION
      ================================= */}

      <Suspense fallback={null}>

        <GLBModel
          url="/models/gate.glb"
          position={[8, 0, -8]}
          rotation={[
            0,
            Math.PI,
            0,
          ]}
          size={4}
        />


        <GLBModel
          url="/models/chest.glb"
          position={[-4, 0, -3]}
          rotation={[
            0,
            0.6,
            0,
          ]}
          size={1.7}
        />


        <GLBModel
          url="/models/barrel.glb"
          position={[-6, 0, -2]}
          size={1.3}
        />


        <GLBModel
          url="/models/banner.glb"
          position={[-9, 0, 4]}
          size={3.5}
        />


      </Suspense>


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
              onMine={mineResource}
            />
          </Suspense>
        )
      )}


      {/* =================================
          SPIELER
      ================================= */}

      <Player
        move={move}
        playerPosition={
          playerPosition
        }
        setPlayerPosition={
          setPlayerPosition
        }
      />

    </>
  );
}


/* =====================================================
   HAUPTSPIEL
===================================================== */

export default function Home() {


  const [
    started,
    setStarted
  ] = useState(false);


  /* =================================
     BEWEGUNG
  ================================= */

  const [
    move,
    setMove
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
    setPlayerPosition
  ] = useState({

    x: 0,
    z: 8,

  });


  /* =================================
     INVENTAR
  ================================= */

  const [
    inventory,
    setInventory
  ] = useState({

    wood: 0,
    stone: 0,

  });


  /* =================================
     NACHRICHT
  ================================= */

  const [
    message,
    setMessage
  ] = useState(
    'Erkunde die Welt!'
  );


  /* =================================
     RESSOURCEN
  ================================= */

  const [
    resources,
    setResources
  ] = useState([


    /* STEINE */

    {
      id: 'stone-1',
      type: 'stone',
      x: 5,
      z: 3,
      size: 2.5,
      model: '/models/rocks.glb',
    },


    {
      id: 'stone-2',
      type: 'stone',
      x: -7,
      z: 6,
      size: 2.2,
      model: '/models/rocks.glb',
    },


    {
      id: 'stone-3',
      type: 'stone',
      x: 9,
      z: -2,
      size: 2.6,
      model: '/models/rocks.glb',
    },


    {
      id: 'stone-4',
      type: 'stone',
      x: -10,
      z: -5,
      size: 2.4,
      model: '/models/rocks.glb',
    },


    /* HOLZ */

    {
      id: 'wood-1',
      type: 'wood',
      x: -3,
      z: 3,
      size: 2.7,
      model:
        '/models/wood-structure.glb',
    },


    {
      id: 'wood-2',
      type: 'wood',
      x: 4,
      z: -5,
      size: 2.5,
      model:
        '/models/wood-structure.glb',
    },


    {
      id: 'wood-3',
      type: 'wood',
      x: 11,
      z: 6,
      size: 2.5,
      model:
        '/models/wood-structure.glb',
    },


  ]);


  /* =================================
     MOBILE BUTTON
  ================================= */

  const press = (
    direction,
    value
  ) => {

    setMove((current) => ({

      ...current,

      [direction]: value,

    }));

  };


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


    onPointerUp: () => {

      press(
        direction,
        false
      );

    },


    onPointerCancel: () => {

      press(
        direction,
        false
      );

    },


    onPointerLeave: () => {

      press(
        direction,
        false
      );

    },


  });


  /* =================================
     NÄCHSTE RESSOURCE FINDEN
  ================================= */

  const getNearestResource = () => {

    if (resources.length === 0) {

      return null;

    }


    let nearest = null;

    let nearestDistance = 999;


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

          nearestDistance =
            distance;

          nearest =
            resource;

        }

      }
    );


    return {
      resource: nearest,
      distance: nearestDistance,
    };

  };


  /* =================================
     ABBAUEN
  ================================= */

  const mineResource = () => {

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


    const {
      resource,
      distance,
    } = result;


    /* ZU WEIT WEG */

    if (distance > 3) {

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
      resource.type === 'stone'
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
     AKTUELLE NÄHE
  ================================= */

  const nearestResult =
    getNearestResource();


  const nearResource =
    nearestResult &&
    nearestResult.distance < 3;


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
            8,
            20,
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
            1.1,

        }}

      >

        <Suspense
          fallback={null}
        >

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

            mineResource={
              mineResource
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

          Version 0.5

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

            top: 75,

            left: '50%',

            transform:
              'translateX(-50%)',

            zIndex: 20,

            background:
              'rgba(10,18,14,.8)',

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
              'linear-gradient(135deg, rgba(8,13,10,.92), rgba(34,63,43,.88))',

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


          {/* HOCH */}

          <button

            {...buttonEvents('up')}

            style={controlStyle}

          >

            ▲

          </button>


          <div />


          {/* LINKS */}

          <button

            {...buttonEvents('left')}

            style={controlStyle}

          >

            ◀

          </button>


          {/* RUNTER */}

          <button

            {...buttonEvents('down')}

            style={controlStyle}

          >

            ▼

          </button>


          {/* RECHTS */}

          <button

            {...buttonEvents('right')}

            style={controlStyle}

          >

            ▶

          </button>

        </div>

      )}


      {/* =================================
          ABBAUEN BUTTON
      ================================= */}

      {started && (

        <button

          onClick={mineResource}

          style={{

            position: 'absolute',

            bottom: 28,

            right: 20,

            zIndex: 30,

            width: 120,

            height: 65,

            borderRadius: 18,

            border:

              nearResource
                ? '2px solid #ffd27d'
                : '1px solid rgba(255,255,255,.25)',

            background:

              nearResource
                ? '#a8702e'
                : 'rgba(15,24,18,.88)',

            color: 'white',

            fontWeight: 900,

            fontSize: 15,

            boxShadow:

              nearResource
                ? '0 0 20px rgba(255,180,70,.35)'
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
   STYLES
===================================================== */

const controlStyle = {

  width: 62,

  height: 62,

  borderRadius: 17,

  border:
    '1px solid rgba(255,255,255,.35)',

  background:
    'rgba(10,24,16,.88)',

  color: 'white',

  fontSize: 22,

  fontWeight: 900,

  touchAction: 'none',

  userSelect: 'none',

};


const inventoryStyle = {

  background:
    'rgba(10,18,14,.82)',

  color: 'white',

  padding:
    '10px 13px',

  borderRadius: 13,

  border:
    '1px solid rgba(255,255,255,.18)',

  fontSize: 15,

  fontWeight: 700,

};


/* =====================================================
   MODELLE VORLADEN
===================================================== */

useGLTF.preload(
  '/models/character-human.glb'
);

useGLTF.preload(
  '/models/rocks.glb'
);

useGLTF.preload(
  '/models/floor.glb'
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
  '/models/wood-structure.glb'
);
