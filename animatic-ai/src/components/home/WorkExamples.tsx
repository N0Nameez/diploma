import React, { useRef, Suspense } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Center, Float } from '@react-three/drei';

interface ModelProps {
  path: string;
}

function Model({ path }: ModelProps) {
  const { scene } = useGLTF(path);
  return <primitive object={scene} />;
}

interface ExampleCardProps {
  title: string;
  category: string;
  description: string;
  image: string;
  modelPath?: string;
  index: number;
  total: number;
  progress: any;
}

const ExampleCard = ({ title, category, description, image, modelPath, index, total, progress }: ExampleCardProps) => {
  const start = index / total;
  const scale = useTransform(progress, [start, (index + 1) / total], [1, 0.95]);

  return (
    <motion.div
      style={{ 
        top: `calc(10% + ${index * 40}px)`,
        scale,
        zIndex: index,
      }}
      className="sticky w-full max-w-6xl mx-auto h-[75vh] md:h-[70vh] mb-[10vh] overflow-hidden border border-white/10 bg-background-primary rounded-[40px] shadow-[0_-20px_80px_rgba(0,0,0,0.6)] flex flex-col md:flex-row group"
    >
      <div className="w-full md:w-1/2 h-[45%] md:h-full overflow-hidden relative bg-[#050505]">
        {/* Always show image as base/fallback */}
        <img
          src={image}
          alt={title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
            modelPath ? 'opacity-30 blur-sm scale-105' : 'opacity-100 group-hover:scale-110'
          }`}
        />
        
        {modelPath && (
          <div className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing">
            <Canvas camera={{ position: [0, 0, 6], fov: 40 }}>
              <ambientLight intensity={0.7} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
              <Suspense fallback={null}>
                <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
                  <Center>
                    <Model path={modelPath} />
                  </Center>
                </Float>
                <Environment preset="city" />
              </Suspense>
              <OrbitControls 
                enableZoom={false} 
                autoRotate 
                autoRotateSpeed={1}
                makeDefault
              />
            </Canvas>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background-primary via-transparent to-transparent md:bg-gradient-to-l pointer-events-none z-20" />
      </div>
      
      <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <p className="text-accent font-mono text-xs uppercase tracking-[3px]">
            {category}
          </p>
        </div>
        
        <h3 className="text-3xl lg:text-5xl font-medium text-white mb-6 tracking-tight leading-[1.1]">
          {title}
        </h3>
        
        <p className="text-text-tertiary text-lg font-light mb-10 max-w-md leading-relaxed">
          {description}
        </p>
        
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-medium hover:bg-accent hover:text-white transition-all duration-300 group/btn">
            Исследовать
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export function WorkExamples() {
  const container = useRef<HTMLDivElement>(null);
  const examples = [
    {
      title: "Детализированные 3D модели",
      category: "Модели",
      description: "Создавайте сложные объекты с идеальной геометрией и фотореалистичными текстурами за считанные минуты.",
      image: "/images/dron_bg.png",
      modelPath: "/models/dron.glb"
    },
    {
      title: "Архитектурная визуализация",
      category: "Архитектура",
      description: "Генерация интерьеров и экстерьеров по вашим чертежам. Идеально для архитекторов и дизайнеров.",
      image: "/images/building_bg.png",
      modelPath: "/models/building.glb"
    },
    {
      title: "Мебель и предметы интерьера",
      category: "Мебель или объекты",
      description: "От уникальных стульев до сложных декоративных элементов. Наполняйте свои сцены уникальным контентом.",
      image: "/images/chair_bg.png",
      modelPath: "/models/chair.glb"
    },
    {
      title: "Персонажи и существа",
      category: "Персонажи",
      description: "Воплощайте самых смелых героев в 3D. Наш ИИ понимает анатомию и сложные формы.",
      image: "/images/samurai_bg.png",
      modelPath: "/models/samurai.glb"
    }
  ];


  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end']
  });

  return (
    <section ref={container} className="relative py-[150px] lg:py-[250px] bg-background-primary" id="work">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 mb-20 lg:mb-32">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="font-mono text-[12px] font-normal text-text-muted tracking-[1px] flex items-center gap-3 mb-8 before:content-[''] before:w-8 before:h-px before:bg-accent/30 uppercase"
        >
          Портфолио
        </motion.div>
        
        <h2 className="text-4xl lg:text-7xl font-medium text-white tracking-tighter leading-[0.9]">
          Результаты нашей <br />
          <span className="text-accent italic font-light">нейросети</span>
        </h2>
      </div>

      <div className="relative px-6 lg:px-10">
        <div className="flex flex-col gap-[30vh]"> {/* Dummy height to allow scrolling between sticky cards */}
          {examples.map((example, i) => (
            <ExampleCard 
              key={i} 
              index={i} 
              total={examples.length}
              progress={scrollYProgress}
              {...example} 
            />
          ))}
        </div>
      </div>
    </section>
  );
}


