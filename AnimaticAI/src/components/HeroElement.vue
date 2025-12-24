<script>
</script>

<template>
    <section class="hero">
        <h1>Создавайте 3D-персонажей из фото и оживляйте их через видео</h1>
        <p>Мощный ИИ превратит ваши фотографии в 3D-модели, а видео - в реалистичные анимации. Присоединяйтесь к
            сообществу 3D-художников.</p>
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Найдите 3D-модели, анимации или пользователей...">
            <button class="search-btn">Найти</button>
        </div>
    </section>
</template>

<style scoped>
.hero {
    text-align: center;
    padding: 120px 20px;
    max-width: 800px;
    margin: 0 auto;
    position: relative;
    z-index: 10;
}

.hero h1 {
    font-size: 48px;
    margin-bottom: 20px;
    background: linear-gradient(45deg, #ffffff, var(--accent-blue));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.2;
}

.hero p {
    font-size: 20px;
    color: var(--text-secondary);
    margin-bottom: 40px;
    line-height: 1.6;
}

.search-container {
    max-width: 500px;
    margin: 0 auto;
    position: relative;
}

.search-input {
    width: 100%;
    padding: 15px 20px;
    border-radius: 50px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: var(--secondary-bg);
    backdrop-filter: blur(10px);
    color: var(--text-primary);
    font-size: 16px;
}

.search-input:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 2px rgba(0, 162, 255, 0.2);
}

.search-btn {
    position: absolute;
    right: 5px;
    top: 5px;
    background: var(--accent-blue);
    border: none;
    border-radius: 50px;
    padding: 10px 25px;
    color: white;
    cursor: pointer;
    transition: background 0.3s;
}

.search-btn:hover {
    background: var(--accent-purple);
}
</style>