<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Game } from '../game/main.js';

const playArea = ref<HTMLElement|null>(null);
let game = null;

function resizeCallback()
{
    const width = window.innerWidth;
    const height = window.innerHeight;
    const div = playArea.value;

    div.style.width = width + "px";
    div.style.height = height + "px";
    game.resize();
}

onMounted(() => {
    if (playArea.value && !game) {
        game = new Game(playArea.value);
        game.start();
        window.addEventListener("resize", () => resizeCallback());
        setTimeout(() => resizeCallback(), 500);
    }
});

onUnmounted(() => {
    if (game) {
        game.destroy();
        game = null;
    }
});
</script>

<template>
    <div ref="playArea">
    </div>
</template>

<style scoped>
</style>
