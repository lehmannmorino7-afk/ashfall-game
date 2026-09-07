'use client';

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Sky,
  useGLTF
} from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";


/* =========================================================
   3D SPIELER
========================================================= */

function Player({ move }) {
  const ref = useRef();

  const playerModel = useGLTF("/models/character-human.glb");
  const swordModel = useGLTF("/models/weapon-sword.glb");

  const keys = useRef({});

  useEffect(() => {

    const down = (e) => {
      keys.current[e.code] = true;
    };

    const up = (e) => {
      keys.current[e.code] = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };

  }, []);


  useFrame((state, delta) => {

    if (!ref.current) return;


    /* =========================
       STEUERUNG
    ========================= */

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

      const direction = new THREE.Vector3(
        inputX,
        0,
        inputZ
      );

      direction.normalize();


      /*
        Bewegung relativ zur Kamera
      */

      const cameraDirection =
        new THREE.Vector3();

      state.camera.getWorldDirection(
        cameraDirection
      );

      cameraDirection.y = 0;

      cameraDirection.normalize();


      const cameraRight =
        new THREE.Vector3()
          .crossVectors(
            cameraDirection,
            new THREE.Vector3(0, 1, 0)
          )
          .normalize();


      const movement =
        new THREE.Vector3();

      movement.addScaledVector(
        cameraRight,
        inputX
      );

      movement.addScaledVector(
        cameraDirection,
        -inputZ
      );


      movement.normalize();


      ref.current.position.addScaledVector(
        movement,
        4.5 * delta
      );


      /* Spielfeld Grenzen */

      ref.current.position.x =
        THREE.MathUtils.clamp(
          ref.current.position.x,
          -18,
          18
        );

      ref.current.position.z =
        THREE.MathUtils.clamp(
          ref.current.position.z,
          -18,
          18
        );


      /* Charakter dreht sich */

      const targetRotation =
        Math.atan2(
          movement.x,
          movement.z
        );

      ref.current.rotation.y =
        THREE.MathUtils.lerp(
          ref.current.rotation.y,
          targetRotation,
          0.15
        );

    }


    /* =========================
       KAMERA FOLGT SPIELER
    ========================= */

    const targetCamera =
      new THREE.Vector3(
        ref.current.position.x,
        ref.current.position.y + 5,
        ref.current.position.z + 8
      );


    state.camera.position.lerp(
      targetCamera,
      0.06
    );


    state.camera.lookAt(
      ref.current.position.x,
      ref.current.position.y + 1.5,
      ref.current.position.z
    );

  });


  return (

    <group
      ref={ref}
      position={[0, 0, 9]}
    >

      {/* =====================
          ECHTER SPIELER
      ====================== */}

      <primitive
        object={playerModel.scene.clone()}
        scale={1}
        position={[0, 0, 0]}
      />


      {/* =====================
          ECHTES SCHWERT
      ====================== */}

      <group
        position={[0.45, 1.1, 0]}
        rotation={[
          0,
          Math.PI / 2,
          0
        ]}
      >

        <primitive
          object={swordModel.scene.clone()}
          scale={1}
        />

      </group>


      {/* Schatten */}

      <pointLight
        intensity={0.15}
        distance={3}
      />

    </group>

  );

}


/* =========================================================
   ORC GEGNER
========================================================= */

function Orc({ position }) {

  const orcModel =
    useGLTF(
      "/models/character-orc.glb"
    );


  const ref = useRef();


  useFrame((state) => {

    if (!ref.current) return;


    /*
      Leichte Bewegung
      damit der Gegner lebendiger wirkt
    */

    ref.current.rotation.y =
      Math.sin(
        state.clock.elapsedTime * 0.5
      ) * 0.2;

  });


  return (

    <group
      ref={ref}
      position={position}
    >

      <primitive
        object={orcModel.scene.clone()}
        scale={1}
      />

    </group>

  );

}


/* =========================================================
   BÄUME
========================================================= */

