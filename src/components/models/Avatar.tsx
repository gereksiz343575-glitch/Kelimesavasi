import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';

interface AvatarProps {
  gender: 'male' | 'female';
  position: [number, number, number];
  isPlayer1: boolean;
  rotationY: number;
  name?: string;
  isOwner?: boolean;
}

const COLORS = {
  skin: "#ffcd94", // warm skin
  male: {
    shirt: "#3b82f6", // clear blue
    pants: "#1e3a8a", // dark blue
    hair: "#3f2b1a",  // dark brown
    shoes: "#1e293b", // slate
  },
  female: {
    shirt: "#ec4899", // pink
    pants: "#831843", // dark pink
    hair: "#ca8a04",  // yellow brown / blonde
    shoes: "#f43f5e", // light red
  }
};

export default function Avatar({ gender, position, isPlayer1, rotationY, name }: AvatarProps) {
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
    body.current.position.y = Math.sin(t * 1.5 + offset) * 0.02 + 0.85;
    
    // Slight body sway
    body.current.rotation.z = Math.sin(t * 1 + offset) * 0.01;
    body.current.rotation.x = Math.sin(t * 1.5 + offset) * 0.01;

    // Head looks around gently
    if (head.current) {
        head.current.rotation.y = Math.sin(t * 0.6 + offset) * 0.1;
        head.current.rotation.x = Math.sin(t * 1.2 + offset) * 0.03;
    }

    // Arms swing gently
    if (armL.current) {
        armL.current.rotation.x = Math.sin(t * 1.5 + offset) * 0.06;
        armL.current.rotation.z = 0.1 + Math.sin(t * 0.8 + offset) * 0.02;
    }
    if (armR.current) {
        armR.current.rotation.x = Math.sin(t * 1.5 + offset + Math.PI) * 0.06;
        armR.current.rotation.z = -0.1 - Math.sin(t * 0.8 + offset) * 0.02;
    }
  });

  return (
    <group ref={group} position={position} rotation-y={rotationY} scale={1.1}>
      
      {/* Upper Body Segment */}
      <group ref={body} position={[0, 0.85, 0]}>

        {name && (
          <Html position={[0, 1.05, 0]} center zIndexRange={[100, 0]}>
            <div className={`px-4 py-2 rounded-full font-black shadow-xl border backdrop-blur-md whitespace-nowrap ${isPlayer1 ? 'bg-zinc-950/80 border-blue-500/50 text-blue-400' : 'bg-zinc-950/80 border-red-500/50 text-red-400'} text-base drop-shadow-lg`}>
              {name}
            </div>
          </Html>
        )}
        
        {/* Core Torso */}
        <RoundedBox args={[0.5, 0.55, 0.35]} radius={0.06} smoothness={4} castShadow receiveShadow>
            <meshStandardMaterial color={c.shirt} roughness={0.6} />
        </RoundedBox>

        {/* Neck */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.1, 16]} />
            <meshStandardMaterial color={COLORS.skin} roughness={0.6} />
        </mesh>

        {/* Head Pivot */}
        <group ref={head} position={[0, 0.45, 0]}>
           {/* Face Box */}
           <RoundedBox args={[0.45, 0.45, 0.45]} radius={0.08} smoothness={4} castShadow receiveShadow position={[0, 0, 0]}>
               <meshStandardMaterial color={COLORS.skin} roughness={0.5} />
           </RoundedBox>

           {/* Core Hair volume */}
           <RoundedBox args={[0.47, 0.45, 0.47]} radius={0.08} smoothness={4} castShadow receiveShadow position={[0, 0.06, -0.02]}>
               <meshStandardMaterial color={c.hair} roughness={0.9} />
           </RoundedBox>

           {/* Hair Front Bangs */}
           <RoundedBox args={[0.47, 0.15, 0.2]} radius={0.05} smoothness={4} castShadow receiveShadow position={[0, 0.18, 0.16]}>
               <meshStandardMaterial color={c.hair} roughness={0.9} />
           </RoundedBox>

           {/* Female Extra Hair */}
           {gender === 'female' && (
             <RoundedBox args={[0.55, 0.55, 0.2]} radius={0.08} smoothness={4} castShadow receiveShadow position={[0, -0.2, -0.16]}>
                 <meshStandardMaterial color={c.hair} roughness={0.9} />
             </RoundedBox>
           )}

           {/* Detailed Eyes */}
           <group position={[0, 0, 0.23]}>
               <mesh position={[-0.1, 0.02, 0]}>
                   <capsuleGeometry args={[0.015, 0.03, 16, 16]} />
                   <meshBasicMaterial color="#1f2937" />
               </mesh>
               <mesh position={[0.1, 0.02, 0]}>
                   <capsuleGeometry args={[0.015, 0.03, 16, 16]} />
                   <meshBasicMaterial color="#1f2937" />
               </mesh>
           </group>

           {/* Blush details */}
           <group position={[0, -0.06, 0.22]}>
               <mesh position={[-0.14, 0, 0]}>
                   <circleGeometry args={[0.035, 16]} />
                   <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
               </mesh>
               <mesh position={[0.14, 0, 0]}>
                   <circleGeometry args={[0.035, 16]} />
                   <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
               </mesh>
           </group>
           
           {/* Detailed Mouth */}
           <mesh position={[0, -0.08, 0.22]} rotation={[0, 0, Math.PI / 2]}>
               <capsuleGeometry args={[0.01, 0.02, 8, 8]} />
               <meshBasicMaterial color="#7f1d1d" />
           </mesh>
        </group>

        {/* Left Arm Pivot structure */}
        <group position={[-0.3, 0.2, 0]}>
            <group ref={armL}>
                {/* Arm Skin segment */}
                <RoundedBox args={[0.14, 0.45, 0.14]} radius={0.05} smoothness={4} castShadow receiveShadow position={[0, -0.2, 0]}>
                    <meshStandardMaterial color={COLORS.skin} roughness={0.6} />
                </RoundedBox>
                {/* Sleeve layer overlying the arm */}
                <RoundedBox args={[0.16, 0.2, 0.16]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.05, 0]}>
                    <meshStandardMaterial color={c.shirt} roughness={0.7} />
                </RoundedBox>
            </group>
        </group>

        {/* Right Arm Pivot structure */}
        <group position={[0.3, 0.2, 0]}>
            <group ref={armR}>
                {/* Arm Skin */}
                <RoundedBox args={[0.14, 0.45, 0.14]} radius={0.05} smoothness={4} castShadow receiveShadow position={[0, -0.2, 0]}>
                    <meshStandardMaterial color={COLORS.skin} roughness={0.6} />
                </RoundedBox>
                {/* Sleeve */}
                <RoundedBox args={[0.16, 0.2, 0.16]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.05, 0]}>
                    <meshStandardMaterial color={c.shirt} roughness={0.7} />
                </RoundedBox>
            </group>
        </group>

        {/* The Pelvis connecting the torso and legs */}
        <RoundedBox args={[0.48, 0.18, 0.33]} radius={0.05} smoothness={4} castShadow receiveShadow position={[0, -0.32, 0]}>
            <meshStandardMaterial color={c.pants} roughness={0.8} />
        </RoundedBox>
      </group>

      {/* Legs (Stationary relative to the bobbing body) */}
      <group position={[0, 0.45, 0]}>
          
          {/* Left Leg Base */}
          <group ref={legL} position={[-0.14, 0, 0]}>
              <RoundedBox args={[0.18, 0.4, 0.18]} radius={0.05} smoothness={4} castShadow receiveShadow position={[0, -0.15, 0]}>
                  <meshStandardMaterial color={c.pants} roughness={0.8} />
              </RoundedBox>
              {/* Left Shoe */}
              <RoundedBox args={[0.2, 0.14, 0.25]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.38, 0.03]}>
                  <meshStandardMaterial color={c.shoes} roughness={0.6} />
              </RoundedBox>
          </group>

          {/* Right Leg Base */}
          <group ref={legR} position={[0.14, 0, 0]}>
              <RoundedBox args={[0.18, 0.4, 0.18]} radius={0.05} smoothness={4} castShadow receiveShadow position={[0, -0.15, 0]}>
                  <meshStandardMaterial color={c.pants} roughness={0.8} />
              </RoundedBox>
              {/* Right Shoe */}
              <RoundedBox args={[0.2, 0.14, 0.25]} radius={0.04} smoothness={4} castShadow receiveShadow position={[0, -0.38, 0.03]}>
                  <meshStandardMaterial color={c.shoes} roughness={0.6} />
              </RoundedBox>
          </group>
      </group>
    </group>
  );
}
