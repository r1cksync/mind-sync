'use client';

import { useRef, useEffect } from 'react';

// Technology data with increased radii and SVG icon paths
const technologies = [
  { name: 'Next.js', color: '#ffffff', radius: 60, speed: 0.005, icon: '/icons/nextjs.svg' },
  { name: 'Tailwind CSS', color: '#38bdf8', radius: 110, speed: 0.004, icon: '/icons/tailwindcss.svg' },
  { name: 'Clerk', color: '#8b5cf6', radius: 170, speed: 0.003, icon: '/icons/clerk.svg' },
  { name: 'Three.js', color: '#f472b6', radius: 250, speed: 0.002, icon: '/icons/threejs.svg' },
  { name: 'Framer Motion', color: '#a78bfa', radius: 340, speed: 0.001, icon: '/icons/framermotion.svg' },
];

export default function TechOrbit() {
  const canvasRef = useRef(null);
  const draggingRef = useRef(null); // Track which circle is being dragged
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Initialize circle data (not React state)
  const circles = technologies.map((tech) => ({
    ...tech,
    angle: Math.random() * 2 * Math.PI, // Random starting angle
    currentRadius: tech.radius,
    targetRadius: tech.radius,
    iconImage: null, // Will hold the rasterized icon image
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas ref is null');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context from canvas');
      return;
    }

    let animationFrameId;

    // Function to rasterize SVG to an image
    const rasterizeSVG = async (svgUrl) => {
      try {
        const response = await fetch(svgUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }
        const svgText = await response.text();

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 40;
        tempCanvas.height = 40;
        const tempCtx = tempCanvas.getContext('2d');

        const img = new Image();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        return new Promise((resolve, reject) => {
          img.onload = () => {
            tempCtx.drawImage(img, 0, 0, 40, 40);
            URL.revokeObjectURL(url);
            resolve(tempCanvas);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load SVG at ${svgUrl}`));
          };
          img.src = url;
        });
      } catch (error) {
        console.error(`Error rasterizing SVG at ${svgUrl}:`, error);
        return null;
      }
    };

    // Load and rasterize SVG icons
    Promise.all(
      circles.map(async (circle) => {
        const rasterizedIcon = await rasterizeSVG(circle.icon);
        if (rasterizedIcon) {
          circle.iconImage = rasterizedIcon;
          console.log(`Rasterized icon for ${circle.name}`);
        } else {
          console.warn(`Using fallback for ${circle.name} icon`);
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 40;
          tempCanvas.height = 40;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.beginPath();
          tempCtx.arc(20, 20, 15, 0, 2 * Math.PI);
          tempCtx.fillStyle = circle.color;
          tempCtx.fill();
          circle.iconImage = tempCanvas;
        }
      })
    )
      .then(() => {
        console.log('All icons processed');
      })
      .catch((error) => {
        console.error('Error loading icons:', error);
      });

    // Set canvas size and account for device pixel ratio
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr); // Adjust for device pixel ratio
      console.log('Canvas resized:', canvas.width, canvas.height, 'DPR:', dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Center of the canvas (in CSS pixels)
    let centerX = canvas.getBoundingClientRect().width / 2;
    let centerY = canvas.getBoundingClientRect().height / 2;

    // Mouse event handlers
    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      circles.forEach((circle, index) => {
        const x = centerX + circle.currentRadius * Math.cos(circle.angle);
        const y = centerY + circle.currentRadius * Math.sin(circle.angle);
        const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

        if (distance < 20) {
          draggingRef.current = index;
          mousePosRef.current = { x: mouseX, y: mouseY };
          console.log(`Started dragging ${circle.name}`);
        }
      });
    };

    const handleMouseMove = (e) => {
      if (draggingRef.current === null) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      mousePosRef.current = { x: mouseX, y: mouseY };

      const circle = circles[draggingRef.current];
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;
      circle.currentRadius = Math.sqrt(dx * dx + dy * dy);
      circle.angle = Math.atan2(dy, dx);
    };

    const handleMouseUp = () => {
      if (draggingRef.current !== null) {
        const circle = circles[draggingRef.current];
        circle.targetRadius = circle.radius; // Return to original radius
        draggingRef.current = null;
        console.log(`Stopped dragging ${circle.name}`);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Animation loop
    const animate = () => {
      // Update center in case of resize
      const rect = canvas.getBoundingClientRect();
      centerX = rect.width / 2;
      centerY = rect.height / 2;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw orbits
      circles.forEach((circle) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, circle.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Update and draw circles
      circles.forEach((circle, index) => {
        if (draggingRef.current !== index) {
          circle.angle += circle.speed;
          const diff = circle.targetRadius - circle.currentRadius;
          circle.currentRadius += diff * 0.1;
        }

        const x = centerX + circle.currentRadius * Math.cos(circle.angle);
        const y = centerY + circle.currentRadius * Math.sin(circle.angle);

        ctx.beginPath();
        ctx.arc(x, y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = circle.color;
        ctx.fill();

        if (circle.iconImage) {
          const iconSize = 30;
          const iconX = x - iconSize / 2;
          const iconY = y - iconSize / 2;
          ctx.drawImage(circle.iconImage, iconX, iconY, iconSize, iconSize);
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[800px] h-[800px]"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}