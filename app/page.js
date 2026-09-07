'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';


/* =====================================================
   ASHFALL
   VERSION 0.7

   SAUBERE BASIS:
   - Echter GLB Charakter
   - GLB Modelle
   - Farben
   - Mobile Steuerung
   - Ressourcen
   - Abbauen
===================================================== */



/* =====================================================
   GLB MODELL
===================================================== */

function GLBModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 1,
  tint = null,
}) {

  const { scene } = useGLTF(url);


  const model = useMemo(() => {

    /*
      WICHTIG:

      SkeletonUtils.clone statt scene.clone.

      Das ist besonders wichtig bei
      character-human.glb.

      Normales clone(true) kann bei
      SkinnedMesh / Skeleton Modellen
      Probleme verursachen.
    */

    const clone = skeletonClone(scene);


    clone.traverse((child) => {

      if (!child.isMesh) return;


      child.castShadow = true;
      child.receiveShadow = true;


      /*
        MATERIALIEN KLONEN

        Dadurch verändern wir nicht das
        Originalmodell.
      */

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];


      const newMaterials = materials.map(
        (material) => {

          if (!material) return material;


          const newMaterial =
            material.clone();


          /*
            FARBE NUR ANPASSEN,
            WENN EIN TINT ANGEGEBEN IST.

            Vorhandene Texturen bleiben
            erhalten.
          */

          if (
            tint &&
            newMaterial.color
          ) {

            newMaterial.color.multiply(
              new THREE.Color(tint)
            );

          }


          newMaterial.needsUpdate = true;


          return newMaterial;

        }
      );


      child.material =
        Array.isArray(child.material)
          ? newMaterials
          : newMaterials[0];

    });


    clone.updateMatrixWorld(true);


    /*
      GRÖSSE DES MODELLS BERECHNEN
    */

    const box =
      new THREE.Box3()
        .setFromObject(clone);


    const dimensions =
      new THREE.Vector3();


    box.getSize(dimensions);


    const largestDimension =
      Math.max(
        dimensions.x,
        dimensions.y,
        dimensions.z
      ) || 1;


    /*
      SKALIERUNG

      Jedes Modell bekommt eine
      kontrollierte Größe.
    */

    const scale =
      size / largestDimension;


    clone.scale.setScalar(scale);


    clone.updateMatrixWorld(true);


    /*
      NEUE BOX NACH SKALIERUNG
    */

    const scaledBox =
      new THREE.Box3()
        .setFromObject(clone);


    const center =
      scaledBox.getCenter(
        new THREE.Vector3()
      );


    /*
      HORIZONTAL ZENTRIEREN
    */

    clone.position.x -= center.x;
    clone.position.z -= center.z;


    /*
      AUF DEN BODEN SETZEN
    */

    clone.position.y -=
      scaledBox.min.y;


    clone.updateMatrixWorld(true);


    return clone;


  }, [
    scene,
    size,
    tint,
  ]);


  return (

    <group
      position={position}
      rotation={rotation}
    >

      <primitive
        object={model}
      />

    </group>

  );

}



/* =====================================================
   SPIELER
===================================================== */

