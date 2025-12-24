<script>
export default {
    data() {
        return {
            gradientText: 'company-name'
        }
    }
}
</script>

<template>
    <nav class="navbar">
        <div class="logo">AnimaticAI</div>
        <div class="nav-links">
            <a href="#">3D-модели</a>
            <a href="#">Анимации</a>
            <a href="#">Генерация</a>
            <a href="#">Сообщество</a>
        </div>
        <div class="auth-buttons">
            <button class="btn btn-login" onclick="openAuthModal()">Войти</button>
            <button class="btn btn-signup" onclick="openAuthModal()">Регистрация</button>
        </div>
    </nav>
</template>

<style>
.navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 50px;
            background: var(--secondary-bg);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            position: relative;
            z-index: 100;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            background: linear-gradient(45deg, var(--accent-blue), var(--accent-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .nav-links {
            display: flex;
            gap: 40px;
        }
        
        .nav-links a {
            color: var(--text-primary);
            text-decoration: none;
            transition: color 0.3s;
            font-weight: 500;
        }
        
        .nav-links a:hover {
            color: var(--accent-blue);
        }
        
        .auth-buttons {
            display: flex;
            gap: 15px;
        }
        
        .btn {
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 500;
        }
        
        .btn-login {
            background: transparent;
            border: 1px solid var(--accent-blue);
            color: var(--accent-blue);
        }
        
        .btn-login:hover {
            background: var(--accent-blue);
            color: var(--primary-bg);
        }
        
        .btn-signup {
            background: var(--accent-purple);
            border: 1px solid var(--accent-purple);
            color: white;
        }
        
        .btn-signup:hover {
            background: transparent;
            color: var(--accent-purple);
        }
</style>