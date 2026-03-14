import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const BLOB_PALETTE = ['#78c9d1', '#8ab6ff', '#9ad8c5', '#b8a5ff', '#75b4c8'];

function createAmbientBlob(color, scale) {
  const geometry = new THREE.IcosahedronGeometry(1, 5);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.15,
    metalness: 0.08,
    transmission: 0.55,
    thickness: 0.9,
    transparent: true,
    opacity: 0.24,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(scale);
  return mesh;
}

function createStarMist(count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 28;
    positions[i3 + 1] = (Math.random() - 0.5) * 18;
    positions[i3 + 2] = -Math.random() * 20;

    color.setHSL(0.55 + Math.random() * 0.08, 0.45, 0.78 + Math.random() * 0.15);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    transparent: true,
    opacity: 0.55,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  return new THREE.Points(geometry, material);
}

export default function ThreeSceneBackground({ className = '', density = 'ambient' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const getSize = () => ({
      width: Math.max(mount.clientWidth || window.innerWidth, 1),
      height: Math.max(mount.clientHeight || window.innerHeight, 1)
    });

    const initialSize = getSize();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(initialSize.width, initialSize.height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#dbe8ee', 0.035);

    const camera = new THREE.PerspectiveCamera(48, initialSize.width / initialSize.height, 0.1, 100);
    camera.position.set(0, 0.3, 9.2);

    const ambient = new THREE.AmbientLight('#dff2f9', 1.1);
    const key = new THREE.DirectionalLight('#e4f6ff', 1.15);
    key.position.set(4, 5, 7);
    const fill = new THREE.PointLight('#8ec5d6', 1.1, 22, 2);
    fill.position.set(-6, 1.5, 6);
    const glow = new THREE.PointLight('#bfa7ff', 0.8, 24, 2);
    glow.position.set(5, -2, 5);

    scene.add(ambient, key, fill, glow);

    const blobs = [];
    const targetCount = density === 'hero' ? 4 : initialSize.width < 768 ? 5 : 8;

    for (let i = 0; i < targetCount; i += 1) {
      const color = BLOB_PALETTE[i % BLOB_PALETTE.length];
      const blob = createAmbientBlob(color, 0.75 + Math.random() * 1.55);

      blob.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 8,
        -3 - Math.random() * 8
      );

      blob.userData = {
        origin: blob.position.clone(),
        driftX: 0.16 + Math.random() * 0.3,
        driftY: 0.12 + Math.random() * 0.25,
        driftZ: 0.08 + Math.random() * 0.18,
        spinX: (Math.random() - 0.5) * 0.002,
        spinY: (Math.random() - 0.5) * 0.003,
        phase: Math.random() * Math.PI * 2
      };

      scene.add(blob);
      blobs.push(blob);
    }

    const mist = createStarMist(density === 'hero' ? 80 : initialSize.width < 768 ? 130 : 220);
    scene.add(mist);

    const cursor = new THREE.Vector2(0, 0);
    const onPointerMove = (event) => {
      cursor.x = (event.clientX / window.innerWidth) * 2 - 1;
      cursor.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointerMove);

    const clock = new THREE.Clock();
    let frameId;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      blobs.forEach((blob) => {
        blob.position.x = blob.userData.origin.x + Math.sin(elapsed * blob.userData.driftX + blob.userData.phase) * 0.7;
        blob.position.y = blob.userData.origin.y + Math.cos(elapsed * blob.userData.driftY + blob.userData.phase) * 0.55;
        blob.position.z = blob.userData.origin.z + Math.sin(elapsed * blob.userData.driftZ + blob.userData.phase) * 0.8;
        blob.rotation.x += blob.userData.spinX;
        blob.rotation.y += blob.userData.spinY;
      });

      mist.rotation.y = elapsed * 0.008;
      mist.rotation.x = Math.sin(elapsed * 0.1) * 0.03;

      const targetX = cursor.x * 0.35;
      const targetY = 0.3 + cursor.y * 0.22;
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    let pendingResize = null;
    const onResize = () => {
      if (pendingResize !== null) cancelAnimationFrame(pendingResize);
      pendingResize = requestAnimationFrame(() => {
        pendingResize = null;
        const nextSize = getSize();
        camera.aspect = nextSize.width / nextSize.height;
        camera.updateProjectionMatrix();
        // updateStyle=false keeps CSS (width:100%) controlling visual size;
        // only the internal buffer resolution is updated
        renderer.setSize(nextSize.width, nextSize.height, false);
      });
    };

    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    return () => {
      if (pendingResize !== null) cancelAnimationFrame(pendingResize);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);

      blobs.forEach((obj) => {
        obj.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });

      if (mist.geometry) mist.geometry.dispose();
      if (mist.material) mist.material.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className={`three-scene-bg ${className}`.trim()} ref={mountRef} aria-hidden="true" />;
}