function Player({
  move,
  onPositionChange,
}) {

  const playerRef =
    useRef(null);


  const keys =
    useRef({});


  const lastUpdate =
    useRef(0);



  /* =================================
     TASTATUR
  ================================= */

  useEffect(() => {


    const keyDown = (event) => {

      keys.current[event.code] =
        true;

    };


    const keyUp = (event) => {

      keys.current[event.code] =
        false;

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
     SPIEL UPDATE
  ================================= */

  useFrame((state, delta) => {


    if (!playerRef.current) return;


    let moveX = 0;
    let moveZ = 0;



    /* KEYBOARD */

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
       BEWEGUNG
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
        );


      direction.normalize();



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
          -20,
          20
        );


      playerRef.current.position.z =
        THREE.MathUtils.clamp(
          playerRef.current.position.z,
          -20,
          20
        );



      /* =================================
         CHARAKTER DREHEN
      ================================= */

      const targetRotation =
        Math.atan2(
          direction.x,
          direction.z
        );


      playerRef.current.rotation.y =
        THREE.MathUtils.lerp(
          playerRef.current.rotation.y,
          targetRotation,
          delta * 10
        );

    }



    /* =================================
       POSITION AN REACT SENDEN

       Nicht 60x pro Sekunde!
    ================================= */

    const now =
      performance.now();


    if (
      now -
      lastUpdate.current >
      100
    ) {


      onPositionChange({

        x:
          playerRef.current.position.x,

        z:
          playerRef.current.position.z,

      });


      lastUpdate.current =
        now;

    }



    /* =================================
       KAMERA

       Isometrische Perspektive
    ================================= */

    const cameraTarget =
      new THREE.Vector3(

        playerRef.current.position.x,

        10,

        playerRef.current.position.z + 11

      );


    state.camera.position.lerp(
      cameraTarget,
      1 - Math.exp(-5 * delta)
    );


    state.camera.lookAt(

      playerRef.current.position.x,

      1.2,

      playerRef.current.position.z

    );


  });



  return (

    <group
      ref={playerRef}
      position={[0, 0, 8]}
    >


      {/* =================================
         ECHTER SPIELER

         character-human.glb
      ================================= */}

      <GLBModel

        url="/models/character-human.glb"

        size={2.4}

        /*
          Leichter warmer Farbton.

          Dadurch wird ein komplett
          weißes Material nicht mehr
          grell weiß.

          Texturen bleiben erhalten.
        */

        tint="#d8b28a"

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


  const distance = Math.sqrt(

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


      {/* =================================
         RESSOURCEN GLB
      ================================= */}

      <GLBModel

        url={resource.model}

        size={resource.size}

        rotation={
          resource.rotation || [
            0,
            0,
            0,
          ]
        }

        tint={resource.tint}

      />



      {/* =================================
         MARKIERUNG

         Nur wenn Spieler nah ist.
      ================================= */}

      {isNear && (

        <mesh
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}

          position={[
            0,
            0.03,
            0,
          ]}
        >


          <ringGeometry
            args={[
              1.1,
              1.45,
              32,
            ]}
          />


          <meshBasicMaterial

            color={
              resource.type === 'wood'
                ? '#d99545'
                : '#91a9c8'
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

    <Suspense
      fallback={null}
    >


      {/* =================================
         TOR
      ================================= */}

      <GLBModel

        url="/models/gate.glb"

        position={[
          0,
          0,
          -17,
        ]}

        rotation={[
          0,
          Math.PI,
          0,
        ]}

        size={5}

        tint="#8a6346"

      />



      {/* =================================
         TRUHE
      ================================= */}

      <GLBModel

        url="/models/chest.glb"

        position={[
          -7,
          0,
          -5,
        ]}

        rotation={[
          0,
          0.5,
          0,
        ]}

        size={1.8}

        tint="#a56a35"

      />



      {/* =================================
         FÄSSER
      ================================= */}

      <GLBModel

        url="/models/barrel.glb"

        position={[
          -9,
          0,
          -5,
        ]}

        size={1.5}

        tint="#8c5a36"

      />



      <GLBModel

        url="/models/barrel.glb"

        position={[
          -8,
          0,
          -6,
        ]}

        rotation={[
          0,
          0.4,
          0,
        ]}

        size={1.2}

        tint="#8c5a36"

      />



      {/* =================================
         BANNER
      ================================= */}

      <GLBModel

        url="/models/banner.glb"

        position={[
          10,
          0,
          -10,
        ]}

        rotation={[
          0,
          -0.4,
          0,
        ]}

        size={3}

        tint="#9b4b3e"

      />



      {/* =================================
         TISCH
      ================================= */}

      <GLBModel

        url="/models/table.glb"

        position={[
          8,
          0,
          8,
        ]}

        rotation={[
          0,
          -0.8,
          0,
        ]}

        size={2.8}

        tint="#765238"

      />



      {/* =================================
         STUHL
      ================================= */}

      <GLBModel

        url="/models/chair.glb"

        position={[
          6.5,
          0,
          8,
        ]}

        rotation={[
          0,
          1,
          0,
        ]}

        size={1.4}

        tint="#765238"

      />



      {/* =================================
         STEIN DEKORATION
      ================================= */}

      <GLBModel

        url="/models/stones.glb"

        position={[
          14,
          0,
          9,
        ]}

        size={3}

        tint="#596168"

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
        args={['#6f8c80']}
      />


      <fog

        attach="fog"

        args={[
          '#6f8c80',
          30,
          70,
        ]}

      />


      <Sky

        sunPosition={[
          10,
          20,
          5,
        ]}

        turbidity={8}

        rayleigh={1.5}

        mieCoefficient={0.004}

      />




      {/* =================================
         LICHT

         Nicht mehr extrem hell.

         Das war teilweise ein Grund,
         warum Modelle weiß wirkten.
      ================================= */}

      <ambientLight
        intensity={0.45}
      />


      <hemisphereLight

        args={[
          '#b9d4e0',
          '#29442f',
          1
        ]}

      />


      <directionalLight

        position={[
          10,
          20,
          10,
        ]}

        intensity={1.4}

        castShadow

        shadow-mapSize-width={2048}

        shadow-mapSize-height={2048}

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
            50,
            50,
          ]}
        />


        <meshStandardMaterial

          color="#355b42"

          roughness={0.95}

        />


      </mesh>




      {/* =================================
         ZENTRALER BODEN

         Etwas heller.
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
            17,
            64,
          ]}
        />


        <meshStandardMaterial

          color="#426d50"

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

      <Suspense
        fallback={null}
      >

        <Player

          move={move}

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
     SPIEL GESTARTET
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
  ================================= */

  const [
    resources,
    setResources,
  ] = useState([



    /* =============================
       STEINE
    ============================= */

    {

      id: 'stone-1',

      type: 'stone',

      x: 5,

      z: 5,

      size: 2.4,

      model:
        '/models/rocks.glb',

      tint:
        '#697078',

    },


    {

      id: 'stone-2',

      type: 'stone',

      x: -6,

      z: 3,

      size: 2.2,

      model:
        '/models/rocks.glb',

      tint:
        '#697078',

    },


    {

      id: 'stone-3',

      type: 'stone',

      x: 10,

      z: -3,

      size: 2.5,

      model:
        '/models/rocks.glb',

      tint:
        '#697078',

    },




    /* =============================
       HOLZ
    ============================= */

    {

      id: 'wood-1',

      type: 'wood',

      x: -3,

      z: 1,

      size: 2.5,

      model:
        '/models/wood-structure.glb',

      tint:
        '#8a5b35',

    },


    {

      id: 'wood-2',

      type: 'wood',

      x: 7,

      z: -6,

      size: 2.4,

      model:
        '/models/wood-structure.glb',

      tint:
        '#8a5b35',

    },


    {

      id: 'wood-3',

      type: 'wood',

      x: -11,

      z: -5,

      size: 2.3,

      model:
        '/models/wood-structure.glb',

      tint:
        '#8a5b35',

    },


  ]);




  /* =================================
     BEWEGUNG ÄNDERN
  ================================= */

  const press =
    (direction, value) => {


      setMove(
        (current) => ({

          ...current,

          [direction]:
            value,

        })
      );


    };




  /* =================================
     MOBILE BUTTON EVENTS
  ================================= */

  const buttonEvents =
    (direction) => ({

      onPointerDown:
        (event) => {

          event.preventDefault();

          event.currentTarget
            .setPointerCapture(
              event.pointerId
            );

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


      let nearest = null;

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


      /* =============================
         ZU WEIT WEG
      ============================= */

      if (
        result.distance > 3
      ) {


        setMessage(
          'Gehe näher an eine Ressource!'
        );


        return;

      }


      const resource =
        result.resource;




      /* =============================
         INVENTAR ERHÖHEN
      ============================= */

      setInventory(
        (current) => ({

          ...current,

          [resource.type]:

            current[
              resource.type
            ] + 1,

        })
      );




      /* =============================
         RESSOURCE ENTFERNEN
      ============================= */

      setResources(
        (current) =>

          current.filter(
            (item) =>

              item.id !==
              resource.id
          )

      );




      /* =============================
         NACHRICHT
      ============================= */

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
     PRÜFEN OB RESSOURCE NAH
  ================================= */

  const nearestResult =
    getNearestResource();


  const nearResource =

    nearestResult &&

    nearestResult.distance <
    3;




  /* =================================================
     UI
  ================================================= */

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
         3D CANVAS
      ================================= */}

      <Canvas

        shadows

        dpr={[
          1,
          1.5,
        ]}


        camera={{

          position: [
            0,
            10,
            19,
          ],

          fov: 48,

          near: 0.1,

          far: 100,

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

          position:
            'absolute',

          top: 20,

          left: 20,

          zIndex: 10,

          pointerEvents:
            'none',

          color:
            'white',

          textShadow:
            '0 3px 10px rgba(0,0,0,.8)',

        }}

      >


        <div

          style={{

            fontSize: 30,

            fontWeight: 900,

            letterSpacing: 5,

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

          Version 0.7

        </div>


      </div>





      {/* =================================
         INVENTAR
      ================================= */}

      {started && (

        <div

          style={{

            position:
              'absolute',

            top: 20,

            right: 15,

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

            position:
              'absolute',

            top: 85,

            left: '50%',

            transform:
              'translateX(-50%)',

            zIndex: 20,

            background:
              'rgba(8,15,11,.88)',

            color:
              'white',

            padding:
              '10px 18px',

            borderRadius: 14,

            border:
              '1px solid rgba(255,255,255,.15)',

            fontSize: 14,

            whiteSpace:
              'nowrap',

          }}

        >

          {message}

        </div>

      )}





      {/* =================================
         START BILDSCHIRM
      ================================= */}

      {!started && (

        <div

          style={{

            position:
              'absolute',

            inset: 0,

            zIndex: 50,

            display: 'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            background:
              'linear-gradient(135deg, rgba(8,13,10,.95), rgba(34,63,43,.92))',

            padding: 25,

          }}

        >


          <div

            style={{

              textAlign:
                'center',

              color:
                'white',

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



            <p

              style={{

                margin:
                  '20px 0 30px',

                lineHeight: 1.6,

                color:
                  '#d7e5da',

              }}

            >

              Erkunde eine gefährliche Welt,
              sammle Ressourcen und baue
              deine eigene Siedlung.

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
                  '#567f58',

                color:
                  'white',

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

            position:
              'absolute',

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
         ABBAUEN BUTTON
      ================================= */}

      {started && (

        <button

          onClick={
            mineResource
          }


          style={{

            position:
              'absolute',

            bottom: 28,

            right: 20,

            zIndex: 30,

            width: 145,

            height: 72,

            borderRadius: 18,


            border:

              nearResource
                ? '2px solid #f1b766'
                : '1px solid rgba(255,255,255,.25)',


            background:

              nearResource
                ? '#9a642c'
                : 'rgba(10,20,14,.92)',


            color:
              'white',

            fontWeight: 900,

            fontSize: 16,


            boxShadow:

              nearResource
                ? '0 0 25px rgba(255,180,70,.35)'
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
   STEUERUNG STYLE
===================================================== */

const controlStyle = {

  width: 62,

  height: 62,

  borderRadius: 17,

  border:
    '1px solid rgba(255,255,255,.35)',

  background:
    'rgba(10,24,16,.92)',

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
    'rgba(10,18,14,.88)',

  color:
    'white',

  padding:
    '11px 14px',

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
   MODELLE VORLADEN
===================================================== */

useGLTF.preload(
  '/models/character-human.glb'
);


useGLTF.preload(
  '/models/rocks.glb'
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


useGLTF.preload(
  '/models/stones.glb'
);
