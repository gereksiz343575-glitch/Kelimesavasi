import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  player1Avatar: 'male' | 'female';
  player2Avatar: 'male' | 'female' | null;
}

function Avatar({ gender, position, isPlayer1, rotationY }: { gender: 'male' | 'female'; position: [number, number, number], isPlayer1: boolean, rotationY: number }) {
  const group = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const lLeg = useRef<THREE.Group>(null);
  const rLeg = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!group.current || !torso.current) return;
    const t = state.clock.getElapsedTime();
    const offset = isPlayer1 ? 0 : Math.PI;

    // Gentle breathing and slight swaying
    const bounce = Math.abs(Math.sin(t * 1.5 + offset));
    torso.current.position.y = 1.0 + bounce * 0.03;
    torso.current.rotation.z = Math.sin(t * 0.5 + offset) * 0.01;
    torso.current.rotation.y = Math.sin(t * 0.5 + offset) * 0.02;
    
    // Head logic
    if(head.current) {
        head.current.rotation.y = Math.sin(t * 0.5 + offset) * 0.05;
        head.current.rotation.x = Math.sin(t * 1 + offset) * 0.02;
    }

    // Gentle Arms
    if(lArm.current) {
        lArm.current.rotation.x = Math.sin(t * 1.5 + offset) * 0.05;
        lArm.current.rotation.z = Math.abs(Math.sin(t * 0.75 + offset)) * 0.05 + 0.1;
    }
    if(rArm.current) {
        rArm.current.rotation.x = Math.sin(t * 1.5 + offset + Math.PI) * 0.05;
        rArm.current.rotation.z = -Math.abs(Math.sin(t * 0.75 + offset + Math.PI)) * 0.05 - 0.1;
    }

    // Legs
    if(lLeg.current) {
        lLeg.current.rotation.x = Math.sin(t * 1.5 + offset) * 0.02;
    }
    if(rLeg.current) {
        rLeg.current.rotation.x = Math.sin(t * 1.5 + offset + Math.PI) * 0.02;
    }

    // Mouth animation for speaking effect (random scale)
    if(mouth.current) {
      const isSpeaking = Math.sin(t * 10 + offset * 5) > 0.5 && Math.sin(t * 2 + offset) > 0;
      mouth.current.scale.y = isSpeaking ? 1.0 + Math.random() * 2 : 1.0;
      mouth.current.scale.x = isSpeaking ? 1.0 + Math.random() * 0.5 : 1.0;
    }
  });

  const skinColor = gender === 'male' ? "#fcd4a6" : "#fcd4a6";
  const shirtColor = gender === 'male' ? "#3b82f6" : "#ec4899";
  const pantColor = gender === 'male' ? "#1e3a8a" : "#831843";
  const hairColor = gender === 'male' ? "#27272a" : "#ca8a04";
  const roughness = 0.3;
  const metalness = 0.1;

  // Use higher quality segments
  const capGeomArgs: [number, number, number, number] = [0.15, 0.5, 16, 32];
  const legGeomArgs: [number, number, number, number] = [0.16, 0.6, 16, 32];
  const bodyGeomArgs: [number, number, number, number] = gender === 'female' ? [0.25, 0.55, 16, 32] : [0.3, 0.6, 16, 32];

  return (
    <group ref={group} position={position} rotation-y={rotationY} scale={[1.15, 1.15, 1.15]}>
        {/* Torso & Upper Body (All move together) */}
        <group ref={torso} position={[0, 1.0, 0]}>
            <mesh castShadow receiveShadow position={[0, 0, 0]}>
                <capsuleGeometry args={bodyGeomArgs} />
                <meshStandardMaterial color={shirtColor} roughness={0.6} metalness={metalness} />
            </mesh>

            {/* Head */}
            <group ref={head} position={[0, 0.65, 0]}>
                 <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
                     <sphereGeometry args={[0.28, 32, 32]} />
                     <meshStandardMaterial color={skinColor} roughness={roughness} metalness={metalness} />
                 </mesh>
                 
                 {/* Hair */}
                 <mesh castShadow receiveShadow position={[0, 0.38, -0.05]}>
                     <sphereGeometry args={gender === 'female' ? [0.32, 32, 32] : [0.3, 32, 32]} />
                     <meshStandardMaterial color={hairColor} roughness={0.8} />
                 </mesh>
                 {gender === 'female' && (
                     <mesh castShadow receiveShadow position={[0, 0.1, -0.25]}>
                         <capsuleGeometry args={[0.15, 0.4, 16, 32]} />
                         <meshStandardMaterial color={hairColor} roughness={0.8} />
                     </mesh>
                 )}

                 {/* Eyes */}
                 <mesh position={[-0.1, 0.22, 0.24]}>
                     <sphereGeometry args={[0.035, 16, 16]} />
                     <meshBasicMaterial color="#18181b" />
                 </mesh>
                 <mesh position={[0.1, 0.22, 0.24]}>
                     <sphereGeometry args={[0.035, 16, 16]} />
                     <meshBasicMaterial color="#18181b" />
                 </mesh>

                 {/* Mouth */}
                 <mesh ref={mouth} position={[0, 0.08, 0.27]} rotation-x={0.1}>
                     <boxGeometry args={[0.06, 0.015, 0.02]} />
                     <meshBasicMaterial color="#7f1d1d" />
                 </mesh>
                 {/* Blush */}
                 <mesh position={[-0.15, 0.15, 0.25]}>
                     <sphereGeometry args={[0.04, 16, 16]} />
                     <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
                 </mesh>
                 <mesh position={[0.15, 0.15, 0.25]}>
                     <sphereGeometry args={[0.04, 16, 16]} />
                     <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
                 </mesh>
            </group>

            {/* Left Arm Joint */}
            <group ref={lArm} position={[gender === 'female' ? -0.4 : -0.45, 0.35, 0]}>
                <mesh castShadow receiveShadow position={[0, -0.3, 0]}>
                    <capsuleGeometry args={capGeomArgs} />
                    <meshStandardMaterial color={skinColor} roughness={roughness} metalness={metalness} />
                </mesh>
                {/* T-Shirt Sleeve */}
                <mesh castShadow position={[0, -0.1, 0]}>
                    <capsuleGeometry args={[capGeomArgs[0] + 0.02, 0.2, 16, 32]} />
                    <meshStandardMaterial color={shirtColor} roughness={0.6} metalness={metalness} />
                </mesh>
            </group>

            {/* Right Arm Joint */}
            <group ref={rArm} position={[gender === 'female' ? 0.4 : 0.45, 0.35, 0]}>
                <mesh castShadow receiveShadow position={[0, -0.3, 0]}>
                    <capsuleGeometry args={capGeomArgs} />
                    <meshStandardMaterial color={skinColor} roughness={roughness} metalness={metalness} />
                </mesh>
                {/* T-Shirt Sleeve */}
                <mesh castShadow position={[0, -0.1, 0]}>
                    <capsuleGeometry args={[capGeomArgs[0] + 0.02, 0.2, 16, 32]} />
                    <meshStandardMaterial color={shirtColor} roughness={0.6} metalness={metalness} />
                </mesh>
            </group>
        </group>

        {/* Left Leg Joint */}
        <group ref={lLeg} position={[-0.15, 0.8, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.4, 0]}>
                <capsuleGeometry args={legGeomArgs} />
                <meshStandardMaterial color={pantColor} roughness={0.7} metalness={metalness} />
            </mesh>
            {/* Shoe */}
            <mesh castShadow receiveShadow position={[0, -0.75, 0.05]}>
                <capsuleGeometry args={[0.18, 0.1, 16, 32]} />
                <meshStandardMaterial color={gender === 'female' ? '#f43f5e' : '#475569'} roughness={0.5} />
            </mesh>
        </group>

        {/* Right Leg Joint */}
        <group ref={rLeg} position={[0.15, 0.8, 0]}>
             <mesh castShadow receiveShadow position={[0, -0.4, 0]}>
                <capsuleGeometry args={legGeomArgs} />
                <meshStandardMaterial color={pantColor} roughness={0.7} metalness={metalness} />
            </mesh>
            {/* Shoe */}
            <mesh castShadow receiveShadow position={[0, -0.75, 0.05]}>
                <capsuleGeometry args={[0.18, 0.1, 16, 32]} />
                <meshStandardMaterial color={gender === 'female' ? '#f43f5e' : '#475569'} roughness={0.5} />
            </mesh>
        </group>
    </group>
  );
}

export default function AvatarScene({ player1Avatar, player2Avatar }: SceneProps) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 to-zinc-950 opacity-80" />
      <Canvas shadows dpr={[1.5, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} camera={{ position: [0, 1.0, 8.5], fov: 50 }}>
        <Environment preset="city" />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#818cf8" />
        
        <Avatar gender={player1Avatar || 'male'} position={[-0.75, -0.8, 0]} isPlayer1={true} rotationY={0.3} />
        {player2Avatar ? (
            <Avatar gender={player2Avatar} position={[0.75, -0.8, 0]} isPlayer1={false} rotationY={-0.3} />
        ) : (
            <group position={[0.75, -0.8, 0]}>
                <mesh position={[0, 0.825, 0]}>
                    <cylinderGeometry args={[0.35, 0.4, 0.05, 32]} />
                    <meshStandardMaterial color="#27272a" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.855, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                   <ringGeometry args={[0.25, 0.3, 32]} />
                   <meshBasicMaterial color="#3f3f46" />
                </mesh>
            </group>
        )}

        <ContactShadows position={[0, -0.8, 0]} opacity={0.7} scale={20} blur={2} far={4} color="#000000" />
      </Canvas>
    </div>
  );
}
