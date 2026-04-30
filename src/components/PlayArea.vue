<script setup lang="ts">
import * as PIXI from 'pixi.js';
import { ref, onMounted, onUnmounted } from 'vue';
import { Game } from '../game/main.js';

const playArea = ref<HTMLElement|null>(null);
let game = null;
let tickerFunc = null;
const fps = ref(0);
let refreshFPS = 0;

function tick(ticker) {
    refreshFPS -= ticker.elapsedMS/1000.0;
    if (refreshFPS <= 0) {
        fps.value = ticker.FPS|0;
        refreshFPS = 1;
    }
}

onMounted(async () => {
    if (playArea.value && !game) {
        game = new Game(playArea.value);
        await game.configure();
        game.start();
        PIXI.Ticker.shared.add(tick);
    }
});

onUnmounted(() => {
    if (game) {
        game.destroy();
        game = null;
    }
    PIXI.Ticker.shared.remove(tick);
});
</script>

<template>
    <div id="fps">FPS: {{ fps }}</div>
    <div ref="playArea">
    </div>
</template>

<style scoped>
#fps {
    position: absolute;
    color: white;
    top: 0.5em;
    right: 0.5em;
    font-size: x-large;
    font-family: arial;
}
</style>
