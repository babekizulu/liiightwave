//libs
import React, { useRef, useState, useEffect} from 'react';
import { Canvas, useLoader} from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import model from '../models/african_analytics.glb';
const Scene = () => {
 
  const gltf = useLoader(GLTFLoader, model);
  const lightBulb = useRef();
   //state management
   const [responsive, setResponsive] = useState([]);
   //handlers
   const responsiveScreenHandler = () => {
    if (window.screen.width > 912) {
      setResponsive([1, 1, 1])
      console.log('desktop')
    };
    if(window.screen.width <= 912 && window.screen.width > 412) {
      setResponsive([0.8, 0.8, 0.8]);
      console.log('tablet');
    };
    if(window.screen.width <= 412) {
      setResponsive([0.2, 0.2, 0.2]);
      console.log('mobile');
    };
   };
   //side effects
   useEffect(() => {
    responsiveScreenHandler();
   }, []);
  // useFrame(({ clock }) => {
  //   lightBulb.current.rotation.x = clock.getElapsedTime();
  // });
  return (
    <primitive
      position={[0, -2, 0]}
      scale={ responsive ? [0.8, 0.8, 0.8]:[1, 1, 1]}
      rotation={[0, Math.PI, 0]}
      object={gltf.scene}
      ref={lightBulb}
    />
  );
};

const ModelContainer = () => {
  return (
    <div
      className='model-container'
      style={{
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: '0',
        cursor: 'pointer',
      }}
    >
      <Canvas camera={{ position: [0, 0, -10] }}>
        <pointLight position={[10, 10, 10]} />
        <Scene />
        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default ModelContainer;
