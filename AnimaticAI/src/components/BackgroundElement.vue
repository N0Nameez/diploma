<script>
export default {
    methods: {
        getParticleStyle(index) {
            const sizes = [2, 3, 4, 5, 6];
            const delays = [0, -3, -6, -9, -12, -15, -18, -21];
            const positions = [
                { top: '20%', left: '85%' },
                { top: '60%', left: '10%' },
                { top: '80%', left: '50%' },
                { top: '30%', left: '30%' },
                { top: '10%', left: '70%' },
                { top: '70%', left: '90%' },
                { top: '40%', left: '15%' },
                { top: '85%', left: '65%' }
            ];
            
            return {
                width: `${sizes[index % sizes.length]}px`,
                height: `${sizes[index % sizes.length]}px`,
                top: positions[index % positions.length].top,
                left: positions[index % positions.length].left,
                animationDelay: `${delays[index % delays.length]}s`
            };
        }
    }
}
</script>

<template>
    <div class="background-lights">
        <div class="light-source blue-light"></div>
        <div class="light-source purple-light"></div>
        <div class="particles">
            <div class="particle" v-for="i in 8" :key="i" :style="getParticleStyle(i)"></div>
        </div>
    </div>
</template>

<style scoped>
:root {
    --primary-bg: #0d0d0d;
    --secondary-bg: rgba(30, 30, 30, 0.8);
    --accent-blue: #00a2ff;
    --accent-purple: #9d4edd;
    --text-primary: #ffffff;
    --text-secondary: #b3b3b3;
}

body {
    background-color: var(--primary-bg);
    color: var(--text-primary);
    position: relative;
    overflow-x: hidden;
}

.background-lights {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    overflow: hidden;
}

.light-source {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.7;
    mix-blend-mode: screen;
}

.blue-light {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(0, 162, 255, 0.9) 0%, rgba(0, 162, 255, 0.3) 50%, transparent 70%);
    top: 40%;
    left: 70%;
    animation: 
        move-blue 25s ease-in-out infinite,
        pulse-blue 8s ease-in-out infinite;
}

.purple-light {
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(157, 78, 221, 0.9) 0%, rgba(157, 78, 221, 0.3) 50%, transparent 70%);
    top: 10%;
    left: 5%;
    animation: 
        move-purple 30s ease-in-out infinite,
        pulse-purple 10s ease-in-out infinite;
}

/* Объединенные анимации движения для синего шара */
@keyframes move-blue {
    0% {
        transform: 
            translate(0, 0) 
            rotate(0deg) 
            translateX(150px) 
            rotate(0deg)
            scale(1);
    }
    25% {
        transform: 
            translate(20px, -15px) 
            rotate(90deg) 
            translateX(150px) 
            rotate(-90deg)
            scale(1.02);
    }
    50% {
        transform: 
            translate(-10px, 25px) 
            rotate(180deg) 
            translateX(150px) 
            rotate(-180deg)
            scale(0.98);
    }
    75% {
        transform: 
            translate(15px, 10px) 
            rotate(270deg) 
            translateX(150px) 
            rotate(-270deg)
            scale(1.01);
    }
    100% {
        transform: 
            translate(0, 0) 
            rotate(360deg) 
            translateX(150px) 
            rotate(-360deg)
            scale(1);
    }
}

/* Объединенные анимации движения для фиолетового шара */
@keyframes move-purple {
    0% {
        transform: 
            translate(0, 0) 
            rotate(0deg) 
            translateX(200px) 
            rotate(0deg)
            scale(1);
    }
    20% {
        transform: 
            translate(-25px, 15px) 
            rotate(-72deg) 
            translateX(200px) 
            rotate(72deg)
            scale(1.03);
    }
    40% {
        transform: 
            translate(10px, -20px) 
            rotate(-144deg) 
            translateX(200px) 
            rotate(144deg)
            scale(0.97);
    }
    60% {
        transform: 
            translate(-15px, -10px) 
            rotate(-216deg) 
            translateX(200px) 
            rotate(216deg)
            scale(1.02);
    }
    80% {
        transform: 
            translate(20px, 5px) 
            rotate(-288deg) 
            translateX(200px) 
            rotate(288deg)
            scale(0.99);
    }
    100% {
        transform: 
            translate(0, 0) 
            rotate(-360deg) 
            translateX(200px) 
            rotate(360deg)
            scale(1);
    }
}

/* Анимации мерцания (только прозрачность) */
@keyframes pulse-blue {
    0%, 100% {
        opacity: 0.6;
    }
    25% {
        opacity: 0.8;
    }
    50% {
        opacity: 0.5;
    }
    75% {
        opacity: 0.7;
    }
}

@keyframes pulse-purple {
    0%, 100% {
        opacity: 0.5;
    }
    20% {
        opacity: 0.7;
    }
    40% {
        opacity: 0.4;
    }
    60% {
        opacity: 0.8;
    }
    80% {
        opacity: 0.6;
    }
}

.particles {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -2;
}

.particle {
    position: absolute;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    animation: float-particle 20s linear infinite;
}

@keyframes float-particle {
    0% {
        transform: translateY(0) translateX(0);
        opacity: 0;
    }
    10% {
        opacity: 1;
    }
    90% {
        opacity: 1;
    }
    100% {
        transform: translateY(-100px) translateX(50px);
        opacity: 0;
    }
}
</style>