function Tree({
  position,
  onCollect
}) {

  const [collected, setCollected] =
    useState(false);


  if (collected) return null;


  return (

    <group
      position={position}

      onClick={(event) => {

        event.stopPropagation();

        setCollected(true);

        onCollect(
          "wood",
          2
        );

      }}

    >

      <mesh
        position={[0, 1.7, 0]}
        castShadow
      >

        <cylinderGeometry
          args={[
            0.22,
            0.38,
            3.4,
            10
          ]}
        />

        <meshStandardMaterial
          color="#4b3426"
          roughness={1}
        />

      </mesh>


      <mesh
        position={[0, 3.7, 0]}
        castShadow
      >

        <coneGeometry
          args={[
            1.6,
            3.8,
            12
          ]}
        />

        <meshStandardMaterial
          color="#243b27"
          roughness={0.95}
        />

      </mesh>


      <mesh
        position={[
          0.35,
          4.7,
          0.1
        ]}
        castShadow
      >

        <coneGeometry
          args={[
            1.25,
            2.8,
            12
          ]}
        />

        <meshStandardMaterial
          color="#2c4a30"
          roughness={0.95}
        />

      </mesh>

    </group>

  );

}


/* =========================================================
   FELSEN
========================================================= */

function Rock({
  position,
  onCollect
}) {

  const [collected, setCollected] =
    useState(false);


  if (collected) return null;


  return (

    <mesh

      position={position}

      castShadow

      onClick={(event) => {

        event.stopPropagation();

        setCollected(true);

        onCollect(
          "stone",
          2
        );

      }}

    >

      <dodecahedronGeometry
        args={[
          0.85,
          1
        ]}
      />

      <meshStandardMaterial
        color="#565b56"
        roughness={1}
      />

    </mesh>

  );

}


/* =========================================================
   SPIELWELT
========================================================= */

function World({
  onCollect,
  move
}) {


  const trees = useMemo(
    () => [

      [-8, -9],
      [-5, -5],
      [5, -8],
      [9, -3],
      [-10, 3],
      [-6, 7],
      [7, 7],
      [3, 10]

    ],
    []
  );


  const rocks = useMemo(
    () => [

      [-3, -1],
      [4, -2],
      [8, 4],
      [-8, -4],
      [1, 3]

    ],
    []
  );


  return (

    <>

      {/* Hintergrund */}

      <color
        attach="background"
        args={["#6d786f"]}
      />


      <fog
        attach="fog"
        args={[
          "#6d786f",
          18,
          55
        ]}
      />


      <Sky
        sunPosition={[
          8,
          12,
          4
        ]}
        turbidity={7}
        rayleigh={1.1}
      />


      {/* LICHT */}

      <ambientLight
        intensity={0.7}
      />


      <directionalLight

        position={[
          8,
          14,
          6
        ]}

        intensity={2}

        castShadow

        shadow-mapSize-width={2048}

        shadow-mapSize-height={2048}

      />


      {/* =====================
          BODEN
      ====================== */}

      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          0
        ]}
        receiveShadow
      >

        <planeGeometry
          args={[
            100,
            100
          ]}
        />

        <meshStandardMaterial
          color="#3d4a38"
          roughness={1}
        />

      </mesh>


      {/* =====================
          STARTBEREICH
      ====================== */}

      <mesh
        position={[
          0,
          0.08,
          0
        ]}
        receiveShadow
      >

        <boxGeometry
          args={[
            6,
            0.16,
            5
          ]}
        />

        <meshStandardMaterial
          color="#625642"
        />

      </mesh>


      {/* BÄUME */}

      {trees.map(
        ([x, z], index) => (

          <Tree

            key={index}

            position={[
              x,
              0,
              z
            ]}

            onCollect={
              onCollect
            }

          />

        )
      )}


      {/* FELSEN */}

      {rocks.map(
        ([x, z], index) => (

          <Rock

            key={index}

            position={[
              x,
              0.82,
              z
            ]}

            onCollect={
              onCollect
            }

          />

        )
      )}


      {/* =====================
          SPIELER
      ====================== */}

      <Player
        move={move}
      />


      {/* =====================
          ERSTER ORC
      ====================== */}

      <Orc
        position={[
          0,
          0,
          -5
        ]}
      />


      <Environment
        preset="forest"
      />

    </>

  );

}


