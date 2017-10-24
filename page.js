function onload()
{
    var div = document.getElementById("canvas_area");
    var width = window.innerWidth-5;
    var height = window.innerHeight-5;
    div.style.width = width + "px";
    div.style.height = height + "px";

    apdungeon.start('canvas_area');
    window.addEventListener("resize", resize);

    setTimeout(resize, 100);
}

function resize()
{
    var div = document.getElementById("canvas_area");
    var width = window.innerWidth;
    var height = window.innerHeight;

    var credits = document.getElementById("credits");
    var rect = credits.getBoundingClientRect();

    height -= (rect.bottom-rect.top);

    div.style.width = width + "px";
    div.style.height = height + "px";
    apdungeon.resize();
}

function closeCredits()
{
    var div = document.getElementById("credits");
    div.style.display = "none";
    resize();
}


