'use client';
import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
// @ts-ignore 
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const Minecraft3DConverter = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [blockSize, setBlockSize] = useState(16); // 体素大小
  const [colorCount, setColorCount] = useState(32); // 颜色数量
  const [pixelScale, setPixelScale] = useState(50); // 最大像素宽度
  const [blockScale, setBlockScale] = useState(1.0); // 方块大小缩放
  const [blockGap, setBlockGap] = useState(0); // 方块间隙
  const [heightFactor, setHeightFactor] = useState(8); // 高度系数
  const [heightMode, setHeightMode] = useState('flat'); // 高度模式：flat, heightmap, 3d
  const [useTextures, setUseTextures] = useState(true); // 是否使用纹理
  const [autoRotate, setAutoRotate] = useState(true); // 自动旋转

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // 材质缓存
  const materialsCache = useRef<Map<string, THREE.Material[]>>(new Map());

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setOriginalImage(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  // 量化颜色
  const quantizeColor = (r: number, g: number, b: number, colorCount: number): [number, number, number] => {
    const step = Math.floor(256 / Math.cbrt(colorCount));
    return [
      Math.floor(r / step) * step,
      Math.floor(g / step) * step,
      Math.floor(b / step) * step
    ];
  };

  // 从图像中提取像素数据
  const getPixelData = (img: HTMLImageElement, maxWidth: number = 100): {
    pixels: Array<{
      r: number, g: number, b: number, a: number,
      x: number, y: number,
      brightness: number
    }>,
    width: number,
    height: number
  } => {
    // 创建临时画布
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建Canvas上下文');

    // 计算缩放比例，控制最大体素数量，避免性能问题
    const scale = Math.min(1, maxWidth / img.width);
    const width = Math.floor(img.width * scale);
    const height = Math.floor(img.height * scale);

    // 缩放尺寸
    const blockSizeScaled = Math.max(1, Math.floor(blockSize * scale));

    // 设置画布尺寸
    canvas.width = width;
    canvas.height = height;

    // 绘制图像
    ctx.drawImage(img, 0, 0, width, height);

    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 存储像素数据
    const pixels: Array<{
      r: number, g: number, b: number, a: number,
      x: number, y: number,
      brightness: number
    }> = [];

    // 按照指定块大小采样像素
    for (let y = 0; y < height; y += blockSizeScaled) {
      for (let x = 0; x < width; x += blockSizeScaled) {
        // 获取块中心点的像素值
        const centerX = Math.min(x + Math.floor(blockSizeScaled / 2), width - 1);
        const centerY = Math.min(y + Math.floor(blockSizeScaled / 2), height - 1);
        const index = (centerY * width + centerX) * 4;

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        // 如果像素不是完全透明
        if (a > 128) {
          // 量化颜色
          const [qr, qg, qb] = quantizeColor(r, g, b, colorCount);

          // 计算亮度值 (0-1)
          const brightness = (qr + qg + qb) / (3 * 255);

          // 存储像素数据，包括位置信息
          pixels.push({
            r: qr,
            g: qg,
            b: qb,
            a,
            x: Math.floor(x / blockSizeScaled),
            y: Math.floor(y / blockSizeScaled),
            brightness
          });
        }
      }
    }

    return {
      pixels,
      width: Math.ceil(width / blockSizeScaled),
      height: Math.ceil(height / blockSizeScaled)
    };
  };

  // 创建或从缓存获取材质
  const getMaterials = (r: number, g: number, b: number): THREE.Material[] => {
    const colorKey = `${r}-${g}-${b}`;

    if (materialsCache.current.has(colorKey)) {
      return materialsCache.current.get(colorKey)!;
    }

    // 创建方块的基本颜色
    const baseColor = new THREE.Color(r / 255, g / 255, b / 255);

    // 为六个面创建不同的材质，模拟Minecraft风格
    let materials: THREE.Material[];

    if (useTextures) {
      // 使用纹理贴图的材质
      const textureLoader = new THREE.TextureLoader();

      // 创建自定义纹理
      const createTextureFromColor = (color: THREE.Color, isDark: boolean = false): THREE.Texture => {
        const size = 16;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;

        // 背景色
        context.fillStyle = color.getStyle();
        context.fillRect(0, 0, size, size);

        // 添加Minecraft风格的纹理图案
        if (isDark) {
          // 暗色面 (底部)
          context.fillStyle = 'rgba(0,0,0,0.4)';
          context.fillRect(0, 0, size, size);

          // 随机添加一些小点
          context.fillStyle = 'rgba(0,0,0,0.2)';
          for (let i = 0; i < 8; i++) {
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);
            const s = 1 + Math.floor(Math.random() * 2);
            context.fillRect(x, y, s, s);
          }
        } else {
          // 一般面 (侧面和顶面)
          // 添加Minecraft风格的像素图案
          context.fillStyle = 'rgba(255,255,255,0.1)';
          for (let i = 0; i < 3; i++) {
            const x = Math.floor(Math.random() * (size - 2));
            const y = Math.floor(Math.random() * (size - 2));
            context.fillRect(x, y, 2, 2);
          }

          // 添加一些暗色边缘细节
          context.fillStyle = 'rgba(0,0,0,0.15)';
          context.fillRect(0, 0, size, 1);
          context.fillRect(0, 0, 1, size);

          // 随机添加一些纹理细节
          for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * (size - 1));
            const y = Math.floor(Math.random() * (size - 1));
            context.fillRect(x, y, 1, 1);
          }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        return texture;
      };

      // 创建各个面的材质
      const topTexture = createTextureFromColor(baseColor.clone().multiplyScalar(1.15)); // 顶面更亮
      const sideTexture = createTextureFromColor(baseColor);
      const bottomTexture = createTextureFromColor(baseColor.clone().multiplyScalar(0.8), true); // 底面更暗

      materials = [
        new THREE.MeshLambertMaterial({ map: sideTexture }), // 右
        new THREE.MeshLambertMaterial({ map: sideTexture }), // 左
        new THREE.MeshLambertMaterial({ map: topTexture }), // 顶
        new THREE.MeshLambertMaterial({ map: bottomTexture }), // 底
        new THREE.MeshLambertMaterial({ map: sideTexture }), // 前
        new THREE.MeshLambertMaterial({ map: sideTexture }) // 后
      ];
    } else {
      // 使用纯色材质
      materials = [
        new THREE.MeshLambertMaterial({ color: baseColor.clone().multiplyScalar(0.9) }), // 右
        new THREE.MeshLambertMaterial({ color: baseColor.clone().multiplyScalar(0.9) }), // 左
        new THREE.MeshLambertMaterial({ color: baseColor.clone().multiplyScalar(1.15) }), // 顶
        new THREE.MeshLambertMaterial({ color: baseColor.clone().multiplyScalar(0.8) }), // 底
        new THREE.MeshLambertMaterial({ color: baseColor }), // 前
        new THREE.MeshLambertMaterial({ color: baseColor }) // 后
      ];
    }

    // 缓存材质
    materialsCache.current.set(colorKey, materials);

    return materials;
  };

  // 创建3D模型
  const createVoxelModel = (pixels: Array<{
    r: number, g: number, b: number, a: number,
    x: number, y: number, brightness: number
  }>, imageWidth: number, imageHeight: number) => {
    if (!sceneRef.current) return;

    // 清除现有场景内容
    while (sceneRef.current.children.length > 0) {
      const object = sceneRef.current.children[0];
      if (object instanceof THREE.Light || object instanceof THREE.Camera) {
        sceneRef.current.children.shift();
        continue;
      }
      sceneRef.current.remove(object);
    }

    // 清除材质缓存
    materialsCache.current.clear();

    // 创建Minecraft风格的世界
    createMinecraftWorld(sceneRef.current, imageWidth, imageHeight);

    // 计算模型中心点偏移，使模型居中
    const offsetX = -imageWidth / 2;
    const offsetZ = -imageHeight / 2;

    // 计算高度映射 - 只在3D模式下使用
    let heightMap: number[][] = [];

    if (heightMode === '3d') {
      // 初始化高度图
      heightMap = Array(imageHeight).fill(0).map(() => Array(imageWidth).fill(0));

      // 填充高度图
      for (const pixel of pixels) {
        heightMap[pixel.y][pixel.x] = Math.floor(pixel.brightness * heightFactor);
      }
    }

    // 组合实例化渲染的方块（提高性能）
    const instanceGroups = new Map<string, {
      instances: Array<{ x: number, y: number, z: number, height: number }>,
      color: { r: number, g: number, b: number }
    }>();

    // 准备实例化数据
    for (const pixel of pixels) {
      const colorKey = `${pixel.r}-${pixel.g}-${pixel.b}`;

      if (!instanceGroups.has(colorKey)) {
        instanceGroups.set(colorKey, {
          instances: [],
          color: { r: pixel.r, g: pixel.g, b: pixel.b }
        });
      }

      let y = 0; // 默认高度
      let height = 1; // 默认方块高度

      if (heightMode === 'heightmap') {
        // 高度图模式 - 方块高度取决于亮度
        height = 1 + Math.floor(pixel.brightness * heightFactor);
      } else if (heightMode === '3d') {
        // 3D模式 - 堆叠方块创建3D效果
        y = heightMap[pixel.y][pixel.x];
      }

      // 添加到实例组
      instanceGroups.get(colorKey)!.instances.push({
        x: pixel.x + offsetX,
        y: y,
        z: pixel.y + offsetZ,
        height
      });
    }

    // 逐个颜色组创建实例化网格
    for (const [colorKey, group] of instanceGroups.entries()) {
      createMinecraftInstances(
        sceneRef.current,
        group.instances,
        group.color.r,
        group.color.g,
        group.color.b
      );
    }

    // 调整相机位置以适应模型大小
    if (cameraRef.current) {
      const modelSize = Math.max(imageWidth, imageHeight);
      const cameraDistance = modelSize * 1.5;
      cameraRef.current.position.set(cameraDistance, cameraDistance * 0.7, cameraDistance);
      cameraRef.current.lookAt(0, 0, 0);
    }

    // 添加照明
    addLighting(sceneRef.current);
  };

  // 创建实例化的Minecraft方块集合
  const createMinecraftInstances = (
    scene: THREE.Scene,
    instances: Array<{ x: number, y: number, z: number, height: number }>,
    r: number, g: number, b: number
  ) => {
    if (instances.length === 0) return;

    // 创建方块实例
    for (const instance of instances) {
      // 应用方块间隙和缩放
      const spacing = 1 + blockGap / 100; // 将百分比转换为实际间距
      const scale = blockScale; // 方块缩放

      const x = instance.x * spacing;
      const z = instance.z * spacing;
      const y = instance.y;

      // 创建标准方块
      createMinecraftBlock(
        scene, x, y, z, r, g, b,
        instance.height, scale
      );
    }
  };

  // 创建Minecraft风格的方块
  const createMinecraftBlock = (
    scene: THREE.Scene,
    x: number, y: number, z: number,
    r: number, g: number, b: number,
    height: number = 1,
    scale: number = 1
  ) => {
    // 获取或创建材质
    const materials = getMaterials(r, g, b);

    // 创建方块的几何体 - 真正的立方体
    const geometry = new THREE.BoxGeometry(scale, height * scale, scale);

    // 创建mesh
    const cube = new THREE.Mesh(geometry, materials);

    // 设置位置 - 确保方块位于地面上，而不是部分嵌入地面
    cube.position.set(x, y + (height * scale) / 2, z);

    // 添加到场景
    scene.add(cube);

    return cube;
  };

  // 创建Minecraft风格的世界
  const createMinecraftWorld = (scene: THREE.Scene, width: number, height: number) => {
    // 基础大小
    const worldSize = Math.max(width, height) * 1.5;

    // 创建草地平面
    const groundGeometry = new THREE.PlaneGeometry(worldSize, worldSize, 1, 1);
    const groundTexture = createMinecraftTexture('grass_top');
    const groundMaterial = new THREE.MeshLambertMaterial({
      map: groundTexture,
      side: THREE.DoubleSide
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    // 创建地面下的土壤
    const dirtDepth = 4;
    const dirtGeometry = new THREE.BoxGeometry(worldSize, dirtDepth, worldSize);

    // 不同面的材质
    const dirtTopTexture = createMinecraftTexture('grass_top');
    const dirtSideTexture = createMinecraftTexture('grass_side');
    const dirtBottomTexture = createMinecraftTexture('dirt');

    const dirtMaterials = [
      new THREE.MeshLambertMaterial({ map: dirtSideTexture }), // right
      new THREE.MeshLambertMaterial({ map: dirtSideTexture }), // left
      new THREE.MeshLambertMaterial({ map: dirtTopTexture }), // top
      new THREE.MeshLambertMaterial({ map: dirtBottomTexture }), // bottom
      new THREE.MeshLambertMaterial({ map: dirtSideTexture }), // front
      new THREE.MeshLambertMaterial({ map: dirtSideTexture }) // back
    ];

    const dirt = new THREE.Mesh(dirtGeometry, dirtMaterials);
    dirt.position.y = -dirtDepth / 2 - 0.01;
    scene.add(dirt);

    // 添加天空颜色
    const skyColor = new THREE.Color(0x87CEEB);
    scene.background = skyColor;

    // 添加Minecraft风格的云层
    createClouds(scene, worldSize);

    // 添加雾效使远处淡出
    scene.fog = new THREE.FogExp2(skyColor, 0.015);
  };

  // 创建Minecraft风格的纹理
  const createMinecraftTexture = (type: 'grass_top' | 'grass_side' | 'dirt' | 'cloud'): THREE.Texture => {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    if (type === 'grass_top') {
      // 草地顶部纹理
      ctx.fillStyle = '#7bac39';
      ctx.fillRect(0, 0, size, size);

      // 添加一些草地的细节
      ctx.fillStyle = '#71a234';
      for (let i = 0; i < size * 0.6; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        ctx.fillRect(x, y, 1, 1);
      }

      // 添加一些亮点
      ctx.fillStyle = '#8bbc49';
      for (let i = 0; i < size * 0.4; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        ctx.fillRect(x, y, 1, 1);
      }
    } else if (type === 'grass_side') {
      // 草方块侧面

      // 上部分是草
      ctx.fillStyle = '#7bac39';
      ctx.fillRect(0, 0, size, 3);

      // 添加草的过渡色
      ctx.fillStyle = '#74a636';
      ctx.fillRect(0, 3, size, 1);

      // 下部分是泥土
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(0, 4, size, size - 4);

      // 添加泥土细节
      ctx.fillStyle = '#7d512a';
      for (let i = 0; i < size * 0.8; i++) {
        const x = Math.floor(Math.random() * size);
        const y = 4 + Math.floor(Math.random() * (size - 4));
        ctx.fillRect(x, y, 1, 1);
      }

      // 添加一些更暗的细节
      ctx.fillStyle = '#6d461f';
      for (let i = 0; i < size * 0.3; i++) {
        const x = Math.floor(Math.random() * size);
        const y = 4 + Math.floor(Math.random() * (size - 4));
        ctx.fillRect(x, y, 1, 1);
      }
    } else if (type === 'dirt') {
      // 泥土纹理
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(0, 0, size, size);

      // 添加泥土细节
      ctx.fillStyle = '#7d512a';
      for (let i = 0; i < size * 0.8; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        ctx.fillRect(x, y, 1, 1);
      }

      // 添加一些更暗的细节
      ctx.fillStyle = '#6d461f';
      for (let i = 0; i < size * 0.3; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        ctx.fillRect(x, y, 1, 1);
      }
    } else if (type === 'cloud') {
      // 云朵纹理
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // 添加一些轻微的阴影
      ctx.fillStyle = '#f0f0f0';
      for (let i = 0; i < size * 0.3; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        const s = 1 + Math.floor(Math.random() * 2);
        ctx.fillRect(x, y, s, s);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // 确保像素风格
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  };

  // 创建云朵
  const createClouds = (scene: THREE.Scene, worldSize: number) => {
    const cloudTexture = createMinecraftTexture('cloud');
    const cloudMaterial = new THREE.MeshLambertMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });

    const cloudCount = Math.floor(worldSize / 20);
    const cloudHeight = worldSize / 2;

    for (let i = 0; i < cloudCount; i++) {
      // 随机云朵大小
      const cloudWidth = 5 + Math.random() * 15;
      const cloudDepth = 5 + Math.random() * 15;

      const cloudGeometry = new THREE.BoxGeometry(cloudWidth, 2, cloudDepth);
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);

      // 随机位置
      const posX = (Math.random() - 0.5) * worldSize;
      const posZ = (Math.random() - 0.5) * worldSize;
      const posY = cloudHeight + (Math.random() - 0.5) * 10;

      cloud.position.set(posX, posY, posZ);
      scene.add(cloud);
    }
  };

  // 添加照明
  const addLighting = (scene: THREE.Scene) => {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
    scene.add(ambientLight);

    // 主方向光 (模拟太阳光)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(1, 1, 0.5).normalize();
    sunLight.castShadow = true;
    scene.add(sunLight);

    // 辅助方向光 (用于照亮阴影处)
    const fillLight = new THREE.DirectionalLight(0x9999ff, 0.3);
    fillLight.position.set(-1, 0.5, -0.5).normalize();
    scene.add(fillLight);

    // 顶光 (增强顶部亮度)
    const topLight = new THREE.DirectionalLight(0xffffcc, 0.4);
    topLight.position.set(0, 1, 0).normalize();
    scene.add(topLight);
  };

  // 初始化Three.js
  const initThreeJS = () => {
    if (!canvasRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      50,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 20, 40);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // 创建轨道控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // 限制俯仰角，防止看到地面下面
    controlsRef.current = controls;

    // 添加窗口大小变化的监听器
    window.addEventListener('resize', handleResize);

    // 初始化场景
    createMinecraftWorld(scene, 20, 20);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();
  };

  // 处理窗口大小变化
  const handleResize = () => {
    if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;

    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    // 更新相机宽高比
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

    // 更新渲染器大小
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
  };

  // 处理图像变化
  useEffect(() => {
    if (!originalImage || !sceneRef.current) return;

    // 加载图像并处理
    const img = new Image();
    img.onload = () => {
      // 限制最大体素宽度，避免性能问题
      const { pixels, width, height } = getPixelData(img, pixelScale);
      createVoxelModel(pixels, width, height);
    };
    img.src = originalImage;
  }, [originalImage, blockSize, colorCount, pixelScale, blockScale, blockGap, heightFactor, heightMode, useTextures]);

  // 更新自动旋转设置
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // 初始化Three.js
  useEffect(() => {
    initThreeJS();

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);

      // 清理Three.js资源
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      // 清理材质缓存
      materialsCache.current.clear();

      if (sceneRef.current) {
        sceneRef.current.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  // 下载截图
  const downloadScreenshot = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    // 渲染当前场景
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    // 获取画布数据URL
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');

    // 创建下载链接
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'minecraft_3d_model.png';
    link.click();
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center gap-6">
      <div className="w-full">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
        />
      </div>

      <div className="w-full aspect-[4/3] relative border rounded-lg overflow-hidden bg-gray-800">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </div>

      <div className="w-full flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <span>方块模式:</span>
          <select
            value={heightMode}
            onChange={(e) => setHeightMode(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="flat">平面模式</option>
            <option value="heightmap">高度图模式</option>
            <option value="3d">3D模式</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span>方块大小:</span>
          <input
            type="range"
            min="4"
            max="32"
            value={blockSize}
            onChange={(e) => setBlockSize(Number(e.target.value))}
            className="flex-1"
          />
          <span>{blockSize}px</span>
        </label>

        <label className="flex items-center gap-2">
          <span>颜色数量:</span>
          <input
            type="range"
            min="8"
            max="64"
            value={colorCount}
            onChange={(e) => setColorCount(Number(e.target.value))}
            className="flex-1"
          />
          <span>{colorCount}</span>
        </label>

        <label className="flex items-center gap-2">
          <span>像素缩放:</span>
          <input
            type="range"
            min="20"
            max="100"
            value={pixelScale}
            onChange={(e) => setPixelScale(Number(e.target.value))}
            className="flex-1"
          />
          <span>{pixelScale}</span>
        </label>

        {heightMode !== 'flat' && (
          <label className="flex items-center gap-2">
            <span>高度系数:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={heightFactor}
              onChange={(e) => setHeightFactor(Number(e.target.value))}
              className="flex-1"
            />
            <span>{heightFactor}</span>
          </label>
        )}

        <label className="flex items-center gap-2">
          <span>方块缩放:</span>
          <input
            type="range"
            min="50"
            max="100"
            value={blockScale * 100}
            onChange={(e) => setBlockScale(Number(e.target.value) / 100)}
            className="flex-1"
          />
          <span>{Math.round(blockScale * 100)}%</span>
        </label>

        <label className="flex items-center gap-2">
          <span>方块间隙:</span>
          <input
            type="range"
            min="0"
            max="20"
            value={blockGap}
            onChange={(e) => setBlockGap(Number(e.target.value))}
            className="flex-1"
          />
          <span>{blockGap}%</span>
        </label>

        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useTextures}
              onChange={(e) => setUseTextures(e.target.checked)}
            />
            <span>使用方块纹理</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
            />
            <span>自动旋转</span>
          </label>
        </div>

        <div className="flex-grow text-sm text-gray-500 mt-2">
          <p>✓ 可用鼠标拖动旋转模型，滚轮缩放</p>
        </div>

        <button
          onClick={downloadScreenshot}
          className="mt-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          下载我的世界3D模型截图
        </button>
      </div>
    </div>
  );
};

export default Minecraft3DConverter; 