/* =========================================================
   HAUPTSPIEL
========================================================= */

export default function Home() {


  const [
    resources,
    setResources
  ] = useState({

    wood: 0,

    stone: 0

  });


  const [
    started,
    setStarted
  ] = useState(false);


  const [
    status,
    setStatus
  ] = useState(
    "Erkunde das Gebiet."
  );


  const [
    move,
    setMove
  ] = useState({

    up: false,

    down: false,

    left: false,

    right: false

  });


  /* Ressourcen */

  const collect = (
    type,
    amount
  ) => {

    setResources(
      (current) => ({

        ...current,

        [type]:
          current[type] + amount

      })
    );


    setStatus(

      type === "wood"

        ? `+${amount} Holz gesammelt`

        : `+${amount} Stein gesammelt`

    );

  };


  /* Touch Steuerung */

  const press = (
    key,
    value
  ) => {

    setMove(
      (current) => ({

        ...current,

        [key]: value

      })
    );

  };


  return (

    <main>


      {/* =====================
          STARTMENÜ
      ====================== */}

      {!started && (

        <section
          className="startScreen"
        >

          <div
            className="panel"
          >

            <div
              className="eyebrow"
            >
              ASHFALL
            </div>


            <h1>
              Version 0.2
            </h1>


            <p>

              Erkunde die Welt
              mit deinem echten
              3D-Charakter.

            </p>


            <button
              onClick={() =>
                setStarted(true)
              }
            >

              Spiel starten

            </button>

          </div>

        </section>

      )}


      {/* =====================
          HUD
      ====================== */}

      <div
        className="hud"
      >

        <div
          className="brand"
        >

          ASHFALL

          <span>
            0.2
          </span>

        </div>


        <div
          className="inventory"
        >

          <div>

            <small>
              HOLZ
            </small>

            <strong>
              {resources.wood}
            </strong>

          </div>


          <div>

            <small>
              STEIN
            </small>

            <strong>
              {resources.stone}
            </strong>

          </div>

        </div>


        <div
          className="status"
        >

          {status}

        </div>

      </div>


      {/* =====================
          3D SPIEL
      ====================== */}

      <Canvas

        shadows

        camera={{

          position: [
            0,
            5,
            16
          ],

          fov: 55

        }}

      >

        <World

          onCollect={
            collect
          }

          move={
            move
          }

        />

      </Canvas>


      {/* =====================
          MOBILE STEUERUNG
      ====================== */}

      <div
        className="mobileControls"
      >

        <div
          className="pad"
        >


          <button

            className="up"

            onPointerDown={() =>
              press("up", true)
            }

            onPointerUp={() =>
              press("up", false)
            }

            onPointerCancel={() =>
              press("up", false)
            }

          >

            ▲

          </button>


          <button

            className="left"

            onPointerDown={() =>
              press("left", true)
            }

            onPointerUp={() =>
              press("left", false)
            }

            onPointerCancel={() =>
              press("left", false)
            }

          >

            ◀

          </button>


          <button

            className="right"

            onPointerDown={() =>
              press("right", true)
            }

            onPointerUp={() =>
              press("right", false)
            }

            onPointerCancel={() =>
              press("right", false)
            }

          >

            ▶

          </button>


          <button

            className="down"

            onPointerDown={() =>
              press("down", true)
            }

            onPointerUp={() =>
              press("down", false)
            }

            onPointerCancel={() =>
              press("down", false)
            }

          >

            ▼

          </button>


        </div>

      </div>


    </main>

  );

}


/* =========================================================
   GLB VORLADEN
========================================================= */

useGLTF.preload(
  "/models/character-human.glb"
);

useGLTF.preload(
  "/models/weapon-sword.glb"
);

useGLTF.preload(
  "/models/character-orc.glb"
);
