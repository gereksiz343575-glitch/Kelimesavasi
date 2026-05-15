import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface AvatarProps {
  gender: 'male' | 'female';
  position: [number, number, number];
  isPlayer1: boolean;
  rotationY: number;
}

const COLORS = {
  skin: "#ffcd94",
  male: {
    shirt: "#3b82f6", // blue-500
    pants: "#1e3a8a", // blue-900
    hair: "#3f2b1a",
    shoes: "#1e293b",
  },
  female: {
    shirt: "#ec4899", // pink-500
    pants: "#831843", // pink-900
    hair: "#ca8a04",
    shoes: "#f43f5e",
  }
};

export default function Avatar({ gender, position, isPlayer1, rotationY }: AvatarProps) {
  const c = COLORS[gender];
  
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || !body.current) return;
    const t = state.clock.getElapsedTime();
    const offset = isPlayer1 ? 0 : Math.PI;

    // Idle breathing (body goes up and down slightly)
    body.current.position.y = Math.sin(t * 2 + offset) * 0.03 + 0.8;
    
    // Slight body sway
    body.current.rotation.z = Math.sin(t * 1 + offset) * 0.015;
    body.current.rotation.x = Math.sin(t * 1.5 + offset) * 0.01;

    // Head looks around slowly
    if (head.current) {
        head.current.rotation.y = Math.sin(t * 0.5 + offset) * 0.15;
        head.current.rotation.x = Math.sin(t * 1.2 + offset) * 0.05;
    }

    // Arms swing gently in opposite phase
    if (armL.current) {
        armL.current.rotation.x = Math.sin(t * 1.5 + offset) * 0.08;
        armL.current.rotation.z = 0.05 + Math.sin(t * 0.8 + offset) * 0.03;
    }
    if (armR.current) {
        armR.current.rotation.x = Math.sin(t * 1.5 + offset + Math.PI) * 0.08;
        armR.current.rotation.z = -0.05 - Math.sin(t * 0.8 + offset) * 0.03;
    }
  });

  return (
    <group ref={group} position={position} rotation-y={rotationY} scale={1.25}>
      
      {/* Upper Body (Bobs up and down) */}
      <group ref={body} position={[0, 0.8, 0]}>
        
        {/* Torso */}
        <RoundedBox args={[0.45, 0.5, 0.3]} radius={0.06} smoothness={4} castShadow receiveShadow>
            <meshStandardMaterial color={c.shirt} roughness={0.7} />
        </RoundedBox>

        {/* Neck */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.15, 16]} />
            <meshStandardMaterial color={COLORS.skin} roughness={0.6} />
        </mesh>

        {/* Head Group */}
        <group ref={head} position={[0, 0.5, 0]}>
           {/* Face */}
           <RoundedBox args={[0.4, 0.4, 0.4]} radius={0.1} smoothness={4} castShadow receiveShadow position={[0, 0, 0]}>
               <meshStandardMaterial color={COLORS.skin} roughness={0.5} />
           </RoundedBox>

           {/* Hair Base */}
           <RoundedBox args={[0.42, 0.42, 0.42]} radius={0.1} smoothness={4} castShadow receiveShadow position={[0, 0.05, -0.02]}>
               <meshStandardMaterial color={c.hair} roughness={0.8} />
           </RoundedBox>

           {/* Female Hair Extensions */}
           {gender === 'female' && (
             <RoundedBox args={[0.46, 0.5, 0.2]} radius={0.1} smoothness={4} castShadow receiveShadow position={[0, -0.2, -0.15]}>
                 <meshStandardMaterial color={c.hair} roughness={0.8} />
             </RoundedBox>
           )}

           {/* Eyes */}
           <group position={[0, 0, 0.21]}>
               <mesh position={[-0.08, 0.02, 0]}>
                   <capsuleGeometry args={[0.015, 0.04, 8, 8]} />
                   <meshBasicMaterial color="#1f2937" />
               </mesh>
               <mesh position={[0.08, 0.02, 0]}>
                   <capsuleGeometry args={[0.015, 0.04, 8, 8]} />
                   <meshBasicMaterial color="#1f2937" />
               </mesh>
           </group>

           {/* Blush */}
           <group position={[0, -0.05, 0.205]}>
               <mesh position={[-0.12, 0, 0]}>
                   <circleGeometry args={[0.03, 16]} />
                   <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
               </mesh>
               <mesh position={[0.12, 0, 0]}>
                   <circleGeometry args={[0.03, 16]} />
                   <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
               </mesh>
           </group>
           
           {/* Mouth */}
           <mesh position={[0, -0.06, 0.21]}>
               <capsuleGeometry args={[0.01, 0.02, 8, 8]} rotation={[0, 0, Math.PI / 2]} />
               <meshBasicMaterial color="#7f1d1d" />
           </mesh>
        </group>

        {/* Left Arm */}
        <group position={[-0.28, 0.2, 0]}>
            <group ref={armL}>
                {/* Arm Base */}
                <RoundedBox args={[0.12, 0.45, 0.12]} radius={0.06} smoothness={4} castShadow receiveShadow position={[0, -0.2, 0]}>
                    <meshStandardMaterial color={COLORS.skin} roughness={0.6} />
                </RoundedBox>
                {/* Sleeve */}
                <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.05, 0]}>
                    <meshStandardMaterial color={c.shirt} roughness={0.7} />
                </RoundedBox>
            </group>
        </group>

        {/* Right Arm */}
        <group position={[0.28, 0.2, 0]}>
            <group ref={armR}>
                {/* Arm Base */}
                <RoundedBox args={[0.12, 0.45, 0.12]} radius={0.06} smoothness={4} castShadow receiveShadow position={[0, -0.2, 0]}>
                    <meshStandardMaterial color={COLORS.skin} roughness={0.6} />
                </RoundedBox>
                {/* Sleeve */}
                <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.05, 0]}>
                    <meshStandardMaterial color={c.shirt} roughness={0.7} />
                </RoundedBox>
            </group>
        </group>

        {/* Pelvis/Belt */}
        <RoundedBox args={[0.42, 0.15, 0.28]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.25, 0]}>
            <meshStandardMaterial color={c.pants} roughness={0.8} />
        </RoundedBox>
      </group>

      {/* Legs */}
      <group position={[0, 0.45, 0]}>
          {/* Left Leg */}
          <group ref={legL} position={[-0.12, 0, 0]}>
              <RoundedBox args={[0.16, 0.35, 0.16]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.15, 0]}>
                  <meshStandardMaterial color={c.pants} roughness={0.8} />
              </RoundedBox>
              {/* Left Shoe */}
              <RoundedBox args={[0.18, 0.12, 0.22]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.35, 0.02]}>
                  <meshStandardMaterial color={c.shoes} roughness={0.6} />
              </RoundedBox>
          </group>

          {/* Right Leg */}
          <group ref={legR} position={[0.12, 0, 0]}>
              <RoundedBox args={[0.16, 0.35, 0.16]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.15, 0]}>
                  <meshStandardMaterial color={c.pants} roughness={0.8} />
              </RoundedBox>
              {/* Right Shoe */}
              <RoundedBox args={[0.18, 0.12, 0.22]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.35, 0.02]}>
                  <meshStandardMaterial color={c.shoes} roughness={0.6} />
              </RoundedBox>
          </group>
      </group>
    </group>
  );
}
